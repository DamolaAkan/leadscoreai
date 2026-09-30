"use client";

import { AuthUser } from "@/lib/dashboard-types";
import { DashboardTab } from "@/app/dashboard/[org-slug]/page";

interface TopNavProps {
  user: AuthUser;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onLogout: () => void;
  accent: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const tabs: { key: DashboardTab; label: string; minRole: string }[] = [
  { key: "start", label: "Start Here", minRole: "staff" },
  { key: "responses", label: "Responses", minRole: "staff" },
  { key: "analytics", label: "Analytics", minRole: "staff" },
  { key: "insights", label: "Predictive Insights", minRole: "staff" },
  { key: "demo", label: "Demo", minRole: "staff" },
  { key: "users", label: "Users", minRole: "admin" },
  { key: "settings", label: "Settings", minRole: "superadmin" },
];

// Self-serve (quiz builder) accounts: five tabs, Builder in the middle.
const selfServeTabs: { key: DashboardTab; label: string; minRole: string }[] = [
  { key: "responses", label: "Responses", minRole: "staff" },
  { key: "analytics", label: "Analytics", minRole: "staff" },
  { key: "builder", label: "Builder", minRole: "staff" },
  { key: "users", label: "Users", minRole: "admin" },
  { key: "settings", label: "Settings", minRole: "superadmin" },
];

// Short labels for the phone bottom bar.
const shortLabel: Partial<Record<DashboardTab, string>> = {
  start: "Start",
  insights: "Insights",
};

export default function TopNav({
  user,
  activeTab,
  onTabChange,
  onLogout,
  accent,
  isAdmin,
  isSuperAdmin,
}: TopNavProps) {
  const canSee = (minRole: string) =>
    minRole === "staff" || (minRole === "admin" && isAdmin) || (minRole === "superadmin" && isSuperAdmin);
  const visible = (user.selfServe ? selfServeTabs : tabs).filter((t) => canSee(t.minRole));
  // The Builder is a dark, full-height studio: on phones it gets the whole
  // screen (no header) and the floating bar switches to its dark style.
  const onBuilder = activeTab === "builder";

  return (
    <>
      <header
        className={`${onBuilder ? "hidden md:block" : ""} bg-white border-b border-[#e9ebf0] shadow-[0_1px_2px_rgba(16,24,40,0.04)] shrink-0`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: brand + user/logout */}
          <div className="flex items-center justify-between gap-3 py-3 md:py-4">
            <div className="flex items-center gap-3 min-w-0">
              {user.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.logoUrl} alt={user.orgName} className="w-10 h-10 rounded-xl object-contain shrink-0" />
              ) : (
                <BrandBars />
              )}
              <div className="min-w-0">
                <h1
                  className="text-base md:text-lg font-bold leading-tight tracking-[-0.01em] truncate"
                  style={{ color: "#16202e" }}
                >
                  {user.orgName}
                </h1>
                <p className="text-xs font-medium" style={{ color: "#98a2b3" }}>
                  {user.selfServe ? "Scorecard dashboard" : "Lead scoring dashboard"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="hidden sm:inline text-sm" style={{ color: "#667085" }}>
                Welcome,{" "}
                <span className="font-semibold" style={{ color: "#16202e" }}>
                  {user.fullName}
                </span>
              </span>
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 text-sm font-medium px-3 md:px-3.5 py-2 rounded-lg border transition-colors"
                style={{ color: "#344054", borderColor: "#e9ebf0", backgroundColor: "white" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Desktop tab bar */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {visible.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onTabChange(t.key)}
                  className="relative whitespace-nowrap px-3.5 py-3 text-sm transition-colors rounded-t-lg inline-flex items-center gap-1.5"
                  style={{
                    color: active ? accent : "#667085",
                    fontWeight: active ? 600 : 500,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.color = "#16202e";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.color = "#667085";
                  }}
                >
                  {t.key === "builder" && <TabIcon tab="builder" className="w-4 h-4" />}
                  {t.label}
                  {active && (
                    <span
                      className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Phone: floating bottom tab bar */}
      <nav
        aria-label="Dashboard"
        className={`md:hidden fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex rounded-2xl border backdrop-blur-md overflow-x-auto ${
          onBuilder
            ? "bg-[#1C2333]/95 border-[#2B3245] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]"
            : "bg-white/95 border-[#e9ebf0] shadow-[0_12px_32px_-10px_rgba(16,24,40,0.28)]"
        }`}
      >
        {visible.map((t) => {
          const active = activeTab === t.key;
          const color = active
            ? onBuilder
              ? "#C4B5FD"
              : accent
            : onBuilder
              ? "#9DA2A6"
              : "#667085";
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              aria-current={active ? "page" : undefined}
              className="flex-1 min-w-[64px] flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] transition-colors"
              style={{ color, fontWeight: active ? 700 : 500 }}
            >
              <span
                className="w-10 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: active ? (onBuilder ? "rgba(139,92,246,0.22)" : "#f3effe") : "transparent",
                }}
              >
                <TabIcon tab={t.key} className="w-[18px] h-[18px]" />
              </span>
              <span className="whitespace-nowrap">{shortLabel[t.key] || t.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

// Line icons for the tab bars (24px grid, stroke = currentColor).
function TabIcon({ tab, className }: { tab: DashboardTab; className?: string }) {
  const paths: Record<DashboardTab, string> = {
    start: "M3 11.5L12 4l9 7.5M5.5 10v9.5h13V10",
    responses: "M4 5h16v11H8l-4 4V5zM8 9.5h8M8 12.5h5",
    analytics: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    insights: "M12 3v2M5.6 5.6l1.4 1.4M3 12h2M19 12h2M17 7l1.4-1.4M9 17h6M10 20h4M12 7a5 5 0 00-3 9h6a5 5 0 00-3-9z",
    demo: "M8 5.5v13l10-6.5-10-6.5z",
    builder: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z",
    users: "M16 19v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 17.5V19M10 10.5a3 3 0 100-6 3 3 0 000 6zM20 19v-1.5a3.5 3.5 0 00-2.5-3.35M15.5 4.6a3 3 0 010 5.8",
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 01-2 1.2L14.8 21h-4l-.3-2.4a7 7 0 01-2-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 010-2.4L4.6 9.9l2-3.4 1.9.7a7 7 0 012-1.2L10.8 3.6h4l.3 2.4a7 7 0 012 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 010 2.4z",
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
      <path d={paths[tab]} />
    </svg>
  );
}

// LeadScoreAI mark — four ascending bars in the logo palette.
function BrandBars() {
  const bars = [
    { h: 10, c: "#dc2626" },
    { h: 16, c: "#2563eb" },
    { h: 22, c: "#d99409" },
    { h: 28, c: "#16a34a" },
  ];
  return (
    <div className="w-10 h-10 shrink-0 rounded-xl bg-[#f5f2fe] flex items-end justify-center gap-[3px] p-2">
      {bars.map((b, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm"
          style={{ height: b.h, backgroundColor: b.c }}
        />
      ))}
    </div>
  );
}
