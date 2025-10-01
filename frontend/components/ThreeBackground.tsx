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

    // Light scene: soft ambient and directional light
    scene.background = new THREE.Color(0xf6f7f9);
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(2, 4, 5);
    scene.add(dir);

    // Generate a field of simple bright blocks (no windows/details)
    const blocks: THREE.Mesh[] = [];
    const baseGeom = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 220; i++) {
      const height = 0.4 + Math.random() * 2.2;
      const matBlock = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xe9ecef), metalness: 0.05, roughness: 0.9 });
      const m = new THREE.Mesh(baseGeom, matBlock);
      m.scale.set(1.2, height, 1.2);
      m.position.set(-15 + Math.random() * 30, (height / 2) - 8, -30 + Math.random() * 40);
      m.rotation.y = Math.random() * Math.PI;
      blocks.push(m);
      scene.add(m);
    }

    // Subtle floating motion to add depth without distraction
    const t0 = Math.random() * 1000;

    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      blocks.forEach((b, idx) => {
        const phase = (idx * 37.17 + t0) % (Math.PI * 2);
        b.position.y = (b.scale.y / 2) - 8 + Math.sin(t * 0.4 + phase) * 0.05;
      });
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

