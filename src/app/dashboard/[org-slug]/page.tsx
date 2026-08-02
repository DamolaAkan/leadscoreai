"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import TopNav from "@/components/dashboard/TopNav";
import ResponsesTab from "@/components/dashboard/ResponsesTab";
import AnalyticsTab from "@/components/dashboard/AnalyticsTab";
import UsersTab from "@/components/dashboard/UsersTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import PredictiveInsightsTab from "@/components/dashboard/PredictiveInsightsTab";
import DemoTab from "@/components/dashboard/DemoTab";

export type DashboardTab =
  | "responses"
  | "analytics"
  | "insights"
  | "demo"
  | "users"
  | "settings";

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params["org-slug"] as string;
  const { user, loading, logout, getAuthHeaders, isAdmin, isSuperAdmin } =
    useAuth(orgSlug);
  const [activeTab, setActiveTab] = useState<DashboardTab>("responses");

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/dashboard/${orgSlug}/login`);
    }
  }, [loading, user, router, orgSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  // Design system: dashboard chrome standardizes on Primary Slate (per-client
  // brand color lives on the public scorecard, not the dashboard).
  const accent = "#64748b";

  const handleLogout = async () => {
    await logout();
    router.push(`/dashboard/${orgSlug}/login`);
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#f8fafc", fontFamily: "var(--font-inter)" }}
    >
      <TopNav
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        accent={accent}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
      />

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div>
          {activeTab === "responses" && (
            <ResponsesTab
              user={user}
              accent={accent}
              getAuthHeaders={getAuthHeaders}
            />
          )}
          {activeTab === "analytics" && (
            <AnalyticsTab
              user={user}
              accent={accent}
              getAuthHeaders={getAuthHeaders}
            />
          )}
          {activeTab === "insights" && (
            <PredictiveInsightsTab
              user={user}
              accent={accent}
              getAuthHeaders={getAuthHeaders}
              isAdmin={isAdmin}
            />
          )}
          {activeTab === "demo" && (
            <DemoTab user={user} accent={accent} getAuthHeaders={getAuthHeaders} />
          )}
          {activeTab === "users" && isAdmin && (
            <UsersTab
              user={user}
              accent={accent}
              getAuthHeaders={getAuthHeaders}
            />
          )}
          {activeTab === "settings" && isSuperAdmin && (
            <SettingsTab
              user={user}
              accent={accent}
              getAuthHeaders={getAuthHeaders}
            />
          )}
        </div>
      </main>
    </div>
  );
}
