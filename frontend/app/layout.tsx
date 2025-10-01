import "../styles/globals.css";
import type { ReactNode } from "react";
import AppShell from "../components/AppShell";
import localFont from "next/font/local";

const vazirmatn = localFont({
  src: [
    { path: "../public/fonts/vazirmatn/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/vazirmatn/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/vazirmatn/Vazirmatn-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/vazirmatn/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
  ],
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