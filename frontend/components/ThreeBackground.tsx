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
    camera.position.set(0, -4, 24);

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
    type BlockMeta = { mesh: THREE.Mesh; basePos: THREE.Vector3; swayPhase: number; rotPhase: number; bobSpeed: number };
    const blocks: BlockMeta[] = [];
    const baseGeom = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 260; i++) {
      const height = 0.5 + Math.random() * 2.8;
      const sx = 0.8 + Math.random() * 1.8;
      const sz = 0.8 + Math.random() * 1.8;
      const matBlock = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xe9ecef), metalness: 0.05, roughness: 0.92 });
      const m = new THREE.Mesh(baseGeom, matBlock);
      m.scale.set(sx, height, sz);
      const base = new THREE.Vector3(-15 + Math.random() * 30, (height / 2) - 8, -30 + Math.random() * 40);
      m.position.copy(base);
      m.rotation.y = Math.random() * Math.PI;
      const meta: BlockMeta = { mesh: m, basePos: base, swayPhase: Math.random() * Math.PI * 2, rotPhase: Math.random() * Math.PI * 2, bobSpeed: 0.35 + Math.random() * 0.35 };
      blocks.push(meta);
      scene.add(m);
    }

    // Smoke: moving soft sprites between blocks
    const makeSmokeTexture = () => {
      const size = 128;
      const c = document.createElement("canvas");
      c.width = size; c.height = size;
      const ctx = c.getContext("2d");
      if (ctx) {
        const g = ctx.createRadialGradient(size/2, size/2, size*0.1, size/2, size/2, size*0.5);
        g.addColorStop(0, "rgba(180, 188, 194, 0.28)");
        g.addColorStop(0.6, "rgba(200, 206, 212, 0.14)");
        g.addColorStop(1, "rgba(220, 226, 232, 0.0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      return tex;
    };
    const smokeTex = makeSmokeTexture();
    type Puff = { sprite: THREE.Sprite; vx: number; vz: number; vy: number; life: number; maxLife: number };
    const puffs: Puff[] = [];
    const makePuff = (): Puff => {
      const mat = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.7 });
      const s = new THREE.Sprite(mat);
      const x = -18 + Math.random() * 36;
      const z = -32 + Math.random() * 46;
      const y = -9 + Math.random() * 7; // between ground and mid blocks
      s.position.set(x, y, z);
      const scale = 2.0 + Math.random() * 4.0;
      s.scale.set(scale, scale, 1);
      const dir = Math.random() > 0.5 ? 1 : -1;
      const speed = 0.03 + Math.random() * 0.06;
      const vx = (Math.random() - 0.5) * speed * 0.6;
      const vz = dir * speed;
      const vy = (Math.random() - 0.5) * 0.01;
      const maxLife = 6 + Math.random() * 8;
      scene.add(s);
      return { sprite: s, vx, vz, vy, life: maxLife, maxLife };
    };
    for (let i = 0; i < 140; i++) {
      puffs.push(makePuff());
    }

    // Subtle floating motion to add depth without distraction
    const t0 = Math.random() * 1000;
    // Mouse parallax
    let targetRotY = 0;
    let targetRotX = 0;
    const onMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1; // -1..1
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetRotY = -nx * 0.15;
      targetRotX = ny * 0.08;
    };
    window.addEventListener("mousemove", onMouseMove);

    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      // Camera travel forward with gentle sway, simulating moving between blocks
      const travelZ = 24 - (t * 1.6 % 60); // loop every ~37s
      camera.position.z = travelZ;
      camera.position.x = Math.sin(t * 0.6) * 2.2;
      camera.position.y = -4 + Math.sin(t * 0.4) * 0.8;
      // mouse parallax (lerp)
      camera.rotation.y += (targetRotY - camera.rotation.y) * 0.08;
      camera.rotation.x += (targetRotX - camera.rotation.x) * 0.08;

      // Blocks bob/rotate slightly
      blocks.forEach((bm, idx) => {
        const { mesh, basePos, swayPhase, rotPhase, bobSpeed } = bm;
        mesh.position.x = basePos.x + Math.cos(t * 0.15 + swayPhase) * 0.08;
        mesh.position.z = basePos.z + Math.sin(t * 0.12 + swayPhase) * 0.08;
        mesh.position.y = basePos.y + Math.sin(t * bobSpeed + swayPhase) * 0.08;
        mesh.rotation.y = Math.sin(t * 0.2 + rotPhase) * 0.15;
      });

      // Smoke movement & lifecycle
      for (let i = 0; i < puffs.length; i++) {
        const p = puffs[i];
        const s = p.sprite;
        s.position.x += p.vx;
        s.position.y += p.vy;
        s.position.z += p.vz;
        p.life -= 0.016;
        const fade = Math.max(0, Math.min(1, p.life / p.maxLife));
        (s.material as THREE.SpriteMaterial).opacity = 0.16 + fade * 0.32;
        // wrap around bounds to keep smoke between blocks
        if (s.position.z > 16) s.position.z = -34;
        if (s.position.z < -36) s.position.z = 14;
        if (s.position.x > 20) s.position.x = -20;
        if (s.position.x < -20) s.position.x = 20;
        if (p.life <= 0) {
          // recycle
          scene.remove(s);
          puffs[i] = makePuff();
        }
      }
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
      window.removeEventListener("mousemove", onMouseMove);
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
      smokeTex.dispose();
    };

    return cleanupRef.current;
  }, []);

  return <div ref={ref} aria-hidden />;
}

