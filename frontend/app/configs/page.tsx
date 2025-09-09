"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function ConfigsPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");

  const load = async () => {
    const data = await apiFetch("/configs");
    setConfigs(data);
  };
  useEffect(() => { load(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const form = new FormData();
    form.append("title", title);
    form.append("file", file);
    const token = localStorage.getItem("access_token") || "";
    const res = await fetch(base + "/configs", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    if (res.ok) {
      setTitle(""); setFile(null); load();
    }
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
          <li key={c.id} className="border rounded-md p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-muted-foreground">{c.file_path}</div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}