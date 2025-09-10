"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";

type Node = { id: number; name: string; status: string; last_seen?: string; metadata?: any };

export default function NodesPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [form, setForm] = useState({ name: "", status: "offline" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const data = await apiFetch("/nodes");
      setNodes(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const createNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch("/nodes", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", status: "offline" });
      load();
    } finally { setBusy(false); }
  };

  const saveNode = async (id: number, updates: Partial<Node>) => {
    setBusy(true);
    try {
      await apiFetch(`/nodes/${id}`, { method: "PUT", body: JSON.stringify(updates) });
      load();
    } finally { setBusy(false); }
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Nodes</h1>
      <form onSubmit={createNode} className="flex flex-wrap gap-2 items-end">
        <input className="border rounded-md h-10 px-3" placeholder="Name" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} />
        <select className="border rounded-md h-10 px-3" value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value}))}>
          <option value="offline">offline</option>
          <option value="online">online</option>
          <option value="degraded">degraded</option>
        </select>
        <Button type="submit" disabled={busy}>Create</Button>
      </form>

      <div className="overflow-auto">
        <table className="min-w-[700px] w-full text-sm border">
          <thead className="bg-secondary">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Last Seen</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map(n => (
              <tr key={n.id} className="border-t">
                <td className="p-2">{n.id}</td>
                <td className="p-2">
                  <input className="border rounded-md h-9 px-2" defaultValue={n.name} onBlur={e=>saveNode(n.id, { name: e.target.value })} />
                </td>
                <td className="p-2">
                  <select className="border rounded-md h-9 px-2" defaultValue={n.status} onChange={e=>saveNode(n.id, { status: e.target.value })}>
                    <option value="offline">offline</option>
                    <option value="online">online</option>
                    <option value="degraded">degraded</option>
                  </select>
                </td>
                <td className="p-2">{n.last_seen || "-"}</td>
                <td className="p-2 text-right">
                  <span className="text-xs text-muted-foreground">{n.metadata ? "has meta" : ""}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

