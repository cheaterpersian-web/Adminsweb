"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";

export default function WalletPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [canView, setCanView] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [panelId, setPanelId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [addDays, setAddDays] = useState<string>("0");
  const [addGb, setAddGb] = useState<string>("0");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const me = await apiFetch("/auth/me");
        setCanView(me?.role === "admin" || me?.role === "operator");
      } catch {}
      setAuthChecked(true);
    };
    check();
  }, []);

  const load = async () => {
    try {
      const data = await apiFetch("/audit?action=wallet_charge");
      const renews = await apiFetch("/audit?action=wallet_renew");
      setLogs([...(data||[]), ...(renews||[])]
        .sort((a:any, b:any)=> (a.id || 0) > (b.id || 0) ? -1 : 1));
    } catch {}
  };
  useEffect(() => { if (authChecked && canView) load(); }, [authChecked, canView]);

  const submitRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const pid = parseInt(panelId, 10);
      const body = { username, add_days: parseInt(addDays||"0",10), add_volume_gb: parseFloat(addGb||"0") };
      const res = await apiFetch(`/panels/${pid}/renew_user`, { method: "POST", body: JSON.stringify(body) });
      if (res.ok) {
        setMsg("تمدید با موفقیت انجام شد");
        setUsername("");
        setAddDays("0");
        setAddGb("0");
        await load();
      } else {
        setMsg(res.error || "خطا در تمدید");
      }
    } catch (e:any) {
      setMsg(e?.message || "خطا");
    } finally { setBusy(false); }
  };

  if (!authChecked) return null;
  if (!canView) return (
    <main className="p-6">
      <div className="max-w-xl mx-auto text-center border rounded-md p-6 bg-yellow-500/10 border-yellow-500/30 text-yellow-700">
        دسترسی غیرمجاز
      </div>
    </main>
  );

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Wallet</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">تمدید کاربر</h2>
        <form onSubmit={submitRenew} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <input className="border rounded-md h-10 px-3" placeholder="Panel ID" value={panelId} onChange={e=>setPanelId(e.target.value)} required />
          <input className="border rounded-md h-10 px-3" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
          <input className="border rounded-md h-10 px-3" placeholder="Add days" value={addDays} onChange={e=>setAddDays(e.target.value)} />
          <input className="border rounded-md h-10 px-3" placeholder="Add GB" value={addGb} onChange={e=>setAddGb(e.target.value)} />
          <Button type="submit" disabled={busy || !panelId || !username}>تمدید</Button>
        </form>
        {msg && <div className="text-sm text-muted-foreground">{msg}</div>}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">تاریخچه شارژ و تمدید</h2>
        <div className="overflow-auto">
          <table className="min-w-[700px] w-full text-sm border">
            <thead className="bg-secondary">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">Target</th>
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
      </section>
    </main>
  );
}
