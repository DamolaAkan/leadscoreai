"use client";

import { useEffect, useState, useCallback } from "react";
import { slGet } from "@/lib/sl-client";
import { SlCommission, SlBalances } from "@/lib/sl-types";
import { formatNaira, formatMoney, formatDate } from "@/lib/sl-format";
import { StatusBadge } from "@/components/sales/Badges";

interface Meta {
  reps: { id: string; full_name: string }[];
  me: { canManage: boolean };
}

export default function EarningsPage() {
  const [rows, setRows] = useState<SlCommission[]>([]);
  const [balances, setBalances] = useState<Omit<SlBalances, "owner_id"> | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [owner, setOwner] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    slGet<Meta>("/api/deals/meta").then(setMeta).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (owner) params.set("owner_id", owner);
    try {
      const d = await slGet<{ commissions: SlCommission[]; balances: Omit<SlBalances, "owner_id"> }>(
        `/api/commissions?${params.toString()}`
      );
      setRows(d.commissions);
      setBalances(d.balances);
    } catch {
      setRows([]);
    }
    setLoading(false);
  }, [owner]);

  useEffect(() => {
    load();
  }, [load]);

  const manager = meta?.me.canManage;

  const cards = [
    { label: "Pending", value: balances?.pending_naira, tint: "#854d0e" },
    { label: "Approved", value: balances?.approved_naira, tint: "#3730a3" },
    { label: "Paid", value: balances?.paid_naira, tint: "#115e59" },
    { label: "Outstanding", value: balances?.outstanding_naira, tint: "#7C3AED" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Commission Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">A record of what has been earned and what is owed.</p>
        </div>
        {manager && (
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="border border-[#cbd5e1] rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All reps</option>
            {meta?.reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">{c.label}</p>
            <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: c.tint }}>
              {formatNaira(c.value || 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
              {["Deal", "Company", "Setup fee", "CBN", "Naira base", "Rate", "Commission", "Status", "Date"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium text-xs uppercase tracking-wide text-[#64748b]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-[#f1f5f9]">
                <td className="px-4 py-3 font-medium text-[#1e293b]">{c.deal?.contact_name || "—"}</td>
                <td className="px-4 py-3 text-[#475569]">{c.deal?.company_name || "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#475569]">{formatMoney(c.setup_fee_original, c.currency)}</td>
                <td className="px-4 py-3 tabular-nums text-[#475569]">{c.cbn_rate ? Number(c.cbn_rate).toLocaleString() : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#475569]">{formatNaira(c.setup_fee_naira)}</td>
                <td className="px-4 py-3 tabular-nums text-[#475569]">{(c.commission_rate * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 tabular-nums font-medium text-[#1e293b]">{formatNaira(c.commission_naira)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-[#94a3b8]">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <div className="px-4 py-10 text-center text-gray-400 text-sm">No commissions yet.</div>
        )}
      </div>

      <p className="text-xs text-[#94a3b8]">
        USD deals are converted to naira for commission at a maximum of ₦1,350/$. The actual CBN rate is
        kept on record.
      </p>
    </div>
  );
}
