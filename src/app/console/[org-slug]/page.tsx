"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon, SESSION_KEY, getSession, type OrgBranding } from "./_lib";
import ResponsesView from "./_components/ResponsesView";
import AnalyticsView from "./_components/AnalyticsView";
import UsersView from "./_components/UsersView";

type Tab = "responses" | "analytics" | "users";

export default function ConsolePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params["org-slug"] as string;
  const [org, setOrg] = useState<OrgBranding | null>(null);
  const [tab, setTab] = useState<Tab>("responses");
  const [quizName, setQuizName] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.replace(`/console/${orgSlug}/login`);
      return;
    }
    setReady(true);
    fetch(`/api/dashboard/org/${orgSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setOrg)
      .catch(() => setOrg(null));
  }, [orgSlug, router]);

  const logout = async () => {
    const session = getSession();
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${session || ""}` } });
    } catch {}
    localStorage.removeItem(SESSION_KEY);
    router.replace(`/console/${orgSlug}/login`);
  };

  if (!ready) return <div className="min-h-screen bg-[#FFF8EC]" />;

  const tabs: { id: Tab; label: string; icon: "users" | "chart" | "settings" }[] = [
    { id: "responses", label: "Responses", icon: "users" },
    { id: "analytics", label: "Analytics", icon: "chart" },
    { id: "users", label: "User Management", icon: "settings" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8EC] via-[#FFF6EC] to-[#FDF3EE] text-gray-900">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon name="sun" className="w-9 h-9 text-amber-400 mt-1 shrink-0" />
            <div>
              <h1 className="text-[28px] sm:text-[34px] font-bold leading-tight tracking-tight">
                {org ? `${org.name} Admin Dashboard` : "Admin Dashboard"}
              </h1>
              <p className="text-[16px] sm:text-[18px] text-gray-600 mt-0.5">{quizName ? `${quizName} Analytics` : "Scorecard Analytics"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-[15px] text-red-600 hover:bg-red-50"
          >
            <Icon name="logout" className="w-4 h-4" />
            Logout
          </button>
        </header>

        <nav className="mt-7 grid grid-cols-3 gap-1 rounded-lg bg-[#F1ECE4] p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-[15px] transition ${
                tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon name={t.icon} className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <main className="mt-5">
          {tab === "responses" && <ResponsesView orgSlug={orgSlug} onQuizName={setQuizName} />}
          {tab === "analytics" && <AnalyticsView orgSlug={orgSlug} />}
          {tab === "users" && <UsersView orgSlug={orgSlug} />}
        </main>
      </div>
    </div>
  );
}
