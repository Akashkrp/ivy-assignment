import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
  Compass, RotateCw, X, AlertTriangle, Flame, CheckCircle2, 
  Eye, Info, ExternalLink, Sparkles, Navigation, Layers, ZoomIn, ZoomOut
} from 'lucide-react';
import { API, formatINR, formatCrores } from '../services/api';

export default function Bellandur3DMap({ onClose, isEmbedded = false }) {
  const mountRef = useRef(null);

  // Data & Filter State
  const [filterType, setFilterType] = useState('all'); // 'all', 'corrupt', 'bait', 'valid'
  const [isSpinning, setIsSpinning] = useState(true);
  const [hoveredSpecimen, setHoveredSpecimen] = useState(null);
  const [selectedSpecimen, setSelectedSpecimen] = useState(null);
  const [specimens, setSpecimens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Three.js Refs
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const pillarsGroupRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2(999, 999));
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraRotationRef = useRef({ theta: 0.8, phi: 0.7, radius: 68 });
  const autoRotateRef = useRef(true);

  useEffect(() => {
    autoRotateRef.current = isSpinning;
  }, [isSpinning]);

  // 1. Prepare 100 Specimens for Bellandur Simulation (84 Valid, 5 Corrupt, 11 Bait)
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [listings, submission] = await Promise.all([
          API.fetchListings(),
          API.fetchSubmission()
        ]);

        const corruptIds = new Set(submission?.answers?.corrupt_listing_ids || []);
        const baitIds = new Set(submission?.answers?.fake_listing_ids || []);

        // Filter Bellandur listings + include all anomalies
        const bellandurAll = listings.filter(l => (l.locality || '').toLowerCase().includes('bellandur'));
        const allCorrupt = listings.filter(l => corruptIds.has(l.listing_id) || l.price < 0 || (l.floor > l.total_floors && l.total_floors > 0) || l.carpet_area > l.super_built_up_area || l.latitude > 50 || l.bedroom === 0);
        const allBait = listings.filter(l => baitIds.has(l.listing_id) || (l.price > 0 && l.price < 50000));
        const allValidBellandur = bellandurAll.filter(l => !corruptIds.has(l.listing_id) && !baitIds.has(l.listing_id) && l.price > 50000 && (l.floor <= l.total_floors || l.total_floors === 0));

        // Sample 84 Valid, 5 Corrupt, 11 Bait to match exactly the 100 specimen simulation in the reference screenshot
        const sampledValid = (allValidBellandur.length >= 84 ? allValidBellandur.slice(0, 84) : [
          ...allValidBellandur,
          ...listings.filter(l => !corruptIds.has(l.listing_id) && !baitIds.has(l.listing_id)).slice(0, 84 - allValidBellandur.length)
        ]).map((item, i) => ({
          ...item,
          simType: 'valid',
          simId: i,
          angle: (i / 84) * Math.PI * 2 + (Math.sin(i * 1.5) * 0.2),
          dist: 16 + (i % 7) * 4.2 + (Math.cos(i) * 2),
          height: Math.max(3, Math.min(14, (item.floor || 4) * 0.8 + 2)),
          statusLabel: 'Verified Listing',
          defectReason: null
        }));

        const sampledCorrupt = allCorrupt.slice(0, 5).map((item, i) => {
          let reason = 'Data Anomaly';
          if (item.price < 0) reason = `Negative Price: ${formatINR(item.price)}`;
          else if (item.floor > item.total_floors && item.total_floors > 0) reason = `Floor Paradox: Floor ${item.floor} of ${item.total_floors}`;
          else if (item.carpet_area > item.super_built_up_area) reason = `Area Paradox: Carpet (${item.carpet_area}) > SBUA (${item.super_built_up_area})`;
          else if (item.latitude > 50) reason = `Swapped GPS: Lat ${item.latitude}° (Arctic Circle)`;
          else if (item.bedroom === 0) reason = '0-BHK Residential Unit';

          return {
            ...item,
            simType: 'corrupt',
            simId: 84 + i,
            angle: (i / 5) * Math.PI * 2 + 0.4,
            dist: 14 + (i % 3) * 6,
            height: 10 + i * 1.5,
            statusLabel: 'Corrupt Listing',
            defectReason: reason
          };
        });

        const sampledBait = allBait.slice(0, 11).map((item, i) => ({
          ...item,
          simType: 'bait',
          simId: 89 + i,
          angle: (i / 11) * Math.PI * 2 + 1.1,
          dist: 12 + (i % 4) * 5.5,
          height: 6 + (i % 4) * 2,
          statusLabel: 'Fraudulent Clickbait',
          defectReason: `Fake Bait Price: ${formatINR(item.price)} (Normal: ₹1.5+ Cr)`
        }));

        const combined = [...sampledValid, ...sampledCorrupt, ...sampledBait];
        setSpecimens(combined);
      } catch (e) {
        console.error('Failed to prepare Bellandur specimens:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const counts = useMemo(() => {
    return {
      all: specimens.length,
      valid: specimens.filter(s => s.simType === 'valid').length,
      corrupt: specimens.filter(s => s.simType === 'corrupt').length,
      bait: specimens.filter(s => s.simType === 'bait').length
    };
  }, [specimens]);

  // 2. Build Low-Poly 3D Scene with Bellandur Lake & Topographic Relief
  useEffect(() => {
    const container = mountRef.current;
    if (!container || specimens.length === 0) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 560;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060c18); // Deep Cyber Geospatial Dark
    scene.fog = new THREE.FogExp2(0x060c18, 0.012);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const updateCameraPos = () => {
      const { theta, phi, radius } = cameraRotationRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(0, 0, 0);
    };
    updateCameraPos();
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x2a3b5c, 2.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(30, 60, 40);
    scene.add(dirLight);

    const lakeLight = new THREE.PointLight(0x00f0ff, 6, 45);
    lakeLight.position.set(0, 4, 0);
    scene.add(lakeLight);

    // --- A. Low-Poly Topographic Terrain Mesh ---
    const terrainGeo = new THREE.PlaneGeometry(120, 120, 36, 36);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const distFromCenter = Math.sqrt(x * x + z * z);

      // Depress the center for Bellandur Lake, elevate surrounding terrain into low-poly hills
      let y = 0;
      if (distFromCenter < 12) {
        y = -1.2;
      } else {
        const hill = Math.sin(x * 0.12) * Math.cos(z * 0.12) * 2.8 + Math.sin(distFromCenter * 0.1) * 3.5;
        const edgeRise = Math.max(0, (distFromCenter - 25) * 0.28);
        y = hill + edgeRise - 1.5;
      }
      posAttr.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x0f1a2e,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
      wireframe: false
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.position.y = -0.5;
    scene.add(terrainMesh);

    // Subtle terrain wireframe overlay for tech geospatial feel
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const wireMesh = new THREE.Mesh(terrainGeo, wireMat);
    wireMesh.position.y = -0.48;
    scene.add(wireMesh);

    // --- B. Bellandur Lake Center Disc & Radar Rings ---
    const lakeDiscGeo = new THREE.CircleGeometry(11, 48);
    lakeDiscGeo.rotateX(-Math.PI / 2);
    const lakeDiscMat = new THREE.MeshStandardMaterial({
      color: 0x052a4f,
      roughness: 0.2,
      metalness: 0.5,
      transparent: true,
      opacity: 0.85
    });
    const lakeDisc = new THREE.Mesh(lakeDiscGeo, lakeDiscMat);
    lakeDisc.position.y = -1.1;
    scene.add(lakeDisc);

    // Glowing Lake Perimeter Ring
    const lakeRingGeo = new THREE.RingGeometry(10.8, 11.4, 64);
    lakeRingGeo.rotateX(-Math.PI / 2);
    const lakeRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const lakeRing = new THREE.Mesh(lakeRingGeo, lakeRingMat);
    lakeRing.position.y = -1.05;
    scene.add(lakeRing);

    // Radar Concentric Circles
    [18, 26, 35].forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.1, radius + 0.1, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x1e40af,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35 - idx * 0.08
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = -0.8;
      scene.add(ring);
    });

    // Crosshair Coordinate Lines through Bellandur Lake Center
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25 });
    const lineXGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-45, -0.9, 0), new THREE.Vector3(45, -0.9, 0)]);
    const lineZGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.9, -45), new THREE.Vector3(0, -0.9, 45)]);
    scene.add(new THREE.Line(lineXGeo, lineMat));
    scene.add(new THREE.Line(lineZGeo, lineMat));

    // --- C. Listing Pillars (Specimens) ---
    const pillarsGroup = new THREE.Group();
    pillarsGroupRef.current = pillarsGroup;
    scene.add(pillarsGroup);

    const interactiveMeshes = [];

    specimens.forEach((sp) => {
      const posX = Math.cos(sp.angle) * sp.dist;
      const posZ = Math.sin(sp.angle) * sp.dist;
      const pillarHeight = sp.height;

      // Color scheme according to specimen type
      let baseColor = 0x38bdf8; // Valid: Cyan
      let emissiveColor = 0x00b4d8;
      let haloColor = null;

      if (sp.simType === 'corrupt') {
        baseColor = 0xf87171; // Corrupt: Coral/Red
        emissiveColor = 0xef4444;
      } else if (sp.simType === 'bait') {
        baseColor = 0xfbbf24; // Bait: Amber/Yellow
        emissiveColor = 0xf59e0b;
        haloColor = 0xfbbf24;
      }

      // Cylinder Pillar
      const cylGeo = new THREE.CylinderGeometry(0.5, 0.65, pillarHeight, 16);
      const cylMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.6
      });
      const pillar = new THREE.Mesh(cylGeo, cylMat);
      pillar.position.set(posX, pillarHeight / 2, posZ);
      pillar.userData = sp;

      // Type-specific ornaments matching reference design:
      if (sp.simType === 'valid') {
        // Glowing cyan sphere beacon on top
        const tipGeo = new THREE.SphereGeometry(0.65, 16, 16);
        const tipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.y = pillarHeight / 2 + 0.35;
        pillar.add(tip);
      } else if (sp.simType === 'corrupt') {
        // Warning cone marker pointing up
        const coneGeo = new THREE.ConeGeometry(0.8, 1.4, 12);
        const coneMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = pillarHeight / 2 + 0.8;
        pillar.add(cone);
      } else if (sp.simType === 'bait') {
        // Halo disk base ring
        const haloGeo = new THREE.RingGeometry(0.8, 2.2, 24);
        haloGeo.rotateX(-Math.PI / 2);
        const haloMat = new THREE.MeshBasicMaterial({ color: haloColor, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.y = -pillarHeight / 2 + 0.05;
        pillar.add(halo);

        // Small top bead
        const beadGeo = new THREE.SphereGeometry(0.5, 12, 12);
        const beadMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
        const bead = new THREE.Mesh(beadGeo, beadMat);
        bead.position.y = pillarHeight / 2 + 0.3;
        pillar.add(bead);
      }

      pillarsGroup.add(pillar);
      interactiveMeshes.push(pillar);
    });

    // Resize Observer to handle window & modal resizing seamlessly
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Mouse Interaction Handlers
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
      mouseRef.current.set(mouseX, mouseY);

      if (isDraggingRef.current) {
        const deltaX = e.clientX - prevMouseRef.current.x;
        const deltaY = e.clientY - prevMouseRef.current.y;
        cameraRotationRef.current.theta -= deltaX * 0.007;
        cameraRotationRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, cameraRotationRef.current.phi - deltaY * 0.007));
        prevMouseRef.current = { x: e.clientX, y: e.clientY };
        updateCameraPos();
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e) => {
      // In embedded view, do not block page scroll unless Ctrl or Meta is held
      if (isEmbedded) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          cameraRotationRef.current.radius = Math.max(25, Math.min(130, cameraRotationRef.current.radius + e.deltaY * 0.06));
          updateCameraPos();
        }
        return;
      }

      // In modal view:
      // If holding Ctrl or Meta, always zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        cameraRotationRef.current.radius = Math.max(25, Math.min(130, cameraRotationRef.current.radius + e.deltaY * 0.06));
        updateCameraPos();
        return;
      }

      // Check if modal has scrollable content that can scroll in this direction
      const scrollParent = container.closest('.overflow-y-auto') || document.querySelector('.overflow-y-auto');
      if (scrollParent) {
        const canScrollDown = e.deltaY > 0 && scrollParent.scrollTop + scrollParent.clientHeight < scrollParent.scrollHeight - 2;
        const canScrollUp = e.deltaY < 0 && scrollParent.scrollTop > 2;
        if (canScrollDown || canScrollUp) {
          // Allow modal scrolling naturally without hijacking!
          return;
        }
      }

      e.preventDefault();
      cameraRotationRef.current.radius = Math.max(25, Math.min(130, cameraRotationRef.current.radius + e.deltaY * 0.06));
      updateCameraPos();
    };

    const onClick = () => {
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(interactiveMeshes, true);
      if (intersects.length > 0) {
        let topMesh = intersects[0].object;
        while (topMesh.parent && topMesh.parent !== pillarsGroup) {
          topMesh = topMesh.parent;
        }
        if (topMesh.userData && topMesh.userData.simType) {
          setSelectedSpecimen(topMesh.userData);
        }
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Auto-rotation if enabled and not user dragging
      if (autoRotateRef.current && !isDraggingRef.current) {
        cameraRotationRef.current.theta += delta * 0.18;
        updateCameraPos();
      }

      // Raycasting for Hover Detection
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(interactiveMeshes, true);
      if (intersects.length > 0) {
        let target = intersects[0].object;
        while (target.parent && target.parent !== pillarsGroup) {
          target = target.parent;
        }
        if (target.userData && target.userData.simType) {
          setHoveredSpecimen(target.userData);
          container.style.cursor = 'pointer';
        }
      } else {
        setHoveredSpecimen(null);
        container.style.cursor = 'grab';
      }

      renderer.render(scene, camera);
    };
    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
      renderer.dispose();
    };
  }, [specimens]);

  // 3. Filter Visibility Updates
  useEffect(() => {
    if (!pillarsGroupRef.current) return;
    pillarsGroupRef.current.children.forEach(pillar => {
      const data = pillar.userData;
      if (!data) return;
      if (filterType === 'all') {
        pillar.visible = true;
      } else {
        pillar.visible = data.simType === filterType;
      }
    });
  }, [filterType]);

  const handleResetView = () => {
    cameraRotationRef.current = { theta: 0.8, phi: 0.7, radius: 68 };
    if (cameraRef.current) {
      const { theta, phi, radius } = cameraRotationRef.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  const handleZoom = (delta) => {
    cameraRotationRef.current.radius = Math.max(25, Math.min(130, cameraRotationRef.current.radius + delta));
    if (cameraRef.current) {
      const { theta, phi, radius } = cameraRotationRef.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div className={`bg-[#060c18] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-white flex flex-col ${isEmbedded ? '' : 'w-full max-w-6xl mx-auto max-h-[92vh]'}`}>
      
      {/* Top Header matching reference image */}
      <div className="bg-[#091224] border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-[#0018a8] text-cyan-300 p-2 rounded-xl shadow-xs">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Bellandur 3D Locality Simulation
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/40">
                Assigned Micro-Market
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Real-Time Three.js Spatial Map • {counts.all} Verified Listings • Corrupt & Bait Anomaly Detection
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-[#080e1e] border-b border-slate-800/80 px-5 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Low-Poly 3D Map: Assigned Locality (Bellandur)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Interactive topographic node cluster centered on Bellandur Lake (12.9345° N, 77.6780° E) • Drag to rotate, scroll / +/- to zoom
          </p>
        </div>

        {/* Filter Pills matching reference screenshot */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all' 
                ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All ({counts.all})
          </button>

          <button
            onClick={() => setFilterType('corrupt')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'corrupt' 
                ? 'bg-rose-500 text-white shadow-sm' 
                : 'bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/50'
            }`}
          >
            Corrupt ({counts.corrupt})
          </button>

          <button
            onClick={() => setFilterType('bait')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'bait' 
                ? 'bg-amber-500 text-slate-950 shadow-sm' 
                : 'bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/50'
            }`}
          >
            Bait ({counts.bait})
          </button>

          <button
            onClick={() => setFilterType('valid')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'valid' 
                ? 'bg-sky-500 text-slate-950 shadow-sm' 
                : 'bg-sky-950/40 text-sky-300 border border-sky-800/60 hover:bg-sky-900/50'
            }`}
          >
            Valid ({counts.valid})
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>

          <button
            onClick={() => setIsSpinning(prev => !prev)}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isSpinning 
                ? 'bg-slate-800 border border-cyan-500/50 text-cyan-300' 
                : 'bg-slate-800/60 border border-slate-700 text-slate-400'
            }`}
          >
            <RotateCw className={`w-3 h-3 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>Spinning</span>
          </button>

          <button
            onClick={handleResetView}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all cursor-pointer"
          >
            Reset View
          </button>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleZoom(-12)}
              className="p-1 rounded-lg text-xs font-bold bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(12)}
              className="p-1 rounded-lg text-xs font-bold bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div className={`relative w-full bg-[#060c18] overflow-hidden ${
        isEmbedded 
          ? 'h-[500px] sm:h-[560px]' 
          : 'flex-1 min-h-[340px] h-[52vh] max-h-[580px]'
      }`}>
        {/* Floating Zoom Controls on 3D viewport */}
        <div className="absolute top-4 right-4 z-10 flex flex-col space-y-1 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-lg">
          <button
            onClick={() => handleZoom(-12)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-full h-px bg-slate-800" />
          <button
            onClick={() => handleZoom(12)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#060c18]/80 z-20">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-400 font-mono">Generating Low-Poly Topographic Mesh...</span>
            </div>
          </div>
        )}

        <div ref={mountRef} className="w-full h-full" />

        {/* Hover / Click Specimen Details HUD Card */}
        {(hoveredSpecimen || selectedSpecimen) && (
          <div className="absolute top-4 left-4 z-10 max-w-sm bg-[#091224]/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl pointer-events-auto">
            {(() => {
              const sp = selectedSpecimen || hoveredSpecimen;
              const isCorrupt = sp.simType === 'corrupt';
              const isBait = sp.simType === 'bait';

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                      {sp.listing_id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isCorrupt 
                        ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                        : isBait 
                        ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {sp.statusLabel}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white">
                    {sp.apartment_name || 'Bellandur Residential Unit'}
                  </div>

                  {sp.defectReason && (
                    <div className="p-2 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs font-mono">
                      ⚠️ {sp.defectReason}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-300 font-medium">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Price</span>
                      <strong className={isCorrupt || isBait ? 'text-rose-400' : 'text-cyan-300'}>
                        {formatINR(sp.price)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Layout</span>
                      <span>{sp.bedroom} BHK · Floor {sp.floor}/{sp.total_floors || '-'}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                    <span className="capitalize">{sp.website}</span>
                    <span>Carpet: {sp.carpet_area} sqft</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Bottom Left: Coordinates & Elevation */}
        <div className="absolute bottom-3 left-4 z-10 text-[10px] font-mono text-slate-500 tracking-wider">
          BELLANDUR LAKE (12.9345° N, 77.6780° E) • ELEVATION 855m
        </div>

        {/* Bottom Right: Radar Grid Overlay matching screenshot */}
        <div className="absolute bottom-3 right-4 z-10 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 tracking-wider">
          BELLANDUR LAKE RADAR GRID • {counts.all} PLOTTED SPECIMENS
        </div>

      </div>

    </div>
  );
}
