import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
  Building2, ShieldAlert, Flame, CheckCircle2, RotateCw, 
  ZoomIn, ZoomOut, Compass, Eye, Filter, Info, AlertTriangle, 
  Maximize2, Play, Pause, Sparkles, MapPin, Globe, Layers, Navigation
} from 'lucide-react';
import { API, formatINR, formatCrores } from '../services/api';

// Micro-market zones in Bangalore
const DISTRICTS = [
  { id: 'bellandur', name: 'Bellandur', subtitle: '★ ASSIGNED LOCALITY · TECH CORRIDOR', center: { x: 0, z: 0 }, color: 0x0018a8, isAssigned: true },
  { id: 'hsr', name: 'HSR Layout', subtitle: 'RESIDENTIAL HUB', center: { x: -28, z: 18 }, color: 0x0284c7 },
  { id: 'koramangala', name: 'Koramangala', subtitle: 'STARTUP & COMMERCIAL', center: { x: -28, z: -18 }, color: 0x6366f1 },
  { id: 'indiranagar', name: 'Indiranagar', subtitle: 'PRIME CENTRAL', center: { x: -6, z: -32 }, color: 0x8b5cf6 },
  { id: 'whitefield', name: 'Whitefield', subtitle: 'IT EXPORT ZONE', center: { x: 34, z: -12 }, color: 0x06b6d4 },
  { id: 'electronic city', name: 'Electronic City', subtitle: 'SOUTH TECH CLUSTER', center: { x: 12, z: 34 }, color: 0x0ea5e9 },
  { id: 'arctic', name: 'Arctic Anomaly', subtitle: '⚠ SWAPPED GPS ANOMALY (LAT > 50°)', center: { x: -42, z: -42 }, color: 0xe11d48, isAnomaly: true }
];

// Helper to create glowing text sprites for clear locality labels
function createTextSprite(text, subtext = '', isHighlight = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Background rounded pill
  ctx.fillStyle = isHighlight ? 'rgba(0, 24, 168, 0.85)' : 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = isHighlight ? '#38bdf8' : '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, 24);
  ctx.fill();
  ctx.stroke();

  // Main text
  ctx.font = 'bold 38px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, subtext ? 48 : 64);

  // Subtitle
  if (subtext) {
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.fillStyle = isHighlight ? '#93c5fd' : '#94a3b8';
    ctx.fillText(subtext, 256, 88);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(16, 4, 1);
  return sprite;
}

export default function ThreeBuildingMap() {
  const mountRef = useRef(null);
  const telemetryRef = useRef(null);
  
  // Data state
  const [allListings, setAllListings] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Filter and View States
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'good', 'corrupt', 'bait'
  const [localityFilter, setLocalityFilter] = useState('all'); // 'all', 'bellandur', 'hsr', 'whitefield', etc.
  const [corruptSubType, setCorruptSubType] = useState('all');
  const [viewMode, setViewMode] = useState('3d'); // '3d' or '2d'
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // Interaction & HUD
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Three.js Core Refs (persist across re-renders to prevent pausing/teardown)
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const buildingsMapRef = useRef(new Map());
  const animationFrameIdRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2(999, 999));
  const raycasterRef = useRef(new THREE.Raycaster());
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraRotationRef = useRef({ theta: 0.75, phi: 0.65, radius: 56 });
  const autoRotateRef = useRef(true);
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAtRef = useRef(new THREE.Vector3(0, 0, 0));

  // Sync autoRotateRef with state
  useEffect(() => {
    autoRotateRef.current = isAutoRotating;
  }, [isAutoRotating]);

  // 1. Fetch and Organize Real Listings into Clear Spaced Districts
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

        // Classify every listing
        const classified = listings.map(l => {
          const id = l.listing_id;
          const isCorrupt = corruptIdsSet.has(id) || l.is_corrupt;
          const isBait = baitIdsSet.has(id) || (l.price > 0 && l.price <= 500);

          let corruptType = null;
          let anomalyReason = null;

          if (isCorrupt) {
            if (l.latitude > 50) {
              corruptType = 'swapped';
              anomalyReason = `Arctic GPS Anomaly: Lat ${l.latitude}°N, Lng ${l.longitude}°E (Swapped with Bangalore)`;
            } else if (l.price < 0) {
              corruptType = 'negative';
              anomalyReason = `Negative Sale Price: ${formatINR(l.price)} (Physical Impossibility)`;
            } else if (l.total_floors > 0 && l.floor > l.total_floors) {
              corruptType = 'floor';
              anomalyReason = `Floor Paradox: Floor ${l.floor} of ${l.total_floors} building floors`;
            } else if (l.carpet_area > l.super_built_up_area && l.super_built_up_area > 0) {
              corruptType = 'carpet';
              anomalyReason = `Area Anomaly: Carpet Area (${l.carpet_area} sqft) > SBUA (${l.super_built_up_area} sqft)`;
            } else if (l.bedroom <= 0) {
              corruptType = 'zerobhk';
              anomalyReason = `Unit Paradox: 0-BHK listing with residential classification`;
            } else {
              corruptType = 'generic';
              anomalyReason = 'Physical integrity data corruption identified in forensic audit';
            }
          } else if (isBait) {
            anomalyReason = `Fraudulent Clickbait: Artificial ${formatINR(l.price)} price to manipulate ranking`;
          }

          return {
            ...l,
            status: isCorrupt ? 'corrupt' : (isBait ? 'bait' : 'good'),
            corruptType,
            anomalyReason
          };
        });

        // 2. Unclutter by organizing into clean physical complexes and districts
        // 100% of all 40 corrupt listings
        const corrupts = classified.filter(l => l.status === 'corrupt');
        // 100% of all 8 bait listings
        const baits = classified.filter(l => l.status === 'bait');
        
        // Clean Bellandur listings: group by complex to avoid multiple overlapping units at identical GPS
        const bellandurRaw = classified.filter(l => l.status === 'good' && (l.locality || '').toLowerCase().includes('bellandur'));
        const bellandurComplexes = new Map();
        bellandurRaw.forEach(l => {
          const key = (l.apartment_name || l.listing_id).toLowerCase().trim();
          if (!bellandurComplexes.has(key)) {
            bellandurComplexes.set(key, { ...l, unitsInComplex: 1 });
          } else {
            bellandurComplexes.get(key).unitsInComplex += 1;
          }
        });
        const bellandurClean = Array.from(bellandurComplexes.values()).slice(0, 36);

        // Other micro-markets (HSR, Koramangala, Whitefield, Indiranagar, Electronic City)
        const otherLocalities = ['hsr', 'koramangala', 'whitefield', 'indiranagar', 'electronic city'];
        const otherClean = [];
        otherLocalities.forEach(loc => {
          const locList = classified.filter(l => l.status === 'good' && (l.locality || '').toLowerCase().includes(loc));
          const locComplexes = new Map();
          locList.forEach(l => {
            const key = (l.apartment_name || l.listing_id).toLowerCase().trim();
            if (!locComplexes.has(key)) {
              locComplexes.set(key, { ...l, unitsInComplex: 1 });
            }
          });
          otherClean.push(...Array.from(locComplexes.values()).slice(0, 12));
        });

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

  // 2. Build Spatially Distinct 3D Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container || allListings.length === 0) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // A. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060c18); // Deep Cyber Geospatial Slate
    scene.fog = new THREE.FogExp2(0x060c18, 0.009);
    sceneRef.current = scene;

    // B. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500);
    const updateCameraPos = () => {
      const { theta, phi, radius } = cameraRotationRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.cos(theta) + currentLookAtRef.current.x;
      camera.position.y = radius * Math.cos(phi) + currentLookAtRef.current.y;
      camera.position.z = radius * Math.sin(phi) * Math.sin(theta) + currentLookAtRef.current.z;
      camera.lookAt(currentLookAtRef.current);
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

    // D. Lights
    const ambientLight = new THREE.AmbientLight(0x2a3854, 3.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(40, 70, 30);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // High-tech Blue & Cyan Accent Lights
    const bellandurLight = new THREE.PointLight(0x0018a8, 9, 70);
    bellandurLight.position.set(0, 16, 0);
    scene.add(bellandurLight);

    // E. Base Ground Grid & Wide Transit Avenues
    const mapGrid = new THREE.GridHelper(120, 40, 0x0044bb, 0x0f223d);
    mapGrid.position.y = -0.05;
    scene.add(mapGrid);

    // Arterial Outer Ring Road (ORR) Highway passing through Bellandur
    const orrPts = [
      new THREE.Vector3(-45, 0.05, 20),
      new THREE.Vector3(-28, 0.05, 18), // HSR
      new THREE.Vector3(-14, 0.05, 8),
      new THREE.Vector3(0, 0.05, 0),     // Bellandur Center
      new THREE.Vector3(18, 0.05, -6),
      new THREE.Vector3(34, 0.05, -12),  // Whitefield
      new THREE.Vector3(50, 0.05, -18)
    ];
    const orrCurve = new THREE.CatmullRomCurve3(orrPts);
    const orrGeom = new THREE.TubeGeometry(orrCurve, 64, 1.4, 8, false);
    const orrMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      emissive: 0x0a192f,
      roughness: 0.3
    });
    const orrRoad = new THREE.Mesh(orrGeom, orrMat);
    scene.add(orrRoad);

    // Glowing center lane for ORR
    const orrLineGeom = new THREE.BufferGeometry().setFromPoints(orrCurve.getPoints(100));
    const orrLineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    const orrLine = new THREE.Line(orrLineGeom, orrLineMat);
    orrLine.position.y += 0.8;
    scene.add(orrLine);

    // Sarjapur Cross Arterial Road
    const sarjapurPts = [
      new THREE.Vector3(0, 0.05, -35),
      new THREE.Vector3(0, 0.05, 0),     // Intersection at Bellandur
      new THREE.Vector3(12, 0.05, 34)    // Towards Electronic City
    ];
    const sarjCurve = new THREE.CatmullRomCurve3(sarjapurPts);
    const sarjGeom = new THREE.TubeGeometry(sarjCurve, 32, 1.1, 8, false);
    const sarjRoad = new THREE.Mesh(sarjGeom, orrMat);
    scene.add(sarjRoad);

    // F. Bellandur Lake 3D Waterbody
    const lakeGeom = new THREE.CylinderGeometry(8.5, 10.0, 0.2, 32);
    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.75
    });
    const lakeMesh = new THREE.Mesh(lakeGeom, lakeMat);
    lakeMesh.position.set(10, 0.08, -12); // Bellandur Lake position
    scene.add(lakeMesh);

    // G. Create District Ground Platforms and Floating 3D Text Billboards
    DISTRICTS.forEach(dist => {
      // Elevated District Boundary Platform
      const isBell = dist.isAssigned;
      const radius = isBell ? 14 : (dist.isAnomaly ? 10 : 10);
      const platGeom = new THREE.CylinderGeometry(radius, radius + 1, 0.15, 32);
      const platMat = new THREE.MeshStandardMaterial({
        color: isBell ? 0x0018a8 : (dist.isAnomaly ? 0x881337 : 0x0f172a),
        emissive: isBell ? 0x020d59 : (dist.isAnomaly ? 0x4c0519 : 0x070d1a),
        transparent: true,
        opacity: isBell ? 0.85 : 0.65,
        roughness: 0.4
      });
      const plat = new THREE.Mesh(platGeom, platMat);
      plat.position.set(dist.center.x, 0.02, dist.center.z);
      scene.add(plat);

      // Glowing Perimeter Ring
      const ringGeom = new THREE.RingGeometry(radius, radius + 0.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isBell ? 0x00f0ff : (dist.isAnomaly ? 0xf43f5e : 0x38bdf8),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(dist.center.x, 0.12, dist.center.z);
      scene.add(ring);

      // 3D Floating Locality Billboard Label
      const labelSprite = createTextSprite(dist.name, dist.subtitle, isBell);
      labelSprite.position.set(dist.center.x, 9.5, dist.center.z);
      scene.add(labelSprite);
    });

    // H. Place Uncluttered Buildings on Spacious Street Plots
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);
    const buildingMeshes = [];
    buildingsMapRef.current.clear();

    // Organize items into district buckets
    const districtBuckets = {
      'bellandur': [],
      'hsr': [],
      'koramangala': [],
      'whitefield': [],
      'indiranagar': [],
      'electronic city': [],
      'arctic': []
    };

    allListings.forEach(item => {
      if (item.corruptType === 'swapped') {
        districtBuckets['arctic'].push(item);
      } else {
        const loc = (item.locality || '').toLowerCase();
        if (loc.includes('bellandur')) districtBuckets['bellandur'].push(item);
        else if (loc.includes('hsr')) districtBuckets['hsr'].push(item);
        else if (loc.includes('koramangala')) districtBuckets['koramangala'].push(item);
        else if (loc.includes('whitefield')) districtBuckets['whitefield'].push(item);
        else if (loc.includes('indiranagar')) districtBuckets['indiranagar'].push(item);
        else if (loc.includes('electronic city')) districtBuckets['electronic city'].push(item);
        else districtBuckets['bellandur'].push(item); // default to bellandur corridor
      }
    });

    // For each district bucket, lay out buildings in a neat, spacious street grid (spacing 4.8 units!)
    Object.entries(districtBuckets).forEach(([distId, items]) => {
      const distInfo = DISTRICTS.find(d => d.id === distId) || DISTRICTS[0];
      const cx = distInfo.center.x;
      const cz = distInfo.center.z;

      const cols = distId === 'bellandur' ? 5 : (distId === 'arctic' ? 3 : 3);
      const spacing = 4.6; // Spacious distance between buildings: NO OVERLAPPING!

      items.forEach((item, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);

        // Position offset from district center
        const posX = cx + (col - (cols - 1) / 2) * spacing;
        const posZ = cz + (row - 1.5) * spacing;

        const floors = item.total_floors || item.floor || 14;
        let bHeight = 2.5 + Math.min(floors, 30) * 0.22;
        const bWidth = 2.4;
        const bDepth = 2.4;

        let baseColor = 0x1e3a8a; // Clean Deep Royal Blue
        let baseEmissive = 0x051a59;
        let wireColor = 0x60a5fa;
        let spireColor = 0x10b981; // Emerald verified tip

        if (item.status === 'corrupt') {
          baseColor = 0xbe123c; // Crimson Red
          baseEmissive = 0x4c0519;
          wireColor = 0xf43f5e;
          spireColor = 0xff0055; // Red warning spire
          bHeight += 1.5;
        } else if (item.status === 'bait') {
          baseColor = 0xb45309; // Amber Warning
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
          opacity: 0.94
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(posX, bHeight / 2 + 0.1, posZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Architectural Clean Glass Wireframe
        const edgesGeom = new THREE.EdgesGeometry(geom);
        const wireMat = new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0.85 });
        const wireframe = new THREE.LineSegments(edgesGeom, wireMat);
        mesh.add(wireframe);

        // Rooftop Anomaly Beacon Spire
        const beaconGeom = new THREE.CylinderGeometry(0.1, 0.25, 1.4, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: spireColor });
        const beacon = new THREE.Mesh(beaconGeom, beaconMat);
        beacon.position.set(0, bHeight / 2 + 0.7, 0);
        mesh.add(beacon);

        // Pulsing Rings for Corrupt and Bait
        let pulseRing = null;
        if (item.status === 'corrupt' || item.status === 'bait') {
          const ringGeom = new THREE.RingGeometry(1.4, 1.8, 16);
          const ringMat = new THREE.MeshBasicMaterial({ 
            color: spireColor, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 0.8 
          });
          pulseRing = new THREE.Mesh(ringGeom, ringMat);
          pulseRing.rotation.x = -Math.PI / 2;
          pulseRing.position.set(0, bHeight / 2 + 1.2, 0);
          mesh.add(pulseRing);
        }

        // If Swapped Lat/Lng in Arctic, laser tether to Bellandur
        let tetherLine = null;
        if (item.corruptType === 'swapped') {
          const lineGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(posX, bHeight + 1.2, posZ),
            new THREE.Vector3(0, 3.5, 0)
          ]);
          const lineMat = new THREE.LineDashedMaterial({
            color: 0xff0055,
            dashSize: 1.5,
            gapSize: 0.8,
            transparent: true,
            opacity: 0.75
          });
          tetherLine = new THREE.Line(lineGeom, lineMat);
          tetherLine.computeLineDistances();
          scene.add(tetherLine);
        }

        mesh.userData = {
          item: item,
          originalY: bHeight / 2 + 0.1,
          height: bHeight,
          status: item.status,
          corruptType: item.corruptType,
          district: distId,
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
    });

    // I. Mouse & Drag Interaction (CONTINUOUS ROTATION: NEVER STOPS ON HOVER!)
    const handleMouseDown = (e) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / width) * 2 - 1;
      const y = -((e.clientY - rect.top) / height) * 2 + 1;
      mouseRef.current.set(x, y);

      // Direct DOM update for GPS telemetry (Zero React re-render overhead!)
      if (telemetryRef.current) {
        const approxLat = (12.9304 - (y * 0.06)).toFixed(4);
        const approxLng = (77.6784 + (x * 0.06)).toFixed(4);
        telemetryRef.current.innerHTML = `LAT: <strong class="text-blue-400">${approxLat}° N</strong> &nbsp; LNG: <strong class="text-blue-400">${approxLng}° E</strong>`;
      }

      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;

        cameraRotationRef.current.theta -= deltaX * 0.006;
        cameraRotationRef.current.phi = Math.max(
          0.15, 
          Math.min(Math.PI / 2.05, cameraRotationRef.current.phi - deltaY * 0.006)
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
      cameraRotationRef.current.radius = Math.max(16, Math.min(95, cameraRotationRef.current.radius + e.deltaY * 0.04));
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

    // J. Main 60 FPS Animation Loop (Smooth Rotation Continues on Hover!)
    let clock = new THREE.Clock();
    let lastHovered = null;

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation towards targetLookAt
      currentLookAtRef.current.lerp(targetLookAtRef.current, 0.05);

      // Continuous rotation: Rotates smoothly EVEN WHILE HOVERING!
      // Only temporarily suspended during physical mouse drag
      if (autoRotateRef.current && !isDraggingRef.current) {
        cameraRotationRef.current.theta += 0.0018;
      }
      updateCameraPos();

      // Animate pulsing rings on anomalies
      buildingMeshes.forEach(mesh => {
        if (mesh.userData.pulseRing) {
          const s = 1.0 + Math.sin(elapsedTime * 4.5 + mesh.position.x) * 0.35;
          mesh.userData.pulseRing.scale.set(s, s, s);
          mesh.userData.pulseRing.material.opacity = 0.3 + Math.cos(elapsedTime * 4.5) * 0.4;
        }
      });

      // Hover Raycasting: Highlights building without interrupting rotation or re-rendering whole scene
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
          target.position.y = target.userData.originalY + 0.9; // Subtle lift on hover
          target.material.emissive.setHex(0x38bdf8); // Bright cyan highlight
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
  }, [allListings]);

  // 3. Filter Application (Updates building visibility without re-creating scene)
  useEffect(() => {
    buildingsMapRef.current.forEach((mesh) => {
      const { status, corruptType, district, locality, mat, baseColor, baseEmissive, tetherLine } = mesh.userData;

      const matchStatus = statusFilter === 'all' || statusFilter === status;
      const matchLocality = localityFilter === 'all' || district.includes(localityFilter.toLowerCase()) || locality.includes(localityFilter.toLowerCase());
      const matchSubtype = statusFilter !== 'corrupt' || corruptSubType === 'all' || corruptType === corruptSubType;

      const isVisible = matchStatus && matchLocality && matchSubtype;

      if (isVisible) {
        mesh.visible = true;
        mat.opacity = 0.94;
        mat.color.setHex(baseColor);
        mat.emissive.setHex(baseEmissive);
        if (tetherLine) tetherLine.visible = true;
      } else {
        // Ghost wireframe for non-matching buildings: keeps geospatial context without clutter!
        mat.opacity = 0.06;
        mat.color.setHex(0x1e293b);
        mat.emissive.setHex(0x020617);
        if (tetherLine) tetherLine.visible = false;
      }
    });
  }, [statusFilter, localityFilter, corruptSubType]);

  // 4. Smooth Camera Focus Functions
  const focusDistrict = (distId) => {
    setLocalityFilter(distId);
    const dist = DISTRICTS.find(d => d.id === distId);
    if (dist && cameraRef.current) {
      targetLookAtRef.current.set(dist.center.x, 0, dist.center.z);
      cameraRotationRef.current.radius = dist.isAssigned ? 32 : 36;
      cameraRotationRef.current.phi = 0.58;
    }
  };

  const focusAllBangalore = () => {
    setLocalityFilter('all');
    setStatusFilter('all');
    targetLookAtRef.current.set(0, 0, 0);
    cameraRotationRef.current.radius = 62;
    cameraRotationRef.current.phi = 0.65;
  };

  const focusCorruptAnomalies = () => {
    setStatusFilter('corrupt');
    setCorruptSubType('all');
    targetLookAtRef.current.set(-15, 0, -10);
    cameraRotationRef.current.radius = 42;
    cameraRotationRef.current.phi = 0.60;
  };

  const handleZoom = (delta) => {
    cameraRotationRef.current.radius = Math.max(16, Math.min(95, cameraRotationRef.current.radius + delta));
  };

  const activeInspection = selectedBuilding || hoveredBuilding;

  // Counts summary
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
      
      {/* 1. Header Toolbar */}
      <div className="p-4 sm:p-5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Bangalore & Bellandur 3D Micro-Market Map
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  Uncluttered District Plots
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Spaced building complexes arranged across Outer Ring Road, Bellandur Lake, and micro-market hubs.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Camera Jump District Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Focus Bellandur (Assigned Locality) */}
          <button
            onClick={() => focusDistrict('bellandur')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              localityFilter === 'bellandur'
                ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                : 'bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border-blue-800/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>★ Focus Bellandur</span>
          </button>

          {/* View All Bangalore */}
          <button
            onClick={focusAllBangalore}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              localityFilter === 'all' && statusFilter === 'all'
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>All Micro-Markets</span>
          </button>

          {/* Focus Corrupt Anomalies */}
          <button
            onClick={focusCorruptAnomalies}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              statusFilter === 'corrupt'
                ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Corrupt (40 IDs)</span>
          </button>

          {/* Focus Arctic Swapped Outpost */}
          <button
            onClick={() => focusDistrict('arctic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              localityFilter === 'arctic'
                ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60'
            }`}
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
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Clean & Anomaly Buildings ({counts.total})
          </button>

          <button
            onClick={() => setStatusFilter('good')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
              statusFilter === 'good'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Physical Complexes</span>
          </button>

          <button
            onClick={() => setStatusFilter('corrupt')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
              statusFilter === 'corrupt'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Corrupted Listings (40 IDs)</span>
          </button>

          <button
            onClick={() => setStatusFilter('bait')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
              statusFilter === 'bait'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Bait Listings (8 IDs)</span>
          </button>
        </div>

        {/* Locality Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">Select District:</span>
          <select
            value={localityFilter}
            onChange={(e) => focusDistrict(e.target.value)}
            className="bg-slate-950 text-white font-bold border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Bangalore Micro-Markets</option>
            <option value="bellandur">★ Bellandur (Assigned Locality)</option>
            <option value="hsr">HSR Layout (Southwest)</option>
            <option value="koramangala">Koramangala (Commercial)</option>
            <option value="whitefield">Whitefield (IT Corridor)</option>
            <option value="indiranagar">Indiranagar (Central)</option>
            <option value="electronic city">Electronic City (South)</option>
            <option value="arctic">Arctic Anomaly Outpost (Lat &gt; 50°)</option>
          </select>
        </div>
      </div>

      {/* 3. Corrupt Sub-Category Filter */}
      {statusFilter === 'corrupt' && (
        <div className="px-4 py-2 bg-rose-950/30 border-b border-rose-900/40 flex flex-wrap items-center gap-2 text-xs animate-in fade-in duration-150">
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                corruptSubType === sub.key
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 border border-rose-800/70'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* 4. Main 3D WebGL Canvas Viewport */}
      <div className="relative w-full h-[600px]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Loading Spinner */}
        {loadingData && (
          <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-300">Generating uncluttered micro-market district plots...</p>
            </div>
          </div>
        )}

        {/* Floating Controls Overlay (Top Left) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
          <div className="bg-slate-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 flex flex-col gap-1.5 shadow-2xl">
            {/* Auto Rotate Toggle (Continues on hover!) */}
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              title={isAutoRotating ? "Pause Continuous Orbit" : "Resume Continuous Orbit"}
              className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                isAutoRotating ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {isAutoRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Reset Camera to Bellandur Core */}
            <button
              onClick={() => focusDistrict('bellandur')}
              title="Reset View to Bellandur Center"
              className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Zoom Controls */}
            <button
              onClick={() => handleZoom(-8)}
              title="Zoom In"
              className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(8)}
              title="Zoom Out"
              className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live GPS Telemetry Readout (Bottom Left) */}
        <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 text-xs flex flex-col gap-0.5 shadow-2xl font-mono">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            <Globe className="w-3 h-3 text-blue-400" />
            <span>Bangalore Spatial Coordinates</span>
          </div>
          <div ref={telemetryRef} className="text-slate-200 text-[11px]">
            LAT: <strong className="text-blue-400">12.9304° N</strong> &nbsp; LNG: <strong className="text-blue-400">77.6784° E</strong>
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
                {activeInspection.status === 'good' ? 'Physical Complex' :
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

            {/* Price & Floor Details Grid */}
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
                {activeInspection.anomalyReason || `Audited physical complex with verified structural integrity (${activeInspection.unitsInComplex || 1} verified units in complex). Verified live listing.`}
              </p>
            </div>

            {/* Lock / Dismiss Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2.5">
              <span>Click building to lock card</span>
              {selectedBuilding && (
                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                >
                  Clear Lock
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
          <span>Uncluttered District Plots: Continuous 60 FPS rotation • Wide street avenues • 3D locality billboards</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="text-emerald-400">● Clean Complexes</span>
          <span className="text-rose-400">● 40 Corrupt Towers</span>
          <span className="text-amber-400">● 8 Bait Spires</span>
        </div>
      </div>

    </div>
  );
}
