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
  const [userInfo, setUserInfo] = useState<any>(null);

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
          setUserInfo(me);
        }
      } catch {}
    };
    load();
  }, []);
  
  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("is_root_admin");
    }
    router.replace("/auth/login");
  };
  
  return (
    <header className="h-16 border-b backdrop-blur supports-[backdrop-filter]:bg-background/95 sticky top-0 z-40 shadow-sm">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            className="md:hidden p-2 rounded-md border border-border hover:bg-accent transition-colors" 
            aria-label="منوی همبرگری" 
            onClick={() => setOpen(v => !v)}
          >
            <span className="block w-5 h-0.5 bg-foreground mb-1 transition-all"></span>
            <span className="block w-5 h-0.5 bg-foreground mb-1 transition-all"></span>
            <span className="block w-5 h-0.5 bg-foreground transition-all"></span>
          </button>
          <Link href="/dashboard" className="font-bold text-xl text-primary hover:text-primary/80 transition-colors">
            پنل مدیریت مرزبان
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              داشبورد
            </Link>
            {isRootAdmin && (
              <Link href="/users" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                کاربران
              </Link>
            )}
            <Link href="/configs" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              تنظیمات
            </Link>
            <Link href="/audit" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              گزارشات
            </Link>
            {isRootAdmin && (
              <>
                <Link href="/panels" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                  پنل‌ها
                </Link>
                <Link href="/panels/discover" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                  کشف پنل‌ها
                </Link>
                <Link href="/sudo" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                  کنترل سوپر ادمین
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {userInfo && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="text-right">
                <div className="font-medium">{userInfo.name}</div>
                <div className="text-xs text-muted-foreground">
                  {userInfo.role === 'admin' ? 'مدیر' : userInfo.role === 'operator' ? 'اپراتور' : 'مشاهده‌گر'}
                  {isRootAdmin && ' (سوپر ادمین)'}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">
                  {userInfo.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            خروج
          </Button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur">
          <nav className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-3 text-sm">
            <Link 
              href="/dashboard" 
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
            >
              داشبورد
            </Link>
            {isRootAdmin && (
              <Link 
                href="/users" 
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
              >
                کاربران
              </Link>
            )}
            <Link 
              href="/configs" 
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
            >
              تنظیمات
            </Link>
            <Link 
              href="/audit" 
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
            >
              گزارشات
            </Link>
            {isRootAdmin && (
              <>
                <Link 
                  href="/panels" 
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
                >
                  پنل‌ها
                </Link>
                <Link 
                  href="/panels/discover" 
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
                >
                  کشف پنل‌ها
                </Link>
                <Link 
                  href="/sudo" 
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
                >
                  کنترل سوپر ادمین
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

