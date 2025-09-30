"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function DashboardPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
  const [health, setHealth] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const h = await fetch(`${api}/monitoring/health`).then(r=>r.json());
        setHealth(h);
      } catch {}
      try {
        const token = localStorage.getItem("access_token") || "";
        const res = await fetch(`${api}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setNotifications(await res.json());
      } catch {}
    };
    load();
  }, [api]);

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight neon-text">Dashboard</h1>
        <p className="text-sm text-muted-foreground">API: {api}</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">System Health</h2>
        {health ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="neon-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">CPU</div>
                <div className="text-2xl font-semibold">{health.cpu}%</div>
              </CardContent>
            </Card>
            <Card className="neon-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Database</div>
                <div className={`text-lg font-semibold ${health.database ? "text-green-600" : "text-red-600"}`}>{health.database ? "OK" : "DOWN"}</div>
              </CardContent>
            </Card>
            <Card className="neon-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Redis</div>
                <div className={`text-lg font-semibold ${health.redis ? "text-green-600" : "text-red-600"}`}>{health.redis ? "OK" : "DOWN"}</div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Notifications</h2>
        <Card className="neon-card">
          <CardContent className="p-0">
            <div className="divide-y">
              {notifications.slice(0, 10).map((n:any)=> (
                <div key={n.id} className="p-3 flex items-center justify-between">
                  <div className="text-sm">{typeof n.payload === "string" ? n.payload : JSON.stringify(n.payload)}</div>
                  <div className="text-xs text-muted-foreground">status: {n.status}</div>
                </div>
              ))}
              {notifications.length === 0 && <div className="p-3 text-sm text-muted-foreground">No notifications</div>}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}