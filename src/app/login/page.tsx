"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./login.css";
import { getVisitorId, trackClient } from "@/lib/track-client";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [noAccount, setNoAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Already signed in on this device? Go straight to the dashboard.
  useEffect(() => {
    const sid = localStorage.getItem("lsai-session");
    if (!sid) {
      trackClient("login_view");
      setChecking(false);
      return;
    }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${sid}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (me?.orgSlug) router.replace(`/dashboard/${me.orgSlug}`);
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div
        className="login-shell"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "2.5px solid #6d28d9",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "login-spin .6s linear infinite",
          }}
        />
        <style>{`@keyframes login-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Step 1: email a 6-digit code (same passcode flow as the quiz builder).
  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNoAccount(false);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/builder/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, purpose: "login", visitorId: getVisitorId() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Could not send a code.");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: verify the code and open that business's dashboard.
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/builder/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code, loginOnly: true, visitorId: getVisitorId() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNoAccount(!!d.noAccount);
        throw new Error(d.error || "Invalid code");
      }
      localStorage.setItem("lsai-session", d.session_id);
      router.push(`/dashboard/${d.orgSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div className="shell">
        {/* LEFT: brand story */}
        <section className="left">
          <div className="brand">
            <span className="bars">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <span>
              LeadScore<b>AI</b>
            </span>
          </div>

          <div className="left-mid">
            <h1>
              Stop replying to people who won&apos;t buy. <em>Let a quiz find your buyers.</em>
            </h1>

            <div className="ledger" aria-hidden="true">
              <div className="lh">
                <span className="t">Live lead scores</span>
                <span className="live">LIVE</span>
              </div>
              <div className="lrow hot">
                <span className="tag">
                  <span className="dot hot"></span>Hot
                </span>
                <span className="bar">
                  <i></i>
                </span>
                <span className="pct">44%</span>
              </div>
              <div className="lrow warm">
                <span className="tag">
                  <span className="dot warm"></span>Warm
                </span>
                <span className="bar">
                  <i></i>
                </span>
                <span className="pct">24%</span>
              </div>
              <div className="lrow cold">
                <span className="tag">
                  <span className="dot cold"></span>Cold
                </span>
                <span className="bar">
                  <i></i>
                </span>
                <span className="pct">6%</span>
              </div>
              <div className="lrow null">
                <span className="tag">
                  <span className="dot null"></span>Not qual.
                </span>
                <span className="bar">
                  <i></i>
                </span>
                <span className="pct">0%</span>
              </div>
            </div>
          </div>

          <div className="left-foot">
            &copy; 2026 LeadScoreAI &middot; Interactive quizzes that find your buyers
          </div>
        </section>

        {/* RIGHT: login card */}
        <section className="right">
          <div className="card">
            <span className="eyebrow">Client sign-in</span>
            <h2>Sign in</h2>
            <p className="lead">
              {step === "email" ? (
                "Enter your email and we'll send you a 6-digit code. No password needed."
              ) : (
                <>
                  We sent a 6-digit code to <b>{email.trim()}</b>. It expires in 10 minutes.
                </>
              )}
            </p>

            {step === "email" ? (
              <form onSubmit={sendCode}>
                {error && <div className="login-error">{error}</div>}
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <button className="submit" type="submit" disabled={loading}>
                  {loading ? "Sending\u2026" : "Email me a code"}
                </button>
              </form>
            ) : (
              <form onSubmit={verify}>
                {error && (
                  <div className="login-error">
                    {error}
                    {noAccount && (
                      <>
                        {" "}
                        <Link href="/">Build your first quiz</Link>
                      </>
                    )}
                  </div>
                )}
                <div className="field">
                  <label htmlFor="code">6-digit code</label>
                  <input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    style={{ textAlign: "center", fontSize: 24, letterSpacing: "0.4em", fontWeight: 600 }}
                    autoFocus
                  />
                </div>
                <button className="submit" type="submit" disabled={loading || code.length !== 6}>
                  {loading ? "Signing in\u2026" : "Sign in to dashboard"}
                </button>
                <p className="newhere" style={{ marginTop: 14 }}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setStep("email");
                      setCode("");
                      setError("");
                      setNoAccount(false);
                    }}
                  >
                    Use a different email
                  </a>
                </p>
              </form>
            )}

            <div className="secure">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#928da0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>
                Secure sign-in. Your dashboard shows only your leads and your
                data.
              </span>
            </div>

            <div className="divider">NEW TO LEADSCOREAI</div>
            <p className="newhere">
              No account yet?{" "}
              <Link href="/">Find my serious buyers</Link>
            </p>

            <div className="card-foot">
              <span>Client portal</span>
              <Link href="/staff">Staff sign-in &rarr;</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
