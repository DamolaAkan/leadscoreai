"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface OrgBranding {
  name: string;
  slug: string;
  primary_color: string;
}

export default function LoginPage() {
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
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOrg(data))
      .catch(() => setOrg(null));
  }, [orgSlug]);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, email }),
      });
      // Always advance — the endpoint never reveals whether the email matched.
      setStage("code");
      setInfo(`If ${email} is on file, we've sent a 6-digit code. It expires in 10 minutes.`);
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
        body: JSON.stringify({ orgSlug, email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code");
        setSubmitting(false);
        return;
      }
      localStorage.setItem("lsai-session", data.session_id);
      router.push(`/dashboard/${orgSlug}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const accent = org?.primary_color || "#6366f1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: accent }}
            >
              {org?.name?.[0] || "L"}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{org?.name || "Dashboard"}</h1>
            <p className="text-gray-500 mt-1">
              {stage === "email" ? "Sign in to your dashboard" : "Enter your login code"}
            </p>
          </div>

          {stage === "email" ? (
            <form onSubmit={requestCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 text-gray-900"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  We&apos;ll email you a 6-digit code — no password needed.
                </p>
              </div>
              {error && <p className="text-red-600 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl text-white font-semibold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {submitting ? "Sending…" : "Send me a code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              {info && <p className="text-sm text-gray-600 text-center">{info}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 text-gray-900 text-center text-2xl tracking-[0.4em]"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-red-600 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={submitting || code.length < 6}
                className="w-full py-3 rounded-xl text-white font-semibold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {submitting ? "Verifying…" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage("email");
                  setCode("");
                  setError("");
                  setInfo("");
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                ← Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
