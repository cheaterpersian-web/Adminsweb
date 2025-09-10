"use client";
import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function ConfigsPage() {
  const [name, setName] = useState("");
  const [volumeGb, setVolumeGb] = useState<string>("");
  const [durationDays, setDurationDays] = useState<string>("");
  const [panelId, setPanelId] = useState<string>("");
  const [panels, setPanels] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ username?: string; sub?: string; error?: string } | null>(null);
  const [delUser, setDelUser] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState<string | null>(null);

  const loadPanels = async () => {
    try {
      const data = await apiFetch("/panels");
      setPanels(data);
      if (data.length && !panelId) setPanelId(String(data[0].id));
    } catch {}
  };
  if (panels === null) { void loadPanels(); }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const pid = parseInt(panelId, 10);
      const payload = { name, volume_gb: parseFloat(volumeGb), duration_days: parseInt(durationDays, 10) };
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
              <label className="text-sm">حجم (GB)</label>
              <input inputMode="decimal" className="w-full h-10 px-3 rounded-md border bg-background" value={volumeGb} onChange={e=>setVolumeGb(e.target.value)} placeholder="50" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm">مدت (روز)</label>
              <input inputMode="numeric" className="w-full h-10 px-3 rounded-md border bg-background" value={durationDays} onChange={e=>setDurationDays(e.target.value)} placeholder="30" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm">پنل مقصد</label>
              <select className="w-full h-10 px-3 rounded-md border bg-background" value={panelId} onChange={e=>setPanelId(e.target.value)} required>
                {(panels || []).map((p:any)=> <option key={p.id} value={p.id}>{p.name} - {p.base_url}</option>)}
              </select>
            </div>
            <div className="col-span-full flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={busy || !name || !volumeGb || !durationDays || !panelId}>ایجاد کاربر</Button>
            </div>
            {result && result.error && <div className="col-span-full text-sm bg-red-500/10 text-red-600 border border-red-500/30 rounded-md p-2">{result.error}</div>}
            {result && !result.error && (
              <div className="col-span-full text-sm bg-green-500/10 text-green-700 border border-green-500/30 rounded-md p-2">
                <div>ساخته شد: {result.username}</div>
                {result.sub && (
                  <div className="truncate">Subscription: <a className="underline" href={result.sub} target="_blank" rel="noreferrer">{result.sub}</a></div>
                )}
              </div>
            )}
          </form>
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
            <div className="space-y-1">
              <label className="text-sm">پنل مقصد</label>
              <select className="w-full h-10 px-3 rounded-md border bg-background" value={panelId} onChange={e=>setPanelId(e.target.value)} required>
                {(panels || []).map((p:any)=> <option key={p.id} value={p.id}>{p.name} - {p.base_url}</option>)}
              </select>
            </div>
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