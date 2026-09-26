"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { IndustryPage } from "@/lib/builder-industries";

// Shared by /build and every /build/<industry> page; only the copy differs.
export default function BuildLanding({ page }: { page: IndustryPage }) {
  const router = useRouter();

  // Carry the industry's starter idea into the studio's first chat message.
  const goToStudio = () => {
    if (page.starter) {
      try {
        localStorage.setItem("lsai-builder-starter", page.starter);
      } catch {
        /* ignore */
      }
    }
    router.push("/build/studio");
  };
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Already signed in? Go straight to the studio (with this page's idea).
  useEffect(() => {
    const sid = localStorage.getItem("lsai-session");
    if (!sid) return;
    fetch("/api/builder/state", { headers: { Authorization: `Bearer ${sid}` } })
      .then((r) => {
        if (!r.ok) return;
        if (page.starter) localStorage.setItem("lsai-builder-starter", page.starter);
        router.replace("/build/studio");
      })
      .catch(() => {});
  }, [router, page.starter]);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/builder/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send a code.");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/builder/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, businessName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Invalid code");
      localStorage.setItem("lsai-session", data.session_id);
      goToStudio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Try again.");
      setBusy(false);
    }
  };

  const input =
    "w-full px-4 py-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white">
      <header className="max-w-6xl mx-auto px-5 py-5 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/favicon-64.png" alt="" className="w-8 h-8 rounded-lg" />
        <span className="font-bold">LeadScoreAI</span>
        <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-violet-200">
          Quiz Builder
        </span>
      </header>

      <main className="max-w-6xl mx-auto px-5 pt-4 lg:pt-8 pb-20 grid lg:grid-cols-2 gap-x-12 gap-y-8 lg:items-center">
        <section className="lg:col-start-1">
          {page.slug && (
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300 mb-3">{page.eyebrow}</p>
          )}
          <h1 className="font-extrabold leading-[1.1]" style={{ fontSize: "clamp(32px, 5.5vw, 56px)" }}>
            {page.headline}
            <br />
            <span className="text-violet-300">{page.highlight}</span>
          </h1>
          <p className="mt-5 text-base lg:text-lg text-slate-300 max-w-xl leading-relaxed">{page.sub}</p>
        </section>

        <section className="lg:col-start-1 lg:row-start-2">
          <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
            {page.examples.map((ex) => (
              <div key={ex.text} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <span className="text-xl">{ex.emoji}</span>
                <span className="text-sm text-slate-200">{ex.text}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-400">
            Free for your first 10 leads or 30 days · Share on WhatsApp · Every lead scored Hot, Warm or Cold
          </p>
        </section>

        <section className="row-start-2 lg:row-start-1 lg:row-span-2 lg:col-start-2 bg-white text-slate-900 rounded-2xl p-6 md:p-9 shadow-2xl max-w-md w-full lg:justify-self-end">
          {step === "email" ? (
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Build your first quiz</h2>
                <p className="text-sm text-slate-500 mt-1">
                  We&apos;ll email you a 6-digit code. No password needed.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Business name</label>
                <input
                  className={input}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={page.namePlaceholder}
                  maxLength={80}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Work email</label>
                <input
                  className={input}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-60"
              >
                {busy ? "Sending…" : "Get my code →"}
              </button>
              <p className="text-xs text-slate-400 text-center">
                Already have an account? Use the same email and you&apos;ll go straight in.
              </p>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Check your email</h2>
                <p className="text-sm text-slate-500 mt-1">
                  We sent a 6-digit code to <b>{email}</b>.
                </p>
              </div>
              <input
                className={`${input} text-center text-2xl tracking-[0.4em] font-semibold`}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full py-3.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Start building →"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                }}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                Use a different email
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
