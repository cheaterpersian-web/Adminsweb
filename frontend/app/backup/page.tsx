"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

export default function BackupPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isRootAdmin, setIsRootAdmin] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [freq, setFreq] = useState<string>("60");
  const [botToken, setBotToken] = useState<string>("");
  const [chatId, setChatId] = useState<string>("");
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      const me = await apiFetch("/auth/me");
      setIsRootAdmin(!!me?.is_root_admin);
      if (me?.is_root_admin) {
        const s = await apiFetch("/backup/settings");
        setEnabled(!!s.enabled);
        setFreq(String(s.frequency_minutes ?? 60));
        setBotToken(s.telegram_bot_token ? "***" : "");
        setChatId(s.telegram_admin_chat_id || "");
        setLastSuccess(s.last_success_at || null);
      }
    } catch {}
    setAuthChecked(true);
  };
  useEffect(()=> { load(); }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload: any = { enabled, frequency_minutes: parseInt(freq || "60", 10) };
      if (botToken && botToken !== "***") payload.telegram_bot_token = botToken.trim();
      payload.telegram_admin_chat_id = chatId.trim() || null;
      await apiFetch("/backup/settings", { method: "POST", body: JSON.stringify(payload) });
      setMsg("ذخیره شد");
      await load();
    } catch (e:any) { setMsg(e?.message || "خطا در ذخیره"); }
    finally { setSaving(false); }
  };

  const runNow = async () => {
    setRunning(true);
    setMsg(null);
    try {
      const res = await apiFetch("/backup/run", { method: "POST" });
      setMsg(res.ok ? "بکاپ با موفقیت اجرا شد" : "خطا در اجرای بکاپ");
      await load();
    } catch (e:any) { setMsg(e?.message || "خطا در اجرای بکاپ"); }
    finally { setRunning(false); }
  };

  if (!authChecked) return null;
  if (!isRootAdmin) {
    return (
      <main className="p-6">
        <div className="max-w-xl mx-auto text-center border rounded-md p-6 bg-yellow-500/10 border-yellow-500/30 text-yellow-700">دسترسی غیرمجاز</div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Backup</h1>
        <p className="text-sm text-muted-foreground">تنظیم بکاپ خودکار و تلگرام</p>
      </div>

      <Card>
        <CardHeader><CardTitle>تنظیمات</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />
              <span>فعال</span>
            </label>
            <div>
              <label className="block text-sm mb-1">بازه (دقیقه)</label>
              <input className="w-full h-10 px-3 rounded-md border bg-background" type="number" min={5} value={freq} onChange={e=>setFreq(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">توکن بات تلگرام</label>
              <input className="w-full h-10 px-3 rounded-md border bg-background" placeholder="123456:ABC..." value={botToken} onChange={e=>setBotToken(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">آیدی عددی ادمین</label>
              <input className="w-full h-10 px-3 rounded-md border bg-background" placeholder="123456789" value={chatId} onChange={e=>setChatId(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره"}</Button>
              <Button variant="outline" onClick={runNow} disabled={running}>{running ? "در حال اجرا..." : "بکاپ الان"}</Button>
              {lastSuccess && <span className="text-sm text-muted-foreground">آخرین موفقیت: {new Date(lastSuccess).toLocaleString()}</span>}
            </div>
            {msg && <div className="md:col-span-2 text-sm text-muted-foreground">{msg}</div>}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

