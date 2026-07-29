"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { slGet } from "@/lib/sl-client";
import { SlDeal, SlProduct, STAGE_META, SlStage } from "@/lib/sl-types";
import { formatMoney, formatDate } from "@/lib/sl-format";
import { StageBadge } from "@/components/sales/Badges";
import GoalCard from "@/components/sales/GoalCard";

interface Meta {
  products: SlProduct[];
  reps: { id: string; full_name: string; role: string }[];
  me: { id: string; full_name: string; role: string; canManage: boolean };
}

const STAGES: SlStage[] = ["contact_added", "meeting_booked", "proposal_sent", "paid", "lost"];

export default function DealsPage() {
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [deals, setDeals] = useState<SlDeal[]>([]);
  const [loading, setLoading] = useState(true);

  const [stage, setStage] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    slGet<Meta>("/api/deals/meta").then(setMeta).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stage) params.set("stage", stage);
    if (ownerId) params.set("owner_id", ownerId);
    if (search.trim()) params.set("search", search.trim());
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    try {
      const d = await slGet<{ deals: SlDeal[] }>(`/api/deals?${params.toString()}`);
      setDeals(d.deals);
    } catch {
      setDeals([]);
    }
    setLoading(false);
  }, [stage, ownerId, search, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const manager = meta?.me.canManage;

  const summary = useMemo(() => {
    const open = deals.filter((d) => d.stage !== "paid" && d.stage !== "lost").length;
    const paid = deals.filter((d) => d.stage === "paid").length;
    return { total: deals.length, open, paid };
  }, [deals]);

  const inputCls =
    "border border-[#cbd5e1] rounded-md px-3 py-2 text-sm text-[#1e293b] bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Deals</h1>
          <p className="text-sm text-gray-500 mt-1">
            {summary.total} deals · {summary.open} open · {summary.paid} paid
          </p>
        </div>
        <Link
          href="/deals/new"
          className="text-sm font-medium px-4 py-2 rounded-md text-white bg-[#7C3AED] hover:bg-[#6d28d9]"
        >
          Add Deal
        </Link>
      </div>

      {/* Personal commission goal + company target */}
      <GoalCard />

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, company or email"
          className={`${inputCls} flex-1 min-w-[200px]`}
        />
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputCls}>
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_META[s].label}
            </option>
          ))}
        </select>
        {manager && (
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
            <option value="">All reps</option>
            {meta?.reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>
        )}
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide text-[#64748b]">Contact</th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide text-[#64748b]">Company</th>
              {manager && <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide text-[#64748b]">Rep</th>}
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide text-[#64748b]">Stage</th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide text-[#64748b] text-right">Setup fee</th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide text-[#64748b]">Added</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr
                key={d.id}
                onClick={() => router.push(`/deals/${d.id}`)}
                className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-[#1e293b]">{d.contact_name}</td>
                <td className="px-4 py-3 text-[#475569]">{d.company_name || "—"}</td>
                {manager && <td className="px-4 py-3 text-[#475569]">{d.owner?.full_name || "—"}</td>}
                <td className="px-4 py-3">
                  <StageBadge stage={d.stage} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[#1e293b]">
                  {formatMoney(d.setup_fee, d.currency)}
                </td>
                <td className="px-4 py-3 text-[#94a3b8]">{formatDate(d.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && deals.length === 0 && (
          <div className="px-4 py-10 text-center text-gray-400 text-sm">No deals yet.</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {deals.map((d) => (
          <Link
            key={d.id}
            href={`/deals/${d.id}`}
            className="block bg-white rounded-lg p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-[#1e293b]">{d.contact_name}</p>
                <p className="text-sm text-[#475569]">{d.company_name || "—"}</p>
              </div>
              <StageBadge stage={d.stage} />
            </div>
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-[#64748b]">{formatDate(d.created_at)}</span>
              <span className="tabular-nums font-medium text-[#1e293b]">
                {formatMoney(d.setup_fee, d.currency)}
              </span>
            </div>
            {manager && <p className="text-xs text-[#94a3b8] mt-1">Rep: {d.owner?.full_name}</p>}
          </Link>
        ))}
        {!loading && deals.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">No deals yet.</div>
        )}
      </div>
    </div>
  );
}
