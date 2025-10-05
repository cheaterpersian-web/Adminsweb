"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { formatToman } from "../../lib/utils";
import { Button } from "../../components/ui/button";

export default function WalletsAdminPage() {
  const [isRootAdmin, setIsRootAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<number, string>>({});
  const [amountByUser, setAmountByUser] = useState<Record<number, string>>({});
  const [reasonByUser, setReasonByUser] = useState<Record<number, string>>({});
  const [targetByUser, setTargetByUser] = useState<Record<number, string>>({});
  const [myBalance, setMyBalance] = useState<string>("0.00");
  const [myTxs, setMyTxs] = useState<any[]>([]);
  const [loadingMy, setLoadingMy] = useState(true);

  const load = async () => {
    try {
      const me = await apiFetch("/auth/me");
      setIsRootAdmin(!!me?.is_root_admin);
      const us = await apiFetch("/users");
      setUsers(us);
      const map: Record<number, string> = {};
      for (const u of us) {
        try { const w = await apiFetch(`/wallet/${u.id}`); map[u.id] = String(w.balance); } catch {}
      }
      setBalances(map);
    } catch {}
  };
  useEffect(()=> { load(); }, []);

  const loadMy = async () => {
    setLoadingMy(true);
    try {
      const [w, t] = await Promise.all([
        apiFetch("/wallet/me"),
        apiFetch("/wallet/me/transactions"),
      ]);
      if (w && typeof w.balance !== "undefined") setMyBalance(String(w.balance));
      setMyTxs((t && Array.isArray(t.items)) ? t.items : []);
    } catch {
      setMyTxs([]);
    } finally { setLoadingMy(false); }
  };
  useEffect(()=> { if (!isRootAdmin) { void loadMy(); } }, [isRootAdmin]);

  const adjust = async (uid: number) => {
    const amount = amountByUser[uid];
    const reason = reasonByUser[uid];
    if (!amount) return;
    await apiFetch(`/wallet/${uid}/adjust`, { method: "POST", body: JSON.stringify({ amount, reason }) });
    setAmountByUser(s=> ({ ...s, [uid]: "" }));
    setReasonByUser(s=> ({ ...s, [uid]: "" }));
    await load();
  };

  const setBalance = async (uid: number) => {
    const target = parseFloat(targetByUser[uid] || "");
    const current = parseFloat(balances[uid] || "0");
    if (isNaN(target)) return;
    const delta = (target - current).toFixed(2);
    await apiFetch(`/wallet/${uid}/adjust`, { method: "POST", body: JSON.stringify({ amount: delta, reason: "Set balance" }) });
    setTargetByUser(s=> ({ ...s, [uid]: "" }));
    await load();
  };

  // If not root admin, show personal wallet view here
  if (!isRootAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
          <p className="text-sm text-muted-foreground">موجودی و تراکنش‌های شما</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Balance: {formatToman(myBalance)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              {loadingMy && <div className="text-sm text-muted-foreground">در حال بارگذاری…</div>}
              <table className="min-w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="p-2 text-left">Amount</th>
                    <th className="p-2 text-left">Reason</th>
                    <th className="p-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myTxs.map((t:any)=> (
                    <tr key={t.id} className="border-t">
                      <td className="p-2">{formatToman(t.amount)}</td>
                      <td className="p-2">{t.reason || '-'}</td>
                      <td className="p-2">{new Date(t.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!loadingMy && myTxs.length === 0 && (
                    <tr><td className="p-3 text-muted-foreground" colSpan={3}>موردی نیست</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Root admin view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallets</h1>
        <p className="text-sm text-muted-foreground">تنظیم موجودی ادمین‌های غیر اصلی</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Role</th>
                  <th className="p-2 text-left">Balance</th>
                  <th className="p-2 text-left">Adjust</th>
                  <th className="p-2 text-left">Set Balance</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u:any)=> (
                  <tr key={u.id} className="border-t">
                    <td className="p-2">{u.name}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.role}</td>
                    <td className="p-2">{balances[u.id] ? formatToman(balances[u.id]) : "-"}</td>
                    <td className="p-2">
                      <div className="flex flex-col sm:flex-row gap-2 items-start">
                        <input className="h-9 px-3 rounded-md border bg-background w-40" placeholder="Amount" value={amountByUser[u.id] || ""} onChange={e=>setAmountByUser(s=>({ ...s, [u.id]: e.target.value }))} />
                        <input className="h-9 px-3 rounded-md border bg-background w-64" placeholder="Reason (optional)" value={reasonByUser[u.id] || ""} onChange={e=>setReasonByUser(s=>({ ...s, [u.id]: e.target.value }))} />
                        <Button size="sm" onClick={()=>adjust(u.id)}>Apply</Button>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-col sm:flex-row gap-2 items-start">
                        <input className="h-9 px-3 rounded-md border bg-background w-40" placeholder="Target balance (T)" value={targetByUser[u.id] || ""} onChange={e=>setTargetByUser(s=>({ ...s, [u.id]: e.target.value }))} />
                        <Button size="sm" onClick={()=>setBalance(u.id)}>Set</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td className="p-3 text-muted-foreground" colSpan={6}>موردی نیست</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

