import type { Metadata } from "next";
import MobileMenu from "../MobileMenu";
import CheckupVideo from "./CheckupVideo";
import "../homepage.css";

const CALENDLY = "https://calendly.com/leadscoreai/30min?back=1";

export const metadata: Metadata = {
  title: "Predict which borrowers will repay | LeadScoreAI for Microfinance",
  description:
    "Know which borrowers will repay before you disburse loans. LeadScoreAI helps microfinance banks and lenders cut defaults and strengthen repayment rates.",
};

const BENEFITS = [
  {
    title: "Predict repayment before you lend",
    body: "Score every applicant on willingness and ability to repay — not just whether they filled the form.",
  },
  {
    title: "Fewer defaults, healthier book",
    body: "Catch the risky applications before disbursement, so bad loans never make it onto your books.",
  },
  {
    title: "Officers chase the ready ones",
    body: "Your team spends its time on applicants who are actually able and willing to pay you back.",
  },
];

export default function MicrofinancePage() {
  return (
    <div className="hp-body">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* NAV */}
      <nav className="hp-nav">
        <div className="hp-nav-inner">
          <a className="hp-nav-logo" href="/microfinance">
            <span
              style={{
                display: "inline-flex",
                alignItems: "flex-end",
                gap: 3,
                height: 22,
              }}
              aria-hidden="true"
            >
              <i style={{ width: 5, height: 11, background: "#dc2626", borderRadius: 1 }} />
              <i style={{ width: 5, height: 16, background: "#2563eb", borderRadius: 1 }} />
              <i style={{ width: 5, height: 22, background: "#16a34a", borderRadius: 1 }} />
            </span>
            <span className="hp-nav-logo-text">
              LeadScore<span>AI</span>
            </span>
          </a>

          <div className="hp-nav-links">
            <a className="hp-nav-link" href="#how">how it works</a>
            <a className="hp-nav-link" href="#checkup">free check-up</a>
            <a className="hp-nav-cta" href={CALENDLY} target="_blank" rel="noopener noreferrer">
              Book a call
            </a>
          </div>

          <MobileMenu calendlyUrl={CALENDLY} />
        </div>
      </nav>

      {/* HERO */}
      <header style={{ background: "#fff", borderBottom: "1px solid #ebe8f1" }}>
        <div
          className="hp-hero-inner"
          style={{
            maxWidth: 860,
            margin: "0 auto",
            padding: "72px 32px 64px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12.5,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#6d28d9",
              background: "#f3effc",
              padding: "7px 14px",
              borderRadius: 999,
              marginBottom: 22,
            }}
          >
            For microfinance banks &amp; lenders
          </span>

          <h1
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 800,
              fontSize: 46,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#15131c",
              margin: "0 0 20px",
            }}
          >
            Know which borrowers will repay before you disburse loans
          </h1>

          <p
            style={{
              fontSize: 19,
              lineHeight: 1.55,
              color: "#5a5568",
              maxWidth: 620,
              margin: "0 auto 34px",
            }}
          >
            Cut defaults and strengthen repayment rates with LeadScoreAI — a system for
            predicting who is able and willing to pay you back.
          </p>

          <div
            className="hp-hero-btns"
            style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}
          >
            <a className="hp-btn-primary" href="#checkup">
              Take the free 2-minute check-up
            </a>
            <a className="hp-btn-secondary" href={CALENDLY} target="_blank" rel="noopener noreferrer">
              Book a call
            </a>
          </div>
        </div>
      </header>

      {/* VIDEO — the walkthrough / proof */}
      <section id="how" style={{ background: "#15131c", padding: "72px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 32px" }} className="hp-section-padded">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12.5,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#a78bfa",
              }}
            >
              See it on a real loan book
            </span>
            <h2
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontWeight: 800,
                fontSize: 32,
                letterSpacing: "-0.02em",
                color: "#fff",
                margin: "14px 0 12px",
              }}
            >
              A system for predicting repayments from your applications
            </h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "#b7b2c4", maxWidth: 560, margin: "0 auto" }}>
              Watch a live review of a microfinance loan book — from application scorecard to the
              analytics that flag who is ready, able, and willing to repay.
            </p>
          </div>
          <CheckupVideo />
        </div>
      </section>

      {/* BENEFITS */}
      <section style={{ background: "#fff", padding: "72px 0" }}>
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "0 32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
          className="hp-showcase-grid hp-section-padded"
        >
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              style={{
                background: "#faf9fc",
                border: "1px solid #ebe8f1",
                borderRadius: 12,
                padding: "30px 26px",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontWeight: 700,
                  fontSize: 18.5,
                  letterSpacing: "-0.01em",
                  color: "#15131c",
                  margin: "0 0 10px",
                }}
              >
                {b.title}
              </h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5a5568", margin: 0 }}>{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SCORECARD — the interactive lead magnet */}
      <section id="checkup" style={{ background: "#f6f4fb", padding: "72px 0", borderTop: "1px solid #ebe8f1" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 32px" }} className="hp-section-padded">
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12.5,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#6d28d9",
              }}
            >
              Free diagnostic
            </span>
            <h2
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontWeight: 800,
                fontSize: 32,
                letterSpacing: "-0.02em",
                color: "#15131c",
                margin: "14px 0 12px",
              }}
            >
              Is your loan qualification up to par?
            </h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "#5a5568", maxWidth: 560, margin: "0 auto" }}>
              Take the 2-minute check-up to see how your current loan application and qualification
              process scores — and where it&apos;s leaking repayments.
            </p>
          </div>

          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #e2ddef",
              boxShadow: "0 30px 70px -40px rgba(21,19,28,.35)",
              background: "#fff",
            }}
          >
            <iframe
              src="/loandoctor/checkup"
              title="Loan Doctor — free loan book check-up"
              style={{ width: "100%", height: 760, border: 0, display: "block" }}
            />
          </div>

          <p style={{ textAlign: "center", fontSize: 14, color: "#8a8598", marginTop: 18 }}>
            Prefer to talk it through?{" "}
            <a
              href={CALENDLY}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6d28d9", fontWeight: 600, textDecoration: "none" }}
            >
              Book a 30-minute call &rarr;
            </a>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#15131c", padding: "36px 0" }}>
        <div
          className="hp-footer-inner hp-section-padded"
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "0 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>
            LeadScore<span style={{ color: "#a78bfa" }}>AI</span>
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: "#8a8598" }}>
            &copy; 2026 LeadScoreAI &middot; leadscoreai.com
          </span>
        </div>
      </footer>
    </div>
  );
}
