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
  { key: "responses", label: "Responses", minRole: "staff" },
  { key: "analytics", label: "Analytics", minRole: "staff" },
  { key: "insights", label: "Predictive Insights", minRole: "staff" },
  { key: "demo", label: "Demo", minRole: "staff" },
  { key: "users", label: "Users", minRole: "admin" },
  { key: "settings", label: "Settings", minRole: "superadmin" },
];

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
  const visible = tabs.filter((t) => canSee(t.minRole));

  return (
    <header className="bg-white border-b border-[#e9ebf0] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Top row: brand + user/logout */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {user.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.logoUrl} alt={user.orgName} className="w-10 h-10 rounded-xl object-contain" />
            ) : (
              <BrandBars />
            )}
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-[-0.01em]" style={{ color: "#16202e" }}>
                {user.orgName}
              </h1>
              <p className="text-xs font-medium" style={{ color: "#98a2b3" }}>
                Lead scoring dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm" style={{ color: "#667085" }}>
              Welcome,{" "}
              <span className="font-semibold" style={{ color: "#16202e" }}>
                {user.fullName}
              </span>
            </span>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-lg border transition-colors"
              style={{ color: "#344054", borderColor: "#e9ebf0", backgroundColor: "white" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <nav className="flex items-center gap-1 overflow-x-auto">
          {visible.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className="relative whitespace-nowrap px-3.5 py-3 text-sm transition-colors rounded-t-lg"
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
    <div className="w-10 h-10 rounded-xl bg-[#f5f2fe] flex items-end justify-center gap-[3px] p-2">
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
