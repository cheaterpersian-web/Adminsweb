"use client";

import { useState } from "react";
import { Button } from "../../../components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = (data && (data.detail || data.message)) || `خطا: ${res.status}`;
        throw new Error(message);
      }
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border rounded-lg p-6">
        <h1 className="text-2xl font-semibold">ورود ادمین</h1>
        <div className="space-y-2">
          <label className="block text-sm">ایمیل</label>
          <input className="w-full h-10 px-3 rounded-md border bg-background" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">رمز عبور</label>
          <input type="password" className="w-full h-10 px-3 rounded-md border bg-background" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">{loading ? "در حال ورود..." : "ورود"}</Button>
      </form>
    </main>
  );
}