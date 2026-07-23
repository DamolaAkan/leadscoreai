"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { slGet, slSend } from "@/lib/sl-client";
import { SlCommission } from "@/lib/sl-types";
import { formatNaira, formatDate } from "@/lib/sl-format";

interface Meta {
  reps: { id: string; full_name: string }[];
  me: { canManage: boolean };
}
interface Payout {
  id: string;
  total_naira: number;
  paid_on: string;
  reference: string | null;
  owner?: { full_name: string } | null;
  created_at: string;
}

export default function PayoutsPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [owner, setOwner] = useState("");
  const [rows, setRows] = useState<SlCommission[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paidOn, setPaidOn] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [history, setHistory] = useState<Payout[]>([]);

  const loadHistory = useCallback(() => {
    slGet<{ payouts: Payout[] }>("/api/payouts").then((d) => setHistory(d.payouts)).catch(() => {});
  }, []);

  useEffect(() => {
    slGet<Meta>("/api/deals/meta")
      .then((m) => {
        setAllowed(m.me.canManage);
        setMeta(m);
        if (m.me.canManage) loadHistory();
      })
      .catch(() => setAllowed(false));
  }, [loadHistory]);

  const loadApproved = useCallback(async (ownerId: string) => {
    setSelected(new Set());
    if (!ownerId) return setRows([]);
    const d = await slGet<{ commissions: SlCommission[] }>(`/api/commissions?status=approved&owner_id=${ownerId}`);
    setRows(d.commissions);
  }, []);

  useEffect(() => {
    if (owner) loadApproved(owner);
    else setRows([]);
  }, [owner, loadApproved]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const total = useMemo(
    () => rows.filter((r) => selected.has(r.id)).reduce((a, r) => a + Number(r.commission_naira), 0),
    [rows, selected]
  );

  async function record() {
    setError("");
    setOk("");
    if (selected.size === 0) return setError("Select at least one commission");
    if (!paidOn) return setError("Enter the payment date");
    setBusy(true);
    try {
      await slSend("/api/payouts", "POST", {
        owner_id: owner,
        commission_ids: Array.from(selected),
        paid_on: paidOn,
        reference,
      });
      setOk(`Payout of ${formatNaira(total)} recorded.`);
      setReference("");
      await loadApproved(owner);
      loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
    setBusy(false);
  }

  if (allowed === false) return <div className="text-sm text-[#64748b]">You do not have access to payouts.</div>;

  const inputCls =
    "border border-[#cbd5e1] rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Payout run</h1>
        <p className="text-sm text-gray-500 mt-1">Group a rep&apos;s approved commissions into one payment.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{ok}</div>}

      <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1">Rep</label>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls}>
              <option value="">Select a rep</option>
              {meta?.reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1">Payment date</label>
            <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={inputCls} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-[#64748b] mb-1">Bank reference</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transfer ref" className={`${inputCls} w-full`} />
          </div>
        </div>

        {owner && (
          <div className="border border-[#e2e8f0] rounded-md overflow-hidden">
            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">No approved, unpaid commissions for this rep.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
                    <th className="px-4 py-2.5 w-10"></th>
                    <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-[#64748b]">Deal</th>
                    <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-[#64748b]">Company</th>
                    <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-[#64748b]">Approved</th>
                    <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-[#64748b] text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] cursor-pointer" onClick={() => toggle(c.id)}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-[#7C3AED]" />
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1e293b]">{c.deal?.contact_name || "—"}</td>
                      <td className="px-4 py-3 text-[#475569]">{c.deal?.company_name || "—"}</td>
                      <td className="px-4 py-3 text-[#94a3b8]">{formatDate(c.approved_at)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-[#1e293b]">{formatNaira(c.commission_naira)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-[#64748b]">
            {selected.size} selected · <span className="font-semibold text-[#1e293b] tabular-nums">{formatNaira(total)}</span>
          </p>
          <button onClick={record} disabled={busy || selected.size === 0} className="text-sm font-medium px-5 py-2.5 rounded-md text-white bg-[#7C3AED] hover:bg-[#6d28d9] disabled:opacity-50">
            {busy ? "Recording..." : `Record payout${total ? " · " + formatNaira(total) : ""}`}
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-x-auto">
          <div className="px-5 pt-4 pb-2 text-sm font-semibold text-[#1e293b]">Recent payouts</div>
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-[#f8fafc] border-y border-[#e2e8f0] text-left">
                <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-[#64748b]">Rep</th>
                <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-[#64748b]">Paid on</th>
                <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-[#64748b]">Reference</th>
                <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-[#64748b] text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-b border-[#f1f5f9]">
                  <td className="px-4 py-3 text-[#1e293b]">{p.owner?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-[#475569]">{formatDate(p.paid_on)}</td>
                  <td className="px-4 py-3 text-[#475569]">{p.reference || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-[#1e293b]">{formatNaira(p.total_naira)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
