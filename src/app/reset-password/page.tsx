"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "./reset-password.css";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password/update`
        : "https://app.leadscoreai.com/reset-password/update";

    await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });

    // Always show success regardless of whether email exists (prevents enumeration)
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="reset-shell">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div className="reset-card">
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

        <h2>Reset your password</h2>
        <p className="desc">
          Enter the email address on your account and we&rsquo;ll send you a
          link to set a new password.
        </p>

        {sent ? (
          <>
            <div className="reset-success" style={{ marginTop: 24 }}>
              If an account exists for <strong>{email.trim()}</strong>,
              you&rsquo;ll receive a password reset link shortly. Check your
              inbox and spam folder.
            </div>
            <Link href="/login" className="back-link">
              &larr; Back to sign in
            </Link>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              {error && <div className="reset-error">{error}</div>}

              <div className="field">
                <label htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button className="submit" type="submit" disabled={loading}>
                {loading ? "Sending\u2026" : "Send reset link"}
              </button>
            </form>

            <Link href="/login" className="back-link">
              &larr; Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
