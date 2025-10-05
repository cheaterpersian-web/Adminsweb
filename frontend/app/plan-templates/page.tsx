"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

type Plan = { id: number; name: string; price: number; effective_price?: number; category_id?: number };
type TemplateItem = { plan_id: number; price_override: number };
type PlanTemplate = { id: number; name: string; items: TemplateItem[] };
type User = { id: number; name: string; email: string; role: string };

export default function PlanTemplatesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignTplId, setAssignTplId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const categories = useMemo(() => {
    const map: Record<string, Plan[]> = {};
    for (const p of plans) {
      const key = String(p.category_id || "uncat");
      map[key] = map[key] || [];
      map[key].push(p);
    }
    return map;
  }, [plans]);

  const load = async () => {
    try {
      const [pls, tpls] = await Promise.all([
        apiFetch("/plans"),
        apiFetch("/plan-templates"),
      ]);
      setPlans(pls || []);
      setTemplates(tpls || []);
    } catch {}
    try { const us = await apiFetch("/users"); setUsers((us||[]).filter((u:any)=>u.role === "operator")); } catch {}
  };
  useEffect(()=>{ void load(); }, []);

  const startFromTemplate = (tpl: PlanTemplate) => {
    const map: Record<number, number> = {};
    for (const it of tpl.items) map[it.plan_id] = Number(it.price_override);
    setSelected(map);
    setName(tpl.name + " copy");
  };

  const createTemplate = async () => {
    setLoading(true); setMsg(null);
    try {
      const items: TemplateItem[] = Object.entries(selected).map(([plan_id, price_override]) => ({ plan_id: Number(plan_id), price_override: Number(price_override) }));
      const body = { name: name || "custom-pricing", items };
      await apiFetch("/plan-templates", { method: "POST", body: JSON.stringify(body) });
      setName(""); setSelected({});
      setMsg("Template created");
      await load();
    } catch (e:any) { setMsg(e.message || "خطا"); }
    finally { setLoading(false); }
  };

  const updateTemplate = async (tpl: PlanTemplate) => {
    setLoading(true); setMsg(null);
    try {
      const items: TemplateItem[] = Object.entries(selected).map(([plan_id, price_override]) => ({ plan_id: Number(plan_id), price_override: Number(price_override) }));
      const body: any = { items };
      if (name) body.name = name;
      await apiFetch(`/plan-templates/${tpl.id}`, { method: "PUT", body: JSON.stringify(body) });
      setMsg("Template updated");
      await load();
    } catch (e:any) { setMsg(e.message || "خطا"); }
    finally { setLoading(false); }
  };

  const deleteTemplate = async (tpl: PlanTemplate) => {
    if (!confirm(`حذف تمپلیت ${tpl.name}؟`)) return;
    setLoading(true); setMsg(null);
    try {
      await apiFetch(`/plan-templates/${tpl.id}`, { method: "DELETE" });
      setMsg("Deleted");
      await load();
    } catch (e:any) { setMsg(e.message || "خطا"); }
    finally { setLoading(false); }
  };

  const assignTemplate = async () => {
    if (!assignUserId || !assignTplId) { setMsg("انتخاب کاربر و تمپلیت الزامی است"); return; }
    setLoading(true); setMsg(null);
    try {
      await apiFetch(`/plan-templates/assign`, { method: "POST", body: JSON.stringify({ user_id: Number(assignUserId), template_id: Number(assignTplId) }) });
      setMsg("Assigned");
    } catch (e:any) { setMsg(e.message || "خطا"); }
    finally { setLoading(false); }
  };

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Plan Templates</h1>
        <p className="text-sm text-muted-foreground">قیمت‌های اختصاصی برای نماینده‌ها</p>
      </div>

      <Card className="neon-card">
        <CardHeader>
          <CardTitle>تعریف تمپلیت</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-3 md:col-span-2">
              <div className="space-y-1">
                <label className="text-sm">نام تمپلیت</label>
                <input className="w-full h-10 px-3 rounded-md border bg-background" value={name} onChange={e=>setName(e.target.value)} placeholder="مثال: pricing-operator-01" />
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">برای هر پلن قیمت اختصاصی وارد کنید (خالی=قیمت اصلی)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-auto p-2 border rounded-md">
                  {Object.entries(categories).map(([cat, list]) => (
                    <div key={cat} className="space-y-2">
                      <div className="text-xs uppercase text-muted-foreground">{cat === "uncat" ? "بدون دسته" : `Category ${cat}`}</div>
                      {(list as Plan[]).map(p => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className="flex-1 truncate text-sm">{p.name}</div>
                          <input
                            className="w-32 h-9 px-2 rounded-md border bg-background"
                            type="number"
                            placeholder={String(p.price)}
                            value={selected[p.id] ?? ""}
                            onChange={e=> setSelected(s=>({ ...s, [p.id]: e.target.value ? Number(e.target.value) : undefined as any }))}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={createTemplate} disabled={loading} className="btn-neon">ساخت</Button>
                <Button onClick={()=>{ setName(""); setSelected({}); }} variant="outline">پاک‌کردن فرم</Button>
              </div>
              {msg && <div className="text-sm text-muted-foreground">{msg}</div>}
            </div>
            <div className="space-y-3">
              <div className="text-sm font-medium">تمپلیت‌های موجود</div>
              <div className="space-y-2 max-h-[460px] overflow-auto">
                {templates.map(tpl => (
                  <div key={tpl.id} className="border rounded-md p-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate">{tpl.name}</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={()=>startFromTemplate(tpl)}>Load</Button>
                        <Button size="sm" variant="outline" onClick={()=>updateTemplate(tpl)}>Save</Button>
                        <Button size="sm" variant="destructive" onClick={()=>deleteTemplate(tpl)}>Delete</Button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{tpl.items.length} items</div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="text-sm text-muted-foreground">موردی نیست</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="neon-card">
        <CardHeader>
          <CardTitle>انتساب تمپلیت به نماینده</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm">نماینده</label>
              <select className="h-10 px-3 rounded-md border bg-background min-w-[220px]" value={assignUserId} onChange={e=>setAssignUserId(e.target.value)}>
                <option value="">- انتخاب -</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm">تمپلیت</label>
              <select className="h-10 px-3 rounded-md border bg-background min-w-[220px]" value={assignTplId} onChange={e=>setAssignTplId(e.target.value)}>
                <option value="">- انتخاب -</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <Button onClick={assignTemplate} disabled={loading}>اعمال</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

