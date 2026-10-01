"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PARTNER_SESSION_KEY, partnerSession } from "@/lib/partner-client";

type Me = {
  partner: {
    full_name: string;
    email: string;
    ref_code: string;
    bank: { bank_name: string | null; account: string | null; account_name: string | null } | null;
  };
  commission: number;
  stats: { paying: number; clients: number; thisMonth: number; owed: number; allTime: number };
  clients: { id: string; name: string; status: string; currency: string; scorecards: number; live: number; earned: number }[];
  earnings: { client: string; amount: number; clientPaid: string | null; status: string; date: string }[];
};

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const STATUS: Record<string, [string, string]> = {
  settled: ["Paid to your bank", "text-emerald-700 bg-emerald-50"],
  paid: ["Paid", "text-emerald-700 bg-emerald-50"],
  owed: ["Owed to you", "text-amber-800 bg-amber-50"],
};

export default function PartnerDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [copied, setCopied] = useState(false);
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [editBank, setEditBank] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [acct, setAcct] = useState("");
  const [bankBusy, setBankBusy] = useState(false);
  const [bankMsg, setBankMsg] = useState<string | null>(null);

  const auth = useCallback((): Record<string, string> => ({ Authorization: `Bearer ${partnerSession() ?? ""}` }), []);

  const load = useCallback(async () => {
    if (!partnerSession()) return router.replace("/partners");
    const res = await fetch("/api/partners/me", { headers: auth() }).catch(() => null);
    if (res?.status === 401) {
      try { localStorage.removeItem(PARTNER_SESSION_KEY); } catch {}
      return router.replace("/partners");
    }
    if (res?.ok) setMe(await res.json());
  }, [auth, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!me || (me.partner.bank && !editBank) || banks.length) return;
    fetch("/api/partners/bank", { headers: auth() })
      .then((r) => r.json())
      .then((d) => setBanks(d.banks ?? []))
      .catch(() => {});
  }, [me, editBank, banks.length, auth]);

  async function connectBank(e: React.FormEvent) {
    e.preventDefault();
    setBankBusy(true);
    setBankMsg(null);
    const res = await fetch("/api/partners/bank", {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ bank_code: bankCode, account_number: acct }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBankBusy(false);
    if (!res?.ok) return setBankMsg(data?.error || "Couldn't connect that account. Try again.");
    setEditBank(false);
    setAcct("");
    load();
  }

  if (!me) {
    return <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center text-slate-500">Loading…</div>;
  }

  const link = `https://app.leadscoreai.com/?ref=${me.partner.ref_code}`;
  const card = "rounded-2xl bg-white border border-slate-200 p-5";

  return (
    <div className="min-h-screen bg-[#FAFAFB] text-[#0B0B12]" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <a href="/partners" className="flex items-center gap-2 font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/leadscoreai-mark-512.png" alt="" className="w-7 h-7" />
          LeadScoreAI <span className="font-medium text-slate-500">Partners</span>
        </a>
        <button
          onClick={() => {
            try { localStorage.removeItem(PARTNER_SESSION_KEY); } catch {}
            router.replace("/partners");
          }}
          className="text-sm text-slate-500"
        >
          Sign out
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 grid gap-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {me.partner.full_name.split(" ")[0]}</h1>

        <section className={card}>
          <p className="font-semibold">Your referral link</p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <code className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm break-all">{link}</code>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
              className="h-11 px-5 rounded-xl bg-violet-600 text-white font-semibold"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <ul className="mt-4 text-sm text-slate-600 grid gap-1.5 list-disc pl-5">
            <li>Businesses that sign up through this link are yours for life.</li>
            <li>Setting a client up yourself? Open your link once in your browser first, then create their account. Use a separate email per client, for example you+clientname@gmail.com.</li>
            <li>In the client&apos;s studio, use <b>Copy demo link</b> to show them their scorecard free before they pay.</li>
          </ul>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Paying clients", String(me.stats.paying)],
            ["Earned this month", naira(me.stats.thisMonth)],
            ["Owed to you", naira(me.stats.owed)],
            ["Earned all time", naira(me.stats.allTime)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-white border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{l}</p>
              <p className="text-2xl font-bold mt-1">{v}</p>
            </div>
          ))}
        </section>

        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Payout account</p>
            {me.partner.bank && !editBank && (
              <button onClick={() => setEditBank(true)} className="text-sm font-semibold text-violet-700">Change</button>
            )}
          </div>
          {me.partner.bank && !editBank ? (
            <p className="mt-2 text-sm text-slate-600">
              {me.partner.bank.account_name} · {me.partner.bank.bank_name} {me.partner.bank.account}. When a Naira client pays,
              Paystack sends your {naira(me.commission)} here automatically.
            </p>
          ) : (
            <form onSubmit={connectBank} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                <option value="">Choose your bank</option>
                {banks.map((b) => (
                  <option key={b.code + b.name} value={b.code}>{b.name}</option>
                ))}
              </select>
              <input
                value={acct}
                onChange={(e) => setAcct(e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                placeholder="10-digit account number"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
              <button disabled={bankBusy} className="h-11 px-5 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-60">
                {bankBusy ? "Checking…" : "Connect"}
              </button>
              <p className="sm:col-span-3 text-xs text-slate-500">
                Nigerian bank accounts only. Paystack confirms the account name before we save it.
              </p>
              {bankMsg && <p className="sm:col-span-3 text-sm text-red-600">{bankMsg}</p>}
            </form>
          )}
        </section>

        <section className={card}>
          <p className="font-semibold mb-3">Your clients</p>
          {me.clients.length === 0 ? (
            <p className="text-sm text-slate-500">No clients yet. Share your link or set up your first client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Business</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Scorecards</th>
                    <th className="py-2 font-medium text-right">You&apos;ve earned</th>
                  </tr>
                </thead>
                <tbody>
                  {me.clients.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="py-2.5 pr-3 font-medium">{c.name}</td>
                      <td className="py-2.5 pr-3">
                        <span className={c.status === "paying" ? "text-emerald-700" : "text-slate-500"}>
                          {c.status === "paying" ? "Paying" : c.status === "demo" ? "Demo" : "Signed up"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">{c.live} live · {c.scorecards} total</td>
                      <td className="py-2.5 text-right">{naira(c.earned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={card}>
          <p className="font-semibold mb-3">Earnings</p>
          {me.earnings.length === 0 ? (
            <p className="text-sm text-slate-500">You earn {naira(me.commission)} each month for every paying client.</p>
          ) : (
            <div className="grid gap-2">
              {me.earnings.map((e, i) => {
                const [label, cls] = STATUS[e.status] ?? [e.status, "text-slate-600 bg-slate-50"];
                return (
                  <div key={i} className="flex items-center justify-between gap-3 text-sm border-t border-slate-100 pt-2">
                    <div>
                      <p className="font-medium">{e.client}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {e.clientPaid ? ` · client paid ${e.clientPaid}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{naira(e.amount)}</p>
                      <span className={`text-xs rounded-full px-2 py-0.5 ${cls}`}>{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
