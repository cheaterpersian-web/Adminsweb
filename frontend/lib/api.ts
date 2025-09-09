export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(base + path, { ...init, headers });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}