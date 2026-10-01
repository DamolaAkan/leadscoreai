"use client";

import { useCallback, useEffect, useState } from "react";
import { slGet, slSend } from "@/lib/sl-client";
import { formatNaira, formatDate } from "@/lib/sl-format";

// Partners and their commissions. Naira clients pay partners automatically
// (Paystack split); USD clients' commissions show here as owed until paid.
interface Owed { id: string; client: string; amount: number; clientPaid: string | null; date: string }
interface PartnerRow {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  country: string;
  ref_code: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  paystack_subaccount_code: string | null;
  status: string;
  clients: number;
  settled: number;
  paid: number;
  owed: Owed[];
}

export default function PartnerPayoutsPage() {
  const [rows, setRows] = useState<PartnerRow[] | null>(null);
  const [error, setError] = useState("");
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    slGet<{ partners: PartnerRow[] }>("/api/staff/partners")
      .then((d) => setRows(d.partners))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function markPaid(p: PartnerRow) {
    setBusy(p.id);
    setError("");
    try {
      await slSend("/api/staff/partners", "POST", { earning_ids: p.owed.map((o) => o.id), payout_ref: refs[p.id] || "" });
      setRefs((r) => ({ ...r, [p.id]: "" }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
    setBusy("");
  }

  if (error && !rows) return <p className="p-6 text-sm text-red-600">{error}</p>;
  if (!rows) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <h1 className="text-xl font-bold text-gray-900">Partner payouts</h1>
      <p className="text-sm text-gray-500 mt-1 mb-5">
        Naira clients pay their partner automatically through Paystack. Commissions from USD clients are owed here until you
        send the transfer and mark them paid.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {rows.length === 0 && <p className="text-sm text-gray-500">No partners yet.</p>}
      <div className="grid gap-4">
        {rows.map((p) => {
          const owedTotal = p.owed.reduce((a, o) => a + o.amount, 0);
          return (
            <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{p.full_name} <span className="text-xs text-gray-400">?ref={p.ref_code}</span></p>
                  <p className="text-xs text-gray-500">{p.email}{p.whatsapp ? ` · ${p.whatsapp}` : ""} · {p.country} · {p.clients} client{p.clients === 1 ? "" : "s"}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {p.paystack_subaccount_code
                      ? `${p.account_name} · ${p.bank_name} ${p.account_number}`
                      : "No payout account connected yet"}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>Auto-paid (Paystack): <b className="text-gray-900">{formatNaira(p.settled)}</b></p>
                  <p>Paid by us: <b className="text-gray-900">{formatNaira(p.paid)}</b></p>
                  <p>Owed now: <b className="text-amber-700">{formatNaira(owedTotal)}</b></p>
                </div>
              </div>
              {p.owed.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  {p.owed.map((o) => (
                    <p key={o.id} className="text-sm text-gray-700">
                      {formatDate(o.date)} · {o.client} paid {o.clientPaid ?? ""} → {formatNaira(o.amount)}
                    </p>
                  ))}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={refs[p.id] || ""}
                      onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))}
                      placeholder="Transfer reference"
                      className="h-9 rounded-lg border border-gray-200 px-3 text-sm"
                    />
                    <button
                      onClick={() => markPaid(p)}
                      disabled={busy === p.id || !refs[p.id]}
                      className="h-9 px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {busy === p.id ? "Saving…" : `Mark ${formatNaira(owedTotal)} paid`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
