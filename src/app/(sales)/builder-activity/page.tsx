"use client";

import { useCallback, useEffect, useState } from "react";
import { slGet } from "@/lib/sl-client";

interface Data {
  days: number;
  totalEvents: number;
  funnel: { step: string; count: number }[];
  sources: { source: string; visitors: number; signups: number; paid: number }[];
  pages: { page: string; visitors: number; clicked: number }[];
  accounts: {
    id: string;
    name: string;
    email: string | null;
    signedUp: string | null;
    source: string;
    quizzes: number;
    live: number;
    edits: number;
    leads: number;
    paid: boolean;
    everPaid: boolean;
    lastSeen: string | null;
  }[];
  feed: { at: string; event: string; who: string; detail: string; device: string | null; country: string | null }[];
}

// Plain-English names for the activity log.
const LABELS: Record<string, string> = {
  landing_view: "👀 Visited landing page",
  cta_click: "👆 Clicked a button",
  signup_sheet_open: "📝 Opened sign-up",
  industry_tab: "🗂️ Browsed an industry",
  code_requested: "✉️ Requested a code",
  signed_up: "🆕 Signed up",
  signed_in: "🔑 Signed in",
  login_view: "🔑 Opened login",
  login_no_account: "❓ Tried to log in without an account",
  studio_open: "🛠️ Opened the builder",
  tap_questions: "💬 Builder asked questions",
  chat_reply: "💬 Builder replied",
  quiz_built: "✨ Built a quiz",
  quiz_edited: "✏️ Edited a quiz",
  quiz_forked: "✏️ Edited a live quiz (new version)",
  chat_error: "⚠️ Builder error",
  preview_opened: "▶️ Opened preview",
  paywall_shown: "💳 Saw the go-live offer",
  publish_blocked: "💳 Tried to publish (needs Pro)",
  go_live_clicked: "💳 Clicked Go live",
  checkout_started: "💳 Started checkout",
  paid: "💰 Paid",
  quiz_published: "🟢 Published a quiz",
  quiz_unpublished: "⚪ Unpublished a quiz",
  share_whatsapp: "📲 Shared on WhatsApp",
  link_copied: "🔗 Copied quiz link",
  embed_copied: "🧩 Copied embed code",
  lead_captured: "🎯 Got a lead",
  credits_opened: "⚡ Checked AI edits",
  out_of_credits: "⛔ Ran out of AI edits",
  topup_clicked: "⚡ Clicked top up",
  topup_checkout_started: "⚡ Started top-up checkout",
  topup_paid: "⚡ Topped up",
  feature_request: "💡 Feature request",
};

const ago = (iso: string | null) => {
  if (!iso) return "—";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

export default function BuilderActivityPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await slGet<Data>(`/api/staff/builder-activity?days=${days}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load activity.");
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const top = data?.funnel[0]?.count || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#15131c]">Builder activity</h1>
          <p className="text-sm text-[#667085]">What self-serve visitors and owners are doing, from first visit to paying.</p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${days === d ? "bg-[#7C3AED] text-white" : "bg-white border border-black/10 text-[#344054]"}`}
            >
              {d === 1 ? "24h" : `${d} days`}
            </button>
          ))}
          <button onClick={load} className="rounded-full px-3.5 py-1.5 text-sm font-semibold bg-white border border-black/10 text-[#344054]">
            {loading ? "…" : "↻"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm text-[#667085]">Loading…</p>}

      {data && (
        <>
          {/* Funnel */}
          <section className="bg-white rounded-2xl border border-black/[0.08] p-5">
            <h2 className="font-semibold text-[#15131c] mb-4">Funnel</h2>
            <div className="space-y-2.5">
              {data.funnel.map((f, i) => {
                const prev = i > 0 ? data.funnel[i - 1].count : 0;
                const pct = top ? Math.round((f.count / top) * 100) : 0;
                const step = i > 0 && prev ? Math.round((f.count / prev) * 100) : null;
                return (
                  <div key={f.step} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] sm:grid-cols-[14rem_1fr_7rem] items-center gap-3">
                    <span className="text-sm text-[#344054] truncate">{f.step}</span>
                    <div className="h-7 rounded-lg bg-[#f4f1fe] overflow-hidden">
                      <div className="h-full rounded-lg bg-[#7C3AED]" style={{ width: `${Math.max(pct, f.count ? 2 : 0)}%` }} />
                    </div>
                    <span className="text-sm text-right tabular-nums">
                      <b className="text-[#15131c]">{f.count}</b>
                      {step !== null && <span className="text-[#98a2b3]"> · {step}%</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[#98a2b3]">% = share of the step above. {data.totalEvents.toLocaleString()} events in this window.</p>
          </section>

          <div className="grid lg:grid-cols-2 gap-6 [&>*]:min-w-0">
            {/* Sources */}
            <section className="bg-white rounded-2xl border border-black/[0.08] p-5">
              <h2 className="font-semibold text-[#15131c] mb-3">Where they come from</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#98a2b3] text-xs uppercase tracking-wider">
                    <th className="py-1.5 font-semibold">Source</th>
                    <th className="py-1.5 font-semibold text-right">Visitors</th>
                    <th className="py-1.5 font-semibold text-right">Sign-ups</th>
                    <th className="py-1.5 font-semibold text-right">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {data.sources.length === 0 && (
                    <tr><td colSpan={4} className="py-3 text-[#98a2b3]">No visits yet.</td></tr>
                  )}
                  {data.sources.map((s) => (
                    <tr key={s.source}>
                      <td className="py-2 text-[#15131c] font-medium truncate max-w-[10rem]">{s.source}</td>
                      <td className="py-2 text-right tabular-nums">{s.visitors}</td>
                      <td className="py-2 text-right tabular-nums">{s.signups}</td>
                      <td className="py-2 text-right tabular-nums">{s.paid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-[#98a2b3]">Tag your ad links with ?utm_source=facebook&amp;utm_campaign=… to see each campaign here.</p>
            </section>

            {/* Landing pages */}
            <section className="bg-white rounded-2xl border border-black/[0.08] p-5">
              <h2 className="font-semibold text-[#15131c] mb-3">Landing pages</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#98a2b3] text-xs uppercase tracking-wider">
                    <th className="py-1.5 font-semibold">Page</th>
                    <th className="py-1.5 font-semibold text-right">Visitors</th>
                    <th className="py-1.5 font-semibold text-right">Clicked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {data.pages.length === 0 && (
                    <tr><td colSpan={3} className="py-3 text-[#98a2b3]">No visits yet.</td></tr>
                  )}
                  {data.pages.map((p) => (
                    <tr key={p.page}>
                      <td className="py-2 text-[#15131c] font-medium">{p.page === "home" ? "Home page" : `/build/${p.page}`}</td>
                      <td className="py-2 text-right tabular-nums">{p.visitors}</td>
                      <td className="py-2 text-right tabular-nums">
                        {p.clicked}
                        {p.visitors ? <span className="text-[#98a2b3]"> · {Math.round((p.clicked / p.visitors) * 100)}%</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          {/* Accounts */}
          <section className="bg-white rounded-2xl border border-black/[0.08] p-5">
            <h2 className="font-semibold text-[#15131c] mb-3">Self-serve accounts ({data.accounts.length})</h2>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-[#98a2b3] text-xs uppercase tracking-wider">
                    <th className="py-1.5 font-semibold">Business</th>
                    <th className="py-1.5 font-semibold">Came from</th>
                    <th className="py-1.5 font-semibold text-right">Quizzes</th>
                    <th className="py-1.5 font-semibold text-right">AI edits</th>
                    <th className="py-1.5 font-semibold text-right">Leads</th>
                    <th className="py-1.5 font-semibold">Status</th>
                    <th className="py-1.5 font-semibold text-right">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {data.accounts.length === 0 && (
                    <tr><td colSpan={7} className="py-3 text-[#98a2b3]">No sign-ups in this window.</td></tr>
                  )}
                  {data.accounts.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2">
                        <div className="font-medium text-[#15131c]">{a.name}</div>
                        <div className="text-xs text-[#98a2b3]">{a.email} · joined {ago(a.signedUp)}</div>
                      </td>
                      <td className="py-2 text-[#344054]">{a.source}</td>
                      <td className="py-2 text-right tabular-nums">
                        {a.quizzes}
                        {a.live ? <span className="text-emerald-600"> ({a.live} live)</span> : null}
                      </td>
                      <td className="py-2 text-right tabular-nums">{a.edits}</td>
                      <td className="py-2 text-right tabular-nums">{a.leads}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            a.paid ? "bg-emerald-50 text-emerald-700" : a.everPaid ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {a.paid ? "Pro" : a.everPaid ? "Lapsed" : a.quizzes ? "Building" : "Signed up"}
                        </span>
                      </td>
                      <td className="py-2 text-right text-[#667085]">{ago(a.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Live feed */}
          <section className="bg-white rounded-2xl border border-black/[0.08] p-5">
            <h2 className="font-semibold text-[#15131c] mb-3">Latest activity</h2>
            {data.feed.length === 0 && <p className="text-sm text-[#98a2b3]">Nothing yet. Activity appears here as people visit and build.</p>}
            <ul className="divide-y divide-black/[0.06]">
              {data.feed.map((f, i) => (
                <li key={i} className="py-2.5 flex items-start gap-3 text-sm">
                  <span className="shrink-0 w-16 text-xs text-[#98a2b3] pt-0.5">{ago(f.at)}</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-[#15131c]">{f.who}</span>{" "}
                    <span className="text-[#344054]">{(LABELS[f.event] || f.event).replace(/^\S+\s/, "").toLowerCase()}</span>
                    <span className="ml-1">{(LABELS[f.event] || "").split(" ")[0]}</span>
                    {f.detail && <div className="text-xs text-[#98a2b3] truncate">{f.detail}</div>}
                  </div>
                  <span className="shrink-0 text-xs text-[#98a2b3]">
                    {[f.device, f.country].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
