"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { apiFetch } from "../../lib/api";

type DashboardStats = {
  users: {
    total: number;
    active: number;
    operators: number;
    admins: number;
  };
  panels: {
    total: number;
    active: number;
  };
  activities: {
    total: number;
    today: number;
    users_created_today: number;
  };
};

type UserInfo = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_root_admin: boolean;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Load user info
        const me = await apiFetch("/auth/me");
        setUserInfo(me);
        
        // Load stats if user is root admin
        if (me?.is_root_admin) {
          try {
            const statsData = await apiFetch("/sudo/stats");
            setStats(statsData);
          } catch (error) {
            console.error("Error loading stats:", error);
          }
        }
        
        // Load system health
        try {
          const healthData = await apiFetch("/monitoring/health");
          setHealth(healthData);
        } catch (error) {
          console.error("Error loading health:", error);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "نامشخص";
    return new Date(dateString).toLocaleString("fa-IR");
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">داشبورد</h1>
          <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">داشبورد</h1>
        <p className="text-sm text-muted-foreground">
          خوش آمدید، {userInfo?.name} ({userInfo?.role === 'admin' ? 'مدیر' : userInfo?.role === 'operator' ? 'اپراتور' : 'مشاهده‌گر'})
          {userInfo?.is_root_admin && ' - سوپر ادمین'}
        </p>
      </div>

      {/* System Health */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">وضعیت سیستم</h2>
        {health ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">CPU</div>
                <div className="text-2xl font-semibold">{health.cpu || 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">پایگاه داده</div>
                <div className={`text-lg font-semibold ${health.database ? "text-green-600" : "text-red-600"}`}>
                  {health.database ? "متصل" : "قطع"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Redis</div>
                <div className={`text-lg font-semibold ${health.redis ? "text-green-600" : "text-red-600"}`}>
                  {health.redis ? "متصل" : "قطع"}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">وضعیت سیستم در دسترس نیست</div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Statistics for Root Admin */}
      {userInfo?.is_root_admin && stats && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">آمار کلی سیستم</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">کل کاربران</div>
                <div className="text-2xl font-semibold">{stats.users.total}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.users.active} فعال
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">اپراتورها</div>
                <div className="text-2xl font-semibold">{stats.users.operators}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.users.admins} ادمین
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">پنل‌ها</div>
                <div className="text-2xl font-semibold">{stats.panels.total}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.panels.active} فعال
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">کاربران امروز</div>
                <div className="text-2xl font-semibold">{stats.activities.users_created_today}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.activities.today} فعالیت
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">دسترسی سریع</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/users'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">مدیریت کاربران</div>
                  <div className="text-sm text-muted-foreground">ایجاد و مدیریت کاربران</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/panels'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">مدیریت پنل‌ها</div>
                  <div className="text-sm text-muted-foreground">تنظیم و مدیریت پنل‌های مرزبان</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/audit'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">گزارشات</div>
                  <div className="text-sm text-muted-foreground">مشاهده گزارشات و فعالیت‌ها</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* System Information */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">اطلاعات سیستم</h2>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium mb-2">اطلاعات کاربر</div>
                <div className="space-y-1 text-muted-foreground">
                  <div>نام: {userInfo?.name}</div>
                  <div>ایمیل: {userInfo?.email}</div>
                  <div>نقش: {userInfo?.role === 'admin' ? 'مدیر' : userInfo?.role === 'operator' ? 'اپراتور' : 'مشاهده‌گر'}</div>
                  {userInfo?.is_root_admin && <div>سطح دسترسی: سوپر ادمین</div>}
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">وضعیت سیستم</div>
                <div className="space-y-1 text-muted-foreground">
                  <div>API: {process.env.NEXT_PUBLIC_API_BASE_URL || "/api"}</div>
                  <div>پایگاه داده: {health?.database ? 'متصل' : 'قطع'}</div>
                  <div>Redis: {health?.redis ? 'متصل' : 'قطع'}</div>
                  <div>آخرین بروزرسانی: {formatDate(new Date().toISOString())}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}