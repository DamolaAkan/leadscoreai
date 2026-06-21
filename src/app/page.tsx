import type { Metadata } from "next";
import "./homepage.css";
import VideoPlayer from "./VideoPlayer";
import MobileMenu from "./MobileMenu";

const CALENDLY_URL = "https://calendly.com/akanbidamola";

export const metadata: Metadata = {
  title: "LeadScoreAI — Know which leads convert before you chase them",
  description:
    "LeadScoreAI scores every lead the moment they raise their hand, sorts them Hot, Warm, Cold, and learns which answers actually predict a sale — so your team spends time only on the people who'll say yes.",
  openGraph: {
    title: "LeadScoreAI — Know which leads convert before you chase them",
    description:
      "LeadScoreAI scores every lead the moment they raise their hand, sorts them Hot, Warm, Cold, and learns which answers actually predict a sale.",
    type: "website",
    siteName: "LeadScoreAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadScoreAI — Know which leads convert before you chase them",
    description:
      "Predictive lead scoring that tells you who'll convert before you pick up the phone.",
  },
  keywords: [
    "lead scoring",
    "lead qualification",
    "predictive analytics",
    "sales pipeline",
    "AI lead scoring",
    "conversion prediction",
    "lead management",
    "sales automation",
  ],
};

function LogoSvg({ size = 25 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect x="0" y="18" width="5" height="10" rx="1.5" fill="#dc2626" />
      <rect x="7.67" y="13" width="5" height="15" rx="1.5" fill="#2563eb" />
      <rect x="15.33" y="8" width="5" height="20" rx="1.5" fill="#d99409" />
      <rect x="23" y="1" width="5" height="27" rx="1.5" fill="#16a34a" />
    </svg>
  );
}

const PIPELINE = [
  {
    n: "01",
    title: "Scorecard",
    body: "A custom assessment, built around your offer, that prospects complete in under a minute.",
  },
  {
    n: "02",
    title: "Qualify",
    body: "Every answer is scored in real time and sorted Hot / Warm / Cold before they see a result.",
  },
  {
    n: "03",
    title: "Dashboard",
    body: "Every lead, score, and status in one live view your team works from each morning.",
  },
  {
    n: "04",
    title: "Analytics",
    body: "Understand your whole market — by answer, segment, and region — continuously.",
  },
  {
    n: "05",
    title: "Predictive",
    body: "The system learns which answers precede real sales and tells you who\u2019ll convert next.",
  },
];

const ICPS = [
  {
    tag: "FN",
    title: "Financing & asset lenders",
    body: "Vehicle, equipment, solar, BNPL. Know who can actually keep up payments before you commit the asset.",
  },
  {
    tag: "IN",
    title: "Insurance & credit",
    body: "Qualify applicants on intent and fit before your agents spend a day on the phone.",
  },
  {
    tag: "CO",
    title: "Coaches, consultants & B2B",
    body: "High-ticket offers where one good call is worth a hundred bad ones. Talk only to ready buyers.",
  },
  {
    tag: "AG",
    title: "Agent & distribution networks",
    body: "Hundreds of reps, thousands of leads. Get attribution and a live read on every market at once.",
  },
  {
    tag: "RE",
    title: "Real estate & high-value sales",
    body: "Long sales cycles where chasing the wrong lead costs weeks. Prioritise on evidence, not gut.",
  },
  {
    tag: "QC",
    title: "Any qualify-then-close motion",
    body: "If a conversation stands between a lead and a sale, scoring that lead first changes your economics.",
  },
];

export default function HomePage() {
  return (
    <div className="hp-body">
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Tier accent strip */}
      <div style={{ display: "flex", height: 4 }}>
        <div style={{ flex: 1, background: "#16a34a" }} />
        <div style={{ flex: 1, background: "#d99409" }} />
        <div style={{ flex: 1, background: "#2563eb" }} />
        <div style={{ flex: 1, background: "#dc2626" }} />
        <div style={{ flex: 4, background: "#6d28d9" }} />
      </div>

      {/* NAV */}
      <nav className="hp-nav">
        <div className="hp-nav-inner">
          <a href="#top" className="hp-nav-logo">
            <LogoSvg />
            <span className="hp-nav-logo-text">
              LeadScore<span>AI</span>
            </span>
          </a>
          <div className="hp-nav-links">
            <a href="#problem" className="hp-nav-link">
              why
            </a>
            <a href="#pipeline" className="hp-nav-link">
              how
            </a>
            <a href="#predictive" className="hp-nav-link">
              predictive
            </a>
            <a href="#pricing" className="hp-nav-link">
              pricing
            </a>
            <a href="#book" className="hp-nav-cta">
              Book a call &rarr;
            </a>
          </div>
          <MobileMenu calendlyUrl={CALENDLY_URL} />
        </div>
      </nav>

      {/* HERO */}
      <header
        id="top"
        className="hp-hero-inner"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "78px 32px 0",
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "12.5px",
            fontWeight: 500,
            letterSpacing: ".16em",
            textTransform: "uppercase" as const,
            color: "#6b6577",
          }}
        >
          Lead qualification{" "}
          <span style={{ color: "#6d28d9" }}>&times;</span> predictive scoring
        </div>
        <h1
          style={{
            fontFamily: "'Archivo'",
            fontWeight: 800,
            fontSize: "clamp(40px,6vw,78px)",
            lineHeight: 0.98,
            letterSpacing: "-0.035em",
            color: "#15131c",
            maxWidth: "15ch",
            marginTop: 26,
          }}
        >
          Know which leads convert{" "}
          <span
            style={{
              color: "#6d28d9",
              textDecoration: "underline",
              textDecorationThickness: "3px",
              textUnderlineOffset: "6px",
            }}
          >
            before
          </span>{" "}
          you chase them.
        </h1>
        <p
          style={{
            fontSize: "clamp(17px,1.7vw,20px)",
            color: "#6b6577",
            maxWidth: "54ch",
            marginTop: 28,
            lineHeight: 1.55,
          }}
        >
          LeadScoreAI scores every lead the moment they raise their hand, sorts
          them{" "}
          <strong style={{ color: "#15131c", fontWeight: 600 }}>
            Hot, Warm, Cold
          </strong>
          , and learns which answers actually predict a sale — so your team
          spends time only on the people who&apos;ll say yes.
        </p>
        <div
          className="hp-hero-btns"
          style={{
            display: "flex",
            gap: 12,
            marginTop: 34,
            flexWrap: "wrap" as const,
          }}
        >
          <a href="#book" className="hp-btn-primary">
            Book a strategy call &rarr;
          </a>
          <a href="#pipeline" className="hp-btn-secondary">
            See how it works
          </a>
        </div>

        {/* Conversion by tier chart */}
        <div
          className="hp-chart-wrapper"
          style={{
            marginTop: 60,
            border: "1px solid #ebe8f1",
            borderRadius: 6,
            background: "#faf9fc",
            display: "flex",
            flexWrap: "wrap" as const,
          }}
        >
          <div
            style={{
              flex: "1 1 460px",
              padding: "30px 34px",
              borderRight: "1px solid #ebe8f1",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap" as const,
                marginBottom: 30,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: ".08em",
                  textTransform: "uppercase" as const,
                  color: "#3a3545",
                }}
              >
                Conversion by tier
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: "11.5px",
                  color: "#928da0",
                }}
              >
                live deployment &middot; n=1,040
              </div>
            </div>
            {/* Bars */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 20,
                borderBottom: "2px solid #15131c",
                paddingTop: 6,
              }}
            >
              {[
                { pct: "44%", h: 150, color: "#16a34a" },
                { pct: "23.8%", h: 81, color: "#d99409" },
                { pct: "6.4%", h: 22, color: "#2563eb" },
                { pct: "0%", h: 3, color: "#dc2626" },
              ].map((bar) => (
                <div
                  key={bar.color}
                  style={{
                    flex: 1,
                    minWidth: 50,
                    display: "flex",
                    flexDirection: "column" as const,
                    justifyContent: "flex-end",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Archivo'",
                      fontWeight: 800,
                      fontSize: "clamp(22px,2.6vw,32px)",
                      lineHeight: 1,
                      color: bar.color,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {bar.pct}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: bar.h,
                      background: bar.color,
                      borderRadius: "2px 2px 0 0",
                    }}
                  />
                </div>
              ))}
            </div>
            {/* Legend */}
            <div style={{ display: "flex", gap: 20, marginTop: 13 }}>
              {[
                { color: "#16a34a", label: "Hot" },
                { color: "#d99409", label: "Warm" },
                { color: "#2563eb", label: "Cold" },
                { color: "#dc2626", label: "Not q." },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    flex: 1,
                    minWidth: 50,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: item.color,
                      borderRadius: 2,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: "11.5px",
                      letterSpacing: ".04em",
                      textTransform: "uppercase" as const,
                      color: "#3a3545",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              flex: "1 1 220px",
              padding: "30px 34px",
              display: "flex",
              flexDirection: "column" as const,
              justifyContent: "center",
              gap: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Archivo'",
                  fontWeight: 800,
                  fontSize: "clamp(30px,4vw,44px)",
                  lineHeight: 1,
                  color: "#6d28d9",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                7 days
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: "11.5px",
                  letterSpacing: ".04em",
                  textTransform: "uppercase" as const,
                  color: "#6b6577",
                  marginTop: 8,
                }}
              >
                From kickoff to live
              </div>
            </div>
            <div style={{ height: 1, background: "#ebe8f1" }} />
            <p
              style={{ fontSize: "13.5px", lineHeight: 1.5, color: "#6b6577" }}
            >
              The score predicts who pays{" "}
              <strong style={{ color: "#15131c", fontWeight: 600 }}>
                before anyone picks up the phone
              </strong>
              .
            </p>
          </div>
        </div>
      </header>

      {/* PROBLEM */}
      <section
        id="problem"
        style={{
          background: "#faf9fc",
          borderTop: "1px solid #ebe8f1",
          borderBottom: "1px solid #ebe8f1",
          marginTop: 96,
          padding: "clamp(74px,9vw,108px) 0",
        }}
      >
        <div
          className="hp-section-padded"
          style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "12.5px",
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase" as const,
              color: "#6b6577",
            }}
          >
            <span style={{ color: "#6d28d9" }}>01</span>
            <span style={{ color: "#cdc7da" }}> / </span>The problem
          </div>
          <p
            style={{
              fontFamily: "'Archivo'",
              fontWeight: 700,
              fontSize: "clamp(26px,3.6vw,42px)",
              lineHeight: 1.18,
              letterSpacing: "-0.02em",
              color: "#15131c",
              maxWidth: "24ch",
              marginTop: 26,
            }}
          >
            Your team pours hours into leads that were never going to buy — and
            you only find out{" "}
            <span
              style={{
                color: "#dc2626",
                textDecoration: "line-through",
                textDecorationThickness: "2px",
              }}
            >
              after
            </span>{" "}
            you&apos;ve spent the time.{" "}
            <span style={{ color: "#6d28d9" }}>
              It should be the other way round.
            </span>
          </p>
          <div
            className="hp-problem-cols"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 40,
              marginTop: 40,
              maxWidth: 880,
            }}
          >
            <p
              style={{ fontSize: "16.5px", lineHeight: 1.65, color: "#3a3545" }}
            >
              Every business that closes through a conversation has the same
              leak: leads come in, and someone guesses which ones are worth
              calling. Most of that guessing is wrong. Your best people burn
              their week on tyre-kickers while ready buyers go cold in the
              queue.
            </p>
            <p
              style={{ fontSize: "16.5px", lineHeight: 1.65, color: "#3a3545" }}
            >
              The information to tell them apart already exists — it&apos;s in{" "}
              <em
                style={{
                  fontStyle: "normal",
                  color: "#15131c",
                  fontWeight: 600,
                }}
              >
                how people answer
              </em>{" "}
              before they ever speak to you. LeadScoreAI turns that answer into
              a score, the score into a priority, and the outcome into a
              prediction that sharpens every month.
            </p>
          </div>
        </div>
      </section>

      {/* PIPELINE */}
      <section
        id="pipeline"
        className="hp-section-padded"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "clamp(74px,9vw,108px) 32px",
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "12.5px",
            fontWeight: 600,
            letterSpacing: ".1em",
            textTransform: "uppercase" as const,
            color: "#6b6577",
          }}
        >
          <span style={{ color: "#6d28d9" }}>02</span>
          <span style={{ color: "#cdc7da" }}> / </span>How it works
        </div>
        <h2
          style={{
            fontFamily: "'Archivo'",
            fontWeight: 800,
            fontSize: "clamp(28px,3.8vw,46px)",
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
            color: "#15131c",
            maxWidth: "20ch",
            marginTop: 22,
          }}
        >
          One pipeline. From first click to{" "}
          <span style={{ color: "#6d28d9" }}>predicted</span> sale.
        </h2>
        <p
          style={{
            fontSize: 17,
            color: "#6b6577",
            maxWidth: "58ch",
            marginTop: 18,
            lineHeight: 1.6,
          }}
        >
          Every piece runs automatically. Your team only steps in when a lead is
          already qualified — and the system tells you which ones to trust.
        </p>
        <div
          className="hp-pipeline-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
            gap: 1,
            background: "#ebe8f1",
            border: "1px solid #ebe8f1",
            borderRadius: 6,
            overflow: "hidden",
            marginTop: 46,
          }}
        >
          {PIPELINE.map((step) => (
            <div
              key={step.n}
              style={{
                background: "#fff",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column" as const,
                gap: 13,
                minHeight: 172,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#6d28d9",
                  }}
                >
                  {step.n}
                </span>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: 13,
                    color: "#d6d1e2",
                  }}
                >
                  &rarr;
                </span>
              </div>
              <div
                style={{
                  fontFamily: "'Archivo'",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#15131c",
                  letterSpacing: "-0.01em",
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  fontSize: "13.5px",
                  color: "#6b6577",
                  lineHeight: 1.55,
                }}
              >
                {step.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SHOWCASE: dashboard + analytics */}
      <section
        style={{
          background: "#f4f2f8",
          borderTop: "1px solid #ebe8f1",
          padding: "clamp(74px,9vw,108px) 0",
        }}
      >
        <div
          className="hp-section-padded"
          style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "12.5px",
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase" as const,
              color: "#6b6577",
            }}
          >
            <span style={{ color: "#6d28d9" }}>03</span>
            <span style={{ color: "#cdc7da" }}> / </span>The product
          </div>
          <div
            className="hp-showcase-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 36,
              alignItems: "start",
              marginTop: 22,
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Archivo'",
                  fontWeight: 800,
                  fontSize: "clamp(24px,2.8vw,32px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.025em",
                  color: "#15131c",
                }}
              >
                Every lead, scored and sorted — the moment they raise their
                hand.
              </h3>
              <p
                style={{
                  fontSize: 16,
                  color: "#6b6577",
                  lineHeight: 1.6,
                  marginTop: 16,
                }}
              >
                No more staring at a flat list of names wondering who to call.
                Each lead arrives with a score, a tier, and a place in the
                queue. Your team works the warm ones first, and nothing slips
                through.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column" as const,
                gap: 14,
                paddingTop: 6,
              }}
            >
              {[
                "Real-time Hot / Warm / Cold scoring on every assessment",
                "Funnel KPIs: conversion, qualification, time-to-close",
                "One-click conversion tracking, end to end",
              ].map((text, i) => (
                <div key={i}>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        color: "#6d28d9",
                        fontWeight: 600,
                        fontSize: 15,
                        lineHeight: 1.4,
                      }}
                    >
                      +
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        color: "#3a3545",
                        lineHeight: 1.45,
                      }}
                    >
                      {text}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      style={{
                        height: 1,
                        background: "#e4e0ee",
                        marginTop: 14,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard screenshot */}
          <div
            style={{
              border: "1px solid #e2def0",
              borderRadius: 9,
              overflow: "hidden",
              boxShadow: "0 36px 70px -34px rgba(40,20,80,.32)",
              marginTop: 40,
              background: "#fff",
            }}
          >
            <div className="hp-browser-bar">
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#e0654c",
                }}
              />
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#e0a23c",
                }}
              />
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#5bb46a",
                }}
              />
              <span
                style={{
                  marginLeft: 14,
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 11,
                  color: "#928da0",
                }}
              >
                app.leadscoreai.com / dashboard
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/dashboard-screenshot.png"
              alt="LeadScoreAI dashboard"
              style={{ display: "block", width: "100%" }}
            />
          </div>

          {/* Analytics section */}
          <div
            className="hp-showcase-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 36,
              alignItems: "start",
              marginTop: 72,
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Archivo'",
                  fontWeight: 800,
                  fontSize: "clamp(24px,2.8vw,32px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.025em",
                  color: "#15131c",
                }}
              >
                Understand your market — not just your leads.
              </h3>
              <p
                style={{
                  fontSize: 16,
                  color: "#6b6577",
                  lineHeight: 1.6,
                  marginTop: 16,
                }}
              >
                Every answer your prospects give becomes market intelligence:
                who they are, where they are, what they want, and what they
                fear. Continuous insight built into the motion you already run.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column" as const,
                gap: 14,
                paddingTop: 6,
              }}
            >
              {[
                "Score distribution and qualification mix at a glance",
                "Volume by segment, region and month — tracked over time",
                "Which answers correlate with a closed sale",
              ].map((text, i) => (
                <div key={i}>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        color: "#6d28d9",
                        fontWeight: 600,
                        fontSize: 15,
                        lineHeight: 1.4,
                      }}
                    >
                      +
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        color: "#3a3545",
                        lineHeight: 1.45,
                      }}
                    >
                      {text}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      style={{
                        height: 1,
                        background: "#e4e0ee",
                        marginTop: 14,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Analytics screenshot */}
          <div
            style={{
              border: "1px solid #e2def0",
              borderRadius: 9,
              overflow: "hidden",
              boxShadow: "0 36px 70px -34px rgba(40,20,80,.32)",
              marginTop: 40,
              background: "#fff",
            }}
          >
            <div className="hp-browser-bar">
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#e0654c",
                }}
              />
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#e0a23c",
                }}
              />
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#5bb46a",
                }}
              />
              <span
                style={{
                  marginLeft: 14,
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 11,
                  color: "#928da0",
                }}
              >
                app.leadscoreai.com / analytics
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/analytics-screenshot.png"
              alt="LeadScoreAI analytics"
              style={{ display: "block", width: "100%" }}
            />
          </div>
        </div>
      </section>

      {/* PREDICTIVE (dark) */}
      <section
        id="predictive"
        style={{ background: "#0a0810", padding: "clamp(74px,9vw,108px) 0" }}
      >
        <div
          className="hp-section-padded"
          style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "12.5px",
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase" as const,
              color: "#a78bfa",
            }}
          >
            <span style={{ color: "#c4aef5" }}>04</span>
            <span style={{ color: "#4a3f63" }}> / </span>The predictive layer
          </div>
          <h2
            style={{
              fontFamily: "'Archivo'",
              fontWeight: 800,
              fontSize: "clamp(28px,3.8vw,46px)",
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              color: "#fff",
              maxWidth: "20ch",
              marginTop: 22,
            }}
          >
            The score predicts who pays —{" "}
            <span style={{ color: "#c4aef5" }}>before</span> a single call.
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "#a39db4",
              maxWidth: "60ch",
              marginTop: 18,
              lineHeight: 1.6,
            }}
          >
            LeadScoreAI links every scorecard answer to what actually happened —
            paid or not — and feeds it back. It doesn&apos;t just sort your
            leads, it tells you which answers signal a buyer.
          </p>

          {/* VIDEO */}
          <div style={{ marginTop: 40 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: ".06em",
                textTransform: "uppercase" as const,
                color: "#a78bfa",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#6d28d9",
                  boxShadow: "0 0 0 4px rgba(109,40,217,.28)",
                }}
              />
              Watch &middot; how the predictive layer works
            </div>
            <VideoPlayer />
          </div>

          {/* Stats grid */}
          <div
            className="hp-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 16,
              marginTop: 44,
            }}
          >
            {[
              { pct: "44%", label: "Hot leads converted", color: "#4ade80", border: "#4ade80" },
              { pct: "23.8%", label: "Warm leads converted", color: "#fbbf24", border: "#fbbf24" },
              { pct: "6.4%", label: "Cold leads converted", color: "#60a5fa", border: "#60a5fa" },
              { pct: "0%", label: "Not-qualified converted", color: "#f87171", border: "#f87171" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  borderTop: `3px solid ${stat.border}`,
                  background: "rgba(255,255,255,.035)",
                  padding: "24px 22px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Archivo'",
                    fontWeight: 800,
                    fontSize: "clamp(30px,3.6vw,44px)",
                    lineHeight: 1,
                    color: stat.color,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stat.pct}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: "11.5px",
                    letterSpacing: ".04em",
                    textTransform: "uppercase" as const,
                    color: "#a39db4",
                    marginTop: 10,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
          <p
            style={{
              fontSize: "14.5px",
              color: "#c8c2d6",
              marginTop: 28,
              maxWidth: "64ch",
              lineHeight: 1.6,
            }}
          >
            Conversion climbs cleanly from{" "}
            <b style={{ color: "#fff" }}>0%</b> for Not-Qualified to{" "}
            <b style={{ color: "#fff" }}>44%</b> for Hot — proof the score
            assigned{" "}
            <em style={{ fontStyle: "normal", color: "#fff" }}>
              before any contact
            </em>{" "}
            predicts who actually pays. The system even surfaces individual
            signals: applicants comfortable with repayments converted at{" "}
            <b style={{ color: "#fff" }}>25.2%</b> vs{" "}
            <b style={{ color: "#fff" }}>19.2%</b> for those who weren&apos;t.
          </p>

          {/* Predictive screenshots */}
          <div
            style={{
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 9,
              overflow: "hidden",
              marginTop: 38,
              boxShadow: "0 36px 70px -34px rgba(0,0,0,.6)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/predictive-conversion.png"
              alt="Predictive conversion"
              style={{ display: "block", width: "100%" }}
            />
          </div>
          <div
            style={{
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 9,
              overflow: "hidden",
              marginTop: 20,
              boxShadow: "0 36px 70px -34px rgba(0,0,0,.6)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/predictive-signals.png"
              alt="Predictive signals"
              style={{ display: "block", width: "100%" }}
            />
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section
        className="hp-section-padded"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "clamp(74px,9vw,108px) 32px",
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "12.5px",
            fontWeight: 600,
            letterSpacing: ".1em",
            textTransform: "uppercase" as const,
            color: "#6b6577",
          }}
        >
          <span style={{ color: "#6d28d9" }}>05</span>
          <span style={{ color: "#cdc7da" }}> / </span>Who it&apos;s for
        </div>
        <h2
          style={{
            fontFamily: "'Archivo'",
            fontWeight: 800,
            fontSize: "clamp(28px,3.8vw,46px)",
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
            color: "#15131c",
            maxWidth: "22ch",
            marginTop: 22,
          }}
        >
          If you qualify leads before you close, this is for you.
        </h2>
        <p
          style={{
            fontSize: 17,
            color: "#6b6577",
            maxWidth: "60ch",
            marginTop: 18,
            lineHeight: 1.6,
          }}
        >
          Any business where a person decides who&apos;s worth pursuing — and
          gets it wrong often enough to cost real money.
        </p>
        <div
          className="hp-icp-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 1,
            background: "#ebe8f1",
            border: "1px solid #ebe8f1",
            borderRadius: 6,
            overflow: "hidden",
            marginTop: 46,
          }}
        >
          {ICPS.map((icp) => (
            <div
              key={icp.tag}
              className="hp-icp-card"
              style={{
                background: "#fff",
                padding: "28px 26px",
                display: "flex",
                flexDirection: "column" as const,
                gap: 11,
                minHeight: 172,
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  letterSpacing: ".08em",
                  color: "#6d28d9",
                  border: "1px solid #e4def7",
                  background: "#f6f3fd",
                  padding: "3px 8px",
                  borderRadius: 3,
                  alignSelf: "flex-start",
                }}
              >
                {icp.tag}
              </span>
              <div
                style={{
                  fontFamily: "'Archivo'",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#15131c",
                  letterSpacing: "-0.01em",
                  marginTop: 2,
                }}
              >
                {icp.title}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#6b6577",
                  lineHeight: 1.55,
                }}
              >
                {icp.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        style={{
          background: "#faf9fc",
          borderTop: "1px solid #ebe8f1",
          borderBottom: "1px solid #ebe8f1",
          padding: "clamp(74px,9vw,108px) 0",
        }}
      >
        <div
          className="hp-section-padded"
          style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "12.5px",
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase" as const,
              color: "#6b6577",
            }}
          >
            <span style={{ color: "#6d28d9" }}>06</span>
            <span style={{ color: "#cdc7da" }}> / </span>Pricing
          </div>
          <h2
            style={{
              fontFamily: "'Archivo'",
              fontWeight: 800,
              fontSize: "clamp(28px,3.8vw,46px)",
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              color: "#15131c",
              maxWidth: "20ch",
              marginTop: 22,
            }}
          >
            Consulting-led. Built for your business.
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "#6b6577",
              maxWidth: "58ch",
              marginTop: 18,
              lineHeight: 1.6,
            }}
          >
            Every engagement starts with a strategy call, because every business
            qualifies differently. Annual billing saves 20%.
          </p>
          <div
            className="hp-pricing-grid-new"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 18,
              marginTop: 46,
              alignItems: "stretch",
            }}
          >
            {/* Starter */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #ebe8f1",
                borderRadius: 6,
                padding: 32,
                display: "flex",
                flexDirection: "column" as const,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: ".08em",
                  textTransform: "uppercase" as const,
                  color: "#6b6577",
                }}
              >
                Starter
              </div>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "#6b6577",
                  marginTop: 10,
                  minHeight: 38,
                  lineHeight: 1.45,
                }}
              >
                Scorecard + qualification for a single offer.
              </p>
              <div
                style={{
                  fontFamily: "'Archivo'",
                  fontWeight: 800,
                  fontSize: 40,
                  color: "#15131c",
                  marginTop: 8,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                $500
                <span
                  style={{
                    fontSize: 15,
                    color: "#928da0",
                    fontWeight: 500,
                  }}
                >
                  {" "}
                  / mo
                </span>
              </div>
              <div
                style={{
                  height: 1,
                  background: "#ebe8f1",
                  margin: "22px 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 12,
                  flexGrow: 1,
                }}
              >
                {[
                  "Custom scorecard build",
                  "Hot / Warm / Cold scoring",
                  "Branded results page",
                  "Admin dashboard & CSV export",
                ].map((f) => (
                  <div
                    key={f}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: "14.5px",
                      color: "#3a3545",
                    }}
                  >
                    <span
                      style={{
                        color: "#6d28d9",
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontWeight: 600,
                      }}
                    >
                      +
                    </span>
                    {f}
                  </div>
                ))}
              </div>
              <a href="#book" className="hp-price-btn-outline">
                Book a call
              </a>
            </div>

            {/* Scale (Most popular) */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #6d28d9",
                boxShadow:
                  "0 0 0 1px #6d28d9, 0 24px 50px -28px rgba(109,40,217,.4)",
                borderRadius: 6,
                padding: 32,
                display: "flex",
                flexDirection: "column" as const,
                position: "relative" as const,
              }}
            >
              <span
                style={{
                  position: "absolute" as const,
                  top: -11,
                  left: 32,
                  background: "#6d28d9",
                  color: "#fff",
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  letterSpacing: ".08em",
                  textTransform: "uppercase" as const,
                  padding: "5px 12px",
                  borderRadius: 3,
                }}
              >
                Most popular
              </span>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: ".08em",
                  textTransform: "uppercase" as const,
                  color: "#6d28d9",
                }}
              >
                Scale
              </div>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "#6b6577",
                  marginTop: 10,
                  minHeight: 38,
                  lineHeight: 1.45,
                }}
              >
                Full analytics + predictive layer for teams.
              </p>
              <div
                style={{
                  fontFamily: "'Archivo'",
                  fontWeight: 800,
                  fontSize: 40,
                  color: "#15131c",
                  marginTop: 8,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                $2,400
                <span
                  style={{
                    fontSize: 15,
                    color: "#928da0",
                    fontWeight: 500,
                  }}
                >
                  {" "}
                  / mo
                </span>
              </div>
              <div
                style={{
                  height: 1,
                  background: "#ebe8f1",
                  margin: "22px 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 12,
                  flexGrow: 1,
                }}
              >
                {[
                  "Everything in Starter",
                  "Unlimited scorecards & responses",
                  "Market intelligence analytics",
                  "Predictive conversion insights",
                  "Agent-level attribution",
                ].map((f) => (
                  <div
                    key={f}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: "14.5px",
                      color: "#3a3545",
                    }}
                  >
                    <span
                      style={{
                        color: "#6d28d9",
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontWeight: 600,
                      }}
                    >
                      +
                    </span>
                    {f}
                  </div>
                ))}
              </div>
              <a href="#book" className="hp-price-btn-primary">
                Book a call
              </a>
            </div>

            {/* Enterprise */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #ebe8f1",
                borderRadius: 6,
                padding: 32,
                display: "flex",
                flexDirection: "column" as const,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: ".08em",
                  textTransform: "uppercase" as const,
                  color: "#6b6577",
                }}
              >
                Enterprise
              </div>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "#6b6577",
                  marginTop: 10,
                  minHeight: 38,
                  lineHeight: 1.45,
                }}
              >
                White-label, bespoke build, dedicated team.
              </p>
              <div
                style={{
                  fontFamily: "'Archivo'",
                  fontWeight: 800,
                  fontSize: 40,
                  color: "#15131c",
                  marginTop: 8,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                $5,000
                <span
                  style={{
                    fontSize: 15,
                    color: "#928da0",
                    fontWeight: 500,
                  }}
                >
                  + / mo
                </span>
              </div>
              <div
                style={{
                  height: 1,
                  background: "#ebe8f1",
                  margin: "22px 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 12,
                  flexGrow: 1,
                }}
              >
                {[
                  "Everything in Scale",
                  "White-label — your brand only",
                  "Custom integrations & exports",
                  "Dedicated account manager",
                ].map((f) => (
                  <div
                    key={f}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: "14.5px",
                      color: "#3a3545",
                    }}
                  >
                    <span
                      style={{
                        color: "#6d28d9",
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontWeight: 600,
                      }}
                    >
                      +
                    </span>
                    {f}
                  </div>
                ))}
              </div>
              <a href="#book" className="hp-price-btn-outline">
                Talk to us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        id="book"
        style={{
          background: "#0a0810",
          padding: "clamp(86px,11vw,128px) 0",
          textAlign: "center" as const,
        }}
      >
        <div
          className="hp-section-padded"
          style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}
        >
          <h2
            style={{
              fontFamily: "'Archivo'",
              fontWeight: 900,
              fontSize: "clamp(34px,5.4vw,66px)",
              lineHeight: 1,
              letterSpacing: "-0.035em",
              color: "#fff",
              maxWidth: "16ch",
              margin: "0 auto",
            }}
          >
            Stop chasing.{" "}
            <span style={{ color: "#c4aef5" }}>Start predicting.</span>
          </h2>
          <p
            style={{
              fontSize: 18,
              color: "#a39db4",
              margin: "24px auto 0",
              maxWidth: "52ch",
              lineHeight: 1.55,
            }}
          >
            Book a 30-minute strategy call. We&apos;ll map your qualification
            flow and show you exactly what we&apos;d build — live in 7 days.
          </p>
          <div style={{ marginTop: 36 }}>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hp-cta-btn"
            >
              Book your strategy call &rarr;
            </a>
          </div>
          <p
            style={{
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 12,
              color: "#6b6577",
              marginTop: 20,
              letterSpacing: ".03em",
            }}
          >
            No commitment &middot; No pitch &middot; Just a conversation about
            your leads
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid #1f1a2b",
          background: "#0a0810",
          padding: "36px 0",
        }}
      >
        <div
          className="hp-footer-inner"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap" as const,
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <LogoSvg size={23} />
            <span
              style={{
                fontFamily: "'Archivo'",
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: "-0.03em",
                color: "#fff",
              }}
            >
              LeadScore<span style={{ color: "#a78bfa" }}>AI</span>
            </span>
          </div>
          <p
            style={{
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 12,
              color: "#6b6577",
              letterSpacing: ".02em",
            }}
          >
            Score every lead. Predict every sale. &copy; 2026 LeadScoreAI.
          </p>
        </div>
      </footer>
    </div>
  );
}
