"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccessToken } from "../lib/auth";
import { Button } from "./ui/button";

export default function Topbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isRootAdmin, setIsRootAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
        const res = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const me = await res.json();
          setIsRootAdmin(!!me?.is_root_admin);
        }
      } catch {}
    };
    load();
  }, []);
  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    router.replace("/auth/login");
  };
  return (
    <header className="h-14 border-b sticky top-0 z-40 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto max-w-6xl h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="md:hidden -ml-1 p-2 rounded-md border hover:border-primary/40 transition" aria-label="Toggle Menu" onClick={() => setOpen(v=>!v)}>
            <span className="block w-4 h-0.5 bg-foreground mb-1"></span>
            <span className="block w-4 h-0.5 bg-foreground mb-1"></span>
            <span className="block w-4 h-0.5 bg-foreground"></span>
          </button>
          <Link href="/dashboard" className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-brand-start to-brand-end">Marzban Admin</Link>
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/dashboard" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Dashboard</Link>
            {isRootAdmin && <Link href="/users" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Users</Link>}
            <Link href="/configs" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Configs</Link>
            <Link href="/audit" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Audit</Link>
            {isRootAdmin && <Link href="/panels" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Panels</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={logout}>Logout</Button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background animate-slide-up-sm">
          <nav className="mx-auto max-w-6xl px-4 py-2 flex flex-col gap-2 text-sm">
            <Link href="/dashboard" className="py-2" onClick={()=>setOpen(false)}>Dashboard</Link>
            {isRootAdmin && <Link href="/users" className="py-2" onClick={()=>setOpen(false)}>Users</Link>}
            <Link href="/configs" className="py-2" onClick={()=>setOpen(false)}>Configs</Link>
            <Link href="/audit" className="py-2" onClick={()=>setOpen(false)}>Audit</Link>
            {isRootAdmin && <Link href="/panels" className="py-2" onClick={()=>setOpen(false)}>Panels</Link>}
          </nav>
        </div>
      )}
    </header>
  );
}

