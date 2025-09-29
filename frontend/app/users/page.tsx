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
                <td className="p-2">
                  <input className="border rounded-md h-9 px-2 w-56" defaultValue={u.email}
                         onBlur={e=>updateUser(u.id, { email: e.target.value })} />
                </td>
                <td className="p-2">
                  <select className="border rounded-md h-9 px-2" defaultValue={u.role} onChange={e=>updateUser(u.id, { role: e.target.value })}>
                    <option value="admin">admin</option>
                    <option value="operator">operator</option>
                    <option value="viewer">viewer</option>
                  </select>
                </td>
                <td className="p-2">{u.is_active ? "Yes" : "No"}</td>
                <td className="p-2 space-x-2">
                  <Button variant="outline" size="sm" disabled={savingId===u.id} onClick={()=>toggleActive(u.id, u.is_active)}>
                    {u.is_active ? "Disable" : "Enable"}
                  </Button>
                  <PasswordReset userId={u.id} onSaved={load} />
                  <ViewCreatedConfigs userId={u.id} />
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

function PasswordReset({ userId, onSaved }: { userId: number; onSaved: ()=>void }) {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <span>
      <Button variant="outline" size="sm" onClick={()=>setOpen(true)}>Set Password</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-md p-4 w-[360px] space-y-3">
            <div className="font-semibold">Set new password</div>
            <div className="flex items-center gap-2">
              <input className="border rounded-md h-9 px-2 flex-1" type={show?"text":"password"} value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="New password" />
              <Button variant="outline" size="sm" onClick={()=>setShow(s=>!s)}>{show?"Hide":"Show"}</Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={()=>{ setOpen(false); setPwd(""); }}>Cancel</Button>
              <Button size="sm" disabled={busy || !pwd.trim()} onClick={async()=>{
                setBusy(true);
                try { await apiFetch(`/users/${userId}`, { method: 'PUT', body: JSON.stringify({ password: pwd }) }); onSaved(); setOpen(false); setPwd(""); } finally { setBusy(false); }
              }}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

function ViewCreatedConfigs({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/panels/created/by-user/${userId}`);
      setItems(res?.items || []);
    } finally { setLoading(false); }
  };
  return (
    <span>
      <Button variant="outline" size="sm" onClick={()=>{ setOpen(true); if (items===null) void load(); }}>Configs</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-md p-4 w-[720px] max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Created configs</div>
              <Button variant="outline" size="sm" onClick={()=>setOpen(false)}>Close</Button>
            </div>
            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!loading && (
              <table className="w-full text-sm border">
                <thead className="bg-secondary">
                  <tr>
                    <th className="p-2 text-left">Panel</th>
                    <th className="p-2 text-left">Username</th>
                    <th className="p-2 text-left">Created</th>
                    <th className="p-2 text-left">Subscription</th>
                  </tr>
                </thead>
                <tbody>
                  {(items||[]).map((r:any)=> (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.panel_id}</td>
                      <td className="p-2">{r.username}</td>
                      <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="p-2 truncate">
                        {r.subscription_url ? (
                          <a className="underline" href={r.subscription_url} target="_blank" rel="noreferrer">Open</a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {items && items.length === 0 && (
                    <tr><td className="p-3 text-muted-foreground" colSpan={4}>Empty</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </span>
  );
}