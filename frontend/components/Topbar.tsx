"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccessToken } from "../lib/auth";
import { Button } from "./ui/button";
import { formatToman } from "../lib/utils";

export default function Topbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isRootAdmin, setIsRootAdmin] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

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
          setRole(String(me?.role || ""));
        }
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let timer: any;
    const fetchBalance = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
        const res = await fetch(`${base}/wallet/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const w = await res.json();
          if (w && typeof w.balance !== "undefined") setWalletBalance(String(w.balance));
        }
      } catch {}
    };
    fetchBalance();
    timer = setInterval(fetchBalance, 30000);
    return () => { if (timer) clearInterval(timer); };
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
          <Link href="/dashboard" className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-brand-start to-brand-end drop-shadow-[0_0_8px_hsl(var(--neon-cyan)/0.4)]">Marzban Admin</Link>
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/dashboard" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Dashboard</Link>
            {isRootAdmin && <Link href="/users" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Users</Link>}
            <Link href="/configs" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Configs</Link>
            {isRootAdmin && <Link href="/audit" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Audit</Link>}
            {isRootAdmin && <Link href="/panels" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Panels</Link>}
            {isRootAdmin && <Link href="/plans" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Plans</Link>}
            {isRootAdmin && <Link href="/templates" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Templates</Link>}
            {isRootAdmin && <Link href="/plan-templates" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Plan Templates</Link>}
            {isRootAdmin && <Link href="/backup" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Backup</Link>}
            {!isRootAdmin && <Link href="/wallet" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Wallet</Link>}
            {isRootAdmin && <Link href="/wallets" className="relative hover:text-foreground transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:rounded-full hover:after:w-full after:transition-all">Wallets</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {role === "operator" && (
            <>
              <Link href="/wallet" className="hidden sm:inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium hover:shadow-[0_0_20px_hsl(var(--neon-pink)/0.35)] transition">
                Wallet: {walletBalance ? formatToman(walletBalance) : "-"}
              </Link>
              <Link href="/wallet" className="inline-flex sm:hidden items-center rounded-full border px-2 py-1 text-xs font-medium hover:shadow-[0_0_20px_hsl(var(--neon-pink)/0.35)] transition">
                {walletBalance ? formatToman(walletBalance) : "Wallet"}
              </Link>
            </>
          )}
          <Button variant="default" size="sm" className="btn-neon" onClick={logout}>Logout</Button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background animate-slide-up-sm">
          <nav className="mx-auto max-w-6xl px-4 py-2 flex flex-col gap-2 text-sm">
            <Link href="/dashboard" className="py-2" onClick={()=>setOpen(false)}>Dashboard</Link>
            {isRootAdmin && <Link href="/users" className="py-2" onClick={()=>setOpen(false)}>Users</Link>}
            <Link href="/configs" className="py-2" onClick={()=>setOpen(false)}>Configs</Link>
            {isRootAdmin && <Link href="/audit" className="py-2" onClick={()=>setOpen(false)}>Audit</Link>}
            {isRootAdmin && <Link href="/panels" className="py-2" onClick={()=>setOpen(false)}>Panels</Link>}
            {isRootAdmin && <Link href="/plans" className="py-2" onClick={()=>setOpen(false)}>Plans</Link>}
            {isRootAdmin && <Link href="/templates" className="py-2" onClick={()=>setOpen(false)}>Templates</Link>}
            {isRootAdmin && <Link href="/plan-templates" className="py-2" onClick={()=>setOpen(false)}>Plan Templates</Link>}
            {isRootAdmin && <Link href="/backup" className="py-2" onClick={()=>setOpen(false)}>Backup</Link>}
            {isRootAdmin && <Link href="/wallets" className="py-2" onClick={()=>setOpen(false)}>Wallets</Link>}
          </nav>
        </div>
      )}
    </header>
  );
}

