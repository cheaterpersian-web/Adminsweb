"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AuthGuard from "./AuthGuard";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const isAuth = pathname.startsWith("/auth");

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Topbar />
        <div className="flex-1">{children}</div>
      </div>
    </AuthGuard>
  );
}

