"use client";

// Lightweight JWT helpers for client-side checks

function base64UrlToBase64(input: string): string {
  return input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
}

export function decodeJwt<T = any>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(base64UrlToBase64(parts[1]));
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function isAccessTokenExpired(token: string, skewSeconds = 15): boolean {
  const payload = decodeJwt<{ exp?: number }>(token);
  if (!payload || !payload.exp) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSeconds + skewSeconds;
}

export async function tryRefreshAccessToken(): Promise<string | null> {
  try {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
    const res = await fetch(`${base}/auth/refresh?refresh_token=${encodeURIComponent(refresh)}`, { method: "POST" });
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    const data = await res.json();
    if (!res.ok || !data?.access_token) return null;
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", data.access_token);
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
    }
    return data.access_token as string;
  } catch {
    return null;
  }
}

