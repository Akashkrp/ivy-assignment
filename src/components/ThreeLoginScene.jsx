import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeLoginScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Dimensions
    const width = currentMount.clientWidth || window.innerWidth;
    const height = currentMount.clientHeight || window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04091a); // Deep Ivy Twilight Navy
    scene.fog = new THREE.FogExp2(0x04091a, 0.024);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 5, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    currentMount.appendChild(renderer.domElement);

    // Group for all elements
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // 1. Modern Architectural Residences & Towers (Ivy Homes Real Estate Theme)
    const buildingsGroup = new THREE.Group();
    const buildingCount = 38;
    const buildingGeometries = [];
    const buildingMaterials = [];

    const citySpread = 32;
    for (let i = 0; i < buildingCount; i++) {
      const bWidth = 1.0 + Math.random() * 1.6;
      const bDepth = 1.0 + Math.random() * 1.6;
      const bHeight = 3.0 + Math.random() * 8.5;

      const angle = (i / buildingCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 7.5 + Math.random() * (citySpread / 2);

      const posX = Math.cos(angle) * dist;
      const posZ = Math.sin(angle) * dist;

      const geom = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
      buildingGeometries.push(geom);

      // Deep Ivy Navy & Cobalt architectural body
      const isWarmAccent = Math.random() > 0.65;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x091533,
        emissive: isWarmAccent ? 0x1e3a8a : 0x0a1936,
        emissiveIntensity: 0.4,
        roughness: 0.35,
        metalness: 0.65,
        transparent: true,
        opacity: 0.92,
      });
      buildingMaterials.push(mat);

      const building = new THREE.Mesh(geom, mat);
      building.position.set(posX, bHeight / 2 - 2.5, posZ);
      buildingsGroup.add(building);

      // Crisp architectural outline edges in Ivy Royal Blue & Sky Cyan
      const wireGeom = new THREE.EdgesGeometry(geom);
      const wireMat = new THREE.LineBasicMaterial({
        color: isWarmAccent ? 0x38bdf8 : 0x1d4ed8,
        transparent: true,
        opacity: 0.75,
      });
      const wireframe = new THREE.LineSegments(wireGeom, wireMat);
      wireframe.position.copy(building.position);
      buildingsGroup.add(wireframe);

      // Glowing interior window blocks (warm residential amber & cyan lights)
      const windowCount = Math.floor(bHeight / 1.8);
      for (let w = 1; w <= windowCount; w++) {
        const winGeom = new THREE.BoxGeometry(bWidth * 0.85, 0.45, bDepth * 0.85);
        const isAmber = (i + w) % 3 === 0;
        const winMat = new THREE.MeshBasicMaterial({
          color: isAmber ? 0xf59e0b : 0x38bdf8,
          transparent: true,
          opacity: 0.45 + Math.random() * 0.35,
        });
        const winMesh = new THREE.Mesh(winGeom, winMat);
        winMesh.position.set(
          posX,
          building.position.y - bHeight / 2 + w * 1.5,
          posZ
        );
        buildingsGroup.add(winMesh);
        buildingGeometries.push(winGeom);
        buildingMaterials.push(winMat);
      }
    }
    worldGroup.add(buildingsGroup);

    // 2. Smooth Topographic Real Estate Contour Terrain (Bangalore hills / lake basin)
    const terrainGeo = new THREE.PlaneGeometry(65, 65, 34, 34);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    const baseHeights = new Float32Array(posAttr.count);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      let y = Math.sin(x * 0.12) * Math.cos(z * 0.12) * 2.2 + Math.sin(dist * 0.08) * 1.5;
      if (dist < 8) y = -0.8; // Center basin for clear readability
      posAttr.setY(i, y - 2.5);
      baseHeights[i] = y - 2.5;
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x060f26,
      roughness: 0.85,
      metalness: 0.2,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    worldGroup.add(terrainMesh);

    // Architectural contour wireframe overlay
    const terrainWireMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a8a,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const terrainWireMesh = new THREE.Mesh(terrainGeo, terrainWireMat);
    terrainWireMesh.position.y = 0.02;
    worldGroup.add(terrainWireMesh);

    // Concentric Central Architectural Rings (Bellandur Water / Locality Center)
    [10, 16, 23].forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.12, radius + 0.12, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x00f0ff : 0x1d4ed8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45 - idx * 0.1,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = -2.4 + idx * 0.05;
      worldGroup.add(ring);
    });

    // 3. Floating Amber & Cyan Starlight Particles (Evening City Ambience)
    const particleCount = 450;
    const particleGeom = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    const colorArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 55;
      posArray[i + 1] = (Math.random() - 0.5) * 25 + 4;
      posArray[i + 2] = (Math.random() - 0.5) * 55;

      const isAmber = Math.random() > 0.65;
      if (isAmber) {
        colorArray[i] = 0.98;     // Warm Gold R
        colorArray[i + 1] = 0.75; // G
        colorArray[i + 2] = 0.22; // B
      } else {
        colorArray[i] = 0.22;     // Ivy Cyan R
        colorArray[i + 1] = 0.74; // G
        colorArray[i + 2] = 0.97; // B
      }
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particleGeom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    worldGroup.add(particles);

    // 4. Lighting Matching Ivy Theme
    const ambientLight = new THREE.AmbientLight(0x0e1e47, 2.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(25, 40, 20);
    scene.add(dirLight);

    const ivyBlueLight = new THREE.PointLight(0x0018a8, 6, 45);
    ivyBlueLight.position.set(0, 8, 0);
    scene.add(ivyBlueLight);

    const warmSunsetLight = new THREE.PointLight(0xf59e0b, 4.5, 40);
    warmSunsetLight.position.set(-15, 6, -15);
    scene.add(warmSunsetLight);

    // 5. Resize Observer for Rock-Solid Responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(currentMount);

    // 6. Smooth Cinematic Camera Animation Loop (Independent of mouse hover)
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth majestic orbital pan around architectural skyline
      const cameraRadius = 24;
      const orbitSpeed = 0.07;
      camera.position.x = Math.sin(elapsedTime * orbitSpeed) * cameraRadius;
      camera.position.z = Math.cos(elapsedTime * orbitSpeed) * cameraRadius;
      camera.position.y = 4.8 + Math.sin(elapsedTime * 0.1) * 1.2;
      camera.lookAt(0, 1.5, 0);

      // Subtle slow world rotation
      worldGroup.rotation.y = elapsedTime * 0.02;

      // Gentle floating particles drift
      particles.rotation.y = elapsedTime * 0.015;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }

      particleGeom.dispose();
      particleMat.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      terrainWireMat.dispose();
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
