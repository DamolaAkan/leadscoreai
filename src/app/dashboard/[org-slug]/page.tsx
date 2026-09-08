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

function PaywallGate({
  feature,
  accent,
  onSubscribe,
}: {
  feature: string;
  accent: string;
  onSubscribe: () => void;
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#eceef2] p-10 sm:p-12 text-center max-w-xl mx-auto mt-6"
      style={{ boxShadow: "0 1px 2px rgba(20,40,30,.04), 0 12px 34px -18px rgba(109,40,217,.22)" }}
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "#f3effe" }}>
        <span className="text-2xl">🔒</span>
      </div>
      <h2 className="text-xl font-bold text-[#16202e] mb-2">{feature} is a paid feature</h2>
      <p className="text-[#667085] leading-relaxed mb-6 max-w-md mx-auto">
        Subscribe to a plan to unlock {feature.toLowerCase()} — see who&apos;s ready and able to buy, not just who filled the form.
      </p>
      <button
        onClick={onSubscribe}
        className="px-6 py-3 rounded-lg text-white font-semibold transition-transform hover:-translate-y-0.5"
        style={{ backgroundColor: accent }}
      >
        Subscribe to access →
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params["org-slug"] as string;
  const { user, loading, logout, getAuthHeaders, isAdmin, isSuperAdmin } =
    useAuth(orgSlug);
  const [activeTab, setActiveTab] = useState<DashboardTab>("responses");
  const [paid, setPaid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/dashboard/${orgSlug}/login`);
    }
  }, [loading, user, router, orgSlug]);

  // Billing state drives the paid-feature gate (Analytics + Predictive Insights).
  useEffect(() => {
    if (!user) return;
    fetch("/api/dashboard/billing", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setPaid(d?.paid !== false))
      .catch(() => setPaid(true)); // fail open — never gate on an error
  }, [user, getAuthHeaders]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  // Design system: dashboard chrome standardizes on LeadScoreAI brand purple
  // (per-client brand color lives on the public scorecard, not the dashboard).
  const accent = "#6d28d9";

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
          {activeTab === "analytics" &&
            (paid === false ? (
              <PaywallGate feature="Analytics" accent={accent} onSubscribe={() => setActiveTab("settings")} />
            ) : (
              <AnalyticsTab
                user={user}
                accent={accent}
                getAuthHeaders={getAuthHeaders}
              />
            ))}
          {activeTab === "insights" &&
            (paid === false ? (
              <PaywallGate feature="Predictive Insights" accent={accent} onSubscribe={() => setActiveTab("settings")} />
            ) : (
              <PredictiveInsightsTab
                user={user}
                accent={accent}
                getAuthHeaders={getAuthHeaders}
                isAdmin={isAdmin}
              />
            ))}
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
