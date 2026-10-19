"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GRADIENT, Icon, SESSION_KEY, type OrgBranding } from "../_lib";

// Console login: username + password (org_members, or a LeadScoreAI staff email).
export default function ConsoleLoginPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params["org-slug"] as string;

  const [org, setOrg] = useState<OrgBranding | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/dashboard/org/${orgSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setOrg)
      .catch(() => setOrg(null));
  }, [orgSlug]);

  const subtitle = org?.industry === "solar_energy" ? "Solar Scorecard Dashboard" : "Scorecard Dashboard";

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
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

        <form onSubmit={signIn} className="px-8 pt-9 pb-8 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-[15px] text-gray-800 mb-2">
              <Icon name="user" className="w-4 h-4" />
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
              required
              className="w-full rounded-md border border-gray-200 px-3.5 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-[15px] text-gray-800 mb-2">
              <Icon name="lock" className="w-4 h-4" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-gray-200 px-3.5 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md py-3 text-[18px] font-semibold text-white shadow-sm transition-opacity disabled:opacity-60"
            style={{ background: GRADIENT }}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>

          <p className="text-center text-[14px] leading-relaxed text-gray-500">
            Authorized access only. Contact system administrator for account access.
          </p>
        </form>
      </div>
    </div>
  );
}
