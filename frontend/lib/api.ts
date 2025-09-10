export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(base + path, { ...init, headers });
  
  // Check if response is JSON
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error("سرور در دسترس نیست. لطفاً مطمئن شوید که سرویس backend در حال اجرا است.");
    }
    throw new Error(`خطا در ارتباط با سرور: ${res.status} ${res.statusText}`);
  }
  
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}