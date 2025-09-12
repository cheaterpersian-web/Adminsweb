export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = ((typeof globalThis !== "undefined" && (globalThis as any).process && (globalThis as any).process.env && (globalThis as any).process.env.NEXT_PUBLIC_API_BASE_URL) as string | undefined) || "/api";
  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(base + path, { ...init, headers });

  // Check if response is JSON
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  if (!isJson) {
    const text = await res.text();
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error("سرور در دسترس نیست. لطفاً مطمئن شوید که سرویس backend در حال اجرا است.");
    }
    throw new Error(`خطا در ارتباط با سرور: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!res.ok) {
    const serverMessage = (data && (data.detail || data.message || data.error)) || undefined;
    throw new Error(serverMessage || `خطا در ارتباط با سرور: ${res.status} ${res.statusText}`);
  }
  return data;
}