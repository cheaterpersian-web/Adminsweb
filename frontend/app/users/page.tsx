"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";

export default function UsersPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isRootAdmin, setIsRootAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "", role: "operator" });
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await apiFetch("/users");
      // fetch assigned templates per user
      const withTpl = await Promise.all((data||[]).map(async (u:any)=>{
        try {
          const a = await apiFetch(`/templates/assigned/${u.id}`);
          return { ...u, template_id: a?.template_id ?? u.template_id };
        } catch { return u; }
      }));
      setUsers(withTpl);
    } catch {}
    try { const t = await apiFetch("/templates"); setTemplates(t); } catch {}
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

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", email: "", username: "", password: "", role: "operator" });
      load();
    } finally { setLoading(false); }
  };

  const updateUser = async (id: number, updates: any) => {
    setSavingId(id);
    try {
      await apiFetch(`/users/${id}`, { method: "PUT", body: JSON.stringify(updates) });
      load();
    } finally { setSavingId(null); }
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    setSavingId(id);
    try {
      await apiFetch(`/users/${id}/${isActive ? "disable" : "enable"}`, { method: "POST" });
      load();
    } finally { setSavingId(null); }
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
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <form onSubmit={createUser} className="flex flex-wrap gap-2 items-end">
        <input className="border rounded-md h-10 px-3" placeholder="Name" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} />
        <input className="border rounded-md h-10 px-3" placeholder="Email (optional for operator)" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))} />
        <input className="border rounded-md h-10 px-3" placeholder="Username (used if email empty)" value={form.username} onChange={e=>setForm(v=>({...v,username:e.target.value}))} />
        <input className="border rounded-md h-10 px-3" placeholder="Password" type="password" value={form.password} onChange={e=>setForm(v=>({...v,password:e.target.value}))} />
        <select className="border rounded-md h-10 px-3" value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))}>
          <option value="admin">admin</option>
          <option value="operator">operator</option>
          <option value="viewer">viewer</option>
        </select>
        <Button type="submit" disabled={loading}>Create</Button>
      </form>
      <div className="overflow-auto">
        <table className="min-w-[600px] w-full text-sm border">
          <thead className="bg-secondary">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Role</th>
              <th className="p-2 text-left">Active</th>
              <th className="p-2 text-left">Actions</th>
              <th className="p-2 text-left">Template</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u=> (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.id}</td>
                <td className="p-2">
                  <input className="border rounded-md h-9 px-2" defaultValue={u.name} onBlur={e=>updateUser(u.id, { name: e.target.value })} />
                </td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">
                  <select className="border rounded-md h-9 px-2" defaultValue={u.role} onChange={e=>updateUser(u.id, { role: e.target.value })}>
                    <option value="admin">admin</option>
                    <option value="operator">operator</option>
                    <option value="viewer">viewer</option>
                  </select>
                </td>
                <td className="p-2">{u.is_active ? "Yes" : "No"}</td>
                <td className="p-2">
                  <Button variant="outline" size="sm" disabled={savingId===u.id} onClick={()=>toggleActive(u.id, u.is_active)}>
                    {u.is_active ? "Disable" : "Enable"}
                  </Button>
                </td>
                <td className="p-2">
                  <select className="border rounded-md h-9 px-2" value={u.template_id || ""} onChange={async (e)=>{
                    const tid = parseInt(e.target.value,10);
                    if (!tid) return;
                    await apiFetch('/templates/assign', { method: 'POST', body: JSON.stringify({ user_id: u.id, template_id: tid }) });
                    // reflect in UI
                    setUsers(list => list.map(x => x.id === u.id ? { ...x, template_id: tid } : x));
                  }}>
                    <option value="">انتخاب تمپلیت</option>
                    {templates.map((t:any)=> <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}