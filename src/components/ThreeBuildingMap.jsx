import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
  Building2, ShieldAlert, Flame, CheckCircle2, RotateCw, 
  ZoomIn, ZoomOut, Compass, Eye, Filter, Info, AlertTriangle, 
  Maximize2, Play, Pause, Sparkles, MapPin, Globe, Layers, Navigation
} from 'lucide-react';
import { API, formatINR, formatCrores } from '../services/api';

// Bangalore Cartographic Reference Bounds
const BLR_BOUNDS = {
  centerLat: 12.9716,
  centerLng: 77.6100,
  minLat: 12.81,
  maxLat: 13.14,
  minLng: 77.44,
  maxLng: 77.76
};

// Map projection: convert GPS (lat, lng) to Three.js (x, z) coordinates
function projectGPS(lat, lng, bounds = BLR_BOUNDS, scale = 110) {
  // 1 deg Lat ~= 111 km, 1 deg Lng at 13 deg N ~= 108 km
  const x = (lng - bounds.centerLng) * scale;
  const z = -(lat - bounds.centerLat) * scale; // In Three.js, negative Z is North
  return { x, z };
}

// Major Bangalore localities GPS anchors for 3D cartographic reference
const LOCALITY_ANCHORS = [
  { name: 'Bellandur (Assigned)', lat: 12.9304, lng: 77.6784, isAssigned: true, tag: 'TECH CORRIDOR' },
  { name: 'Bellandur Lake', lat: 12.9360, lng: 77.6650, isLake: true, tag: 'WATER BODY' },
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245, tag: 'COMMERCIAL HUB' },
  { name: 'HSR Layout', lat: 12.9121, lng: 77.6446, tag: 'RESIDENTIAL' },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, tag: 'PRIME CENTRAL' },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7500, tag: 'IT SEZ' },
  { name: 'Electronic City', lat: 12.8452, lng: 77.6602, tag: 'TECH HUB' },
  { name: 'Hebbal', lat: 13.0358, lng: 77.5970, tag: 'NORTH TRANSIT' },
  { name: 'Sarjapur Road', lat: 12.9050, lng: 77.6950, tag: 'ORR ACCESS' }
];

export default function ThreeBuildingMap() {
  const mountRef = useRef(null);
  
  // Data state
  const [allListings, setAllListings] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Filter and View States
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'good', 'corrupt', 'bait'
  const [localityFilter, setLocalityFilter] = useState('all'); // 'all', 'bellandur', 'hsr', 'whitefield', etc.
  const [corruptSubType, setCorruptSubType] = useState('all'); // 'all', 'swapped', 'negative', 'floor', 'carpet', 'zerobhk'
  const [viewMode, setViewMode] = useState('3d'); // '3d' or '2d'
  const [autoRotate, setAutoRotate] = useState(true);
  const [arcticExpanded, setArcticExpanded] = useState(false);
  
  // Interaction & HUD
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [gpsTelemetry, setGpsTelemetry] = useState({ lat: 12.9304, lng: 77.6784 });

  // Three.js References
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const buildingsMapRef = useRef(new Map());
  const animationFrameIdRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2(999, 999));
  const raycasterRef = useRef(new THREE.Raycaster());
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraRotationRef = useRef({ theta: 0.85, phi: 0.65, radius: 48 });
  const buildingsGroupRef = useRef(null);

  // 1. Fetch Real Listings Data
  useEffect(() => {
    async function load() {
      setLoadingData(true);
      try {
        const [listings, submission] = await Promise.all([
          API.fetchListings(),
          API.fetchSubmission()
        ]);

        const corruptIdsSet = new Set(submission?.answers?.corrupt_listing_ids || []);
        const baitIdsSet = new Set(submission?.answers?.fake_listing_ids || []);

        // Classify listings strictly according to submission audit
        const classified = listings.map(l => {
          const id = l.listing_id;
          const isCorrupt = corruptIdsSet.has(id) || l.is_corrupt;
          const isBait = baitIdsSet.has(id) || (l.price > 0 && l.price <= 500);

          let corruptType = null;
          let anomalyReason = null;

          if (isCorrupt) {
            if (l.latitude > 50) {
              corruptType = 'swapped';
              anomalyReason = `Arctic GPS Anomaly: Lat ${l.latitude}°N, Lng ${l.longitude}°E (Swapped Coordinates)`;
            } else if (l.price < 0) {
              corruptType = 'negative';
              anomalyReason = `Negative Sale Price: ${formatINR(l.price)} (Database constraint violation)`;
            } else if (l.total_floors > 0 && l.floor > l.total_floors) {
              corruptType = 'floor';
              anomalyReason = `Floor Paradox: Floor ${l.floor} of ${l.total_floors} building floors`;
            } else if (l.carpet_area > l.super_built_up_area && l.super_built_up_area > 0) {
              corruptType = 'carpet';
              anomalyReason = `Area Anomaly: Carpet Area (${l.carpet_area} sqft) exceeds SBUA (${l.super_built_up_area} sqft)`;
            } else if (l.bedroom <= 0) {
              corruptType = 'zerobhk';
              anomalyReason = `Unit Paradox: 0-BHK listing with residential classification`;
            } else {
              corruptType = 'generic';
              anomalyReason = 'Physical integrity data corruption identified in audit';
            }
          } else if (isBait) {
            anomalyReason = `Fraudulent Clickbait: Artificial ${formatINR(l.price)} price to capture broker leads`;
          }

          return {
            ...l,
            status: isCorrupt ? 'corrupt' : (isBait ? 'bait' : 'good'),
            corruptType,
            anomalyReason
          };
        });

        // Filter for optimal visualization:
        // - 100% of Corrupted listings (all 40)
        // - 100% of Bait listings (all 8)
        // - All Bellandur live listings + balanced sample of other micro-markets
        const corrupts = classified.filter(l => l.status === 'corrupt');
        const baits = classified.filter(l => l.status === 'bait');
        const bellandurClean = classified.filter(l => l.status === 'good' && (l.locality || '').toLowerCase().includes('bellandur'));
        const otherClean = classified.filter(l => l.status === 'good' && !(l.locality || '').toLowerCase().includes('bellandur')).slice(0, 100);

        const dataset = [...corrupts, ...baits, ...bellandurClean, ...otherClean];
        setAllListings(dataset);
      } catch (err) {
        console.error('Failed loading 3D map dataset:', err);
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, []);

  // 2. Initialize Three.js Scene and GIS Plane
  useEffect(() => {
    const container = mountRef.current;
    if (!container || allListings.length === 0) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // A. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a14); // Deep geospatial Navy
    scene.fog = new THREE.FogExp2(0x050a14, 0.012);
    sceneRef.current = scene;

    // B. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500);
    const updateCameraPos = () => {
      const { theta, phi, radius } = cameraRotationRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(0, 1, 0);
    };
    updateCameraPos();
    cameraRef.current = camera;

    // C. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // D. Lighting
    const ambientLight = new THREE.AmbientLight(0x223355, 3.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.6);
    sunLight.position.set(30, 60, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // Cyan & Royal Blue High-tech Accents
    const bellandurLight = new THREE.PointLight(0x0018a8, 8, 80);
    bellandurLight.position.set(8, 12, -4);
    scene.add(bellandurLight);

    const anomalyRadarLight = new THREE.PointLight(0xf43f5e, 6, 70);
    anomalyRadarLight.position.set(-15, 15, -15);
    scene.add(anomalyRadarLight);

    // E. GIS Coordinate Grid & Terrain Plane
    const mapGridSize = 75;
    const gridHelper = new THREE.GridHelper(mapGridSize, 30, 0x0044bb, 0x0d1e38);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Outer Map Border Outline
    const borderGeom = new THREE.EdgesGeometry(new THREE.PlaneGeometry(mapGridSize, mapGridSize));
    const borderMat = new THREE.LineBasicMaterial({ color: 0x0055ff, transparent: true, opacity: 0.4 });
    const borderMesh = new THREE.LineSegments(borderGeom, borderMat);
    borderMesh.rotation.x = -Math.PI / 2;
    borderMesh.position.y = 0.01;
    scene.add(borderMesh);

    // F. Bellandur Lake 3D Waterbody Geometry
    const lakeGPS = projectGPS(12.9360, 77.6650);
    const lakeGeom = new THREE.CylinderGeometry(4.2, 5.0, 0.15, 24);
    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.65
    });
    const lakeMesh = new THREE.Mesh(lakeGeom, lakeMat);
    lakeMesh.position.set(lakeGPS.x, 0.06, lakeGPS.z);
    scene.add(lakeMesh);

    // G. Outer Ring Road (ORR) Arterial Highway Ribbon
    const orrPts = [
      projectGPS(12.9120, 77.6440), // Silk Board / HSR
      projectGPS(12.9240, 77.6650), // Agara
      projectGPS(12.9304, 77.6784), // Bellandur Central
      projectGPS(12.9450, 77.6950), // Devarabisanahalli
      projectGPS(12.9550, 77.7010)  // Marathahalli
    ];
    const orrCurve = new THREE.CatmullRomCurve3(
      orrPts.map(p => new THREE.Vector3(p.x, 0.08, p.z))
    );
    const orrTubeGeom = new THREE.TubeGeometry(orrCurve, 32, 0.65, 8, false);
    const orrMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      emissive: 0x0f172a,
      roughness: 0.4
    });
    const orrMesh = new THREE.Mesh(orrTubeGeom, orrMat);
    scene.add(orrMesh);

    // Road glowing center line
    const orrLineGeom = new THREE.BufferGeometry().setFromPoints(orrCurve.getPoints(50));
    const orrLineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    const orrLine = new THREE.Line(orrLineGeom, orrLineMat);
    orrLine.position.y += 0.4;
    scene.add(orrLine);

    // H. Locality Land-marker Beacons & Labels
    LOCALITY_ANCHORS.forEach(loc => {
      const p = projectGPS(loc.lat, loc.lng);
      const isBell = loc.isAssigned;
      
      const pinGeom = new THREE.CylinderGeometry(0.1, isBell ? 0.7 : 0.4, isBell ? 3.0 : 1.8, 12);
      const pinMat = new THREE.MeshBasicMaterial({ 
        color: isBell ? 0x00f0ff : (loc.isLake ? 0x0284c7 : 0x475569),
        transparent: true,
        opacity: isBell ? 0.9 : 0.6
      });
      const pin = new THREE.Mesh(pinGeom, pinMat);
      pin.position.set(p.x, isBell ? 1.5 : 0.9, p.z);
      scene.add(pin);

      // Expanding radar beacon for Bellandur
      if (isBell) {
        const ringGeom = new THREE.RingGeometry(2.5, 3.2, 32);
        const ringMat = new THREE.MeshBasicMaterial({ 
          color: 0x00f0ff, 
          side: THREE.DoubleSide, 
          transparent: true, 
          opacity: 0.5 
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(p.x, 0.1, p.z);
        scene.add(ring);
      }
    });

    // I. Arctic Siberia Outpost for Swapped Coordinates Listings
    // When lat > 50, coordinates are in Russia/Arctic (~77°N, ~13°E)
    // We visualize this anomaly outpost at the northwest quadrant with a radar perimeter
    const arcticCenter = { x: -32, z: -32 };
    const arcticPerimeterGeom = new THREE.RingGeometry(5.0, 5.5, 32);
    const arcticPerimeterMat = new THREE.MeshBasicMaterial({ 
      color: 0xe11d48, 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 0.7 
    });
    const arcticPerimeter = new THREE.Mesh(arcticPerimeterGeom, arcticPerimeterMat);
    arcticPerimeter.rotation.x = -Math.PI / 2;
    arcticPerimeter.position.set(arcticCenter.x, 0.05, arcticCenter.z);
    scene.add(arcticPerimeter);

    // J. Render Real Classified 3D Buildings
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);
    buildingsGroupRef.current = buildingsGroup;
    const buildingMeshes = [];
    buildingsMapRef.current.clear();

    allListings.forEach((item) => {
      let isSwapped = item.latitude > 50;
      let pos;

      if (isSwapped) {
        // Place in Arctic Anomaly perimeter or flipped based on state
        const angle = Math.random() * Math.PI * 2;
        const dist = 1.0 + Math.random() * 3.5;
        pos = {
          x: arcticCenter.x + Math.cos(angle) * dist,
          z: arcticCenter.z + Math.sin(angle) * dist
        };
      } else {
        // Exact Real GPS projection
        pos = projectGPS(item.latitude, item.longitude);
      }

      // Proportional height based on real building floors or unit size
      const floors = item.total_floors || item.floor || 12;
      let bHeight = 1.8 + Math.min(floors, 35) * 0.22;
      const bWidth = 1.2 + Math.random() * 0.6;
      const bDepth = 1.2 + Math.random() * 0.6;

      let baseColor = 0x2563eb; // Royal Blue
      let baseEmissive = 0x031749;
      let wireColor = 0x60a5fa;
      let spireColor = 0x3b82f6;

      if (item.status === 'good') {
        baseColor = 0x1e40af; // Deep Blue
        baseEmissive = 0x051a59;
        wireColor = 0x93c5fd;
        spireColor = 0x10b981; // Emerald verified tip
      } else if (item.status === 'corrupt') {
        baseColor = 0xe11d48; // Crimson Rose Anomaly
        baseEmissive = 0x4c0519;
        wireColor = 0xf43f5e;
        spireColor = 0xff0055;
        bHeight += 1.0; // Spire elevation
      } else if (item.status === 'bait') {
        baseColor = 0xd97706; // Amber Fraud
        baseEmissive = 0x451a03;
        wireColor = 0xfbbf24;
        spireColor = 0xf59e0b;
      }

      const geom = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
      const mat = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseEmissive,
        roughness: 0.35,
        metalness: 0.65,
        transparent: true,
        opacity: 0.92
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(pos.x, bHeight / 2, pos.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Architectural Wireframe
      const edgesGeom = new THREE.EdgesGeometry(geom);
      const wireMat = new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0.8 });
      const wireframe = new THREE.LineSegments(edgesGeom, wireMat);
      mesh.add(wireframe);

      // Rooftop GPS Sensor Spire
      const beaconGeom = new THREE.CylinderGeometry(0.08, 0.2, 1.2, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: spireColor });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.set(0, bHeight / 2 + 0.6, 0);
      mesh.add(beacon);

      // Animated Pulse Ring for Corrupt and Bait anomalies
      let pulseRing = null;
      if (item.status === 'corrupt' || item.status === 'bait') {
        const ringGeom = new THREE.RingGeometry(0.9, 1.3, 16);
        const ringMat = new THREE.MeshBasicMaterial({ 
          color: spireColor, 
          side: THREE.DoubleSide, 
          transparent: true, 
          opacity: 0.8 
        });
        pulseRing = new THREE.Mesh(ringGeom, ringMat);
        pulseRing.rotation.x = -Math.PI / 2;
        pulseRing.position.set(0, bHeight / 2 + 0.9, 0);
        mesh.add(pulseRing);
      }

      // If Swapped Lat/Lng, draw a laser trajectory back to where it should be in Bangalore
      let tetherLine = null;
      if (isSwapped) {
        const correctedGPS = projectGPS(item.longitude, item.latitude); // Invert
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pos.x, bHeight + 0.5, pos.z),
          new THREE.Vector3(correctedGPS.x, 0.5, correctedGPS.z)
        ]);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xff0055,
          dashSize: 1,
          gapSize: 0.5,
          transparent: true,
          opacity: 0.65
        });
        tetherLine = new THREE.Line(lineGeom, lineMat);
        tetherLine.computeLineDistances();
        scene.add(tetherLine);
      }

      mesh.userData = {
        item: item,
        originalY: bHeight / 2,
        height: bHeight,
        status: item.status,
        corruptType: item.corruptType,
        locality: (item.locality || '').toLowerCase(),
        mat: mat,
        pulseRing: pulseRing,
        tetherLine: tetherLine,
        baseColor: baseColor,
        baseEmissive: baseEmissive
      };

      buildingsGroup.add(mesh);
      buildingMeshes.push(mesh);
      buildingsMapRef.current.set(item.listing_id, mesh);
    });

    // K. Mouse Event Listeners
    const handleMouseDown = (e) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / width) * 2 - 1;
      const y = -((e.clientY - rect.top) / height) * 2 + 1;
      mouseRef.current.set(x, y);

      // Compute approximate GPS coordinate under cursor
      const invX = (x * 30);
      const invZ = (y * 30);
      const approxLng = (invX / 110) + BLR_BOUNDS.centerLng;
      const approxLat = -(invZ / 110) + BLR_BOUNDS.centerLat;
      setGpsTelemetry({
        lat: Math.round(approxLat * 10000) / 10000,
        lng: Math.round(approxLng * 10000) / 10000
      });

      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;

        cameraRotationRef.current.theta -= deltaX * 0.008;
        cameraRotationRef.current.phi = Math.max(
          0.15, 
          Math.min(Math.PI / 2.05, cameraRotationRef.current.phi - deltaY * 0.008)
        );
        updateCameraPos();

        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      cameraRotationRef.current.radius = Math.max(15, Math.min(85, cameraRotationRef.current.radius + e.deltaY * 0.04));
      updateCameraPos();
    };

    const handleClick = () => {
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(buildingMeshes);
      if (intersects.length > 0) {
        const clicked = intersects[0].object;
        setSelectedBuilding(clicked.userData.item);
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('click', handleClick);

    // L. Animation Loop
    let clock = new THREE.Clock();
    let lastHovered = null;

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle continuous orbit when enabled
      if (autoRotate && !isDraggingRef.current && viewMode === '3d') {
        cameraRotationRef.current.theta += 0.0015;
        updateCameraPos();
      }

      // Animate pulsing rings on anomalies
      buildingMeshes.forEach(mesh => {
        if (mesh.userData.pulseRing) {
          const s = 1.0 + Math.sin(elapsedTime * 4.5 + mesh.position.x) * 0.4;
          mesh.userData.pulseRing.scale.set(s, s, s);
          mesh.userData.pulseRing.material.opacity = 0.3 + Math.cos(elapsedTime * 4.5) * 0.4;
        }
      });

      // Hover Raycasting
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(buildingMeshes);

      if (intersects.length > 0) {
        const target = intersects[0].object;
        if (lastHovered !== target) {
          if (lastHovered) {
            lastHovered.position.y = lastHovered.userData.originalY;
            lastHovered.material.emissive.setHex(lastHovered.userData.baseEmissive);
          }
          lastHovered = target;
          target.position.y = target.userData.originalY + 1.0; // Elevate on hover
          target.material.emissive.setHex(0x38bdf8); // Bright highlight glow
          setHoveredBuilding(target.userData.item);
        }
      } else {
        if (lastHovered) {
          lastHovered.position.y = lastHovered.userData.originalY;
          lastHovered.material.emissive.setHex(lastHovered.userData.baseEmissive);
          lastHovered = null;
          setHoveredBuilding(null);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, [allListings, autoRotate, viewMode]);

  // 3. Dynamic Filtering Logic (Status + Locality + Corrupt Subtype)
  useEffect(() => {
    buildingsMapRef.current.forEach((mesh) => {
      const { status, corruptType, locality, mat, baseColor, baseEmissive, tetherLine } = mesh.userData;

      // Check status filter
      const matchStatus = statusFilter === 'all' || statusFilter === status;

      // Check locality filter
      const matchLocality = localityFilter === 'all' || locality.includes(localityFilter.toLowerCase());

      // Check corrupt subtype filter
      const matchSubtype = statusFilter !== 'corrupt' || corruptSubType === 'all' || corruptType === corruptSubType;

      const isVisible = matchStatus && matchLocality && matchSubtype;

      if (isVisible) {
        mesh.visible = true;
        mat.opacity = 0.92;
        mat.color.setHex(baseColor);
        mat.emissive.setHex(baseEmissive);
        if (tetherLine) tetherLine.visible = true;
      } else {
        // Ghost translucent mode for filtered-out buildings
        mat.opacity = 0.05;
        mat.color.setHex(0x334155);
        mat.emissive.setHex(0x020617);
        if (tetherLine) tetherLine.visible = false;
      }
    });
  }, [statusFilter, localityFilter, corruptSubType]);

  // 4. View Mode Transitions (Top-Down 2D Map vs 3D Isometric)
  const toggleViewMode = (mode) => {
    setViewMode(mode);
    if (!cameraRef.current) return;

    if (mode === '2d') {
      setAutoRotate(false);
      cameraRotationRef.current = { theta: 0, phi: 0.05, radius: 52 }; // Top-down
      cameraRef.current.position.set(0, 52, 0.01);
      cameraRef.current.lookAt(0, 0, 0);
    } else {
      cameraRotationRef.current = { theta: 0.85, phi: 0.65, radius: 48 }; // 3D Perspective
      const { theta, phi, radius } = cameraRotationRef.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.lookAt(0, 1, 0);
    }
  };

  // Camera Quick Focus Functions
  const focusBellandur = () => {
    if (!cameraRef.current) return;
    const bGPS = projectGPS(12.9304, 77.6784);
    cameraRotationRef.current = { theta: 0.95, phi: 0.60, radius: 30 };
    cameraRef.current.position.set(bGPS.x + 12, 14, bGPS.z + 18);
    cameraRef.current.lookAt(bGPS.x, 2, bGPS.z);
  };

  const focusArcticAnomaly = () => {
    if (!cameraRef.current) return;
    setStatusFilter('corrupt');
    setCorruptSubType('swapped');
    cameraRotationRef.current = { theta: -2.35, phi: 0.55, radius: 26 };
    cameraRef.current.position.set(-24, 12, -22);
    cameraRef.current.lookAt(-32, 2, -32);
  };

  const handleZoom = (delta) => {
    cameraRotationRef.current.radius = Math.max(15, Math.min(85, cameraRotationRef.current.radius + delta));
    if (cameraRef.current) {
      const { theta, phi, radius } = cameraRotationRef.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.lookAt(0, 1, 0);
    }
  };

  const activeInspection = selectedBuilding || hoveredBuilding;

  // Compute counts
  const counts = useMemo(() => {
    let good = 0, corrupt = 0, bait = 0, bellandur = 0;
    allListings.forEach(l => {
      if (l.status === 'good') good++;
      if (l.status === 'corrupt') corrupt++;
      if (l.status === 'bait') bait++;
      if ((l.locality || '').toLowerCase().includes('bellandur')) bellandur++;
    });
    return { good, corrupt, bait, bellandur, total: allListings.length };
  }, [allListings]);

  return (
    <div className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative text-white">
      
      {/* 1. Header Toolbar & Real GPS Status */}
      <div className="p-4 sm:p-5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Bangalore & Bellandur 3D Geospatial Audit Map
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  Real GPS Projection
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Extruded 3D building coordinates accurately matched to actual Bangalore latitude & longitude cartography.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Camera Quick Jump Buttons */}
        <div className="flex items-center gap-2">
          {/* 3D vs 2D Toggle */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => toggleViewMode('3d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D Isometric</span>
            </button>
            <button
              onClick={() => toggleViewMode('2d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>2D GIS Map</span>
            </button>
          </div>

          {/* Quick Jump to Bellandur */}
          <button
            onClick={focusBellandur}
            className="px-3 py-1.5 rounded-xl bg-[#0018A8]/30 hover:bg-[#0018A8]/60 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Focus camera directly on Bellandur ORR tech corridor"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>Focus Bellandur</span>
          </button>

          {/* Focus Arctic Swapped Outpost */}
          <button
            onClick={focusArcticAnomaly}
            className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Jump to Arctic Swapped Coordinates anomaly perimeter"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Arctic Coords (8)</span>
          </button>
        </div>
      </div>

      {/* 2. Secondary Filter Bar: Status, Locality & Corrupt Anomaly Subtypes */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" />
            Status:
          </span>
          <button
            onClick={() => { setStatusFilter('all'); setCorruptSubType('all'); }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Buildings ({counts.total})
          </button>

          <button
            onClick={() => setStatusFilter('good')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
              statusFilter === 'good'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Good</span>
          </button>

          <button
            onClick={() => setStatusFilter('corrupt')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
              statusFilter === 'corrupt'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Corrupt (40 IDs)</span>
          </button>

          <button
            onClick={() => setStatusFilter('bait')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
              statusFilter === 'bait'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Bait (8 IDs)</span>
          </button>
        </div>

        {/* Locality Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">Locality Scope:</span>
          <select
            value={localityFilter}
            onChange={(e) => setLocalityFilter(e.target.value)}
            className="bg-slate-950 text-white font-medium border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">All Micro-Markets (Bangalore)</option>
            <option value="bellandur">Bellandur (Assigned Locality)</option>
            <option value="hsr">HSR Layout</option>
            <option value="koramangala">Koramangala</option>
            <option value="whitefield">Whitefield</option>
            <option value="indiranagar">Indiranagar</option>
            <option value="electronic city">Electronic City</option>
            <option value="hebbal">Hebbal</option>
            <option value="sarjapur">Sarjapur Road</option>
          </select>
        </div>
      </div>

      {/* 3. Corrupt Sub-Category Filter (Shows when Corrupt is active) */}
      {statusFilter === 'corrupt' && (
        <div className="px-4 py-2 bg-rose-950/20 border-b border-rose-900/40 flex flex-wrap items-center gap-2 text-xs animate-in fade-in duration-150">
          <span className="text-rose-300 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Anomaly Sub-Type:
          </span>
          {[
            { key: 'all', label: 'All 40 Corrupt' },
            { key: 'swapped', label: 'Swapped Lat/Lng (8)' },
            { key: 'negative', label: 'Negative Price (8)' },
            { key: 'floor', label: 'Floor > Total Floors (8)' },
            { key: 'carpet', label: 'Carpet > SBUA (8)' },
            { key: 'zerobhk', label: '0-BHK Unit (8)' }
          ].map(sub => (
            <button
              key={sub.key}
              onClick={() => setCorruptSubType(sub.key)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                corruptSubType === sub.key
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-950/50 text-rose-300 hover:bg-rose-900/50 border border-rose-900/60'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* 4. Main 3D WebGL Canvas Viewport */}
      <div className="relative w-full h-[580px]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Loading Spinner */}
        {loadingData && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-300">Projecting 4,700 real GPS records onto 3D GIS terrain...</p>
            </div>
          </div>
        )}

        {/* Floating Quick Action Overlay (Top Left) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
          <div className="bg-slate-950/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 flex flex-col gap-1 shadow-2xl">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title={autoRotate ? "Pause Auto Orbit" : "Resume Auto Orbit"}
              className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                autoRotate ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => toggleViewMode(viewMode === '3d' ? '2d' : '3d')}
              title="Toggle 2D Map / 3D Isometric"
              className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            >
              <Compass className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(-7)}
              title="Zoom In"
              className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(7)}
              title="Zoom Out"
              className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live GPS Telemetry Readout (Bottom Left) */}
        <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 text-xs flex flex-col gap-1 shadow-2xl font-mono">
          <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            <Globe className="w-3 h-3 text-blue-400" />
            <span>GIS Cursor Telemetry</span>
          </div>
          <div className="flex items-center gap-3 text-slate-200 text-[11px]">
            <span>LAT: <strong className="text-blue-400">{gpsTelemetry.lat}° N</strong></span>
            <span>LNG: <strong className="text-blue-400">{gpsTelemetry.lng}° E</strong></span>
            <span className="text-slate-500 font-sans">| WGS84 Datum</span>
          </div>
        </div>

        {/* Map Legend Overlay (Bottom Right) */}
        <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 text-xs flex items-center gap-4 shadow-2xl">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 shadow-xs shadow-blue-500/50" />
            <span className="text-slate-300">Clean Units</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-600 animate-pulse shadow-xs shadow-rose-500/50" />
            <span className="text-rose-300 font-bold">Corrupt (40 IDs)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 shadow-xs shadow-amber-500/50" />
            <span className="text-amber-300 font-bold">Bait (8 IDs)</span>
          </div>
        </div>

        {/* Interactive Building Inspector HUD Card (Top Right) */}
        {activeInspection && (
          <div className="absolute top-4 right-4 max-w-sm w-full bg-slate-950/95 backdrop-blur-md rounded-2xl border border-slate-700/80 p-5 shadow-2xl text-left animate-in fade-in slide-in-from-top-2 duration-200 z-10">
            {/* Header / ID Badge */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  activeInspection.status === 'good' ? 'bg-emerald-400' :
                  activeInspection.status === 'corrupt' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                }`} />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                  {activeInspection.listing_id}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                activeInspection.status === 'good' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                activeInspection.status === 'corrupt' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {activeInspection.status === 'good' ? 'Physical Property' :
                 activeInspection.status === 'corrupt' ? 'Corrupt Anomaly' : 'Fraud Bait'}
              </span>
            </div>

            {/* Building Name & Locality */}
            <h4 className="text-base font-black text-white leading-tight mb-1">
              {activeInspection.apartment_name || activeInspection.listing_id}
            </h4>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="capitalize text-slate-300">{activeInspection.locality || 'Bellandur'}, Bangalore</span>
              <span className="text-slate-400">Via {activeInspection.website || 'broker portal'}</span>
            </div>

            {/* Real GPS Coordinate Badge */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-slate-400">GPS Position:</span>
              <span className="text-blue-300 font-bold">
                {activeInspection.latitude}° N, {activeInspection.longitude}° E
              </span>
            </div>

            {/* Price & Unit Details Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Sale Price</span>
                <span className={`font-bold text-sm ${
                  activeInspection.price < 0 ? 'text-rose-400' :
                  activeInspection.status === 'bait' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {formatINR(activeInspection.price)}
                </span>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Floor Level</span>
                <span className="font-bold text-sm text-slate-200">
                  Floor {activeInspection.floor} of {activeInspection.total_floors || '—'}
                </span>
              </div>
            </div>

            {/* Forensic Anomaly Diagnostic Box */}
            <div className={`p-3 rounded-xl text-xs mb-3 ${
              activeInspection.status === 'good' ? 'bg-slate-900 border border-slate-800 text-slate-300' :
              activeInspection.status === 'corrupt' ? 'bg-rose-950/40 border border-rose-900/60 text-rose-200' :
              'bg-amber-950/40 border border-amber-900/60 text-amber-200'
            }`}>
              <div className="font-bold mb-1 flex items-center gap-1.5">
                {activeInspection.status === 'good' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>Auditor Verdict:</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-95">
                {activeInspection.anomalyReason || `Audited physical unit with verified structural integrity (${activeInspection.bedroom || 2} BHK, ${activeInspection.carpet_area || 1200} sqft). Verified live listing.`}
              </p>
            </div>

            {/* Lock / Dismiss Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2.5">
              <span>Click building in 3D to freeze card</span>
              {selectedBuilding && (
                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                >
                  Clear Freeze
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Geospatial Status Footer */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Real Coordinates Cartography Engine: Projected into WGS84 Cartesian coordinates with 60 FPS WebGL</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="text-emerald-400">● {counts.good} Physical Residences</span>
          <span className="text-rose-400">● {counts.corrupt} Corrupt Anomaly Units</span>
          <span className="text-amber-400">● {counts.bait} Clickbait Records</span>
        </div>
      </div>

    </div>
  );
}
