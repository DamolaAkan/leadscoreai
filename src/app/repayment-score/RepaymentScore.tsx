"use client";

import { useEffect, useRef, useState } from "react";
import {
  BOOK_SIZES,
  COUNTRIES,
  DIAGNOSTIC_BOOKING_URL,
  FINANCES,
  PARTS,
  QUESTIONS,
  ROLES,
  RS_COPY,
  type RSResult,
} from "@/lib/repayment-score";
import "./repayment-score.css";

type Step = "landing" | number | "details" | "result";

type Details = {
  name: string;
  company: string;
  role: string;
  email: string;
  whatsapp: string;
  finances: string;
  country: string;
  bookSize: string;
  raising: "" | "yes" | "no";
  consent: boolean;
};

const EMPTY: Details = {
  name: "", company: "", role: "", email: "", whatsapp: "", finances: "",
  country: "", bookSize: "", raising: "", consent: false,
};

const TOTAL_Q = QUESTIONS.length;

function band(score: number) {
  return score < 40 ? "low" : score < 70 ? "mid" : "high";
}

const Logo = () => (
  <svg width="26" height="26" viewBox="0 0 30 28" aria-hidden="true">
    <rect x="0" y="17" width="5.5" height="11" rx="1.5" fill="#dc2626" />
    <rect x="8" y="12" width="5.5" height="16" rx="1.5" fill="#2563eb" />
    <rect x="16" y="6" width="5.5" height="22" rx="1.5" fill="#d99409" />
    <rect x="24" y="0" width="5.5" height="28" rx="1.5" fill="#16a34a" />
  </svg>
);

function Ring({ score, size = 132, stroke = 12, light = false }: { score: number; size?: number; stroke?: number; light?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="rs-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? "rgba(255,255,255,.18)" : "#ece7f6"} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={light ? "#fff" : "#6d28d9"} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="rs-ring-val">
        <b>{score}</b>
        <span>out of 100</span>
      </div>
    </div>
  );
}

function Bars({ parts, weakestKey }: { parts: { key: string; name: string; score: number }[]; weakestKey?: string }) {
  return (
    <div className="rs-bars">
      {parts.map((p) => (
        <div key={p.key} className={`rs-barrow ${p.key === weakestKey ? "weak" : ""}`}>
          <span className="rs-barname">{p.name}</span>
          <span className="rs-bartrack"><i className={band(p.score)} style={{ width: `${Math.max(3, p.score)}%` }} /></span>
          <span className="rs-barval">{p.score}</span>
        </div>
      ))}
    </div>
  );
}

// Illustrative preview shown on the landing page (not anyone's real result).
const PREVIEW_PARTS = [
  { key: "acquisition", name: "Acquisition", score: 72 },
  { key: "screening", name: "Screening", score: 58 },
  { key: "handover", name: "Handover", score: 81 },
  { key: "repayment", name: "Repayment", score: 64 },
  { key: "collections", name: "Collections", score: 47 },
  { key: "tracking", name: "Tracking", score: 23 },
  { key: "prediction", name: "Prediction", score: 38 },
];

function TakeawayPreview() {
  return (
    <div className="rs-take">
      <div className="rs-take-hd">
        <span>YOUR TAKEAWAY</span>
        <em>example</em>
      </div>
      <div className="rs-take-top">
        <Ring score={55} size={112} stroke={10} />
        <div>
          <div className="rs-take-k">Number one repayment block</div>
          <div className="rs-take-block">Tracking</div>
          <p>You can&apos;t trace repayments back to the ad or agent that brought each customer.</p>
        </div>
      </div>
      <Bars parts={PREVIEW_PARTS} weakestKey="tracking" />
      <div className="rs-take-plan">
        {[
          ["30", "Track", "Tag every customer with their channel and agent"],
          ["60", "Fix", "Cut the agents and channels that bring defaulters"],
          ["90", "Predict", "Weekly view of repayment by month of lending"],
        ].map(([d, t, s]) => (
          <div key={d}>
            <b>{d}</b>
            <span className="t">{t}</span>
            <span className="s">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="rs-landing">
      <header className="rs-top">
        <div className="rs-logo"><Logo /><span className="rs-wm">LeadScore<span>AI</span></span></div>
        <div className="rs-toptag">Repayment Score</div>
      </header>
      <section className="rs-hero">
        <div className="rs-hero-l">
          <h1 className="rs-h1">{RS_COPY.headline}</h1>
          <p className="rs-byline">{RS_COPY.byline}</p>
          <p className="rs-sub">{RS_COPY.sub}</p>
          <button className="rs-cta" onClick={onStart}>{RS_COPY.button} <span aria-hidden>→</span></button>
          <p className="rs-under">{RS_COPY.underButton}</p>
          <p className="rs-note">{RS_COPY.note}</p>
        </div>
        <div className="rs-hero-r">
          <TakeawayPreview />
        </div>
      </section>
      <section className="rs-parts">
        <h2>The seven parts of a complete repayment system</h2>
        <div className="rs-parts-grid">
          {PARTS.map((p) => (
            <div key={p.key} className="rs-part">
              <span className="n">{p.n}</span>
              <b>{p.name}</b>
              <span>{p.blurb}</span>
            </div>
          ))}
        </div>
        <button className="rs-cta rs-cta2" onClick={onStart}>{RS_COPY.button} <span aria-hidden>→</span></button>
      </section>
      <footer className="rs-foot">For lenders and asset financiers: solar and PAYGo, phones, motorcycles, microfinance, digital loans, BNPL, farm inputs and equipment.</footer>
    </div>
  );
}

export default function RepaymentScore() {
  const [step, setStep] = useState<Step>("landing");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Details>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [result, setResult] = useState<RSResult | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  function pick(qid: string, oid: string, idx: number) {
    setAnswers((a) => ({ ...a, [qid]: oid }));
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => setStep(idx + 1 < TOTAL_Q ? idx + 1 : "details"), 260);
  }

  const set = <K extends keyof Details>(k: K, v: Details[K]) => setDetails((d) => ({ ...d, [k]: v }));

  async function submit() {
    const e: Record<string, string> = {};
    if (details.name.trim().length < 2) e.name = "Please add your name";
    if (details.company.trim().length < 2) e.company = "Please add your company";
    if (!details.role) e.role = "Please choose your role";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) e.email = "Please add a valid work email";
    if (details.whatsapp.replace(/\D/g, "").length < 8) e.whatsapp = "Add your WhatsApp number with country code";
    if (!details.finances) e.finances = "Please choose what you finance";
    if (!details.country) e.country = "Please choose your country";
    if (!details.bookSize) e.bookSize = "Please choose your loan book size";
    if (!details.raising) e.raising = "Please choose yes or no";
    if (!details.consent) e.consent = "Please tick to get your score";
    setErrors(e);
    setAlert(null);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/repayment-score/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          details: { ...details, raising: details.raising === "yes" },
          source: { url: window.location.href, referrer: document.referrer },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.result) {
        setAlert(data.error || "Something went wrong. Please try again.");
        return;
      }
      setResult(data.result);
      setStep("result");
    } catch {
      setAlert("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadPdf() {
    if (!result) return;
    setPdfBusy(true);
    try {
      const { buildRepaymentPlanPdf } = await import("@/lib/repayment-score-pdf");
      buildRepaymentPlanPdf(result).save("repayment-score-90-day-plan.pdf");
    } finally {
      setPdfBusy(false);
    }
  }

  if (step === "landing") return <div className="rs-page"><Landing onStart={() => setStep(0)} /></div>;

  // ---------- questions ----------
  if (typeof step === "number") {
    const q = QUESTIONS[step];
    const part = PARTS.find((p) => p.key === q.part)!;
    const inPart = QUESTIONS.filter((x) => x.part === q.part).findIndex((x) => x.id === q.id) + 1;
    return (
      <div className="rs-page">
        <div className="rs-flow">
          <div className="rs-flowtop">
            <div className="rs-logo sm"><Logo /><span className="rs-wm">LeadScore<span>AI</span></span></div>
            <span className="rs-count">{step + 1} of {TOTAL_Q}</span>
          </div>
          <div className="rs-progress"><i style={{ width: `${((step + 1) / (TOTAL_Q + 1)) * 100}%` }} /></div>
          <div className="rs-partpills">
            {PARTS.map((p) => (
              <span key={p.key} className={p.key === q.part ? "on" : PARTS.indexOf(p) < PARTS.indexOf(part) ? "done" : ""}>{p.n}</span>
            ))}
          </div>
          <div className="rs-card">
            <div className="rs-kicker">Part {part.n} of 7 · {part.name} · question {inPart} of 3</div>
            <h2 className="rs-q">{q.q}</h2>
            <div className="rs-opts">
              {q.opts.map((o) => (
                <button key={o.id} type="button" className={`rs-opt ${answers[q.id] === o.id ? "sel" : ""}`} onClick={() => pick(q.id, o.id, step)}>
                  <span className="dot" />{o.text}
                </button>
              ))}
            </div>
            <div className="rs-nav">
              <button className="rs-back" onClick={() => setStep(step === 0 ? "landing" : step - 1)}>← Back</button>
              {answers[q.id] && (
                <button className="rs-next" onClick={() => setStep(step + 1 < TOTAL_Q ? step + 1 : "details")}>Next →</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- details ----------
  if (step === "details") {
    const F = (k: keyof Details, label: string, input: React.ReactNode) => (
      <label className={`rs-field ${errors[k] ? "has-err" : ""}`}>
        <span className="lbl">{label}</span>
        {input}
        {errors[k] && <span className="err">{errors[k]}</span>}
      </label>
    );
    return (
      <div className="rs-page">
        <div className="rs-flow">
          <div className="rs-flowtop">
            <div className="rs-logo sm"><Logo /><span className="rs-wm">LeadScore<span>AI</span></span></div>
            <span className="rs-count">Last step</span>
          </div>
          <div className="rs-progress"><i style={{ width: `${(TOTAL_Q / (TOTAL_Q + 1)) * 100}%` }} /></div>
          <div className="rs-card">
            <div className="rs-kicker">All seven parts done</div>
            <h2 className="rs-q">Where should we send your Repayment Score and 90-day plan?</h2>
            {alert && <div className="rs-alert" role="alert">{alert}</div>}
            <div className="rs-grid2">
              {F("name", "Your name", <input value={details.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Amina Okafor" autoComplete="name" />)}
              {F("company", "Company", <input value={details.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Sunrise Asset Finance" autoComplete="organization" />)}
              {F("role", "Your role", (
                <select value={details.role} onChange={(e) => set("role", e.target.value)}>
                  <option value="">Choose…</option>
                  {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              ))}
              {F("email", "Work email", <input type="email" value={details.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" autoComplete="email" />)}
              {F("whatsapp", "WhatsApp number", <input type="tel" inputMode="tel" value={details.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+234 811 000 0000" autoComplete="tel" />)}
              {F("finances", "What do you finance?", (
                <select value={details.finances} onChange={(e) => set("finances", e.target.value)}>
                  <option value="">Choose…</option>
                  {FINANCES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              ))}
              {F("country", "Country", (
                <select value={details.country} onChange={(e) => set("country", e.target.value)}>
                  <option value="">Choose…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ))}
              {F("bookSize", "Loan book size", (
                <select value={details.bookSize} onChange={(e) => set("bookSize", e.target.value)}>
                  <option value="">Choose…</option>
                  {BOOK_SIZES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              ))}
            </div>
            <div className={`rs-field ${errors.raising ? "has-err" : ""}`}>
              <span className="lbl">Are you raising money this year?</span>
              <div className="rs-yn">
                {(["yes", "no"] as const).map((v) => (
                  <button key={v} type="button" className={details.raising === v ? "sel" : ""} onClick={() => set("raising", v)}>
                    {v === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
              {errors.raising && <span className="err">{errors.raising}</span>}
            </div>
            <label className={`rs-consent ${errors.consent ? "has-err" : ""}`}>
              <input type="checkbox" checked={details.consent} onChange={(e) => set("consent", e.target.checked)} />
              <span>LeadScoreAI may contact me about my Repayment Score by email or WhatsApp. I can opt out at any time.</span>
            </label>
            {errors.consent && <span className="err rs-consent-err">{errors.consent}</span>}
            <div className="rs-nav">
              <button className="rs-back" onClick={() => setStep(TOTAL_Q - 1)}>← Back</button>
              <button className="rs-next big" disabled={submitting} onClick={submit}>
                {submitting ? "Scoring…" : "See my Repayment Score →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- result ----------
  if (!result) return null;
  return (
    <div className="rs-page">
      <div className="rs-result">
        <div className="rs-flowtop">
          <div className="rs-logo sm"><Logo /><span className="rs-wm">LeadScore<span>AI</span></span></div>
          <span className="rs-count">Your Repayment Score</span>
        </div>

        <section className="rs-res-hero">
          <Ring score={result.total} size={156} stroke={13} light />
          <div>
            <div className="rs-res-k">{result.firstName ? `${result.firstName}, your` : "Your"} number one repayment block is</div>
            <h1 className="rs-res-block">{result.weakest.name}</h1>
            <p>{result.weakest.explanation}</p>
          </div>
        </section>

        <section className="rs-res-card">
          <h2>Your seven parts</h2>
          <Bars parts={result.parts} weakestKey={result.weakest.key} />
        </section>

        <section className="rs-res-card">
          <h2>Your three next steps</h2>
          <ol className="rs-steps">
            {result.nextSteps.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}
          </ol>
        </section>

        <section className="rs-res-card">
          <h2>Your 90-day plan</h2>
          <p className="rs-muted">Built from your two weakest parts.</p>
          <div className="rs-plan">
            {result.plan.map((ph) => (
              <div key={ph.phase} className="rs-phase">
                <div className="rs-phase-d">{ph.days}</div>
                <div className="rs-phase-t">{ph.phase}</div>
                <ul>{ph.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className="rs-pdfrow">
            <button className="rs-pdf" onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy ? "Preparing…" : "Download my plan (PDF)"}</button>
            {result.emailSent && <span className="rs-muted">We have also emailed your plan to you.</span>}
          </div>
        </section>

        <section className={`rs-diag ${result.bookOver1m ? "vip" : ""}`}>
          {result.bookOver1m && <div className="rs-diag-tag">Your loan book qualifies</div>}
          <h2>{RS_COPY.diagnosticTitle}</h2>
          <p>{RS_COPY.diagnosticBody}</p>
          <a className="rs-cta" href={DIAGNOSTIC_BOOKING_URL} target="_blank" rel="noopener noreferrer">
            {RS_COPY.diagnosticButton} <span aria-hidden>→</span>
          </a>
        </section>
        <p className="rs-foot">{RS_COPY.byline}</p>
      </div>
    </div>
  );
}
