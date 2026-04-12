"use client";

import { useState } from "react";
import { AuthUser } from "@/lib/dashboard-types";
import { DashboardTab } from "@/app/dashboard/[org-slug]/page";

interface SidebarProps {
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
  { key: "calls", label: "Calls", minRole: "staff" },
  { key: "users", label: "Users", minRole: "admin" },
  { key: "settings", label: "Settings", minRole: "superadmin" },
];

export default function Sidebar({
  user,
  activeTab,
  onTabChange,
  onLogout,
  accent,
  isAdmin,
  isSuperAdmin,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const canSeeTab = (minRole: string) => {
    if (minRole === "staff") return true;
    if (minRole === "admin") return isAdmin;
    if (minRole === "superadmin") return isSuperAdmin;
    return false;
  };

  const navContent = (
    <>
      <div className="p-6 border-b border-gray-200">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-3"
          style={{ backgroundColor: accent }}
        >
          {user.orgName[0]}
        </div>
        <h2 className="font-bold text-gray-900 text-lg">{user.orgName}</h2>
        <p className="text-sm text-gray-500 mt-1">{user.fullName}</p>
        <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
          {user.role}
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {tabs
          .filter((t) => canSeeTab(t.minRole))
          .map((t) => (
            <button
              key={t.key}
              onClick={() => {
                onTabChange(t.key);
                setMobileOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              style={
                activeTab === t.key ? { backgroundColor: accent } : undefined
              }
            >
              {t.label}
            </button>
          ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {mobileOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-40 transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
