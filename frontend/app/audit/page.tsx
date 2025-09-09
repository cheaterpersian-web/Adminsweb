"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState<string>("");

  const load = async () => {
    const qs = new URLSearchParams();
    if (action) qs.set("action", action);
    if (userId) qs.set("user_id", userId);
    const data = await apiFetch(`/audit?${qs.toString()}`);
    setLogs(data);
  };
  useEffect(() => { load(); }, []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Audit Logs</h1>
      <div className="flex gap-2">
        <input className="border rounded-md h-10 px-3" placeholder="action" value={action} onChange={e=>setAction(e.target.value)} />
        <input className="border rounded-md h-10 px-3" placeholder="user id" value={userId} onChange={e=>setUserId(e.target.value)} />
        <button className="border rounded-md h-10 px-4" onClick={load}>Filter</button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-[600px] w-full text-sm border">
          <thead className="bg-secondary">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Action</th>
              <th className="p-2">User</th>
              <th className="p-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l:any)=> (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.id}</td>
                <td className="p-2">{l.action}</td>
                <td className="p-2">{l.user_id}</td>
                <td className="p-2">{l.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}