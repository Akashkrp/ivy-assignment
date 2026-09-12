import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeLoginScene({ mousePos }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Dimensions
    const width = currentMount.clientWidth || window.innerWidth;
    const height = currentMount.clientHeight || window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.035);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 4, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    currentMount.appendChild(renderer.domElement);

    // Group for all rotating elements
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // 1. Futuristic 3D Cyber City Skyscrapers (Architectural wireframes + glossy bodies)
    const buildingsGroup = new THREE.Group();
    const buildingCount = 45;
    const buildingGeometries = [];
    const buildingMaterials = [];

    const cityGridSize = 30;
    for (let i = 0; i < buildingCount; i++) {
      const bWidth = 0.8 + Math.random() * 1.4;
      const bDepth = 0.8 + Math.random() * 1.4;
      const bHeight = 2.5 + Math.random() * 9;

      const posX = (Math.random() - 0.5) * cityGridSize;
      const posZ = (Math.random() - 0.5) * cityGridSize;

      // Keep center somewhat open for the modal
      if (Math.abs(posX) < 3.5 && Math.abs(posZ) < 3.5) continue;

      const geom = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
      buildingGeometries.push(geom);

      // Glassy solid body
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x061e2b,
        emissive: 0x022c22,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.75,
      });
      buildingMaterials.push(mat);

      const building = new THREE.Mesh(geom, mat);
      building.position.set(posX, bHeight / 2 - 2, posZ);
      buildingsGroup.add(building);

      // Glowing edges / wireframe outlines
      const wireGeom = new THREE.EdgesGeometry(geom);
      const wireMat = new THREE.LineBasicMaterial({
        color: Math.random() > 0.4 ? 0x10b981 : 0x06b6d4,
        transparent: true,
        opacity: 0.65,
      });
      const wireframe = new THREE.LineSegments(wireGeom, wireMat);
      wireframe.position.copy(building.position);
      buildingsGroup.add(wireframe);
    }
    worldGroup.add(buildingsGroup);

    // 2. Undulating Cyber Floor Grid
    const gridHelper = new THREE.GridHelper(50, 40, 0x10b981, 0x0f343a);
    gridHelper.position.y = -2;
    worldGroup.add(gridHelper);

    // 3. Floating Holographic Polyhedra (Crystalline Real Estate Nodes)
    const polyhedra = [];
    const polyGroup = new THREE.Group();

    const shapes = [
      new THREE.IcosahedronGeometry(1.4, 0),
      new THREE.OctahedronGeometry(1.6, 0),
      new THREE.DodecahedronGeometry(1.2, 0),
      new THREE.TetrahedronGeometry(1.5, 0),
    ];

    for (let i = 0; i < 7; i++) {
      const geom = shapes[i % shapes.length];
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x10b981 : 0x06b6d4,
        wireframe: true,
        emissive: i % 2 === 0 ? 0x059669 : 0x0891b2,
        emissiveIntensity: 0.8,
      });
      const mesh = new THREE.Mesh(geom, mat);
      const angle = (i / 7) * Math.PI * 2;
      const radius = 9 + Math.random() * 4;
      mesh.position.set(
        Math.cos(angle) * radius,
        1 + Math.sin(angle * 2) * 3,
        Math.sin(angle) * radius
      );
      mesh.userData = {
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() - 0.5) * 0.02,
        floatSpeed: 0.8 + Math.random() * 0.6,
        originalY: mesh.position.y,
        seed: Math.random() * 100,
      };
      polyhedra.push(mesh);
      polyGroup.add(mesh);
    }
    worldGroup.add(polyGroup);

    // 4. Floating Nebula / Constellation Particles
    const particleCount = 700;
    const particleGeom = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    const colorArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 45;
      posArray[i + 1] = (Math.random() - 0.5) * 30 + 3;
      posArray[i + 2] = (Math.random() - 0.5) * 45;

      const isEmerald = Math.random() > 0.4;
      colorArray[i] = isEmerald ? 0.06 : 0.02;     // R
      colorArray[i + 1] = isEmerald ? 0.72 : 0.71; // G
      colorArray[i + 2] = isEmerald ? 0.51 : 0.83; // B
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particleGeom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    worldGroup.add(particles);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0x0a192f, 2.5);
    scene.add(ambientLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 6, 30);
    emeraldLight.position.set(5, 6, 5);
    scene.add(emeraldLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 5, 30);
    cyanLight.position.set(-6, 4, -4);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 4, 35);
    purpleLight.position.set(0, 10, -8);
    scene.add(purpleLight);

    // Mouse coordinates interpolation
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 4;

    const handleMouseMove = (e) => {
      const normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
      const normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseX = normalizedX;
      mouseY = normalizedY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth || window.innerWidth;
      const h = currentMount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera parallax following mouse
      targetCameraX = mouseX * 5;
      targetCameraY = 4 + mouseY * 2.5;
      camera.position.x += (targetCameraX - camera.position.x) * 0.04;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;
      camera.lookAt(0, 1.5, 0);

      // Rotate city world slowly
      worldGroup.rotation.y = elapsedTime * 0.08 + mouseX * 0.2;

      // Polyhedra animation
      polyhedra.forEach((mesh) => {
        mesh.rotation.x += mesh.userData.rotSpeedX;
        mesh.rotation.y += mesh.userData.rotSpeedY;
        mesh.position.y =
          mesh.userData.originalY +
          Math.sin(elapsedTime * mesh.userData.floatSpeed + mesh.userData.seed) * 0.8;
      });

      // Move lights dynamically
      emeraldLight.position.x = Math.sin(elapsedTime * 0.7) * 9;
      emeraldLight.position.z = Math.cos(elapsedTime * 0.7) * 9;
      cyanLight.position.x = -Math.cos(elapsedTime * 0.5) * 8;
      cyanLight.position.z = -Math.sin(elapsedTime * 0.5) * 8;

      // Particle subtle rotation
      particles.rotation.y = elapsedTime * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }

      // Dispose Three resources
      particleGeom.dispose();
      particleMat.dispose();
      buildingGeometries.forEach((g) => g.dispose());
      buildingMaterials.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
    />
  );
}
