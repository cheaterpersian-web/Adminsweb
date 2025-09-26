"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";

type Plan = {
  id: number;
  name: string;
  data_quota_mb: number | null;
  is_data_unlimited: boolean;
  duration_days: number | null;
  is_duration_unlimited: boolean;
  price: string;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [dataQuotaMb, setDataQuotaMb] = useState<number | "">("");
  const [isDataUnlimited, setIsDataUnlimited] = useState(false);
  const [durationDays, setDurationDays] = useState<number | "">("");
  const [isDurationUnlimited, setIsDurationUnlimited] = useState(false);
  const [price, setPrice] = useState<string>("0");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/plans");
      setPlans(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName("");
    setDataQuotaMb("");
    setIsDataUnlimited(false);
    setDurationDays("");
    setIsDurationUnlimited(false);
    setPrice("0");
  };

  const create = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name,
        is_data_unlimited: isDataUnlimited,
        is_duration_unlimited: isDurationUnlimited,
        price,
      };
      if (!isDataUnlimited) payload.data_quota_mb = dataQuotaMb === "" ? 0 : Number(dataQuotaMb);
      if (!isDurationUnlimited) payload.duration_days = durationDays === "" ? 0 : Number(durationDays);
      await apiFetch("/plans", { method: "POST", body: JSON.stringify(payload) });
      await load();
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    await apiFetch(`/plans/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">مدیریت پلن‌ها (فقط ادمین روت)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ساخت پلن جدید</CardTitle>
          <CardDescription>نام، حجم، زمان و قیمت را مشخص کنید. برای نامحدود، گزینه‌های مربوطه را فعال کنید.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">نام</label>
            <input className="w-full h-10 px-3 rounded-md border bg-background" value={name} onChange={e=>setName(e.target.value)} placeholder="مثال: طلایی 30 روزه" />
          </div>
          <div>
            <label className="block text-sm mb-1">حجم (MB)</label>
            <div className="flex gap-2 items-center">
              <input className="w-full h-10 px-3 rounded-md border bg-background disabled:opacity-50" type="number" min={0} value={isDataUnlimited? "" : (dataQuotaMb as any)} onChange={e=>setDataQuotaMb(e.target.value === "" ? "" : Number(e.target.value))} disabled={isDataUnlimited} placeholder="مثال: 102400" />
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isDataUnlimited} onChange={e=>setIsDataUnlimited(e.target.checked)} /> نامحدود</label>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">زمان (روز)</label>
            <div className="flex gap-2 items-center">
              <input className="w-full h-10 px-3 rounded-md border bg-background disabled:opacity-50" type="number" min={0} value={isDurationUnlimited? "" : (durationDays as any)} onChange={e=>setDurationDays(e.target.value === "" ? "" : Number(e.target.value))} disabled={isDurationUnlimited} placeholder="مثال: 30" />
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isDurationUnlimited} onChange={e=>setIsDurationUnlimited(e.target.checked)} /> نامحدود</label>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">قیمت</label>
            <input className="w-full h-10 px-3 rounded-md border bg-background" type="number" min={0} step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="مثال: 199000" />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={create} disabled={saving || !name}>ایجاد پلن</Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">در حال بارگذاری...</div>
        ) : (
          plans.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>
                  {p.is_data_unlimited ? "حجم نامحدود" : `${p.data_quota_mb?.toLocaleString()} MB`} · {p.is_duration_unlimited ? "زمان نامحدود" : `${p.duration_days} روز`} · قیمت: {p.price}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">شناسه: {p.id}</div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => remove(p.id)}>حذف</Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

