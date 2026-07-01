"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "../reset-password.css";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  // Wait for Supabase to process the recovery tokens from the URL hash
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if there's already an active session (e.g. user refreshed the page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else {
        // Give Supabase a moment to process hash tokens, then flag as expired
        const timer = setTimeout(() => {
          setExpired(true);
        }, 4000);
        return () => clearTimeout(timer);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setLoading(false);
      setError("Something went wrong. Try again or request a new link.");
      return;
    }

    // Sign out so they log in fresh with new password
    await supabase.auth.signOut();
    setSuccess(true);
    setLoading(false);

    // Redirect to login after a brief pause
    setTimeout(() => {
      router.push("/login");
    }, 3000);
  }

  if (!ready && !expired) {
    return (
      <div className="reset-shell">
        <div
          style={{
            width: 24,
            height: 24,
            border: "2.5px solid #6d28d9",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "reset-spin .6s linear infinite",
          }}
        />
        <style>{`@keyframes reset-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (expired && !ready) {
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
          <h2>Link expired</h2>
          <p className="desc">
            This password reset link is invalid or has expired. Request a new
            one.
          </p>
          <Link
            href="/reset-password"
            className="submit"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              marginTop: 24,
            }}
          >
            Request new link
          </Link>
          <Link href="/login" className="back-link">
            &larr; Back to sign in
          </Link>
        </div>
      </div>
    );
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

        <h2>Set new password</h2>
        <p className="desc">Choose a new password for your account.</p>

        {success ? (
          <>
            <div className="reset-success" style={{ marginTop: 24 }}>
              Password updated. Redirecting to sign in&hellip;
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              {error && <div className="reset-error">{error}</div>}

              <div className="field">
                <label htmlFor="new-pw">New password</label>
                <input
                  id="new-pw"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="confirm-pw">Confirm password</label>
                <input
                  id="confirm-pw"
                  type="password"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              <button className="submit" type="submit" disabled={loading}>
                {loading ? "Updating\u2026" : "Update password"}
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
