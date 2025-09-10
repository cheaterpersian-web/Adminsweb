"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function ConfigsPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    const data = await apiFetch("/configs");
    setConfigs(data);
  };
  useEffect(() => { load(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
    const form = new FormData();
    form.append("title", title);
    form.append("file", file);
    const token = localStorage.getItem("access_token") || "";
    const res = await fetch(base + "/configs", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    if (res.ok) {
      setTitle(""); setFile(null); load();
    }
  };

  const updateTitle = async (id: number, newTitle: string) => {
    setBusyId(id);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(`${base}/configs/${id}?title=${encodeURIComponent(newTitle)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) load();
    } finally { setBusyId(null); }
  };

  const deleteConfig = async (id: number) => {
    setBusyId(id);
    try {
      await apiFetch(`/configs/${id}`, { method: "DELETE" });
      load();
    } finally { setBusyId(null); }
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Configs</h1>
      <form onSubmit={upload} className="flex flex-wrap gap-2 items-end">
        <input className="border rounded-md h-10 px-3" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <input type="file" onChange={e=>setFile(e.target.files?.[0] || null)} />
        <button className="border rounded-md h-10 px-4 bg-primary text-primary-foreground" type="submit">Upload</button>
      </form>

      <ul className="space-y-2">
        {configs.map((c:any)=> (
          <li key={c.id} className="border rounded-md p-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <input className="border rounded-md h-9 px-2 w-full" defaultValue={c.title} onBlur={e=>updateTitle(c.id, e.target.value)} />
              <div className="text-xs text-muted-foreground mt-1 truncate">{c.file_path}</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="border rounded-md h-9 px-3" disabled={busyId===c.id} onClick={()=>deleteConfig(c.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}