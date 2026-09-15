"use client";

import { useEffect, useState, useCallback } from "react";
import { slGet, slSend } from "@/lib/sl-client";

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

export default function ClientOnboardingPage() {
  const [orgs, setOrgs] = useState<OrgRow[] | null>(null);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await slGet<{ orgs: OrgRow[] }>("/api/staff/onboarding");
      setOrgs(d.orgs || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setOrgs([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activate = async (org: OrgRow) => {
    setBusy(org.id);
    setMsg((m) => ({ ...m, [org.id]: "" }));
    try {
      const d = await slSend<{ success: boolean; emailStatus: string }>(
        "/api/staff/onboarding",
        "POST",
        { orgId: org.id, signupDate: dates[org.id] || todayISO() }
      );
      const email =
        d.emailStatus === "sent"
          ? "✓ activation email sent"
          : d.emailStatus === "failed"
            ? "⚠ activated, but email failed"
            : "activated (no email — check billing email)";
      setMsg((m) => ({ ...m, [org.id]: `Activated · ${email}` }));
      await load();
    } catch (e) {
      setMsg((m) => ({ ...m, [org.id]: e instanceof Error ? e.message : "Could not activate." }));
    }
    setBusy(null);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-[#16202e] mb-1">Client Activations</h1>
      <p className="text-[#667085] mb-6 text-sm">
        Approve a client&apos;s onboarding to <b>activate their account</b> — this sets their signup
        date (starting the 30-day free-trial clock) and emails them &quot;your account is activated.&quot;
      </p>

      {err && <div className="text-sm text-red-600 mb-4">{err}</div>}

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
                    Active · signed up{" "}
                    {new Date(o.signupDate!).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    Pending onboarding
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-sm text-gray-600">
                  Signup date{" "}
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
                  className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: "#7C3AED" }}
                >
                  {busy === o.id
                    ? o.onboarded
                      ? "Saving…"
                      : "Activating…"
                    : o.onboarded
                      ? "Update date + resend"
                      : "Approve & Activate →"}
                </button>
              </div>

              {msg[o.id] && <div className="mt-2 text-sm text-[#16202e]">{msg[o.id]}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
