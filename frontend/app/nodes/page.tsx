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
      <div className="text-sm text-muted-foreground">این بخش با Panels جایگزین شد. از منو به Panels بروید.</div>
    </main>
  );
}

