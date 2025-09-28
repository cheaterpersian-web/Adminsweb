"use client";
import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function ConfigsPage() {
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [panelId, setPanelId] = useState<string>("");
  const [panels, setPanels] = useState<any[] | null>(null);
  const [plans, setPlans] = useState<any[] | null>(null);
  const [categories, setCategories] = useState<any[] | null>(null);
  const [isRootAdmin, setIsRootAdmin] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ username?: string; sub?: string; error?: string } | null>(null);
  const [created, setCreated] = useState<any[] | null>(null);
  const [loadingInfo, setLoadingInfo] = useState<Record<number, boolean>>({});
  const [userInfo, setUserInfo] = useState<Record<number, any>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});
  const [delUser, setDelUser] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState<string | null>(null);

  const loadPanels = async () => {
    try {
      // For sudo/root, /panels returns all; for operators, fall back to /panels/my
      let data: any[] = [];
      try { data = await apiFetch("/panels"); } catch {}
      if (!Array.isArray(data) || data.length === 0) {
        try { data = await apiFetch("/panels/my"); } catch {}
      }
      setPanels(data);
      if (data.length && !panelId) {
        // If any default exists, prefer it; otherwise first
        const def = data.find((p:any)=> p.is_default);
        setPanelId(String((def || data[0]).id));
      }
    } catch {}
  };
  if (panels === null) { void loadPanels(); }
  const loadPlans = async () => {
    try {
      const [cats, data] = await Promise.all([
        apiFetch("/plan-categories").catch(()=>[]),
        apiFetch("/plans").catch(()=>[]),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setPlans(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length && !planId) setPlanId(String(data[0].id));
    } catch {
      setCategories([]);
      setPlans([]);
    }
  };
  if (plans === null || categories === null) { void loadPlans(); }

  // Fallbacks to ensure defaults are set after data arrives
  useEffect(() => {
    try {
      if (Array.isArray(panels) && panels.length > 0 && !panelId) {
        const def = (panels as any[]).find((p:any)=> p.is_default);
        setPanelId(String((def || panels[0]).id));
      }
    } catch {}
  }, [panels]);

  useEffect(() => {
    try {
      if (Array.isArray(plans) && plans.length > 0 && !planId) {
        setPlanId(String(plans[0].id));
      }
    } catch {}
  }, [plans]);

  const loadAuth = async () => {
    try {
      const me = await apiFetch("/auth/me");
      setIsRootAdmin(!!me?.is_root_admin);
    } catch { setIsRootAdmin(false); }
  };
  // Fire once
  if (!isRootAdmin && typeof window !== "undefined") { void loadAuth(); }
  const loadInfoForRows = async (items: any[]) => {
    try {
      const entries = await Promise.all(items.map(async (r:any) => {
        try {
          const info = await apiFetch(`/panels/${r.panel_id}/user/${encodeURIComponent(r.username)}/info`);
          return [r.id, info] as const;
        } catch { return [r.id, null] as const; }
      }));
      const map: Record<number, any> = {};
      for (const [id, info] of entries) { if (info) map[id] = info; }
      setUserInfo(s => ({ ...s, ...map }));
    } catch {}
  };

  const loadCreated = async () => {
    try {
      // For root admin: always show local created DB list
      if (isRootAdmin) {
        const res = await apiFetch(`/panels/created`);
        const items = res.items || [];
        setCreated(items);
        if (items.length) { void loadInfoForRows(items); }
        return;
      }
      // For operator/admin non-root: show live list by selected panel
      const pid = parseInt(panelId, 10);
      if (pid) {
        try {
          const live = await apiFetch(`/panels/${pid}/users`);
          const items = live.items || [];
          setCreated(items.map((it:any, idx:number)=> ({ id: idx+1, panel_id: pid, username: it.username, created_at: new Date().toISOString(), subscription_url: it.subscription_url })));
          if (items.length) { void loadInfoForRows(items.map((it:any, idx:number)=> ({ id: idx+1, panel_id: pid, username: it.username }))); }
          return;
        } catch {}
      }
      setCreated([]);
    } catch { setCreated([]); }
  };
  if (created === null) { void loadCreated(); }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const pid = parseInt(panelId, 10);
      const payload = { name, plan_id: parseInt(planId, 10) };
      const res = await apiFetch(`/panels/${pid}/create_user`, { method: "POST", body: JSON.stringify(payload) });
      if (res.ok) {
        setResult({ username: res.username, sub: res.subscription_url });
      } else {
        setResult({ error: res.error || "خطا در ساخت کاربر" });
      }
    } catch (e:any) {
      setResult({ error: e.message || "خطا" });
    } finally { setBusy(false); }
  };

  const deleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setDelBusy(true);
    setDelMsg(null);
    try {
      const pid = parseInt(panelId, 10);
      const res = await apiFetch(`/panels/${pid}/delete_user`, { method: "POST", body: JSON.stringify({ username: delUser }) });
      if (res.ok) {
        setDelMsg(`کاربر ${delUser} حذف شد`);
        setDelUser("");
      } else {
        setDelMsg(res.error || "خطا در حذف کاربر");
      }
    } catch (e:any) {
      setDelMsg(e.message || "خطا");
    } finally { setDelBusy(false); }
  };

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Configs</h1>
        <p className="text-sm text-muted-foreground">ایجاد کاربر در پنل مرزبان و دریافت لینک ساب</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ایجاد کاربر و لینک Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm">نام کاربر</label>
              <input className="w-full h-10 px-3 rounded-md border bg-background" value={name} onChange={e=>setName(e.target.value)} placeholder="example_user" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm">پلن</label>
              <select className="w-full h-10 px-3 rounded-md border bg-background" value={planId} onChange={e=>setPlanId(e.target.value)} required>
                {/* گروه «بدون دسته» */}
                {(() => {
                  const uncategorized = (plans||[]).filter((p:any)=> !p.category_id);
                  return uncategorized.length ? (
                    <optgroup key="uncat" label="(بدون دسته)">
                      {uncategorized.map((p:any)=> (
                        <option key={p.id} value={p.id}>
                          {p.name} — {(p.is_data_unlimited ? "حجم ∞" : `${p.data_quota_mb}MB`)} · {(p.is_duration_unlimited ? "زمان ∞" : `${p.duration_days} روز`)} · قیمت: {new Intl.NumberFormat('en-US').format(Number(p.price))} T
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })()}
                {/* گروه‌های دسته‌بندی شده */}
                {(categories||[]).map((c:any)=> {
                  const items = (plans||[]).filter((p:any)=> p.category_id === c.id);
                  if (!items.length) return null;
                  return (
                    <optgroup key={c.id} label={c.name}>
                      {items.map((p:any)=> (
                        <option key={p.id} value={p.id}>
                          {p.name} — {(p.is_data_unlimited ? "حجم ∞" : `${p.data_quota_mb}MB`)} · {(p.is_duration_unlimited ? "زمان ∞" : `${p.duration_days} روز`)} · قیمت: {new Intl.NumberFormat('en-US').format(Number(p.price))} T
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            {/* For operators, hide panel select and auto-use default; for sudo, show selector */}
            {Array.isArray(panels) && panels.length > 0 && (
              <DefaultAwarePanelSelect panels={panels} panelId={panelId} setPanelId={setPanelId} />
            )}
            <div className="col-span-full flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={busy || !name || !planId || !panelId}>ایجاد کاربر</Button>
            </div>
            {result && result.error && <div className="col-span-full text-sm bg-red-500/10 text-red-600 border border-red-500/30 rounded-md p-2">{result.error}</div>}
            {result && !result.error && (
              <div className="col-span-full text-sm bg-green-500/10 text-green-700 border border-green-500/30 rounded-md p-2">
                <div>ساخته شد: {result.username}</div>
                {result.sub && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label="Copy subscription URL"
                      onClick={async()=>{
                        try {
                          await navigator.clipboard.writeText(result.sub!);
                        } catch {}
                      }}
                    >Copy link</Button>
                    <span className="truncate">{new URL(result.sub, window.location.origin).href}</span>
                  </div>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Created</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="min-w-full sm:min-w-[1000px] w-full text-sm border">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-2 text-left">User</th>
                  <th className="p-2 text-left">Panel</th>
                  <th className="p-2 text-left">Created</th>
                  <th className="p-2 text-left">Subscription</th>
                  <th className="p-2 text-left">Usage</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(created||[]).map((r:any)=> (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.username}</td>
                    <td className="p-2">{r.panel_id}</td>
                    <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-2 truncate">
                      {r.subscription_url ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label="Copy subscription URL"
                          onClick={async()=>{
                            try {
                              await navigator.clipboard.writeText(r.subscription_url);
                              setCopied(s=>({ ...s, [r.id]: true }));
                              setTimeout(()=> setCopied(s=>({ ...s, [r.id]: false })), 1500);
                            } catch {}
                          }}
                        >{copied[r.id] ? "Copied" : "Copy link"}</Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-2">
                      {userInfo[r.id] ? (
                        <div className="space-y-0.5 text-xs">
                          <div>{formatShortGBPair(userInfo[r.id].remaining, userInfo[r.id].data_limit)}</div>
                          <div>{formatShortDayPair(userInfo[r.id].expires_in, r.created_at, userInfo[r.id].expire)}</div>
                          <div>Status: {userInfo[r.id].status || '-'}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Loading…</span>
                      )}
                    </td>
                    <td className="p-2">
                      <RowActions username={r.username} panelId={r.panel_id} onDone={loadCreated} />
                    </td>
                  </tr>
                ))}
                {created && created.length===0 && (
                  <tr><td colSpan={4} className="p-3 text-muted-foreground">موردی نیست</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" variant="outline" onClick={loadCreated}>بروزرسانی</Button>
            <span className="text-xs text-muted-foreground">برای اپراتور، لیست زنده از پنل خوانده می‌شود</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>حذف کاربر از پنل</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={deleteUser} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm">نام کاربر</label>
              <input className="w-full h-10 px-3 rounded-md border bg-background" value={delUser} onChange={e=>setDelUser(e.target.value)} placeholder="example_user" required />
            </div>
            {Array.isArray(panels) && panels.length > 0 && (
              <DefaultAwarePanelSelect panels={panels} panelId={panelId} setPanelId={setPanelId} />
            )}
            <div className="col-span-full flex flex-col sm:flex-row gap-2">
              <Button type="submit" variant="destructive" disabled={delBusy || !delUser || !panelId}>حذف کاربر</Button>
            </div>
            {delMsg && <div className="col-span-full text-sm text-muted-foreground">{delMsg}</div>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function DefaultAwarePanelSelect({ panels, panelId, setPanelId }: { panels: any[]; panelId: string; setPanelId: (v: string)=>void }) {
  // If user is operator (no is_root_admin flag here), backend already restricts /panels to sudo only.
  // Heuristics: if only one panel is visible, hide selector; otherwise show selector.
  const onlyOne = Array.isArray(panels) && panels.length === 1;
  if (onlyOne) {
    // Ensure the single panel is selected
    const only = panels[0];
    if (!panelId || panelId !== String(only.id)) setPanelId(String(only.id));
    return null;
  }
  return (
    <div className="space-y-1">
      <label className="text-sm">پنل مقصد</label>
      <select className="w-full h-10 px-3 rounded-md border bg-background" value={panelId} onChange={e=>setPanelId(e.target.value)} required>
        {(panels || []).map((p:any)=> <option key={p.id} value={p.id}>{p.name} - {p.base_url}{p.is_default ? " (default)" : ""}</option>)}
      </select>
    </div>
  );
}

function RowActions({ username, panelId, onDone }: { username: string; panelId: number; onDone: ()=>void }) {
  const [busy, setBusy] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [plans, setPlans] = useState<any[] | null>(null);
  const [templates, setTemplates] = useState<any[] | null>(null);
  const [planId, setPlanId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");

  const loadPlans = async () => { try { const d = await apiFetch("/plans"); setPlans(d); if (d.length && !planId) setPlanId(String(d[0].id)); } catch { setPlans([]); } };
  const loadTemplates = async () => { try { const d = await apiFetch("/templates"); setTemplates(d); if (d.length && !templateId) setTemplateId(String(d[0].id)); } catch { setTemplates([]); } };

  const setStatus = async (status: "active" | "disabled") => {
    setBusy(true);
    try {
      await apiFetch(`/panels/${panelId}/user/${encodeURIComponent(username)}/status`, { method: "POST", body: JSON.stringify({ status }) });
      onDone();
    } finally { setBusy(false); }
  };

  const extend = async () => {
    setBusy(true);
    try {
      const body: any = { plan_id: parseInt(planId, 10) };
      if (templateId) body.template_id = parseInt(templateId, 10);
      await apiFetch(`/panels/${panelId}/user/${encodeURIComponent(username)}/extend`, { method: "POST", body: JSON.stringify(body) });
      setShowExtend(false);
      onDone();
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-2 min-w-[280px]">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={()=>setStatus("active")}>فعال</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={()=>setStatus("disabled")}>غیرفعال</Button>
        <Button size="sm" onClick={()=>{ setShowExtend(v=>!v); if (!plans) void loadPlans(); if (!templates) void loadTemplates(); }}>تمدید</Button>
      </div>
      {showExtend && (
        <div className="flex flex-col sm:flex-row gap-2">
          <select className="h-9 px-2 rounded-md border bg-background" value={planId} onChange={e=>setPlanId(e.target.value)}>
            {(plans||[]).map((p:any)=> <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="h-9 px-2 rounded-md border bg-background" value={templateId} onChange={e=>setTemplateId(e.target.value)}>
            <option value="">بدون تمپلیت</option>
            {(templates||[]).map((t:any)=> <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Button size="sm" onClick={extend} disabled={busy || !planId}>اعمال تمدید</Button>
        </div>
      )}
    </div>
  );
}

function formatBytes(v?: number) {
  if (!v && v !== 0) return '-';
  const units = ['B','KB','MB','GB','TB'];
  let val = v;
  let i = 0;
  while (val >= 1024 && i < units.length-1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}

function formatDuration(s?: number) {
  if (!s && s !== 0) return '-';
  const d = Math.floor((s||0) / 86400);
  const h = Math.floor(((s||0) % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor(((s||0) % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatShortGBPair(remaining?: number, total?: number) {
  if ((remaining === undefined || remaining === null) && (total === undefined || total === null)) return '-';
  const GB = 1024 ** 3;
  const MB = 1024 ** 2;
  const chooseUnit = (r?: number, t?: number) => {
    const rv = r ?? 0, tv = t ?? 0;
    // Use GB if either side is >= 1 GB; otherwise use MB
    return (rv >= GB || tv >= GB) ? 'gb' : 'mb';
  };
  const unit = chooseUnit(remaining, total);
  const div = unit === 'gb' ? GB : MB;
  const r = remaining !== undefined && remaining !== null ? Math.round(remaining / div) : undefined;
  const t = total !== undefined && total !== null ? Math.round(total / div) : undefined;
  if (t !== undefined && t > 0) return `${r ?? 0}/${t}${unit}`;
  return `${r ?? 0}${unit}/∞`;
}

function formatShortDayPair(expiresIn?: number, createdAt?: string, expireTs?: number) {
  // Compute remaining and total seconds
  const now = Math.floor(Date.now() / 1000);
  const remainSec = (expiresIn !== undefined && expiresIn !== null)
    ? Math.max(0, Math.floor(expiresIn))
    : (expireTs ? Math.max(0, expireTs - now) : undefined);
  let totalSec: number | undefined = undefined;
  let elapsedSec: number | undefined = undefined;
  try {
    if (expireTs && createdAt) {
      const start = Math.floor(new Date(createdAt).getTime() / 1000);
      totalSec = Math.max(0, expireTs - start);
      const rem = remainSec !== undefined ? remainSec : Math.max(0, expireTs - now);
      elapsedSec = Math.max(0, totalSec - rem);
    }
  } catch {}

  if (elapsedSec === undefined && totalSec === undefined) return '-';

  // Decide unit: use hours if total or remaining is under 2 days; otherwise days
  const useHours = (totalSec !== undefined && totalSec < 2 * 86400) || (remainSec !== undefined && remainSec < 86400);
  if (useHours) {
    const eHraw = elapsedSec !== undefined ? elapsedSec / 3600 : 0;
    const tHraw = totalSec !== undefined ? totalSec / 3600 : undefined;
    const eH = eHraw > 0 && eHraw < 1 ? 1 : Math.floor(eHraw);
    if (tHraw !== undefined && tHraw > 0) {
      const tH = Math.max(1, Math.ceil(tHraw));
      return `${eH}/${tH}h`;
    }
    return `${eH}h`;
  }

  const eDraw = elapsedSec !== undefined ? elapsedSec / 86400 : 0;
  const tDraw = totalSec !== undefined ? totalSec / 86400 : undefined;
  const eD = eDraw > 0 && eDraw < 1 ? 1 : Math.floor(eDraw);
  if (tDraw !== undefined && tDraw > 0) {
    const tD = Math.max(1, Math.ceil(tDraw));
    return `${eD}/${tD}day`;
  }
  return `${eD}day`;
}