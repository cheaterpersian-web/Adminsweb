import "../styles/globals.css";
import type { ReactNode } from "react";
import AppShell from "../components/AppShell";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap" rel="stylesheet" />
        <title>پنل مدیریت مرزبان</title>
        <meta name="description" content="پنل مدیریت مرزبان - سیستم مدیریت کاربران و پنل‌های مرزبان" />
      </head>
      <body className="min-h-screen bg-background text-foreground persian-text">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}