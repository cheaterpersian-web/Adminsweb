"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function WalletPage() {
  const [balance, setBalance] = useState<string>("0.00");
  const [txs, setTxs] = useState<any[]>([]);

  const load = async () => {
    try {
      const w = await apiFetch("/wallet/me");
      setBalance(String(w.balance));
    } catch {}
    try {
      const t = await apiFetch("/wallet/me/transactions");
      setTxs(t.items || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">موجودی و تراکنش‌های شما</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Balance: {balance}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Reason</th>
                  <th className="p-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t:any)=> (
                  <tr key={t.id} className="border-t">
                    <td className="p-2">{t.amount}</td>
                    <td className="p-2">{t.reason || '-'}</td>
                    <td className="p-2">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {txs.length === 0 && (
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

