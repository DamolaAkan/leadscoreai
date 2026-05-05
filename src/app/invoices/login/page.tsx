"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "lsai-admin-session";

export default function InvoiceLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already has session, redirect immediately
  useEffect(() => {
    const session = localStorage.getItem(STORAGE_KEY);
    if (session) {
      router.replace("/invoices");
    }
  }, [router]);

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
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    localStorage.setItem(STORAGE_KEY, data.session_id);
    router.replace("/invoices");
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#7C3AED]">LeadscoreAI</h1>
          <p className="text-sm text-gray-500 mt-1">Admin Invoicing Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#141425] border border-[#2a2a3d] rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Username"
              className="w-full bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
