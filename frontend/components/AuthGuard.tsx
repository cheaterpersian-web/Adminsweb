"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getAccessToken, isAccessTokenExpired, tryRefreshAccessToken } from "../lib/auth";
import { usePathname, useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const run = async () => {
      // Skip guard for auth pages
      if (pathname?.startsWith("/auth")) {
        setReady(true);
        return;
      }
      let token = getAccessToken();
      if (!token || isAccessTokenExpired(token)) {
        token = await tryRefreshAccessToken();
      }
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      // Role-based page access: operators allowed on dashboard, configs, and wallet
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
        const res = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const me = await res.json();
          const role = String(me?.role || "");
          const isOperator = role === "operator";
          const allowedForOperator = ["/dashboard", "/configs", "/wallet", "/forbidden", "/"];
          const isAllowed = allowedForOperator.some(p => pathname === p || pathname?.startsWith(p + "/"));
          if (isOperator && !isAllowed) {
            router.replace("/forbidden");
            return;
          }
        }
      } catch {}
      setReady(true);
    };
    run();
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}

