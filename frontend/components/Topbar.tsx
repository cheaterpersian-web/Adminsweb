"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export default function Topbar() {
  const router = useRouter();
  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    router.replace("/auth/login");
  };
  return (
    <header className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="font-semibold">Marzban Admin</Link>
        <nav className="hidden md:flex items-center gap-3 text-sm">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/users" className="hover:underline">Users</Link>
          <Link href="/configs" className="hover:underline">Configs</Link>
          <Link href="/audit" className="hover:underline">Audit</Link>
          <Link href="/nodes" className="hover:underline">Nodes</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
      </div>
    </header>
  );
}

