"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

type Panel = { id: number; name: string; base_url: string; username: string; is_default?: boolean; type?: string };
type InboundItem = { id: string; tag?: string; remark?: string };
type HostItem = { host: string };

export default function PanelsPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isRootAdmin, setIsRootAdmin] = useState(false);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [form, setForm] = useState({ name: "", base_url: "", username: "", password: "", type: "marzban" as "marzban" | "xui" });
  const [busy, setBusy] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [inbounds, setInbounds] = useState<InboundItem[] | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string>("");
  const [selectedInbound, setSelectedInbound] = useState<string>("");
  const [hosts, setHosts] = useState<HostItem[] | null>(null);
  const [savedByPanel, setSavedByPanel] = useState<Record<number, string[]>>({});

  const load = async () => {
    try {
      const data = await apiFetch("/panels");
      setPanels(data);
      // load saved selections for each panel
      try {
        await Promise.all((data as Panel[]).map(async (p: Panel) => {
          const sel = await apiFetch(`/panels/${p.id}/inbound`);
          setSavedByPanel(prev => ({ ...prev, [p.id]: sel.inbound_ids || [] }));
        }));
      } catch {}
    } catch {}
  };
  useEffect(() => {
    const check = async () => {
      try {
        const me = await apiFetch("/auth/me");
        setIsRootAdmin(!!me?.is_root_admin);
        if (me?.is_root_admin) {
          await load();
        }
      } catch {}
      setAuthChecked(true);
    };
    check();
  }, []);

  const normalizeUrl = (u: string) => {
    const v = (u || "").trim();
    if (!v) return v;
    if (!/^https?:\/\//i.test(v)) return `https://${v}`;
    return v;
  };

  const createPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTestMsg(null);
    try {
      const payload = { ...form, base_url: normalizeUrl(form.base_url) };
      const p = await apiFetch("/panels", { method: "POST", body: JSON.stringify(payload) });
      setForm({ name: "", base_url: "", username: "", password: "" });
      await load();
      if (p && p.id) {
        setSelectedPanelId(String(p.id));
        await loadInbounds(p.id);
      }
      setTestMsg("پنل با موفقیت ذخیره شد");
    } catch (err: any) {
      setTestMsg(err?.message || "خطا در ذخیره پنل");
    } finally { setBusy(false); }
  };

  const testPanel = async () => {
    setBusy(true);
    setTestMsg(null);
    try {
      const res = await apiFetch("/panels/test", { method: "POST", body: JSON.stringify({ base_url: normalizeUrl(form.base_url), username: form.username, password: form.password }) });
      if (res.ok) {
        setTestMsg(`اتصال موفق (${res.endpoint}), token: ${res.token_preview || "..."}`);
      } else {
        setTestMsg(`عدم موفقیت (${res.status || "?"}) ${res.error || ""}`);
      }
    } catch (e:any) {
      setTestMsg(e?.message || "خطا در اتصال");
    } finally { setBusy(false); }
  };

  const loadInbounds = async (panelId: number) => {
    setInbounds(null);
    try {
      const res = await apiFetch(`/panels/${panelId}/inbounds`);
      setInbounds(res.items || []);
      // Load selected ones
      try {
        const sel = await apiFetch(`/panels/${panelId}/inbound`);
        const ids: string[] = sel.inbound_ids || [];
        // check corresponding checkboxes
        setTimeout(() => {
          document.querySelectorAll<HTMLInputElement>("input[name=panel-inbound]").forEach(el => {
            el.checked = ids.includes(el.value);
          });
        }, 0);
      } catch {}
    } catch { setInbounds([]); }
  };

  const loadHosts = async (panelId: number) => {
    setHosts(null);
    try {
      const res = await apiFetch(`/panels/${panelId}/hosts`);
      setHosts(res.items || []);
    } catch { setHosts([]); }
  };

  const refreshLists = async () => {
    const pid = parseInt(selectedPanelId, 10);
    if (!pid) return;
    setBusy(true);
    try {
      await Promise.all([loadInbounds(pid), loadHosts(pid)]);
      setTestMsg("لیست‌ها بروزرسانی شد");
    } catch (e:any) {
      setTestMsg(e.message || "خطا در بروزرسانی");
    } finally { setBusy(false); }
  };

  const saveInbound = async () => {
    if (!selectedPanelId) return;
    setBusy(true);
    try {
      const pid = parseInt(selectedPanelId, 10);
      const selectedIds = Array.from(document.querySelectorAll<HTMLInputElement>("input[name=panel-inbound]:checked")).map(el => el.value);
      await apiFetch(`/panels/${pid}/inbound`, { method: "POST", body: JSON.stringify({ inbound_ids: selectedIds }) });
      setTestMsg("این‌باند ذخیره شد");
      setSavedByPanel(prev => ({ ...prev, [pid]: selectedIds }));
    } catch (e:any) {
      setTestMsg(e.message || "خطا در ذخیره این‌باند");
    } finally { setBusy(false); }
  };

  const setDefault = async (id: number) => {
    try {
      await apiFetch(`/panels/${id}/default`, { method: "POST" });
      await load();
    } catch {}
  };

  const removePanel = async (id: number) => {
    if (!confirm("پنل حذف شود؟")) return;
    try {
      await apiFetch(`/panels/${id}`, { method: "DELETE" });
      await load();
    } catch (e:any) {
      setTestMsg(e?.message || "خطا در حذف پنل");
    }
  };

  if (!authChecked) return null;
  if (!isRootAdmin) {
    return (
      <main className="p-6">
        <div className="max-w-xl mx-auto text-center border rounded-md p-6 bg-yellow-500/10 border-yellow-500/30 text-yellow-700">
          دسترسی غیرمجاز: شما اجازه ورود به این صفحه را ندارید.
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Panels</h1>
        <p className="text-sm text-muted-foreground">افزودن پنل (Marzban یا XUI) با URL / User / Password</p>
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
              <label className="text-sm">نوع پنل</label>
              <select className="w-full h-10 px-3 rounded-md border bg-background" value={form.type} onChange={e=>setForm(v=>({...v, type: e.target.value as any}))}>
                <option value="marzban">Marzban</option>
                <option value="xui">XUI</option>
              </select>
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
              <select className="w-full h-10 px-3 rounded-md border bg-background" value={selectedPanelId} onChange={e=>{ setSelectedPanelId(e.target.value); const v = parseInt(e.target.value,10); if (v) { loadInbounds(v); loadHosts(v); } }}>
                <option value="">انتخاب پنل</option>
                {panels.map(p=> <option key={p.id} value={p.id}>{p.name} - {p.base_url} ({p.type || 'marzban'})</option>)}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm">انتخاب این‌باندها (چندتایی)</label>
              <div className="border rounded-md p-2 max-h-64 overflow-auto">
                {(inbounds||[]).map(i=> (
                  <label key={i.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" name="panel-inbound" value={i.id} />
                    <span className="text-sm">{i.tag || i.remark || i.id}</span>
                  </label>
                ))}
                {(!inbounds || inbounds.length===0) && <div className="text-sm text-muted-foreground">لیست خالی است</div>}
              </div>
            </div>
            <div className="col-span-full">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={refreshLists} disabled={!selectedPanelId || busy}>بروزرسانی لیست‌ها</Button>
                <Button onClick={saveInbound} disabled={!selectedPanelId || busy}>ذخیره این‌باندها</Button>
              </div>
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
            <table className="min-w-full sm:min-w-[900px] w-full text-sm border">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-2 text-left hidden sm:table-cell">ID</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Base URL</th>
                  <th className="p-2 text-left hidden md:table-cell">Username</th>
                  <th className="p-2 text-left">Selected Inbounds</th>
                  <th className="p-2 text-left">Default</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {panels.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 hidden sm:table-cell">{p.id}</td>
                    <td className="p-2">{p.name} <span className="text-xs text-muted-foreground">({p.type || 'marzban'})</span></td>
                    <td className="p-2">{p.base_url}</td>
                    <td className="p-2 hidden md:table-cell">{p.username}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {(savedByPanel[p.id] || []).map((id)=> (
                          <span key={id} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">{id}</span>
                        ))}
                        {(!savedByPanel[p.id] || savedByPanel[p.id].length===0) && <span className="text-xs text-muted-foreground">-</span>}
                      </div>
                    </td>
                    <td className="p-2">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={!!p.is_default} onChange={()=>setDefault(p.id)} />
                        <span className="text-xs">تنظیم به عنوان پیش‌فرض</span>
                      </label>
                  </td>
                  <td className="p-2">
                    <Button size="sm" variant="destructive" onClick={()=>removePanel(p.id)}>حذف</Button>
                  </td>
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

