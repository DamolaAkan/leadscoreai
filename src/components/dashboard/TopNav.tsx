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
  { key: "analyst", label: "AI Analyst", minRole: "staff" },
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
    <header className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Top row: brand + user/logout */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {user.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.logoUrl} alt={user.orgName} className="w-10 h-10 rounded-lg" />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: accent }}
              >
                {user.orgName[0]}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold leading-tight" style={{ color: "#1e293b" }}>
                {user.orgName}
              </h1>
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                Lead scoring dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm" style={{ color: "#64748b" }}>
              Welcome, <span className="font-medium" style={{ color: "#1e293b" }}>{user.fullName}</span>
            </span>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md border transition-colors"
              style={{ color: "#475569", borderColor: "#cbd5e1", backgroundColor: "white" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
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
        <nav className="flex items-center gap-1 overflow-x-auto -mb-px">
          {visible.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className="whitespace-nowrap px-4 py-3 text-sm transition-colors border-b-2"
                style={{
                  color: active ? "#1e293b" : "#64748b",
                  fontWeight: active ? 600 : 500,
                  borderBottomColor: active ? accent : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = "#1e293b";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = "#64748b";
                }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
