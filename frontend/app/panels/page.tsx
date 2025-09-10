"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

type Panel = { id: number; name: string; base_url: string; username: string };
type InboundItem = { id: string; tag?: string; remark?: string };

export default function PanelsPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [form, setForm] = useState({ name: "", base_url: "", username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [inbounds, setInbounds] = useState<InboundItem[] | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string>("");
  const [selectedInbound, setSelectedInbound] = useState<string>("");

  const load = async () => {
    try {
      const data = await apiFetch("/panels");
      setPanels(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const createPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTestMsg(null);
    try {
      await apiFetch("/panels", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", base_url: "", username: "", password: "" });
      await load();
    } finally { setBusy(false); }
  };

  const testPanel = async () => {
    setBusy(true);
    setTestMsg(null);
    try {
      const res = await apiFetch("/panels/test", { method: "POST", body: JSON.stringify({ base_url: form.base_url, username: form.username, password: form.password }) });
      if (res.ok) {
        setTestMsg(`اتصال موفق (${res.endpoint}), token: ${res.token_preview || "..."}`);
      } else {
        setTestMsg(`عدم موفقیت (${res.status || "?"}) ${res.error || ""}`);
      }
    } catch (e:any) {
      setTestMsg(e.message || "خطا در اتصال");
    } finally { setBusy(false); }
  };

  const loadInbounds = async (panelId: number) => {
    setInbounds(null);
    try {
      const res = await apiFetch(`/panels/${panelId}/inbounds`);
      setInbounds(res.items || []);
    } catch { setInbounds([]); }
  };

  const saveInbound = async () => {
    if (!selectedPanelId || !selectedInbound) return;
    setBusy(true);
    try {
      const pid = parseInt(selectedPanelId, 10);
      const item = (inbounds || []).find(x => x.id === selectedInbound);
      await apiFetch(`/panels/${pid}/inbound`, { method: "POST", body: JSON.stringify({ inbound_id: selectedInbound, inbound_tag: item?.tag || null }) });
      setTestMsg("این‌باند ذخیره شد");
    } catch (e:any) {
      setTestMsg(e.message || "خطا در ذخیره این‌باند");
    } finally { setBusy(false); }
  };

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Panels</h1>
        <p className="text-sm text-muted-foreground">افزودن پنل مرزبان با URL / User / Password</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>افزودن پنل</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createPanel} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm">نام</label>
              <input className="w-full h-10 px-3 rounded-md border bg-background" placeholder="مثال: panel-1" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Base URL</label>
              <input className="w-full h-10 px-3 rounded-md border bg-background" placeholder="https://panel.example.com" value={form.base_url} onChange={e=>setForm(v=>({...v,base_url:e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Username</label>
              <input className="w-full h-10 px-3 rounded-md border bg-background" value={form.username} onChange={e=>setForm(v=>({...v,username:e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Password</label>
              <input type="password" className="w-full h-10 px-3 rounded-md border bg-background" value={form.password} onChange={e=>setForm(v=>({...v,password:e.target.value}))} required />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 col-span-full">
              <Button type="button" variant="outline" onClick={testPanel} disabled={busy || !form.base_url || !form.username || !form.password}>تست اتصال</Button>
              <Button type="submit" disabled={busy || !form.name || !form.base_url || !form.username || !form.password}>ذخیره پنل</Button>
            </div>
            {testMsg && <div className="col-span-full text-sm text-muted-foreground">{testMsg}</div>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>انتخاب این‌باند برای هر پنل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm">پنل</label>
              <select className="w-full h-10 px-3 rounded-md border bg-background" value={selectedPanelId} onChange={e=>{ setSelectedPanelId(e.target.value); const v = parseInt(e.target.value,10); if (v) loadInbounds(v); }}>
                <option value="">انتخاب پنل</option>
                {panels.map(p=> <option key={p.id} value={p.id}>{p.name} - {p.base_url}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm">این‌باند</label>
              <select className="w-full h-10 px-3 rounded-md border bg-background" value={selectedInbound} onChange={e=>setSelectedInbound(e.target.value)} disabled={!inbounds}>
                <option value="">انتخاب این‌باند</option>
                {(inbounds||[]).map(i=> (
                  <option key={i.id} value={i.id}>{i.tag || i.remark || i.id}</option>
                ))}
              </select>
            </div>
            <div className="col-span-full">
              <Button onClick={saveInbound} disabled={!selectedPanelId || !selectedInbound || busy}>ذخیره این‌باند</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>لیست پنل‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="min-w-full sm:min-w-[700px] w-full text-sm border">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-2 text-left hidden sm:table-cell">ID</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Base URL</th>
                  <th className="p-2 text-left hidden md:table-cell">Username</th>
                </tr>
              </thead>
              <tbody>
                {panels.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 hidden sm:table-cell">{p.id}</td>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">{p.base_url}</td>
                    <td className="p-2 hidden md:table-cell">{p.username}</td>
                  </tr>
                ))}
                {panels.length === 0 && (
                  <tr><td colSpan={4} className="p-3 text-muted-foreground">پنلی ثبت نشده است</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

