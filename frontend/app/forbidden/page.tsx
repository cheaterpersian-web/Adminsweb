"use client";

import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="text-2xl font-semibold">دسترسی ندارید</div>
        <div className="text-sm text-muted-foreground">برای مشاهده این صفحه مجوز کافی ندارید.</div>
        <div className="pt-2">
          <Link href="/dashboard" className="underline">بازگشت به داشبورد</Link>
        </div>
      </div>
    </main>
  );
}

