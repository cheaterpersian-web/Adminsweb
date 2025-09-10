import "../styles/globals.css";
import type { ReactNode } from "react";
import AppShell from "../components/AppShell";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}