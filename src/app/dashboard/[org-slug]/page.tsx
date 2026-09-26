"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import TopNav from "@/components/dashboard/TopNav";
import ResponsesTab from "@/components/dashboard/ResponsesTab";
import AnalyticsTab from "@/components/dashboard/AnalyticsTab";
import UsersTab from "@/components/dashboard/UsersTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import PredictiveInsightsTab from "@/components/dashboard/PredictiveInsightsTab";
import DemoTab from "@/components/dashboard/DemoTab";
import StartHereTab from "@/components/dashboard/StartHereTab";
import BuilderStudio from "@/components/builder/BuilderStudio";
import MetaPixel, { checkoutStartedPixel, purchaseReturnPixel } from "@/components/MetaPixel";

export type DashboardTab =
  | "start"
  | "responses"
  | "analytics"
  | "insights"
  | "demo"
  | "users"
  | "settings"
  | "builder";

const SELF_SERVE_TABS: DashboardTab[] = ["responses", "analytics", "builder", "users", "settings"];

interface AccessInfo {
  locked: boolean;
  reason?: string;
  leadsUsed?: number;
  leadLimit?: number;
  trialEndsAt?: string | null;
  prices?: { core: number; pro: number };
  plans?: { tier: string; label: string; naira: number }[];
  trialDays?: number;
  configured?: boolean;
  paid?: boolean;
  offer?: { eligible: boolean; discount: number; endsAt: string | null };
}

// Paystack checkout for a plan; resolves with an error message if it couldn't start.
async function startCheckout(tier: string, getAuthHeaders: () => Record<string, string>): Promise<string> {
  try {
    const res = await fetch("/api/dashboard/billing/checkout", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.authorization_url) {
      checkoutStartedPixel(d);
      setTimeout(() => (window.location.href = d.authorization_url), 300); // → Paystack (after the pixel sends)
      return "";
    }
    return d.error || "Could not start checkout.";
  } catch {
    return "Could not start checkout.";
  }
}

// Self-serve go-live offer: "₦10,000 off your first month" strip above the dashboard,
// for 48 hours after the owner builds their first quiz.
function OfferBanner({ info, getAuthHeaders }: { info: AccessInfo; getAuthHeaders: () => Record<string, string> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const plan = info.plans?.[0];
  if (!plan || !info.offer?.eligible || !info.offer.endsAt) return null;
  const msLeft = new Date(info.offer.endsAt).getTime() - Date.now();
  const hoursLeft = Math.max(1, Math.ceil(msLeft / 3600000));
  const price = plan.naira - info.offer.discount;
  return (
    <div className="shrink-0 bg-gradient-to-r from-violet-700 via-violet-600 to-fuchsia-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <span className="text-lg leading-none">🎁</span>
        <p className="flex-1 min-w-0 text-[13px] sm:text-sm leading-snug">
          <b>Go live today: ₦{info.offer.discount.toLocaleString()} off your first month.</b> Pay{" "}
          <b>₦{price.toLocaleString()}</b>
          <span className="hidden sm:inline"> instead of ₦{plan.naira.toLocaleString()}</span>. Offer ends in{" "}
          {hoursLeft}h.
          {err && <span className="block text-amber-200">{err}</span>}
        </p>
        <button
          onClick={async () => {
            setBusy(true);
            setErr("");
            const e = await startCheckout(plan.tier, getAuthHeaders);
            if (e) {
              setErr(e);
              setBusy(false);
            }
          }}
          disabled={busy || info.configured === false}
          className="shrink-0 rounded-full bg-white text-violet-700 text-[13px] sm:text-sm font-bold px-4 py-2 disabled:opacity-60"
        >
          {busy ? "Starting…" : "Go live"}
        </button>
      </div>
    </div>
  );
}

// Full-dashboard lock shown once the free trial is exhausted (10 real leads or
// 30 days) and the org hasn't subscribed. The public scorecard keeps collecting
// leads in the background — they just can't be viewed until payment.
function LockScreen({
  info,
  accent,
  orgName,
  getAuthHeaders,
  onLogout,
}: {
  info: AccessInfo;
  accent: string;
  orgName: string;
  getAuthHeaders: () => Record<string, string>;
  onLogout: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const subscribe = async (tier: string) => {
    setBusy(tier);
    setErr("");
    const e = await startCheckout(tier, getAuthHeaders);
    if (e) {
      setErr(e);
      setBusy(null);
    }
  };
  const discount = info.offer?.eligible ? info.offer.discount : 0;

  const limit = info.leadLimit ?? 10;
  const headline =
    info.reason === "trial_expired"
      ? `Your ${info.trialDays ?? 30}-day free trial has ended`
      : `You've used all ${limit} of your free leads`;
  const plans = info.plans ?? [
    { tier: "core", label: "Core", naira: info.prices?.core ?? 130000 },
    { tier: "pro", label: "Pro", naira: info.prices?.pro ?? 250000 },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#f8fafc", fontFamily: "var(--font-inter)" }}
    >
      <div
        className="bg-white rounded-2xl border border-[#eceef2] p-8 sm:p-10 text-center max-w-lg w-full"
        style={{ boxShadow: "0 1px 2px rgba(20,40,30,.04), 0 18px 44px -20px rgba(109,40,217,.25)" }}
      >
        <div
          className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
          style={{ background: "#f3effe" }}
        >
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold text-[#16202e] mb-2">{headline}</h1>
        <p className="text-[#667085] leading-relaxed mb-1 max-w-md mx-auto">
          {orgName}&apos;s quiz is still live and collecting leads, but your dashboard is
          locked until you subscribe.
        </p>
        <p className="text-sm text-[#98a2b3] mb-6">
          Subscribe to unlock every lead waiting for you, plus analytics and predictive insights.
        </p>

        {discount > 0 && (
          <p className="mb-4 text-sm font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
            🎁 Launch offer: ₦{discount.toLocaleString()} off your first month.
          </p>
        )}
        <div className={`grid grid-cols-1 ${plans.length > 1 ? "sm:grid-cols-2" : ""} gap-3 text-left`}>
          {plans.map(({ tier: t, label, naira: price }) => (
            <button
              key={t}
              onClick={() => subscribe(t)}
              disabled={!!busy || info.configured === false}
              className="rounded-xl border-2 px-4 py-4 transition-colors hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: accent }}
            >
              <div className="font-bold text-gray-900">{label}</div>
              <div className="text-sm text-gray-600">
                {discount > 0 ? (
                  <>
                    <s className="text-gray-400">₦{price.toLocaleString()}</s> ₦{(price - discount).toLocaleString()} first
                    month, then ₦{price.toLocaleString()}/month
                  </>
                ) : (
                  <>₦{price.toLocaleString()}/month</>
                )}
              </div>
              <div className="mt-2 text-sm font-semibold" style={{ color: accent }}>
                {busy === t ? "Starting…" : "Subscribe →"}
              </div>
            </button>
          ))}
        </div>

        {info.configured === false && (
          <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Card / bank billing isn&apos;t switched on yet — contact support to activate.
          </p>
        )}
        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        <p className="mt-6 text-xs text-gray-400">
          Pay by card, bank transfer or USSD via Paystack. Cancel anytime.
        </p>
        <button onClick={onLogout} className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline">
          Log out
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params["org-slug"] as string;
  const { user, loading, logout, getAuthHeaders, isAdmin, isSuperAdmin } =
    useAuth(orgSlug);
  const [activeTab, setActiveTab] = useState<DashboardTab>("start");
  const [access, setAccess] = useState<AccessInfo | null>(null);

  // Back from Paystack: record the ad Purchase (deduped with the server event).
  useEffect(() => {
    if (user?.selfServe) purchaseReturnPixel();
  }, [user?.selfServe]);

  // Opening tab: self-serve accounts start on Responses; `?tab=builder` (from
  // the standalone studio) deep-links straight into a tab.
  useEffect(() => {
    if (!user) return;
    const requested = new URLSearchParams(window.location.search).get("tab") as DashboardTab | null;
    if (user.selfServe) {
      setActiveTab(requested && SELF_SERVE_TABS.includes(requested) ? requested : "responses");
    } else if (requested && requested !== "builder") {
      setActiveTab(requested);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/dashboard/${orgSlug}/login`);
    }
  }, [loading, user, router, orgSlug]);

  // Trial / lock state drives whether the whole dashboard is accessible.
  useEffect(() => {
    if (!user) return;
    fetch("/api/dashboard/billing", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setAccess(d ?? { locked: false }))
      .catch(() => setAccess({ locked: false })); // fail open — never lock on an error
  }, [user, getAuthHeaders]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push(`/dashboard/${orgSlug}/login`);
  }, [logout, router, orgSlug]);

  // Wait for both auth and access so we never flash the dashboard before locking.
  if (loading || (user && access === null)) {
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

  if (access?.locked) {
    return (
      <LockScreen
        info={access}
        accent={accent}
        orgName={user.orgName}
        getAuthHeaders={getAuthHeaders}
        onLogout={handleLogout}
      />
    );
  }

  const onBuilder = activeTab === "builder" && user.selfServe;

  return (
    <div
      className={onBuilder ? "h-[100dvh] flex flex-col overflow-hidden" : "min-h-screen"}
      style={{ backgroundColor: "#f8fafc", fontFamily: "var(--font-inter)" }}
    >
      {/* Meta pixel (Siteflipmarket) for self-serve owners only: ad conversions */}
      {user.selfServe && <MetaPixel />}
      {access && !access.paid && <OfferBanner info={access} getAuthHeaders={getAuthHeaders} />}
      <TopNav
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        accent={accent}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
      />

      {onBuilder && (
        // Full-bleed studio; on phones it stops above the floating tab bar.
        <main className="flex-1 min-h-0 bg-[#0E1525] pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
          <BuilderStudio embedded />
        </main>
      )}

      <main
        className={`${onBuilder ? "hidden" : ""} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8`}
      >
        <div>
          {activeTab === "start" && <StartHereTab user={user} accent={accent} getAuthHeaders={getAuthHeaders} />}
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
