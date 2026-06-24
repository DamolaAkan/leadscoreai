"use client";

import { useState, useEffect } from "react";

/* ─── Price data — single source of truth ───
   To add a market: add a block to PRICING, a line to TZ_CURRENCY,
   and a line to CURRENCY_META. The selector builds itself from
   Object.keys(PRICING). */

const PRICING: Record<
  string,
  { starter: { setup: string; rec: string }; scale: { setup: string; rec: string } }
> = {
  USD: {
    starter: { setup: "$500", rec: "$150/mo" },
    scale: { setup: "$2,400", rec: "$600/mo" },
  },
  NGN: {
    starter: { setup: "₦500K", rec: "₦150K/mo" },
    scale: { setup: "₦2M", rec: "₦600K/mo" },
  },
  // future markets — add one block each with hand-set prices:
  // ZAR: { starter: { setup: "R…", rec: "R…/mo" }, scale: { setup: "R…", rec: "R…/mo" } },
  // KES: { ... }, BRL: { ... }, PHP: { ... }
};

const TZ_CURRENCY: Record<string, string> = {
  "Africa/Lagos": "NGN",
  // future:
  // "Africa/Johannesburg": "ZAR",
  // "Africa/Nairobi": "KES",
  // "America/Sao_Paulo": "BRL",
  // "Asia/Manila": "PHP",
};

const CURRENCY_META: Record<string, { symbol: string; label: string }> = {
  USD: { symbol: "$", label: "USD" },
  NGN: { symbol: "₦", label: "NGN" },
  // add alongside PRICING entries
};

const STORAGE_KEY = "lsai_currency";

function detectCurrency(): string {
  // 1. saved manual choice always wins
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in PRICING) return saved;
  } catch {}

  // 2. timezone (device-set, survives international routing)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const mapped = TZ_CURRENCY[tz];
    if (mapped && mapped in PRICING) return mapped;
  } catch {}

  // 3. default — the universal safe fallback
  return "USD";
}

/* ─── Purple pill for "one-time" label ─── */
const oneTimePillStyle: React.CSSProperties = {
  display: "inline-block",
  fontFamily: "'IBM Plex Mono',monospace",
  fontSize: "10.5px",
  fontWeight: 600,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#6d28d9",
  background: "#f3eefa",
  padding: "3px 8px",
  borderRadius: 3,
  marginLeft: 8,
  verticalAlign: "middle",
  position: "relative",
  top: -2,
};

/* ─── Feature list bullet ─── */
function FeatureList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, flexGrow: 1 }}>
      {items.map((f) => (
        <div
          key={f}
          style={{ display: "flex", gap: 10, fontSize: "14.5px", color: "#3a3545" }}
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
  );
}

export default function PricingSection() {
  const [currency, setCurrency] = useState("USD");
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  function selectCurrency(code: string) {
    setCurrency(code);
    setSelectorOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  }

  const prices = PRICING[currency] ?? PRICING.USD;
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  const currencyKeys = Object.keys(PRICING);

  return (
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
            textTransform: "uppercase",
            color: "#6b6577",
          }}
        >
          <span style={{ color: "#6d28d9" }}>06</span>
          <span style={{ color: "#cdc7da" }}> / </span>Pricing
        </div>

        {/* Heading + currency selector row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 22,
          }}
        >
          <h2
            style={{
              fontFamily: "'Archivo'",
              fontWeight: 800,
              fontSize: "clamp(28px,3.8vw,46px)",
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              color: "#15131c",
              maxWidth: "20ch",
              margin: 0,
            }}
          >
            Consulting-led. Built for your business.
          </h2>

          {/* Currency selector */}
          {currencyKeys.length > 1 && (
            <div style={{ position: "relative", flexShrink: 0, marginTop: 6 }}>
              <button
                onClick={() => setSelectorOpen(!selectorOpen)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: ".04em",
                  color: "#6d28d9",
                  background: "#f3eefa",
                  border: "1px solid #e4def7",
                  borderRadius: 4,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 14 }}>
                  🌍
                </span>
                {meta.symbol} {meta.label}
                <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
              </button>
              {selectorOpen && (
                <>
                  {/* Invisible overlay to close on outside click */}
                  <div
                    onClick={() => setSelectorOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 9 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      right: 0,
                      background: "#fff",
                      border: "1px solid #e4def7",
                      borderRadius: 4,
                      boxShadow: "0 8px 24px -8px rgba(109,40,217,.18)",
                      zIndex: 10,
                      minWidth: 120,
                      overflow: "hidden",
                    }}
                  >
                    {currencyKeys.map((code) => {
                      const m = CURRENCY_META[code] ?? { symbol: code, label: code };
                      const active = code === currency;
                      return (
                        <button
                          key={code}
                          onClick={() => selectCurrency(code)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "10px 14px",
                            border: "none",
                            background: active ? "#f3eefa" : "transparent",
                            fontFamily: "'IBM Plex Mono',monospace",
                            fontSize: 12,
                            fontWeight: active ? 600 : 500,
                            color: active ? "#6d28d9" : "#3a3545",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {m.symbol} {m.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <p
          style={{
            fontSize: 17,
            color: "#6b6577",
            maxWidth: "58ch",
            marginTop: 18,
            lineHeight: 1.6,
          }}
        >
          Every engagement starts with a one-time setup and a low monthly. We
          build it for your business — you go live in 7 days.
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
          {/* ── Starter ── */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #ebe8f1",
              borderRadius: 6,
              padding: 32,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: ".08em",
                textTransform: "uppercase",
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
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  fontFamily: "'Archivo'",
                  fontWeight: 800,
                  fontSize: 40,
                  color: "#15131c",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {prices.starter.setup}
                <span style={oneTimePillStyle}>one-time</span>
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "#928da0",
                  fontWeight: 500,
                  marginTop: 4,
                }}
              >
                then {prices.starter.rec}
              </div>
            </div>
            <div style={{ height: 1, background: "#ebe8f1", margin: "22px 0" }} />
            <FeatureList
              items={[
                "Custom scorecard build",
                "Hot / Warm / Cold scoring",
                "Branded results page",
                "Admin dashboard & CSV export",
              ]}
            />
            <a href="#book" className="hp-price-btn-outline">
              Book a call
            </a>
          </div>

          {/* ── Scale (Most popular) ── */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #6d28d9",
              boxShadow:
                "0 0 0 1px #6d28d9, 0 24px 50px -28px rgba(109,40,217,.4)",
              borderRadius: 6,
              padding: 32,
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -11,
                left: 32,
                background: "#6d28d9",
                color: "#fff",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "10.5px",
                fontWeight: 600,
                letterSpacing: ".08em",
                textTransform: "uppercase",
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
                textTransform: "uppercase",
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
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  fontFamily: "'Archivo'",
                  fontWeight: 800,
                  fontSize: 40,
                  color: "#15131c",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {prices.scale.setup}
                <span style={oneTimePillStyle}>one-time</span>
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "#928da0",
                  fontWeight: 500,
                  marginTop: 4,
                }}
              >
                then {prices.scale.rec}
              </div>
            </div>
            <div style={{ height: 1, background: "#ebe8f1", margin: "22px 0" }} />
            <FeatureList
              items={[
                "Everything in Starter",
                "Unlimited scorecards & responses",
                "Market intelligence analytics",
                "Predictive conversion insights",
                "Agent-level attribution",
              ]}
            />
            <a href="#book" className="hp-price-btn-primary">
              Book a call
            </a>
          </div>

          {/* ── Enterprise ── */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #ebe8f1",
              borderRadius: 6,
              padding: 32,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: ".08em",
                textTransform: "uppercase",
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
              Custom
            </div>
            <div
              style={{
                fontSize: 15,
                color: "#928da0",
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              Let&apos;s talk
            </div>
            <div style={{ height: 1, background: "#ebe8f1", margin: "22px 0" }} />
            <FeatureList
              items={[
                "Everything in Scale",
                "White-label — your brand only",
                "Custom integrations & exports",
                "Dedicated account manager",
              ]}
            />
            <a href="#book" className="hp-price-btn-outline">
              Talk to us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
