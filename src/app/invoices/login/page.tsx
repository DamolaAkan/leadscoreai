"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "lsai-admin-session";

export default function InvoiceLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already has a valid session, redirect immediately
  useEffect(() => {
    const sessionId = localStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
      setChecking(false);
      return;
    }

    fetch("/api/invoices/auth", {
      headers: { Authorization: `Bearer ${sessionId}` },
    })
      .then((res) => {
        if (res.ok) {
          // Valid session — full redirect so layout remounts with auth
          window.location.href = "/invoices";
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setChecking(false);
        }
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/invoices/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Login failed");
      return;
    }

    localStorage.setItem(STORAGE_KEY, data.session_id);
    // Full page redirect — forces layout to remount and pick up the new session
    window.location.href = "/invoices";
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#7C3AED]">LeadscoreAI</h1>
          <p className="text-sm text-black/50 mt-1">Admin Invoicing Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Username"
              className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2.5 text-[#111827] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2.5 text-[#111827] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#7C3AED] text-white font-medium rounded-full hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
