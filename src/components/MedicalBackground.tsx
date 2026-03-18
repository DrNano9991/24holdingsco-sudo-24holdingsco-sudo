import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  isEyeComfort?: boolean;
}

const MedicalBackground: React.FC<Props> = ({ isEyeComfort }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Three.js scene with white background ---
    const scene = new THREE.Scene();
    const bgColor = 0xffffff; // Pure white background
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.03);

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    containerRef.current.appendChild(renderer.domElement);

    // Brighter lights for white background
    const ambient = new THREE.AmbientLight(0x404060, 0.8);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    fillLight.position.set(-10, 5, 15);
    scene.add(fillLight);

    const blueRim = new THREE.PointLight(0x0891b2, 0.8, 30);
    blueRim.position.set(-8, 5, 8);
    scene.add(blueRim);

    // Subtle particles (very light)
    const pGeom = new THREE.BufferGeometry();
    const pPos = [];
    for (let i = 0; i < 1000; i++) {
      pPos.push((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 40);
    }
    pGeom.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeom, new THREE.PointsMaterial({ 
      color: 0xcbd5e1, 
      size: 0.04, 
      transparent: true, 
      opacity: 0.2 
    }));
    scene.add(particles);

    // Realistic DNA (more subtle)
    const dnaGroup = new THREE.Group();
    dnaGroup.scale.set(0.8, 0.8, 0.8);
    scene.add(dnaGroup);

    const DNA_BACKBONE_COLOR = 0x94a3b8; // slate-400
    const AT_COLOR = 0xf43f5e; // rose-500
    const GC_COLOR = 0x0ea5e9; // sky-500

    const radius = 3.2;
    const height = 24;
    const turns = 3;
    const steps = 120;
    const phaseShift = 2.2;

    const strand1Pts: THREE.Vector3[] = [];
    const strand2Pts: THREE.Vector3[] = [];

    const backboneSphere = new THREE.SphereGeometry(0.18, 16, 12);
    const baseSphere = new THREE.SphereGeometry(0.12, 12, 12);
    const backboneMat = new THREE.MeshStandardMaterial({
      color: DNA_BACKBONE_COLOR,
      roughness: 0.4,
      metalness: 0.1,
    });

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const angle = ratio * Math.PI * 2 * turns;
      const y = (ratio - 0.5) * height;

      const p1 = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      strand1Pts.push(p1);

      const p2 = new THREE.Vector3(Math.cos(angle + phaseShift) * radius, y, Math.sin(angle + phaseShift) * radius);
      strand2Pts.push(p2);

      if (i % 2 === 0) {
        const node1 = new THREE.Mesh(backboneSphere, backboneMat);
        node1.position.copy(p1);
        dnaGroup.add(node1);

        const node2 = new THREE.Mesh(backboneSphere, backboneMat);
        node2.position.copy(p2);
        dnaGroup.add(node2);
      }

      if (i % 4 === 0) {
        const pairGroup = new THREE.Group();
        const isAT = (i / 4) % 2 === 0;
        const pairColor = isAT ? AT_COLOR : GC_COLOR;
        const atomCount = 6;

        for (let j = 0; j < atomCount; j++) {
          const t = j / (atomCount - 1);
          const pos = new THREE.Vector3().lerpVectors(p1, p2, t);
          const atom = new THREE.Mesh(baseSphere, new THREE.MeshPhongMaterial({
            color: pairColor,
            emissive: pairColor,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.9
          }));
          atom.position.copy(pos);
          atom.scale.multiplyScalar(0.8 + Math.random() * 0.6);
          pairGroup.add(atom);
        }
        dnaGroup.add(pairGroup);
      }
    }

    const tubeMat = new THREE.MeshStandardMaterial({ color: DNA_BACKBONE_COLOR, roughness: 0.5 });
    const tube1 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strand1Pts), 120, 0.06, 8, false), tubeMat);
    const tube2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strand2Pts), 120, 0.06, 8, false), tubeMat);
    dnaGroup.add(tube1, tube2);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      requestAnimationFrame(animate);
      const time = performance.now() * 0.001;
      dnaGroup.rotation.y += 0.005;
      dnaGroup.rotation.x = Math.sin(time * 0.2) * 0.1;
      dnaGroup.position.y = Math.sin(time * 0.4) * 0.2;
      particles.rotation.y += 0.0005;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 -z-50 pointer-events-none bg-white" />
  );
};

export default MedicalBackground;
