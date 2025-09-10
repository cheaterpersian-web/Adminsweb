"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";

export default function Topbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    router.replace("/auth/login");
  };
  return (
    <header className="h-14 border-b backdrop-blur supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40">
      <div className="mx-auto max-w-6xl h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="md:hidden -ml-1 p-2 rounded-md border" aria-label="Toggle Menu" onClick={() => setOpen(v=>!v)}>
            <span className="block w-4 h-0.5 bg-foreground mb-1"></span>
            <span className="block w-4 h-0.5 bg-foreground mb-1"></span>
            <span className="block w-4 h-0.5 bg-foreground"></span>
          </button>
          <Link href="/dashboard" className="font-semibold">Marzban Admin</Link>
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link href="/users" className="hover:text-foreground">Users</Link>
            <Link href="/configs" className="hover:text-foreground">Configs</Link>
            <Link href="/audit" className="hover:text-foreground">Audit</Link>
            <Link href="/panels" className="hover:text-foreground">Panels</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background">
          <nav className="mx-auto max-w-6xl px-4 py-2 flex flex-col gap-2 text-sm">
            <Link href="/dashboard" onClick={()=>setOpen(false)}>Dashboard</Link>
            <Link href="/users" onClick={()=>setOpen(false)}>Users</Link>
            <Link href="/configs" onClick={()=>setOpen(false)}>Configs</Link>
            <Link href="/audit" onClick={()=>setOpen(false)}>Audit</Link>
            <Link href="/panels" onClick={()=>setOpen(false)}>Panels</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

