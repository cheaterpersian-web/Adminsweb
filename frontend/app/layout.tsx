import "../styles/globals.css";
import type { ReactNode } from "react";
import AppShell from "../components/AppShell";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}