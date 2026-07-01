"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already has a valid Supabase session, redirect immediately
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      } else {
        setChecking(false);
      }
    }).catch(() => {
      setChecking(false);
    });
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

  function togglePassword() {
    setShowPassword((prev) => !prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (authError) {
      setLoading(false);
      if (authError.message === "Invalid login credentials") {
        setError("Incorrect email or password.");
      } else {
        setError("Something went wrong. Try again.");
      }
      return;
    }

    router.push("/dashboard");
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
              Know who pays you <em>before you chase them.</em>
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
            &copy; 2026 LeadScoreAI &middot; Qualify before you chase
          </div>
        </section>

        {/* RIGHT: login card */}
        <section className="right">
          <div className="card">
            <span className="eyebrow">Client sign-in</span>
            <h2>Sign in</h2>
            <p className="lead">
              Enter your details to reach your LeadScoreAI dashboard.
            </p>

            <form onSubmit={handleSubmit}>
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
                />
              </div>

              <div className="field">
                <div className="pw-head">
                  <label htmlFor="pw">Password</label>
                  <Link href="/reset-password">Forgot password?</Link>
                </div>
                <div className="pw-wrap">
                  <input
                    id="pw"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={togglePassword}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              <button className="submit" type="submit" disabled={loading}>
                {loading ? "Signing in\u2026" : "Sign in to dashboard"}
              </button>
            </form>

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
              Want to see what it does first?{" "}
              <a
                href="https://leadscoreai.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit leadscoreai.com
              </a>
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
