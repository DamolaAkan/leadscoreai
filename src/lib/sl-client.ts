"use client";

// Client-side helpers for the sales workspace. Uses the shared admin session.
const STORAGE_KEY = "lsai-admin-session";

export function authHeaders(json = false): Record<string, string> {
  const sid = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const h: Record<string, string> = {};
  if (sid) h.Authorization = `Bearer ${sid}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export async function slGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Request failed");
  return res.json();
}

export async function slSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: authHeaders(true),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}
