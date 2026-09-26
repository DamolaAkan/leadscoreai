"use client";

// Browser side of the funnel log. Anonymous visitor id + first-touch
// attribution live in localStorage; events go to /api/track (never blocks UI).
const VID_KEY = "lsai-vid";
const FT_KEY = "lsai-first-touch";

export function getVisitorId(): string {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v = `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch {
    return "";
  }
}

// Remember how this visitor first arrived (ad campaign, page, referrer).
export function captureFirstTouch(): void {
  try {
    if (localStorage.getItem(FT_KEY)) return;
    const q = new URLSearchParams(window.location.search);
    const ft: Record<string, string | boolean> = { path: window.location.pathname };
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const val = q.get(k);
      if (val) ft[k] = val;
    }
    if (q.get("fbclid")) ft.fbclid = true;
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) ft.referrer = document.referrer;
    localStorage.setItem(FT_KEY, JSON.stringify(ft));
  } catch {
    /* ignore */
  }
}

export function getFirstTouch(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(FT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function trackClient(event: string, props: Record<string, unknown> = {}, quizId?: string | null): void {
  try {
    const session = localStorage.getItem("lsai-session");
    fetch("/api/track", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session}` } : {}) },
      body: JSON.stringify({ event, visitorId: getVisitorId(), path: window.location.pathname, props, quizId }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
