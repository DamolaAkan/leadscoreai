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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/dashboard/org/${orgSlug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOrg(data))
      .catch(() => setOrg(null));
  }, [orgSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
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
            <h1 className="text-2xl font-bold text-gray-900">
              {org?.name || "Dashboard"}
            </h1>
            <p className="text-gray-500 mt-1">Sign in to your admin dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 text-gray-900"
                style={{ focusRingColor: accent } as React.CSSProperties}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 text-gray-900"
                required
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-white font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
