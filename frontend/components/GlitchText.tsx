"use client";

import type { ReactNode } from "react";

export default function GlitchText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-block glitch ${className}`} data-text={typeof children === 'string' ? children : ''}>
      {children}
    </span>
  );
}

