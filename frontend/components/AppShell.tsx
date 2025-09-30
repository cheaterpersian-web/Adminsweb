"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AuthGuard from "./AuthGuard";
import Topbar from "./Topbar";
import PageTransition from "./PageTransition";
import ThreeBackground from "./ThreeBackground";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const isAuth = pathname.startsWith("/auth");

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col relative">
        <div className="neon-bg" />
        <ThreeBackground />
        <Topbar />
        <div className="flex-1">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <PageTransition>{children}</PageTransition>
          </div>
        </div>
        <footer className="site-footer">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="text-muted-foreground/70">© {new Date().getFullYear()}</div>
            <a
              href="https://t.me/wingsbotCr"
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >Built by wings</a>
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
}

