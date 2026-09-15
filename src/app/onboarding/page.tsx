"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "lsai-admin-session";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  tier: string | null;
  signupDate: string | null;
  onboarded: boolean;
  createdAt: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function OnboardingConsole() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [orgs, setOrgs] = useState<OrgRow[] | null>(null);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  // Auth gate — mirror the staff console (validate the stored admin session).
  useEffect(() => {
    const sid = localStorage.getItem(STORAGE_KEY);
    if (!sid) {
      window.location.href = "/staff";
      return;
    }
    fetch("/api/invoices/auth", { headers: { Authorization: `Bearer ${sid}` } })
      .then((res) => {
        if (res.ok) {
          setSessionId(sid);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          window.location.href = "/staff";
        }
      })
      .catch(() => (window.location.href = "/staff"))
      .finally(() => setChecking(false));
  }, []);

  const load = useCallback(async (sid: string) => {
    const res = await fetch("/api/staff/onboarding", { headers: { Authorization: `Bearer ${sid}` } });
    const d = await res.json().catch(() => ({ orgs: [] }));
    setOrgs(d.orgs || []);
  }, []);

  useEffect(() => {
    if (sessionId) load(sessionId);
  }, [sessionId, load]);

  const activate = async (org: OrgRow) => {
    if (!sessionId) return;
    setBusy(org.id);
    setMsg((m) => ({ ...m, [org.id]: "" }));
    try {
      const res = await fetch("/api/staff/onboarding", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionId}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: org.id, signupDate: dates[org.id] || todayISO() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        const email =
          d.emailStatus === "sent" ? "✓ activation email sent" : d.emailStatus === "failed" ? "⚠ activated, but email failed" : "activated (no email — check billing email)";
        setMsg((m) => ({ ...m, [org.id]: `Activated · ${email}` }));
        await load(sessionId);
      } else {
        setMsg((m) => ({ ...m, [org.id]: d.error || "Could not activate." }));
      }
    } catch {
      setMsg((m) => ({ ...m, [org.id]: "Could not activate." }));
    }
    setBusy(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-10" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-[#16202e]">Client Onboarding</h1>
          <a href="/deals" className="text-sm text-[#7C3AED] hover:underline">← Workspace</a>
        </div>
        <p className="text-[#667085] mb-6 text-sm">
          Approve a client&apos;s onboarding to <b>activate their account</b> — this sets their signup date
          (starting the 30-day trial clock) and emails them &quot;your account is activated.&quot;
        </p>

        {orgs === null ? (
          <div className="text-gray-500">Loading…</div>
        ) : orgs.length === 0 ? (
          <div className="text-gray-500">No trial clients to onboard.</div>
        ) : (
          <div className="space-y-3">
            {orgs.map((o) => (
              <div key={o.id} className="bg-white rounded-xl border border-[#eceef2] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-[#16202e]">{o.name}</div>
                    <div className="text-xs text-gray-500">
                      {o.email || "no email"} · /{o.slug}
                    </div>
                  </div>
                  {o.onboarded ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                      Active · signed up {new Date(o.signupDate!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                      Pending onboarding
                    </span>
                  )}
                </div>

                {!o.onboarded && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="text-sm text-gray-600">
                      Signup date{" "}
                      <input
                        type="date"
                        value={dates[o.id] || todayISO()}
                        onChange={(e) => setDates((d) => ({ ...d, [o.id]: e.target.value }))}
                        className="ml-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                      />
                    </label>
                    <button
                      onClick={() => activate(o)}
                      disabled={busy === o.id}
                      className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                      style={{ backgroundColor: "#7C3AED" }}
                    >
                      {busy === o.id ? "Activating…" : "Approve & Activate →"}
                    </button>
                  </div>
                )}

                {o.onboarded && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="text-sm text-gray-600">
                      Change signup date{" "}
                      <input
                        type="date"
                        value={dates[o.id] || (o.signupDate ? o.signupDate.slice(0, 10) : todayISO())}
                        onChange={(e) => setDates((d) => ({ ...d, [o.id]: e.target.value }))}
                        className="ml-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                      />
                    </label>
                    <button
                      onClick={() => activate(o)}
                      disabled={busy === o.id}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 disabled:opacity-50"
                    >
                      {busy === o.id ? "Saving…" : "Update date + resend"}
                    </button>
                  </div>
                )}

                {msg[o.id] && <div className="mt-2 text-sm text-[#16202e]">{msg[o.id]}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
