import "../styles/globals.css";
import type { ReactNode } from "react";
import AppShell from "../components/AppShell";
import { Vazirmatn, Poppins } from "next/font/google";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-sans",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-en",
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${vazirmatn.variable} ${poppins.variable} min-h-screen bg-background text-foreground font-sans`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}