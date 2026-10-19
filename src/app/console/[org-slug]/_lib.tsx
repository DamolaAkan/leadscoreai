// Shared bits for the warm "admin console" skin (the Oríkì-style dashboard):
// session-aware fetch, formatting, qualification styling and a small icon set.
// The console runs on the same /api/dashboard/* endpoints as the main dashboard.

export const SESSION_KEY = "lsai-session";

export const GRADIENT = "linear-gradient(90deg, #EAB308 0%, #F97316 100%)";

export interface OrgBranding {
  name: string;
  slug: string;
  primary_color: string;
  industry?: string | null;
}

export function getSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

// Fetch a dashboard API with the console session; a 401 sends you back to login.
export async function api<T = unknown>(
  orgSlug: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const session = getSession();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${session || ""}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (res.status === 401) {
    window.location.href = `/console/${orgSlug}/login`;
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const QUAL: Record<string, { label: string; icon: string; pill: string; tint: string }> = {
  HOT_LEAD: { label: "Hot Lead", icon: "🔥", pill: "bg-green-100 text-green-800", tint: "bg-green-100" },
  WARM_LEAD: { label: "Warm Lead", icon: "⭐", pill: "bg-amber-100 text-amber-800", tint: "bg-amber-100" },
  COLD_LEAD: { label: "Cold Lead", icon: "❄️", pill: "bg-blue-100 text-blue-800", tint: "bg-blue-100" },
  NOT_QUALIFIED: { label: "Not Qualified", icon: "⚠️", pill: "bg-red-100 text-red-800", tint: "bg-red-100" },
};

export function QualPill({ q }: { q: string | null }) {
  const s = q ? QUAL[q] : null;
  if (!s) return <span className="text-gray-400">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.pill}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  if (!withTime) return date;
  return `${date} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function downloadText(filename: string, text: string, type = "text/csv") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type IconName =
  | "sun" | "user" | "lock" | "users" | "chart" | "settings" | "refresh" | "download" | "filter"
  | "search" | "calendar" | "logout" | "trash" | "x" | "back" | "check" | "trend" | "pin" | "chevron";

export function Icon({ name, className = "w-5 h-5" }: { name: IconName; className?: string }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<IconName, JSX.Element> = {
    sun: (
      <>
        <circle cx="12" cy="12" r="4" {...p} />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...p} />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" {...p} />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" {...p} />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" {...p} />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" {...p} />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" {...p} />
        <path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5" {...p} />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.8 5.2" {...p} />
      </>
    ),
    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...p} />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" {...p} />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...p} />
      </>
    ),
    refresh: <path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4" {...p} />,
    download: <path d="M12 3v12M7 10l5 5 5-5M4 21h16" {...p} />,
    filter: <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" {...p} />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" {...p} />
        <path d="M21 21l-4.3-4.3" {...p} />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" {...p} />
        <path d="M3 10h18M8 3v4M16 3v4" {...p} />
      </>
    ),
    logout: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" {...p} />,
    trash: <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" {...p} />,
    x: <path d="M6 6l12 12M18 6L6 18" {...p} />,
    back: <path d="M19 12H5M11 18l-6-6 6-6" {...p} />,
    check: (
      <>
        <circle cx="12" cy="12" r="9" {...p} />
        <path d="M8 12.5l2.7 2.7L16 9.8" {...p} />
      </>
    ),
    trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" {...p} />,
    pin: (
      <>
        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" {...p} />
        <circle cx="12" cy="9.5" r="2.5" {...p} />
      </>
    ),
    chevron: <path d="M6 9l6 6 6-6" {...p} />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {paths[name]}
    </svg>
  );
}
