"use client";

import { useEffect, useRef } from "react";

export default function CursorTrail() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: { x: number; y: number; vx: number; vy: number; life: number; hue: number }[] = [];
    let lastX = -1; let lastY = -1;

    const onMove = (e: MouseEvent) => {
      const x = e.clientX * dpr;
      const y = e.clientY * dpr;
      const dx = lastX >= 0 ? x - lastX : 0;
      const dy = lastY >= 0 ? y - lastY : 0;
      lastX = x; lastY = y;
      const speed = Math.min(20, Math.hypot(dx, dy) / dpr);
      for (let i = 0; i < 6; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed, life: 1, hue: Math.random() > 0.5 ? 190 : 317 });
      }
    };
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    const loop = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life})`;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${Math.max(0, p.life - 0.3)})`;
        ctx.shadowBlur = 12 * dpr;
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-10" aria-hidden />;
}

