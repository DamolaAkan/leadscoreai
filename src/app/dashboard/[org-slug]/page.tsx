"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Sidebar from "@/components/dashboard/Sidebar";
import ResponsesTab from "@/components/dashboard/ResponsesTab";
import AnalyticsTab from "@/components/dashboard/AnalyticsTab";
import UsersTab from "@/components/dashboard/UsersTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import CallsTab from "@/components/dashboard/CallsTab";

export type DashboardTab = "responses" | "analytics" | "calls" | "users" | "settings";

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

  const accent = user.primaryColor || "#6366f1";

  const handleLogout = async () => {
    await logout();
    router.push(`/dashboard/${orgSlug}/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        accent={accent}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
      />

      <main className="flex-1 min-h-screen overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
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
          {activeTab === "calls" && (
            <CallsTab
              user={user}
              accent={accent}
              getAuthHeaders={getAuthHeaders}
            />
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
