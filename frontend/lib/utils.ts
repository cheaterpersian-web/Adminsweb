import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function formatToman(amount: number | string): string {
  const num = Number(amount);
  if (!isFinite(num)) return String(amount);
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(abs);
  return `${sign}${formatted} T`;
}