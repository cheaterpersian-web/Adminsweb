"use client";

import { useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  maxTiltDeg?: number;
  scale?: number;
};

export default function NeonTilt({ children, className, maxTiltDeg = 8, scale = 1.02 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties | undefined>();

  const onMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const rx = (py - 0.5) * 2 * maxTiltDeg; // rotateX
    const ry = (0.5 - px) * 2 * maxTiltDeg; // rotateY
    setStyle({
      transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
      transition: "transform 60ms linear",
    });
  };
  const onLeave = () => {
    setStyle({ transform: "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)", transition: "transform 180ms ease-out" });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}

