"use client";

import { useEffect, useRef } from "react";

export default function ParallaxLayers() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx; // -1..1
      const dy = (e.clientY - cy) / cy;
      el.style.setProperty("--parallax-x", String(dx));
      el.style.setProperty("--parallax-y", String(dy));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[-1]">
      <div className="absolute inset-0" style={{ transform: "translate3d(calc(var(--parallax-x,0)*6px), calc(var(--parallax-y,0)*6px), 0)" }}>
        <div className="absolute left-10 top-16 w-24 h-24 rounded-full blur-2xl" style={{ background: "radial-gradient(circle, rgba(25,251,255,0.35), transparent 60%)" }} />
        <div className="absolute right-16 top-8 w-40 h-40 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(255,0,225,0.25), transparent 60%)" }} />
      </div>
      <div className="absolute inset-0" style={{ transform: "translate3d(calc(var(--parallax-x,0)*12px), calc(var(--parallax-y,0)*12px), 0)" }}>
        <div className="absolute right-24 bottom-16 w-28 h-28 rounded-full blur-2xl" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.3), transparent 60%)" }} />
      </div>
    </div>
  );
}

