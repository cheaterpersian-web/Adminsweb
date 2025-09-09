"use client";

export default function DashboardPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;
  return (
    <main className="p-6 space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">API: {api}</p>
      <p>این صفحه بعدا با آمار و نوتیف‌ها پر می‌شود.</p>
    </main>
  );
}