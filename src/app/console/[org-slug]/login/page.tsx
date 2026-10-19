"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GRADIENT, Icon, SESSION_KEY, type OrgBranding } from "../_lib";

// Console login: passwordless. Email (org email on file, or a LeadScoreAI staff
// email) → 6-digit code → session. Same endpoints as the client dashboard login.
export default function ConsoleLoginPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params["org-slug"] as string;

  const [org, setOrg] = useState<OrgBranding | null>(null);
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/dashboard/org/${orgSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setOrg)
      .catch(() => setOrg(null));
  }, [orgSlug]);

  const subtitle = org?.industry === "solar_energy" ? "Solar Scorecard Dashboard" : "Scorecard Dashboard";

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, email: email.trim() }),
      });
      // Always advance: the endpoint never reveals whether the email matched.
      setStage("code");
      setInfo(`If ${email.trim()} has access, we've sent a 6-digit code. It expires in 10 minutes.`);
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, email: email.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code");
        setSubmitting(false);
        return;
      }
      localStorage.setItem(SESSION_KEY, data.session_id);
      router.push(`/console/${orgSlug}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-gray-200 px-3.5 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300";
  const buttonClass =
    "w-full rounded-md py-3 text-[18px] font-semibold text-white shadow-sm transition-opacity disabled:opacity-60";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#FFF8EC] via-[#FFF5EA] to-[#FDF1EE]">
      <div className="w-full max-w-[486px] bg-white rounded-lg shadow-[0_10px_40px_-12px_rgba(120,80,20,0.25)] overflow-hidden">
        <div className="px-8 py-8 text-center text-white" style={{ background: GRADIENT }}>
          <div className="flex items-center justify-center gap-3">
            <Icon name="sun" className="w-8 h-8" />
            <h1 className="text-[26px] font-bold tracking-tight">{org ? `${org.name} Admin` : "Admin"}</h1>
          </div>
          <p className="mt-3 text-[17px] text-white/95">{subtitle}</p>
        </div>

        {stage === "email" ? (
          <form onSubmit={requestCode} className="px-8 pt-9 pb-8 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-[15px] text-gray-800 mb-2">
                <Icon name="user" className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                autoFocus
                required
                className={inputClass}
              />
              <p className="mt-2 text-[13px] text-gray-500">We&apos;ll email you a 6-digit code. No password needed.</p>
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <button type="submit" disabled={submitting} className={buttonClass} style={{ background: GRADIENT }}>
              {submitting ? "Sending…" : "Send me a code"}
            </button>

            <p className="text-center text-[14px] leading-relaxed text-gray-500">
              Authorized access only. Contact system administrator for account access.
            </p>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="px-8 pt-9 pb-8 space-y-6">
            {info && <p className="text-center text-[14px] text-gray-600">{info}</p>}
            <div>
              <label className="flex items-center gap-2 text-[15px] text-gray-800 mb-2">
                <Icon name="lock" className="w-4 h-4" />
                6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                autoFocus
                required
                className={`${inputClass} text-center text-[24px] tracking-[0.4em]`}
              />
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <button
              type="submit"
              disabled={submitting || code.length < 6}
              className={buttonClass}
              style={{ background: GRADIENT }}
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStage("email");
                setCode("");
                setError("");
                setInfo("");
              }}
              className="w-full text-[14px] text-gray-500 hover:text-gray-700"
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
