import type { Metadata } from "next";
import CheckupVideo from "./CheckupVideo";
import "../homepage.css";

export const metadata: Metadata = {
  title: "Predict which borrowers will repay | LeadScoreAI for Microfinance",
  description:
    "Know which borrowers will repay before you disburse loans. LeadScoreAI helps microfinance banks and lenders cut defaults and strengthen repayment rates.",
};

export default function MicrofinancePage() {
  return (
    <div className="hp-body">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* NAV — logo only */}
      <nav className="hp-nav">
        <div className="hp-nav-inner" style={{ justifyContent: "center" }}>
          <a className="hp-nav-logo" href="/microfinance">
            <span
              style={{ display: "inline-flex", alignItems: "flex-end", gap: 3, height: 22 }}
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
        </div>
      </nav>

      {/* MAIN — headline, video, scorecard */}
      <main style={{ background: "#fff", padding: "clamp(40px, 7vw, 72px) 20px clamp(48px, 8vw, 88px)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {/* Headline + subheadline */}
          <div style={{ textAlign: "center", marginBottom: "clamp(28px, 5vw, 44px)" }}>
            <h1
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(30px, 6vw, 46px)",
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                color: "#15131c",
                margin: "0 0 18px",
              }}
            >
              Know which borrowers will repay before you disburse loans
            </h1>
            <p
              style={{
                fontSize: "clamp(16px, 2.6vw, 19px)",
                lineHeight: 1.55,
                color: "#5a5568",
                maxWidth: 620,
                margin: "0 auto",
              }}
            >
              A video walkthrough of how microfinance banks and lenders can strengthen repayment
              rates and reduce defaults with LeadScoreAI.
            </p>
          </div>

          {/* Video */}
          <div style={{ marginBottom: "clamp(40px, 7vw, 72px)" }}>
            <CheckupVideo />
          </div>

          {/* Scorecard intro */}
          <div style={{ textAlign: "center", marginBottom: "clamp(24px, 4vw, 36px)" }}>
            <h2
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(24px, 4.4vw, 34px)",
                lineHeight: 1.14,
                letterSpacing: "-0.02em",
                color: "#15131c",
                margin: "0 0 14px",
                maxWidth: 720,
                marginInline: "auto",
              }}
            >
              Discover a system for predicting which borrowers are able and willing to pay you back.
            </h2>
            <p
              style={{
                fontSize: "clamp(15px, 2.4vw, 17.5px)",
                lineHeight: 1.55,
                color: "#5a5568",
                maxWidth: 560,
                margin: "0 auto",
              }}
            >
              Take the free 2-minute Loan Doctor scorecard below to see how your current loan
              qualification measures up.
            </p>
          </div>

          {/* Scorecard */}
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
              style={{ width: "100%", height: "clamp(680px, 92vh, 820px)", border: 0, display: "block" }}
            />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ background: "#15131c", padding: "32px 20px" }}>
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
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
