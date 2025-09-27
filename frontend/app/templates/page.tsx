"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

type Panel = { id: number; name: string; base_url: string };
type Template = { id: number; name: string; panel_id: number; inbound_ids: string[] };

export default function TemplatesPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isRootAdmin, setIsRootAdmin] = useState(false);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<{ name: string; panel_id: string; inbound_ids: string[] }>({ name: "", panel_id: "", inbound_ids: [] });
  const [inbounds, setInbounds] = useState<{ id: string; tag?: string; remark?: string }[] | null>(null);

  const load = async () => {
    const p = await apiFetch("/panels"); setPanels(p);
    const t = await apiFetch("/templates"); setTemplates(t);
  };
  const loadInbounds = async (panelId: number) => {
    setInbounds(null);
    try { const res = await apiFetch(`/panels/${panelId}/inbounds`); setInbounds(res.items || []); } catch { setInbounds([]); }
  };

  useEffect(()=>{
    const check = async () => {
      try {
        const me = await apiFetch("/auth/me");
        setIsRootAdmin(!!me?.is_root_admin);
        if (me?.is_root_admin) await load();
      } catch {}
      setAuthChecked(true);
    };
    check();
  },[]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, panel_id: parseInt(form.panel_id, 10), inbound_ids: form.inbound_ids };
    await apiFetch("/templates", { method: "POST", body: JSON.stringify(payload) });
    setForm({ name: "", panel_id: "", inbound_ids: [] });
    await load();
  };

  const toggleInbound = (id: string) => {
    setForm(s=> ({ ...s, inbound_ids: s.inbound_ids.includes(id) ? s.inbound_ids.filter(x=>x!==id) : [...s.inbound_ids, id] }));
  };

  if (!authChecked) return null;
  if (!isRootAdmin) {
    return (
      <main className="p-6">
        <div className="max-w-xl mx-auto text-center border rounded-md p-6 bg-yellow-500/10 border-yellow-500/30 text-yellow-700">دسترسی غیرمجاز</div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="text-sm text-muted-foreground">تعریف تمپلیت (پنل + این‌باندها)</p>
      </div>

      <Card>
        <CardHeader><CardTitle>ایجاد تمپلیت</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            <div className="space-y-1">
              <label className="text-sm">نام تمپلیت</label>
              <input className="w-full h-10 px-3 rounded-md border bg-background" value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm">پنل</label>
              <select className="w-full h-10 px-3 rounded-md border bg-background" value={form.panel_id} onChange={e=>{ setForm(s=>({...s,panel_id:e.target.value,inbound_ids:[]})); const v=parseInt(e.target.value,10); if(v) loadInbounds(v); }} required>
                <option value="">انتخاب پنل</option>
                {panels.map(p=> <option key={p.id} value={p.id}>{p.name} - {p.base_url}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm">این‌باندها</label>
              <div className="border rounded-md p-2 max-h-64 overflow-auto">
                {(inbounds||[]).map(i=> (
                  <label key={i.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" checked={form.inbound_ids.includes(i.id)} onChange={()=>toggleInbound(i.id)} />
                    <span className="text-sm">{i.tag || i.remark || i.id}</span>
                  </label>
                ))}
                {(!inbounds || inbounds.length===0) && <div className="text-sm text-muted-foreground">لیست خالی است</div>}
              </div>
            </div>
            <div className="col-span-full"><Button type="submit">ثبت تمپلیت</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>لیست تمپلیت‌ها</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Panel</th>
                  <th className="p-2 text-left">Inbounds</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t=> (
                  <tr key={t.id} className="border-t">
                    <td className="p-2">{t.id}</td>
                    <td className="p-2">{t.name}</td>
                    <td className="p-2">{panels.find(p=>p.id===t.panel_id)?.name || t.panel_id}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {t.inbound_ids.map(id=> <span key={id} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">{id}</span>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

