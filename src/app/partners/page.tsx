"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PARTNER_SESSION_KEY } from "@/lib/partner-client";

// Partner programme: marketers sign up (or sign in) with an email code.
// Partners outside Nigeria must confirm they can be paid in Naira first.

const COUNTRIES: [string, string][] = [
  ["NG", "Nigeria"], ["GH", "Ghana"], ["KE", "Kenya"], ["ZA", "South Africa"], ["GB", "United Kingdom"],
  ["US", "United States"], ["CA", "Canada"], ["ZZ", "Somewhere else"],
];

export default function PartnersPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [step, setStep] = useState<"form" | "code">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [country, setCountry] = useState("NG");
  const [confirmed, setConfirmed] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      setSignedIn(!!localStorage.getItem(PARTNER_SESSION_KEY));
    } catch {}
  }, []);

  const details = { email, full_name: name, whatsapp, country, confirmed_ngn: confirmed };

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && country !== "NG" && !confirmed) {
      setError("Confirm you can receive Naira payouts into a Nigerian bank account.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/partners/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...details, purpose: mode }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error || "Something went wrong. Try again.");
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/partners/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...details, code }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok || !data?.session_id) return setError(data?.error || "That code didn't work. Try again.");
    try {
      localStorage.setItem(PARTNER_SESSION_KEY, data.session_id);
    } catch {}
    router.push("/partners/dashboard");
  }

  const input = "w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-[15px] outline-none focus:border-violet-500";

  return (
    <div className="min-h-screen bg-[#FAFAFB] text-[#0B0B12]" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/leadscoreai-mark-512.png" alt="" className="w-7 h-7" />
          LeadScoreAI <span className="font-medium text-slate-500">Partners</span>
        </a>
        {signedIn && (
          <a href="/partners/dashboard" className="text-sm font-semibold text-violet-700">
            My dashboard →
          </a>
        )}
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-start">
        <section className="pt-6 md:pt-14">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-violet-700 mb-4">For digital marketers and creatives</p>
          <h1 className="text-[34px] sm:text-5xl font-extrabold leading-[1.06] tracking-tight">
            Earn ₦11,950 a month for every business you bring.
          </h1>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-xl">
            Build Buyer Scorecards for your clients so their ads bring leads that are already scored Hot, Warm or Cold. Show
            them a free demo first. When they go live, you earn every month they stay.
          </p>
          <ol className="mt-8 grid gap-3">
            {[
              ["Share your link or set the client up yourself", "Every business that signs up through your link is yours, for life."],
              ["Show the client a free demo", "Build their scorecard and send a demo link. Nothing to pay until they go live."],
              ["Get paid every month", "₦11,950 per paying client, straight to your Nigerian bank account by Paystack."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4 rounded-2xl bg-white border border-slate-200 p-4">
                <span className="w-8 h-8 shrink-0 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center">{i + 1}</span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-7 shadow-sm">
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            {(["signup", "login"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setStep("form");
                  setError(null);
                }}
                className={`flex-1 h-10 rounded-lg text-sm font-semibold ${mode === m ? "bg-white shadow-sm" : "text-slate-500"}`}
              >
                {m === "signup" ? "Become a partner" : "Sign in"}
              </button>
            ))}
          </div>

          {step === "form" ? (
            <form onSubmit={requestCode} className="grid gap-3">
              {mode === "signup" && (
                <>
                  <input className={input} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                  <input className={input} placeholder="WhatsApp number" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </>
              )}
              <input className={input} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              {mode === "signup" && (
                <>
                  <select className={input} value={country} onChange={(e) => { setCountry(e.target.value); setConfirmed(false); }}>
                    {COUNTRIES.map(([c, n]) => (
                      <option key={c} value={c}>{n}</option>
                    ))}
                  </select>
                  {country !== "NG" && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                      <p className="mb-2">Partner payouts are sent in Naira, by Paystack, into a Nigerian bank account only.</p>
                      <label className="flex gap-2 items-start">
                        <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                        I confirm I can receive payouts into a Nigerian bank account.
                      </label>
                    </div>
                  )}
                </>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button disabled={busy} className="h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-60">
                {busy ? "Sending…" : "Email me a code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="grid gap-3">
              <p className="text-sm text-slate-600">We sent a 6-digit code to {email}.</p>
              <input
                className={`${input} text-center tracking-[0.4em] text-xl font-bold`}
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button disabled={busy || code.length !== 6} className="h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-60">
                {busy ? "Checking…" : mode === "signup" ? "Create my partner account" : "Sign in"}
              </button>
              <button type="button" onClick={() => setStep("form")} className="text-sm text-slate-500">
                Use a different email
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
