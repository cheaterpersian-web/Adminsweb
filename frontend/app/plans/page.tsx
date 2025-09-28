"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { formatToman } from "../../lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";

type Plan = {
  id: number;
  name: string;
  data_quota_mb: number | null;
  is_data_unlimited: boolean;
  duration_days: number | null;
  is_duration_unlimited: boolean;
  price: string;
  category_id?: number | null;
  sort_order?: number;
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

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [eName, setEName] = useState("");
  const [eDataQuotaMb, setEDataQuotaMb] = useState<number | "">("");
  const [eIsDataUnlimited, setEIsDataUnlimited] = useState(false);
  const [eDurationDays, setEDurationDays] = useState<number | "">("");
  const [eIsDurationUnlimited, setEIsDurationUnlimited] = useState(false);
  const [ePrice, setEPrice] = useState<string>("0");
  const [savingEdit, setSavingEdit] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [sort, setSort] = useState<string>("0");
  const [eCategoryId, setECategoryId] = useState<string>("");
  const [eSort, setESort] = useState<string>("0");
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSort, setNewCatSort] = useState<string>("0");
  const [creatingCat, setCreatingCat] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cats, data] = await Promise.all([
        apiFetch("/plan-categories"),
        apiFetch("/plans"),
      ]);
      setCategories(cats || []);
      setPlans(data || []);
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
        category_id: categoryId ? parseInt(categoryId, 10) : null,
        sort_order: parseInt(sort || "0", 10),
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

  const startEdit = (p: Plan) => {
    setEditId(p.id);
    setEName(p.name);
    setEIsDataUnlimited(!!p.is_data_unlimited);
    setEDataQuotaMb(p.data_quota_mb === null ? "" : Number(p.data_quota_mb));
    setEIsDurationUnlimited(!!p.is_duration_unlimited);
    setEDurationDays(p.duration_days === null ? "" : Number(p.duration_days));
    setEPrice(String(p.price));
    setECategoryId(String(p.category_id || ""));
    setESort(String(p.sort_order || 0));
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const saveEdit = async (id: number) => {
    setSavingEdit(true);
    try {
      const payload: any = {
        name: eName,
        is_data_unlimited: eIsDataUnlimited,
        is_duration_unlimited: eIsDurationUnlimited,
        price: ePrice,
        category_id: eCategoryId ? parseInt(eCategoryId, 10) : null,
        sort_order: parseInt(eSort || "0", 10),
      };
      if (!eIsDataUnlimited) payload.data_quota_mb = eDataQuotaMb === "" ? 0 : Number(eDataQuotaMb);
      if (!eIsDurationUnlimited) payload.duration_days = eDurationDays === "" ? 0 : Number(eDurationDays);
      await apiFetch(`/plans/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      await load();
      setEditId(null);
    } finally {
      setSavingEdit(false);
    }
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
            <label className="block text-sm mb-1">دسته</label>
            <select className="w-full h-10 px-3 rounded-md border bg-background" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
              <option value="">(بدون دسته)</option>
              {categories.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={()=>setShowNewCat(v=>!v)}>افزودن دسته</Button>
            </div>
            {showNewCat && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <input className="h-9 px-3 rounded-md border bg-background" placeholder="نام دسته" value={newCatName} onChange={e=>setNewCatName(e.target.value)} />
                <input className="h-9 px-3 rounded-md border bg-background" type="number" placeholder="ترتیب" value={newCatSort} onChange={e=>setNewCatSort(e.target.value)} />
                <div className="md:col-span-2">
                  <Button type="button" size="sm" disabled={creatingCat || !newCatName.trim()} onClick={async()=>{
                    setCreatingCat(true);
                    try {
                      const payload = { name: newCatName.trim(), sort_order: parseInt(newCatSort || "0", 10) } as any;
                      const created = await apiFetch("/plan-categories", { method: "POST", body: JSON.stringify(payload) });
                      // reload categories
                      try { const cats = await apiFetch("/plan-categories"); setCategories(cats||[]); } catch {}
                      if (created && created.id) setCategoryId(String(created.id));
                      setShowNewCat(false);
                      setNewCatName(""); setNewCatSort("0");
                    } finally { setCreatingCat(false); }
                  }}>ثبت دسته</Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">ترتیب</label>
            <input className="w-full h-10 px-3 rounded-md border bg-background" type="number" value={sort} onChange={e=>setSort(e.target.value)} />
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
            <input className="w-full h-10 px-3 rounded-md border bg-background" type="number" min={0} step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="مثال: 199000 (T)" />
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
                {editId === p.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm mb-1">نام</label>
                      <input className="w-full h-10 px-3 rounded-md border bg-background" value={eName} onChange={e=>setEName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">حجم (MB)</label>
                      <div className="flex gap-2 items-center">
                        <input className="w-full h-10 px-3 rounded-md border bg-background disabled:opacity-50" type="number" min={0} value={eIsDataUnlimited? "" : (eDataQuotaMb as any)} onChange={e=>setEDataQuotaMb(e.target.value === "" ? "" : Number(e.target.value))} disabled={eIsDataUnlimited} />
                        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={eIsDataUnlimited} onChange={e=>setEIsDataUnlimited(e.target.checked)} /> نامحدود</label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">زمان (روز)</label>
                      <div className="flex gap-2 items-center">
                        <input className="w-full h-10 px-3 rounded-md border bg-background disabled:opacity-50" type="number" min={0} value={eIsDurationUnlimited? "" : (eDurationDays as any)} onChange={e=>setEDurationDays(e.target.value === "" ? "" : Number(e.target.value))} disabled={eIsDurationUnlimited} />
                        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={eIsDurationUnlimited} onChange={e=>setEIsDurationUnlimited(e.target.checked)} /> نامحدود</label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">قیمت</label>
                      <input className="w-full h-10 px-3 rounded-md border bg-background" type="number" min={0} step="0.01" value={ePrice} onChange={e=>setEPrice(e.target.value)} placeholder="قیمت (T)" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">دسته</label>
                      <select className="w-full h-10 px-3 rounded-md border bg-background" value={eCategoryId} onChange={e=>setECategoryId(e.target.value)}>
                        <option value="">(بدون دسته)</option>
                        {categories.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">ترتیب</label>
                      <input className="w-full h-10 px-3 rounded-md border bg-background" type="number" value={eSort} onChange={e=>setESort(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle>{p.name}</CardTitle>
                    <CardDescription>
                      {p.is_data_unlimited ? "حجم نامحدود" : `${p.data_quota_mb?.toLocaleString()} MB`} · {p.is_duration_unlimited ? "زمان نامحدود" : `${p.duration_days} روز`} · قیمت: {formatToman(p.price)}
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">شناسه: {p.id}</div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                {editId === p.id ? (
                  <>
                    <Button variant="outline" size="sm" onClick={cancelEdit} disabled={savingEdit}>انصراف</Button>
                    <Button size="sm" onClick={() => saveEdit(p.id)} disabled={savingEdit || !eName}>ذخیره</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => startEdit(p)}>ویرایش</Button>
                    <Button variant="outline" size="sm" onClick={() => remove(p.id)}>حذف</Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

