"use client";

import { useState } from "react";
import { trackLead, META_PIXEL_ID } from "@/components/MetaPixel";
import "./mortgage.css";

// order (1-based) matches the seeded question_order.
type Q = { order: number; q: string; opts: [string, number][]; multi?: boolean };
const QUESTIONS: Q[] = [
  { order: 1, q: "Roughly how many people request mortgage properties from you each month?",
    opts: [["Over 300", 20], ["100 – 300", 16], ["Under 100", 8], ["Hard to say", 0]] },
  { order: 2, q: "How many of those actually become buyers?",
    opts: [["Only a few — most go nowhere", 15], ["About half", 10], ["I'm not sure", 8], ["Most of them", 5]] },
  { order: 3, q: "What kind of homes do you mainly sell?", multi: true,
    opts: [["Detached / duplexes", 0], ["Semi-detached / terraces", 0], ["Apartments / flats", 0], ["Estates / off-plan", 0]] },
  { order: 4, q: "What's your average property price?",
    opts: [["Under ₦100M", 0], ["₦100 – 500M", 0], ["₦500M – 1B", 0], ["Over ₦1B", 0]] },
  { order: 5, q: "How do your buyers usually pay?",
    opts: [["Mortgage (NHF / MREIF)", 0], ["Bank mortgage", 0], ["In-house installment / rent-to-own", 0], ["Outright cash", 0], ["A mix", 0]] },
  { order: 6, q: "Once we set up your scorecard and dashboard, how soon could you start sending your enquiries to it?",
    opts: [["Right away", 15], ["Within a month", 10], ["Just exploring for now", 3]] },
  { order: 7, q: "One closed sale covers it many times over. Can you commit to ₦130,000/month?",
    opts: [["Yes, that works", 50], ["I'd need to think", 20], ["Not right now", 0]] },
];

// index into QUESTIONS for the three headline factors
const FACTORS = [
  { label: "Ability to invest", qi: 6, max: 50 },
  { label: "Enquiry volume", qi: 0, max: 20 },
  { label: "Readiness to start", qi: 5, max: 15 },
];

type Answer = { text: string; points: number };
type Contact = { name: string; co: string; email: string; phone: string };

function emailOk(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export default function MortgageScorecard() {
  const N = QUESTIONS.length + 1; // contact + questions
  const [step, setStep] = useState(0); // 0 = contact, 1..7 = questions, N = score
  const [contact, setContact] = useState<Contact>({ name: "", co: "", email: "", phone: "" });
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [claimed, setClaimed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [started, setStarted] = useState(false);
  const [responseId, setResponseId] = useState<string | null>(null);

  function startAssessment() {
    const errs: Record<string, string> = {};
    if (!contact.name.trim()) errs.name = "Please add your name";
    if (!contact.email.trim()) errs.email = "Please add your email";
    else if (!emailOk(contact.email.trim())) errs.email = "That email doesn't look right";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStep(1);
  }

  function pick(qi: number, text: string, points: number) {
    setAnswers((p) => ({ ...p, [qi]: { text, points } }));
  }

  // Multi-select (tickbox) questions store the picks joined; points stay 0 (info).
  const MULTI_SEP = ", ";
  function toggleMulti(qi: number, text: string) {
    setAnswers((p) => {
      const cur = p[qi]?.text ? p[qi].text.split(MULTI_SEP) : [];
      const next = cur.includes(text) ? cur.filter((t) => t !== text) : [...cur, text];
      const copy = { ...p };
      if (next.length) copy[qi] = { text: next.join(MULTI_SEP), points: 0 };
      else delete copy[qi];
      return copy;
    });
  }
  function multiHas(qi: number, text: string) {
    return (answers[qi]?.text ? answers[qi].text.split(MULTI_SEP) : []).includes(text);
  }

  // ---- scoring ----
  const scoredMax = 100;
  const total = QUESTIONS.reduce((s, _q, i) => s + (answers[i]?.points || 0), 0);
  const score = Math.round((total / scoredMax) * 100);
  const gateFail =
    answers[0]?.text === "Hard to say" || answers[6]?.text === "Not right now";
  const qualified = !gateFail && score >= 50;
  const tier = qualified
    ? score >= 80 ? { t: "HOT FIT", e: "🔥" } : score >= 60 ? { t: "Strong fit", e: "✅" } : { t: "Warm fit", e: "🌤️" }
    : { t: "Not the right fit yet", e: "🌱" };
  const qualification =
    !qualified ? "NOT_QUALIFIED" : score >= 80 ? "HOT_LEAD" : score >= 60 ? "WARM_LEAD" : "COLD_LEAD";

  async function saveLead() {
    if (saved) return;
    setSaved(true);
    try {
      const payload = {
        contact: {
          name: contact.name.trim(),
          co: contact.co.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
        },
        answers: QUESTIONS.map((q, i) => ({
          order: q.order,
          text: answers[i]?.text || "",
          points: answers[i]?.points || 0,
        })),
        score,
        qualification,
      };
      const res = await fetch("/api/mortgage/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.responseId) {
        console.error("[mortgage] save failed", data);
        return;
      }
      setResponseId(data.responseId);
      fetch("/api/email/mortgage-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId: data.responseId }),
      }).catch(() => {});
      // Fire the Meta Lead conversion (Siteflipmarket pixel) with advanced matching.
      trackLead(
        {
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          fullName: contact.name.trim(),
          externalId: data.responseId,
        },
        META_PIXEL_ID
      );
    } catch (e) {
      console.error("[mortgage] save exception", e);
    }
  }

  // Save the lead the moment we reach the score screen.
  function goToScore() {
    setStep(N);
    saveLead();
  }

  // Lead clicked "Claim my free scorecard" — record the extra intent so the
  // team sees "Interested in dashboard" on the response.
  function claimDashboard() {
    setClaimed(true);
    if (!responseId) return;
    fetch("/api/mortgage/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseId }),
    }).catch(() => {});
  }

  // ---------- render ----------
  const pct = (step / N) * 100;
  const Header = (idx: number) => (
    <div className="sc-hd">
      <div className="sc-hd-top">
        <div className="sc-hd-title"><img className="sun" src="/logos/leadscoreai.svg" alt="LeadScoreAI" width={26} height={26} /> Mortgage Fit Assessment</div>
        <span className="sc-chip">{Math.min(idx + 1, N)} of {N}</span>
      </div>
      <div className="sc-bar"><i style={{ width: `${Math.max(8, pct + 8)}%` }} /></div>
    </div>
  );

  if (!started) {
    return <MortgageLanding onStart={() => setStarted(true)} />;
  }

  let inner: React.ReactNode;

  if (step === 0) {
    inner = (
      <div className="sc-card">
        {Header(0)}
        <div className="sc-bd">
          <h2 className="sc-qh">First, a little about you</h2>
          <p className="sc-sub">So we know where to send your results and your free scorecard.</p>
          <div className="sc-field">
            <label>Your name</label>
            <input className={errors.name ? "err" : ""} placeholder="e.g. Tunde Bello"
              value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            {errors.name && <div className="sc-errtext">{errors.name}</div>}
          </div>
          <div className="sc-field">
            <label>Company</label>
            <input placeholder="e.g. Lekki Homes Ltd"
              value={contact.co} onChange={(e) => setContact({ ...contact, co: e.target.value })} />
          </div>
          <div className="sc-row2">
            <div className="sc-field">
              <label>Email</label>
              <input className={errors.email ? "err" : ""} placeholder="you@company.com"
                value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              {errors.email && <div className="sc-errtext">{errors.email}</div>}
            </div>
            <div className="sc-field">
              <label>Phone</label>
              <input placeholder="0801 234 5678"
                value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            </div>
          </div>
          <div className="sc-nav">
            <span />
            <button className="sc-btn next" onClick={startAssessment}>Start assessment <span>→</span></button>
          </div>
        </div>
      </div>
    );
  } else if (step <= QUESTIONS.length) {
    const qi = step - 1;
    const Q = QUESTIONS[qi];
    const last = step === QUESTIONS.length;
    inner = (
      <div className="sc-card">
        {Header(step)}
        <div className="sc-bd">
          <h2 className="sc-qh">{Q.q}</h2>
          {Q.multi && <p className="sc-hint">Select all that apply.</p>}
          <div className="sc-opts">
            {Q.opts.map(([text, points], i) => {
              const sel = Q.multi ? multiHas(qi, text) : answers[qi]?.text === text;
              return (
                <button key={i} type="button"
                  className={`sc-opt ${Q.multi ? "multi" : ""} ${sel ? "sel" : ""}`}
                  onClick={() => (Q.multi ? toggleMulti(qi, text) : pick(qi, text, points))}>
                  <span className="rd" />{text}
                </button>
              );
            })}
          </div>
          <div className="sc-nav">
            <button className="sc-btn prev" onClick={() => setStep(step - 1)}>← Previous</button>
            <button className="sc-btn next" disabled={Q.multi ? !answers[qi]?.text : answers[qi] == null}
              onClick={() => (last ? goToScore() : setStep(step + 1))}>
              {last ? "See my result" : "Next"} <span>→</span>
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    // score screen
    const R = 70, C = 2 * Math.PI * R;
    const off = C * (1 - score / 100);
    const verdict = !qualified
      ? "You're early — but worth staying close."
      : score >= 80 ? "You're a strong fit for LeadScoreAI."
      : score >= 60 ? "Good fit — this could work well for you."
      : "There's potential here — let's put it to work.";
    const vsub = qualified
      ? "You've got the enquiry volume and the readiness. If you qualify, a LeadScoreAI rep sets up your branded mortgage scorecard and dashboard — so you see which buyers can actually finance before you spend time on viewings."
      : "Right now the free scorecard wouldn't do much for you yet. No problem — we'll keep you posted, and reach out when the timing is better.";
    inner = (
      <div className="sc-card">
        <div className={`sc-score-hd ${qualified ? "" : "cold"}`}>
          <div className="sc-gauge">
            <svg width="168" height="168" viewBox="0 0 168 168">
              <circle cx="84" cy="84" r={R} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="13" />
              <circle cx="84" cy="84" r={R} fill="none" stroke="#D9A441" strokeWidth="13" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={off}
                style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }} />
            </svg>
            <div className="val"><div className="n">{score}</div><div className="of">out of 100</div></div>
          </div>
          <div className="sc-tierbadge">{tier.e} {tier.t}</div>
        </div>
        <div className="sc-score-bd">
          <h2 className="sc-verdict">{verdict}</h2>
          <p className="sc-verdict-sub">{vsub}</p>
          {qualified && FACTORS.map((f) => {
            const p = Math.round(((answers[f.qi]?.points || 0) / f.max) * 100);
            return (
              <div className="sc-fac" key={f.label}>
                <div className="sc-fac-top"><b>{f.label}</b><span>{p}%</span></div>
                <div className="sc-fac-bar"><i style={{ width: `${p}%` }} /></div>
              </div>
            );
          })}
          {qualified ? (
            <>
              <div className="sc-next-box">
                <b>What happens next</b>
                <p>If you qualify, a LeadScoreAI rep reaches out to set up your branded scorecard and dashboard — free to start. You bring your enquiries; then ₦130,000/month to keep it running. Cancel anytime.</p>
              </div>
              {claimed ? (
                <div className="sc-done">✓ You&apos;re in — we&apos;ll email {contact.email} shortly.</div>
              ) : (
                <button className="sc-btn next full sc-cta" onClick={claimDashboard}>
                  Claim my free scorecard →
                </button>
              )}
            </>
          ) : (
            claimed ? (
              <div className="sc-done">✓ Done — we&apos;ll keep you posted at {contact.email}.</div>
            ) : (
              <button className="sc-btn next full sc-cta" onClick={() => setClaimed(true)}>
                Keep me posted →
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="sc-stage">
      <div className="sc-wrap">{inner}</div>
    </div>
  );
}

const LOGO_BARS = (
  <svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true" style={{ flexShrink: 0 }}>
    <rect x="0" y="16" width="5.5" height="10" rx="1.5" fill="#8FBF9F" />
    <rect x="8" y="11" width="5.5" height="15" rx="1.5" fill="#C8892B" />
    <rect x="16" y="6" width="5.5" height="20" rx="1.5" fill="#D9A441" />
    <rect x="24" y="0" width="5.5" height="26" rx="1.5" fill="#F2EEE4" />
  </svg>
);

type Row = { init: string; title: string; sub: string; tier: "hot" | "warm" | "cold"; score: number };
const ROWS: Row[] = [
  { init: "OA", title: "₦45M · Lekki Ph 1", sub: "Salaried · deposit ready", tier: "hot", score: 96 },
  { init: "CE", title: "₦28M · Gwarinpa", sub: "Mortgage pre-approved", tier: "hot", score: 91 },
  { init: "TB", title: "₦32M · Ikoyi", sub: "Comparing plans", tier: "warm", score: 68 },
  { init: "KN", title: "₦18M · Ibadan", sub: "No deposit yet", tier: "cold", score: 31 },
  { init: "??", title: '"How much?"', sub: "No details · went quiet", tier: "cold", score: 18 },
];
// Mobile card uses shorter subtitles (matches the mobile reference).
const ROWS_M: Row[] = [
  { init: "OA", title: "₦45M · Lekki", sub: "Deposit ready", tier: "hot", score: 96 },
  { init: "CE", title: "₦28M · Gwarinpa", sub: "Pre-approved", tier: "hot", score: 91 },
  { init: "TB", title: "₦32M · Ikoyi", sub: "Comparing plans", tier: "warm", score: 68 },
  { init: "KN", title: "₦18M · Ibadan", sub: "No deposit", tier: "cold", score: 31 },
  { init: "??", title: '"How much?"', sub: "Went quiet", tier: "cold", score: 18 },
];
const STEPS = [
  { t: "Take the 2-minute scorecard", d: "A few questions about how enquiries reach you today." },
  { t: "Get your Mortgage Fit assessment", d: "See where time is leaking and what a ready property buyer looks like." },
  { t: "A rep sets up your dashboard", d: "If you qualify, a LeadScoreAI rep reaches out to set up your own dashboard — enquiries scored HOT, WARM or COLD, buyers to the top." },
];

function EnquiriesCard({ rows }: { rows: Row[] }) {
  return (
    <div className="lp-card">
      <div className="lp-card-head">
        <span className="lp-card-title">YOUR ENQUIRIES · SCORED</span>
        <span className="lp-card-week">this week</span>
      </div>
      {rows.map((r) => (
        <div key={r.init + r.score} className={`lp-row lp-${r.tier}`}>
          <span className="lp-av">{r.init}</span>
          <span className="lp-row-main">
            <span className="lp-row-t">{r.title}</span>
            <span className="lp-row-s">{r.sub}</span>
          </span>
          <span className={`lp-badge2 lp-b-${r.tier}`}>{r.tier.toUpperCase()}</span>
          <span className="lp-score">{r.score}</span>
        </div>
      ))}
    </div>
  );
}

function Steps() {
  return (
    <>
      {STEPS.map((s, i) => (
        <div className="lp-step" key={i}>
          <span className="lp-step-n">{i + 1}</span>
          <div>
            <div className="lp-step-t">{s.t}</div>
            <div className="lp-step-d">{s.d}</div>
          </div>
        </div>
      ))}
    </>
  );
}

function Badges({ mobile }: { mobile?: boolean }) {
  const cls = mobile ? "lp-m-badge" : "lp-badge";
  return (
    <div className={mobile ? "lp-m-badges" : "lp-badges"}>
      <span className={cls}><span className="ck">✓</span> Free scorecard</span>
      <span className={cls}><span className="ck">✓</span> Free assessment</span>
      <span className={cls}><span className="ck">✓</span> Free dashboard</span>
    </div>
  );
}

function MortgageLanding({ onStart }: { onStart: () => void }) {
  return (
    <div className="lp-page">
      {/* ===== DESKTOP (>=768px) ===== */}
      <div className="lp-d">
        <div className="lp">
          <div className="lp-top">
            <div className="lp-logo">{LOGO_BARS} LeadScoreAI</div>
            <div className="lp-tag"><span className="lp-dot" /> Mortgage Fit scorecard · 2 minutes</div>
          </div>
          <div className="lp-hero">
            <div className="lp-left">
              <h1 className="lp-h1">Tired of time-wasting <em>mortgage</em> enquiries in your real estate business?</h1>
              <p className="lp-sub">
                We score the mortgage and instalment enquiries you already get, so you know which buyers can
                actually finance before you book a viewing. Take the 2-minute scorecard to see if you qualify.
              </p>
              <div className="lp-cta-row">
                <button className="lp-cta" onClick={onStart}>See if I qualify <span>→</span></button>
                <span className="lp-note">No card. No commitment.</span>
              </div>
              <Badges />
            </div>
            <div className="lp-right">
              <EnquiriesCard rows={ROWS} />
              <div className="lp-illus">Illustrative. Your own enquiries, your own scores.</div>
            </div>
          </div>
        </div>
        <div className="lp-steps-wrap">
          <div className="lp-steps"><Steps /></div>
        </div>
      </div>

      {/* ===== MOBILE (<768px) ===== */}
      <div className="lp-m">
        <div className="lp-m-hero">
          <div className="lp-m-top">
            <div className="lp-logo">{LOGO_BARS} LeadScoreAI</div>
            <div className="lp-m-tag">2-min scorecard</div>
          </div>
          <h1 className="lp-m-h1">Tired of time-wasting <em>mortgage</em> enquiries in your real estate business?</h1>
          <p className="lp-m-sub">
            We score the mortgage and instalment enquiries you already get, so you know which buyers can
            actually finance before you book a viewing.
          </p>
          <button className="lp-m-cta" onClick={onStart}>See if I qualify <span>→</span></button>
          <div className="lp-m-note">No card. No commitment.</div>
          <Badges mobile />
          <div className="lp-m-cardgap" />
          <EnquiriesCard rows={ROWS_M} />
          <div className="lp-illus">Illustrative. Your own enquiries, your own scores.</div>
        </div>
        <div className="lp-m-steps">
          <Steps />
          <button className="lp-m-cta lp-m-cta2" onClick={onStart}>See if I qualify <span>→</span></button>
        </div>
      </div>
    </div>
  );
}
