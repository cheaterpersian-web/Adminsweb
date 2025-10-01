import "../styles/globals.css";
import type { ReactNode } from "react";
import AppShell from "../components/AppShell";
import { Vazirmatn } from "next/font/google";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-sans",
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${vazirmatn.variable} min-h-screen bg-background text-foreground font-sans`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}