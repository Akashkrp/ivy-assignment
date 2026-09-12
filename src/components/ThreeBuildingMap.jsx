import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
  Building2, ShieldAlert, Flame, CheckCircle2, RotateCw, 
  ZoomIn, ZoomOut, Compass, Eye, Filter, Info, AlertTriangle, 
  Maximize2, Play, Pause, Sparkles
} from 'lucide-react';

// Real corrupt and bait IDs from submission.json
const CORRUPT_IDS = [
  { id: '100-1000035', reason: 'Negative Price: -₹8.46 Cr', type: 'corrupt', category: 'Negative Price' },
  { id: '100-1000753', reason: 'Negative Price: -₹3.12 Cr', type: 'corrupt', category: 'Negative Price' },
  { id: '100-1001077', reason: 'Floor Paradox: Floor 18 of 10', type: 'corrupt', category: 'Floor > Total' },
  { id: '100-1001141', reason: 'Floor Paradox: Floor 24 of 12', type: 'corrupt', category: 'Floor > Total' },
  { id: '100-1002346', reason: 'Area Anomaly: Carpet > Super Built-up', type: 'corrupt', category: 'Carpet > SBUA' },
  { id: '100-1002442', reason: 'Arctic Coords: Lat 77.67, Lng 12.92 (Swapped)', type: 'corrupt', category: 'Swapped Lat/Lng' },
  { id: '100-1002512', reason: 'Zero Room: 0-BHK Luxury Flat', type: 'corrupt', category: '0-BHK' },
  { id: '100-1002600', reason: 'Negative Price: -₹1.85 Cr', type: 'corrupt', category: 'Negative Price' },
  { id: '100-1002884', reason: 'Floor Paradox: Floor 30 of 14', type: 'corrupt', category: 'Floor > Total' },
  { id: '100-1003117', reason: 'Arctic Coords: Swapped Coordinates', type: 'corrupt', category: 'Swapped Lat/Lng' },
  { id: '100-1003624', reason: 'Zero Room: 0-BHK Unit', type: 'corrupt', category: '0-BHK' },
  { id: 'DWE-1000614', reason: 'Negative Price: -₹2.40 Cr', type: 'corrupt', category: 'Negative Price' },
  { id: 'DWE-1001165', reason: 'Floor Paradox: Floor 15 of 8', type: 'corrupt', category: 'Floor > Total' },
  { id: 'DWE-1001183', reason: 'Floor Paradox: Floor 22 of 11', type: 'corrupt', category: 'Floor > Total' },
  { id: 'DWE-1001909', reason: 'Area Anomaly: Carpet > Super Built-up', type: 'corrupt', category: 'Carpet > SBUA' },
  { id: 'DWE-1002892', reason: 'Arctic Coords: Lat 77.68, Lng 12.93', type: 'corrupt', category: 'Swapped Lat/Lng' },
  { id: 'DWE-1003673', reason: 'Zero Room: 0-BHK Listing', type: 'corrupt', category: '0-BHK' },
  { id: 'MAG-1000179', reason: 'Negative Price: -₹4.10 Cr', type: 'corrupt', category: 'Negative Price' },
  { id: 'MAG-1000885', reason: 'Floor Paradox: Floor 19 of 9', type: 'corrupt', category: 'Floor > Total' },
  { id: 'MAG-1002362', reason: 'Area Anomaly: Carpet > Super Built-up', type: 'corrupt', category: 'Carpet > SBUA' },
  { id: 'MAG-1003269', reason: 'Arctic Coords: Swapped Lat/Lng', type: 'corrupt', category: 'Swapped Lat/Lng' },
  { id: 'MAG-1003510', reason: 'Zero Room: 0-BHK Listing', type: 'corrupt', category: '0-BHK' },
  { id: 'SQU-1000394', reason: 'Negative Price: -₹1.95 Cr', type: 'corrupt', category: 'Negative Price' },
  { id: 'SQU-1000979', reason: 'Floor Paradox: Floor 27 of 15', type: 'corrupt', category: 'Floor > Total' },
  { id: 'SQU-1002298', reason: 'Area Anomaly: Carpet > Super Built-up', type: 'corrupt', category: 'Carpet > SBUA' },
  { id: 'SQU-1002843', reason: 'Arctic Coords: Swapped Coordinates', type: 'corrupt', category: 'Swapped Lat/Lng' },
  { id: 'SQU-1003177', reason: 'Zero Room: 0-BHK Listing', type: 'corrupt', category: '0-BHK' },
  { id: 'SQU-1003370', reason: 'Floor Paradox: Floor 16 of 9', type: 'corrupt', category: 'Floor > Total' },
  { id: 'ZER-1000260', reason: 'Negative Price: -₹5.20 Cr', type: 'corrupt', category: 'Negative Price' },
  { id: 'ZER-1000430', reason: 'Negative Price: -₹3.75 Cr', type: 'corrupt', category: 'Negative Price' },
  { id: 'ZER-1000500', reason: 'Negative Price: -₹1.50 Cr', type: 'corrupt', category: 'Negative Price' },
  { id: 'ZER-1001207', reason: 'Floor Paradox: Floor 21 of 10', type: 'corrupt', category: 'Floor > Total' },
  { id: 'ZER-1001249', reason: 'Floor Paradox: Floor 25 of 12', type: 'corrupt', category: 'Floor > Total' },
  { id: 'ZER-1001334', reason: 'Area Anomaly: Carpet > Super Built-up', type: 'corrupt', category: 'Carpet > SBUA' },
  { id: 'ZER-1002586', reason: 'Arctic Coords: Swapped Coordinates', type: 'corrupt', category: 'Swapped Lat/Lng' },
  { id: 'ZER-1002632', reason: 'Zero Room: 0-BHK Listing', type: 'corrupt', category: '0-BHK' },
  { id: 'ZER-1002667', reason: 'Floor Paradox: Floor 14 of 7', type: 'corrupt', category: 'Floor > Total' },
  { id: 'ZER-1002911', reason: 'Arctic Coords: Swapped Coordinates', type: 'corrupt', category: 'Swapped Lat/Lng' },
  { id: 'ZER-1003426', reason: 'Area Anomaly: Carpet > Super Built-up', type: 'corrupt', category: 'Carpet > SBUA' },
  { id: 'ZER-1003603', reason: 'Zero Room: 0-BHK Listing', type: 'corrupt', category: '0-BHK' }
];

const BAIT_IDS = [
  { id: '100-1002501', reason: 'Price ₹100 INR clickbait trap', type: 'bait', price: '₹100' },
  { id: 'DWE-1002631', reason: 'Price ₹200 INR duplicate broker trap', type: 'bait', price: '₹200' },
  { id: 'DWE-1003102', reason: 'Price ₹250 INR sorting rank exploit', type: 'bait', price: '₹250' },
  { id: 'MAG-1003492', reason: 'Price ₹300 INR prime 3BHK fake rate', type: 'bait', price: '₹300' },
  { id: 'SQU-1001431', reason: 'Price ₹350 INR enquiry funnel', type: 'bait', price: '₹350' },
  { id: 'SQU-1003524', reason: 'Price ₹400 INR fraudulent lead capture', type: 'bait', price: '₹400' },
  { id: 'ZER-1003652', reason: 'Price ₹450 INR zero-brokerage spoof', type: 'bait', price: '₹450' },
  { id: 'ZER-1003813', reason: 'Price ₹500 INR fake listing price', type: 'bait', price: '₹500' }
];

const GOOD_BUILDINGS = [
  { id: 'IVY-BLR-01', name: 'Sobha Silicon Oasis', locality: 'Bellandur', floors: 16, units: 84, rate: '₹10,400/sqft', type: 'good' },
  { id: 'IVY-BLR-02', name: 'Assetz Marq Phase II', locality: 'Bellandur ORR', floors: 22, units: 110, rate: '₹11,200/sqft', type: 'good' },
  { id: 'IVY-BLR-03', name: 'Prestige Tech Vista', locality: 'Bellandur', floors: 14, units: 62, rate: '₹12,800/sqft', type: 'good' },
  { id: 'IVY-BLR-04', name: 'Divyasree 77 East', locality: 'Bellandur Lake Rd', floors: 18, units: 95, rate: '₹13,500/sqft', type: 'good' },
  { id: 'IVY-BLR-05', name: 'Brigade Tech Gardens Res', locality: 'Outer Ring Road', floors: 24, units: 140, rate: '₹9,800/sqft', type: 'good' },
  { id: 'IVY-BLR-06', name: 'Rohan Jharoka', locality: 'Bellandur', floors: 12, units: 76, rate: '₹9,200/sqft', type: 'good' },
  { id: 'IVY-BLR-07', name: 'Salarpuria Sattva Greenage', locality: 'Bellandur Junction', floors: 20, units: 120, rate: '₹10,600/sqft', type: 'good' },
  { id: 'IVY-BLR-08', name: 'Godrej Air Bellandur', locality: 'Bellandur', floors: 17, units: 90, rate: '₹11,900/sqft', type: 'good' },
  { id: 'IVY-BLR-09', name: 'Puravankara Windermere', locality: 'Bellandur', floors: 15, units: 70, rate: '₹9,600/sqft', type: 'good' },
  { id: 'IVY-BLR-10', name: 'Total Environment Windmills', locality: 'Bellandur ORR', floors: 19, units: 88, rate: '₹15,200/sqft', type: 'good' },
  { id: 'IVY-BLR-11', name: 'Adarsh Palm Retreat', locality: 'Bellandur', floors: 14, units: 68, rate: '₹12,100/sqft', type: 'good' },
  { id: 'IVY-BLR-12', name: 'Embassy Pristine Heights', locality: 'Bellandur Lake Front', floors: 21, units: 104, rate: '₹13,900/sqft', type: 'good' },
  { id: 'IVY-BLR-13', name: 'DSR Waterscape', locality: 'Bellandur Outer Ring', floors: 13, units: 58, rate: '₹8,900/sqft', type: 'good' },
  { id: 'IVY-BLR-14', name: 'Vaswani Whispering Palms', locality: 'Bellandur', floors: 16, units: 80, rate: '₹10,100/sqft', type: 'good' },
  { id: 'IVY-BLR-15', name: 'Mantri Espana Bellandur', locality: 'Outer Ring Road', floors: 25, units: 160, rate: '₹11,500/sqft', type: 'good' },
  { id: 'IVY-BLR-16', name: 'Bren Palms Residency', locality: 'Bellandur', floors: 11, units: 54, rate: '₹8,700/sqft', type: 'good' },
  { id: 'IVY-BLR-17', name: 'Mahaveer Cypress', locality: 'Bellandur Extn', floors: 14, units: 64, rate: '₹8,400/sqft', type: 'good' },
  { id: 'IVY-BLR-18', name: 'SJR Watermark Bellandur', locality: 'Bellandur Lake', floors: 18, units: 92, rate: '₹9,700/sqft', type: 'good' },
  { id: 'IVY-BLR-19', name: 'Sterling Terraces', locality: 'Bellandur ORR', floors: 15, units: 75, rate: '₹10,800/sqft', type: 'good' },
  { id: 'IVY-BLR-20', name: 'Sobha Hibiscus', locality: 'Bellandur Green', floors: 17, units: 85, rate: '₹11,000/sqft', type: 'good' },
  { id: 'IVY-BLR-21', name: 'Prestige Sunnyside', locality: 'Bellandur ORR', floors: 23, units: 130, rate: '₹12,400/sqft', type: 'good' },
  { id: 'IVY-BLR-22', name: 'Assetz Earth & Essence', locality: 'Bellandur', floors: 16, units: 82, rate: '₹11,800/sqft', type: 'good' }
];

export default function ThreeBuildingMap() {
  const mountRef = useRef(null);
  const [filter, setFilter] = useState('all'); // 'all', 'good', 'corrupt', 'bait'
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [buildingCount, setBuildingCount] = useState({ total: 70, good: 22, corrupt: 40, bait: 8 });

  // References for animation and raycasting
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const buildingsMapRef = useRef(new Map());
  const animationFrameIdRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2(999, 999));
  const raycasterRef = useRef(new THREE.Raycaster());
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraRotationRef = useRef({ theta: 0.8, phi: 0.7, radius: 46 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060c18); // High-contrast deep cyber slate
    scene.fog = new THREE.FogExp2(0x060c18, 0.016);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const updateCameraPos = () => {
      const { theta, phi, radius } = cameraRotationRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(0, 2, 0);
    };
    updateCameraPos();
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0x2d3748, 2.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(25, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Subtle blue and cyan point lights for high-tech micro-market feeling
    const bluePoint = new THREE.PointLight(0x0018a8, 6, 60);
    bluePoint.position.set(-15, 12, -15);
    scene.add(bluePoint);

    const cyanPoint = new THREE.PointLight(0x00f0ff, 4, 50);
    cyanPoint.position.set(15, 8, 15);
    scene.add(cyanPoint);

    // 5. Terrain Grid & Road Network
    const gridHelper = new THREE.GridHelper(60, 30, 0x0055ff, 0x112244);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Outer Ring Road arterial axis (Glowing transit spine)
    const orrGeom = new THREE.PlaneGeometry(60, 2.2);
    const orrMat = new THREE.MeshBasicMaterial({ 
      color: 0x002266, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const orrRoad = new THREE.Mesh(orrGeom, orrMat);
    orrRoad.rotation.x = -Math.PI / 2;
    orrRoad.position.set(0, 0.02, 0);
    scene.add(orrRoad);

    // Center divider strip
    const dividerGeom = new THREE.PlaneGeometry(60, 0.15);
    const dividerMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide });
    const divider = new THREE.Mesh(dividerGeom, dividerMat);
    divider.rotation.x = -Math.PI / 2;
    divider.position.set(0, 0.03, 0);
    scene.add(divider);

    // Cross arterial road (Sarjapur / Bellandur Gate)
    const crossGeom = new THREE.PlaneGeometry(2.0, 60);
    const crossRoad = new THREE.Mesh(crossGeom, orrMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.set(0, 0.02, 0);
    scene.add(crossRoad);

    // 6. Floating Particles (Data Streams)
    const particleCount = 200;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 50;
      particlePositions[i + 1] = Math.random() * 15 + 2;
      particlePositions[i + 2] = (Math.random() - 0.5) * 50;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.35,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // 7. Generate Buildings in Bellandur Grid
    // Total 70 buildings: 22 Good, 40 Corrupt, 8 Bait
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);
    const buildingMeshes = [];

    // Combine all list items
    const allItems = [
      ...GOOD_BUILDINGS.map(b => ({ ...b, status: 'good' })),
      ...CORRUPT_IDS.map(b => ({ ...b, name: `Anomaly ${b.id}`, locality: 'Bellandur Tech Zone', floors: 15, status: 'corrupt' })),
      ...BAIT_IDS.map(b => ({ ...b, name: `Clickbait ${b.id}`, locality: 'Bellandur Junction', floors: 8, status: 'bait' }))
    ];

    // Arrange in an 9x8 grid with road separations
    let index = 0;
    const cols = 9;
    const spacingX = 5.2;
    const spacingZ = 5.2;

    allItems.forEach((item) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      index++;

      // Offset position, skip road gaps
      let posX = (col - Math.floor(cols / 2)) * spacingX;
      let posZ = (row - 4) * spacingZ;
      if (Math.abs(posX) < 2) posX += posX >= 0 ? 2.5 : -2.5;
      if (Math.abs(posZ) < 2) posZ += posZ >= 0 ? 2.5 : -2.5;

      // Heights according to status and floors
      let bHeight = 3.5;
      let color = 0x2563eb; // Royal blue default for good
      let emissive = 0x0a2266;
      let spireColor = 0x3b82f6;

      if (item.status === 'good') {
        bHeight = 4.0 + (item.floors || 15) * 0.22;
        color = 0x1d4ed8; // Clean Royal Blue
        emissive = 0x05164d;
        spireColor = 0x10b981; // Emerald verified tip
      } else if (item.status === 'corrupt') {
        bHeight = 3.0 + Math.random() * 5.0;
        color = 0xe11d48; // Crimson Rose Anomaly
        emissive = 0x4c0519;
        spireColor = 0xff0055;
      } else if (item.status === 'bait') {
        bHeight = 2.5 + Math.random() * 3.0;
        color = 0xd97706; // Amber Warning Bait
        emissive = 0x451a03;
        spireColor = 0xf59e0b;
      }

      // Building Geometry
      const widthB = 2.2 + Math.random() * 0.8;
      const depthB = 2.2 + Math.random() * 0.8;
      const geom = new THREE.BoxGeometry(widthB, bHeight, depthB);
      
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: emissive,
        roughness: 0.35,
        metalness: 0.65,
        transparent: true,
        opacity: 0.92
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(posX, bHeight / 2, posZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Glass Edge Wireframe for architectural quality
      const edgesGeom = new THREE.EdgesGeometry(geom);
      const edgeColor = item.status === 'good' ? 0x60a5fa : (item.status === 'corrupt' ? 0xf43f5e : 0xfbbf24);
      const wireMat = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.75 });
      const wireframe = new THREE.LineSegments(edgesGeom, wireMat);
      mesh.add(wireframe);

      // Rooftop Beacon / Spire for anomalies & verified landmarks
      const beaconGeom = new THREE.CylinderGeometry(0.1, 0.25, 1.4, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: spireColor });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.set(0, bHeight / 2 + 0.7, 0);
      mesh.add(beacon);

      // Add flashing ring for corrupt and bait listings
      let pulseRing = null;
      if (item.status === 'corrupt' || item.status === 'bait') {
        const ringGeom = new THREE.RingGeometry(1.2, 1.5, 16);
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

      // Store metadata in mesh user data
      mesh.userData = {
        item: item,
        originalY: bHeight / 2,
        height: bHeight,
        status: item.status,
        mat: mat,
        pulseRing: pulseRing,
        baseColor: color,
        baseEmissive: emissive
      };

      buildingsGroup.add(mesh);
      buildingMeshes.push(mesh);
      buildingsMapRef.current.set(item.id, mesh);
    });

    // 8. Mouse & Drag Interaction
    const handleMouseDown = (e) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / width) * 2 - 1;
      const y = -((e.clientY - rect.top) / height) * 2 + 1;
      mouseRef.current.set(x, y);

      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;

        cameraRotationRef.current.theta -= deltaX * 0.008;
        cameraRotationRef.current.phi = Math.max(0.2, Math.min(Math.PI / 2.1, cameraRotationRef.current.phi - deltaY * 0.008));
        updateCameraPos();

        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      cameraRotationRef.current.radius = Math.max(18, Math.min(75, cameraRotationRef.current.radius + e.deltaY * 0.04));
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

    // 9. Main Animation Loop
    let clock = new THREE.Clock();
    let lastHovered = null;

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Auto Rotation
      if (autoRotate && !isDraggingRef.current) {
        cameraRotationRef.current.theta += 0.002;
        updateCameraPos();
      }

      // Particle subtle drifting
      particles.rotation.y = elapsedTime * 0.02;

      // Animate pulsing rings on anomalies
      buildingMeshes.forEach(mesh => {
        if (mesh.userData.pulseRing) {
          const s = 1.0 + Math.sin(elapsedTime * 4 + mesh.position.x) * 0.35;
          mesh.userData.pulseRing.scale.set(s, s, s);
          mesh.userData.pulseRing.material.opacity = 0.4 + Math.cos(elapsedTime * 4) * 0.4;
        }
      });

      // Raycasting for Hover Highlights
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
          target.position.y = target.userData.originalY + 0.8; // Lift on hover
          target.material.emissive.setHex(0x38bdf8); // Bright highlight
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

    // 10. Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
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
  }, []);

  // Update Building Filter Visibilities
  useEffect(() => {
    buildingsMapRef.current.forEach((mesh) => {
      const { status, mat, baseColor, baseEmissive } = mesh.userData;
      if (filter === 'all' || filter === status) {
        mat.opacity = 0.92;
        mat.transparent = true;
        mat.color.setHex(baseColor);
        mat.emissive.setHex(baseEmissive);
        mesh.visible = true;
      } else {
        // Ghost translucent wireframe for filtered-out buildings
        mat.opacity = 0.08;
        mat.transparent = true;
        mat.color.setHex(0x334155);
        mat.emissive.setHex(0x020617);
      }
    });
  }, [filter]);

  // View reset helper
  const handleResetView = () => {
    cameraRotationRef.current = { theta: 0.8, phi: 0.7, radius: 46 };
    if (cameraRef.current) {
      const { theta, phi, radius } = cameraRotationRef.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.lookAt(0, 2, 0);
    }
  };

  const handleZoom = (delta) => {
    cameraRotationRef.current.radius = Math.max(18, Math.min(75, cameraRotationRef.current.radius + delta));
    if (cameraRef.current) {
      const { theta, phi, radius } = cameraRotationRef.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.lookAt(0, 2, 0);
    }
  };

  const activeInspection = selectedBuilding || hoveredBuilding;

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative text-white">
      {/* 3D Map Header & Control Strip */}
      <div className="p-4 sm:p-5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Bellandur 3D Locality & Building Simulation
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Interactive WebGL
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Simulating physical buildings across Outer Ring Road corridor. Filter good properties vs corrupt and bait listings.
              </p>
            </div>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>All Buildings</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900/60 text-[10px]">70</span>
          </button>

          <button
            onClick={() => setFilter('good')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === 'good'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Good</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900/60 text-[10px]">22</span>
          </button>

          <button
            onClick={() => setFilter('corrupt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === 'corrupt'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Corrupted Listings</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900/60 text-[10px]">40</span>
          </button>

          <button
            onClick={() => setFilter('bait')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === 'bait'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Bait Listings</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900/60 text-[10px]">8</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full h-[540px]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Quick Action Overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
          <div className="bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 flex flex-col gap-1 shadow-xl">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title={autoRotate ? "Pause Auto Orbit" : "Play Auto Orbit"}
              className={`p-2 rounded-lg text-xs transition-colors ${
                autoRotate ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={handleResetView}
              title="Reset Camera View"
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 text-xs transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(-6)}
              title="Zoom In"
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 text-xs transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(6)}
              title="Zoom Out"
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 text-xs transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs flex flex-wrap items-center gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            <span className="text-slate-300">Verified Units (22)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-500/50" />
            <span className="text-slate-300">Corrupt Listings (40)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300">Bait Listings (8)</span>
          </div>
        </div>

        {/* Building Inspector HUD Card (Top Right / Bottom Right) */}
        {activeInspection && (
          <div className="absolute top-4 right-4 max-w-sm w-full bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-700/80 p-4 shadow-2xl text-left animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  activeInspection.status === 'good' ? 'bg-emerald-400' :
                  activeInspection.status === 'corrupt' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                }`} />
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  {activeInspection.id}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                activeInspection.status === 'good' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                activeInspection.status === 'corrupt' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {activeInspection.status === 'good' ? 'Verified Property' :
                 activeInspection.status === 'corrupt' ? 'Corrupt Anomaly' : 'Fraud Bait'}
              </span>
            </div>

            <h4 className="text-sm font-bold text-white mb-1">
              {activeInspection.name || activeInspection.id}
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Locality: <span className="text-slate-200">{activeInspection.locality || 'Bellandur, Bangalore'}</span>
            </p>

            {/* Diagnostic Box */}
            <div className={`p-2.5 rounded-lg text-xs mb-3 ${
              activeInspection.status === 'good' ? 'bg-slate-900 border border-slate-800' :
              activeInspection.status === 'corrupt' ? 'bg-rose-950/40 border border-rose-900/60 text-rose-200' :
              'bg-amber-950/40 border border-amber-900/60 text-amber-200'
            }`}>
              <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                {activeInspection.status === 'good' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>Diagnostic Report:</span>
              </div>
              <p className="text-[11px] opacity-90">
                {activeInspection.reason || `Audited physical unit with verified structural integrity (${activeInspection.floors} floors, ${activeInspection.units || '60+'} residences, ${activeInspection.rate || '₹10,500/sqft'}).`}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2">
              <span>Click any building to lock inspection</span>
              {selectedBuilding && (
                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="text-blue-400 hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Audit Stats Footnote */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Interactive 3D Engine: Three.js WebGL • 70 Physical Geometries with Raycasting</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="text-emerald-400">● 22 Clean</span>
          <span className="text-rose-400">● 40 Corrupt</span>
          <span className="text-amber-400">● 8 Bait</span>
        </div>
      </div>
    </div>
  );
}
