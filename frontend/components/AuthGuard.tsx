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
      setReady(true);
    };
    run();
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}

