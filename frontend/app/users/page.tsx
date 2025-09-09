"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "operator" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const data = await apiFetch("/users");
      setUsers(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", email: "", password: "", role: "operator" });
      load();
    } finally { setLoading(false); }
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <form onSubmit={createUser} className="flex flex-wrap gap-2 items-end">
        <input className="border rounded-md h-10 px-3" placeholder="Name" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} />
        <input className="border rounded-md h-10 px-3" placeholder="Email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))} />
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
            </tr>
          </thead>
          <tbody>
            {users.map(u=> (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.id}</td>
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.is_active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}