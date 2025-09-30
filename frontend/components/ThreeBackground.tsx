"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export default function ThreeBackground() {
  const ref = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.zIndex = "-1";
    container.appendChild(renderer.domElement);

    // Postprocessing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.65, 0.8, 0.85);
    composer.addPass(bloom);

    // Neon grid plane
    const grid = new THREE.GridHelper(200, 80, new THREE.Color("#19fbff"), new THREE.Color("#ff00e1"));
    grid.material.depthWrite = false;
    grid.position.y = -18;
    scene.add(grid);

    // Floating neon lines
    const lines: THREE.Line[] = [];
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color("#19fbff"), transparent: true, opacity: 0.6 });
    for (let i = 0; i < 40; i++) {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-40 + Math.random() * 80, -8 + Math.random() * 16, -40 + Math.random() * 20),
        new THREE.Vector3(-40 + Math.random() * 80, -8 + Math.random() * 16, -40 + Math.random() * 20),
      ]);
      const ln = new THREE.Line(geom, mat.clone());
      (ln.material as THREE.LineBasicMaterial).color = new THREE.Color(Math.random() > 0.5 ? "#19fbff" : "#ff00e1");
      lines.push(ln);
      scene.add(ln);
    }

    // Starfield particles
    const starGeom = new THREE.BufferGeometry();
    const starCount = 600;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3 + 0] = (Math.random() - 0.5) * 120;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      starPositions[i * 3 + 2] = -60 + Math.random() * 40;
    }
    starGeom.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: new THREE.Color("#a855f7"), size: 0.08, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeom, starMat);
    scene.add(stars);

    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      lines.forEach((ln, idx) => {
        const geom = ln.geometry as THREE.BufferGeometry;
        const pos = geom.attributes.position as THREE.BufferAttribute;
        const speed = 0.8 + (idx % 5) * 0.2;
        const z = -40 + ((t * speed + idx * 3) % 60);
        pos.setZ(0, z);
        pos.setZ(1, z + 4);
        pos.needsUpdate = true;
      });
      stars.rotation.z = t * 0.03;
      composer.render();
      raf = requestAnimationFrame(animate);
    };
    let raf = requestAnimationFrame(animate);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      composer.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      scene.traverse((obj: THREE.Object3D) => {
        const anyObj = obj as any;
        if (anyObj.geometry) anyObj.geometry.dispose();
        if (anyObj.material) {
          const m = anyObj.material;
          if (Array.isArray(m)) m.forEach(mm => mm.dispose()); else m.dispose();
        }
      });
    };

    return cleanupRef.current;
  }, []);

  return <div ref={ref} aria-hidden />;
}

