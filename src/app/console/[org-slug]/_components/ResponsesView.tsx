"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QuizResponse } from "@/lib/types";
import { GRADIENT, Icon, QualPill, QUAL, api, downloadText, fmtDate, getSession } from "../_lib";
import DetailModal from "./DetailModal";

interface Analytics {
  kpis: { totalAssessments: number; avgScore: number; converted: number; conversionRate: number };
  qualDistribution: Record<string, number>;
}

type Range = "all" | "today" | "7" | "30" | "90";
type Deposit = "all" | "paid" | "pending";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ResponsesView({ orgSlug, onQuizName }: { orgSlug: string; onQuizName: (n: string) => void }) {
  const [rows, setRows] = useState<QuizResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Analytics | null>(null);
  const [search, setSearch] = useState("");
  const [qual, setQual] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [deposit, setDeposit] = useState<Deposit>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [interval, setIntervalSec] = useState(30);
  const [status, setStatus] = useState("Checking for new leads...");
  const [viewId, setViewId] = useState<string | null>(null);
  const pageSize = 25;
  const loadingRef = useRef(false);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: String(deposit === "all" ? pageSize : 1000) });
    if (search.trim()) p.set("search", search.trim());
    if (qual) p.set("qualification", qual);
    if (range === "today") p.set("dateFrom", daysAgo(0));
    else if (range !== "all") p.set("dateFrom", daysAgo(Number(range)));
    return p.toString();
  }, [page, search, qual, range, deposit]);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setStatus("Checking for new leads...");
    try {
      const [list, analytics] = await Promise.all([
        api<{ responses: QuizResponse[]; total: number; totalPages: number }>(orgSlug, `/api/dashboard/responses?${query}`),
        api<Analytics>(orgSlug, "/api/dashboard/analytics"),
      ]);
      setRows(list.responses);
      setTotal(list.total);
      setTotalPages(Math.max(1, list.totalPages));
      setStats(analytics);
      const name = list.responses.find((r) => r.quiz_name)?.quiz_name;
      if (name) onQuizName(name);
      setStatus(`Last checked ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
    } catch {
      setStatus("Couldn't refresh. Retrying soon.");
    } finally {
      loadingRef.current = false;
    }
  }, [orgSlug, query, onQuizName]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, interval * 1000);
    return () => clearInterval(t);
  }, [autoRefresh, interval, load]);

  // Deposit status is filtered on the page (the list API filters everything else).
  const shown = useMemo(() => {
    if (deposit === "all") return rows;
    return rows.filter((r) => (deposit === "paid" ? r.converted_to_sale : !r.converted_to_sale));
  }, [rows, deposit]);

  const exportCsv = async () => {
    const p = new URLSearchParams(query);
    p.delete("page");
    p.delete("pageSize");
    const res = await fetch(`/api/dashboard/responses/export?${p.toString()}`, {
      headers: { Authorization: `Bearer ${getSession() || ""}` },
    });
    if (!res.ok) return;
    downloadText(`${orgSlug}-responses.csv`, await res.text());
  };

  const remove = async (r: QuizResponse) => {
    if (!window.confirm(`Delete ${r.contact_name || "this response"}? This can't be undone.`)) return;
    await api(orgSlug, `/api/dashboard/responses/${r.id}`, { method: "DELETE" });
    load();
  };

  const q = stats?.qualDistribution || {};
  const kpis = [
    { icon: <Icon name="users" className="w-7 h-7 text-blue-500" />, value: stats?.kpis.totalAssessments ?? "–", label: "Total Assessments" },
    { emoji: QUAL.HOT_LEAD.icon, tint: "bg-green-100", value: q.HOT_LEAD ?? 0, label: "Hot Lead" },
    { emoji: QUAL.WARM_LEAD.icon, tint: "bg-amber-100", value: q.WARM_LEAD ?? 0, label: "Warm Lead" },
    { emoji: QUAL.COLD_LEAD.icon, tint: "bg-blue-100", value: q.COLD_LEAD ?? 0, label: "Cold Lead" },
    { emoji: QUAL.NOT_QUALIFIED.icon, tint: "bg-red-100", value: q.NOT_QUALIFIED ?? 0, label: "Not Qualified" },
    {
      icon: <Icon name="check" className="w-8 h-8 text-green-600" />,
      value: stats?.kpis.converted ?? "–",
      label: "Deposits Paid",
      sub: `${stats ? Math.round(stats.kpis.conversionRate) : 0}% rate`,
    },
    { icon: <Icon name="trend" className="w-7 h-7 text-purple-500" />, value: stats ? `${stats.kpis.avgScore}%` : "–", label: "Average Score" },
  ];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={load} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white/70 px-3 py-2 text-[15px] text-gray-600 hover:bg-white">
          <Icon name="refresh" className="w-4 h-4" />
          Refresh
        </button>
        <span className="text-[15px] text-gray-700">Auto-refresh:</span>
        <button
          onClick={() => setAutoRefresh((v) => !v)}
          className={`rounded-md px-3 py-2 text-[13px] font-semibold ${autoRefresh ? "bg-amber-400 text-white" : "bg-gray-200 text-gray-600"}`}
        >
          {autoRefresh ? "ON" : "OFF"}
        </button>
        <select
          value={interval}
          onChange={(e) => setIntervalSec(Number(e.target.value))}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-[14px]"
        >
          <option value={15}>15s</option>
          <option value={30}>30s</option>
          <option value={60}>60s</option>
        </select>
        <span className="text-[15px] text-gray-500">{status}</span>
        <button
          onClick={exportCsv}
          className="ml-auto flex items-center gap-2 rounded-md px-5 py-2.5 text-[15px] font-medium text-white shadow-sm"
          style={{ background: GRADIENT }}
        >
          <Icon name="download" className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Advanced filters */}
      <div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-blue-200 bg-white px-4 py-2.5 text-[15px] text-blue-700"
        >
          <Icon name="filter" className="w-4 h-4" />
          Advanced Filters
          <Icon name="chevron" className={`w-4 h-4 transition ${showFilters ? "rotate-180" : ""}`} />
        </button>
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
            <label className="text-sm text-gray-600">
              Deposit status
              <select
                value={deposit}
                onChange={(e) => {
                  setDeposit(e.target.value as Deposit);
                  setPage(1);
                }}
                className="mt-1 block rounded-md border border-gray-200 px-3 py-2 text-[14px] text-gray-900"
              >
                <option value="all">All</option>
                <option value="paid">Deposit paid</option>
                <option value="pending">Not paid yet</option>
              </select>
            </label>
            <button
              onClick={() => {
                setDeposit("all");
                setQual("");
                setRange("all");
                setSearch("");
                setPage(1);
              }}
              className="rounded-md border border-gray-200 px-3 py-2 text-[14px] text-gray-600 hover:bg-gray-50"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col items-center justify-center rounded-lg border border-gray-100 bg-white px-3 py-6 text-center shadow-sm">
            {k.emoji ? (
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-[18px] ${k.tint}`}>{k.emoji}</span>
            ) : (
              k.icon
            )}
            <div className="mt-3 text-[26px] font-bold leading-none">{k.value}</div>
            <div className="mt-2 text-[15px] text-gray-700">{k.label}</div>
            {k.sub && <div className="mt-1 text-[12px] text-gray-500">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email..."
            className="w-full rounded-md border border-gray-200 py-2.5 pl-10 pr-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>
        <div className="relative">
          <Icon name="filter" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={qual}
            onChange={(e) => {
              setQual(e.target.value);
              setPage(1);
            }}
            className="appearance-none rounded-md border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-[15px]"
          >
            <option value="">All Qualifications</option>
            {Object.entries(QUAL).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Icon name="calendar" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={range}
            onChange={(e) => {
              setRange(e.target.value as Range);
              setPage(1);
            }}
            className="appearance-none rounded-md border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-[15px]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <table className="w-full min-w-[900px] text-left text-[15px]">
          <thead>
            <tr className="text-[13px] text-gray-500">
              <th className="px-3 py-3 font-normal">Name</th>
              <th className="px-3 py-3 font-normal">Email</th>
              <th className="px-3 py-3 font-normal">Phone</th>
              <th className="px-3 py-3 font-normal">Score</th>
              <th className="px-3 py-3 font-normal">Qualification</th>
              <th className="px-3 py-3 font-normal">Deposit</th>
              <th className="px-3 py-3 font-normal">Date</th>
              <th className="px-3 py-3 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-amber-50/40">
                <td className="px-3 py-3 text-gray-900">{r.contact_name || "—"}</td>
                <td className="px-3 py-3 text-gray-800">{r.contact_email || "—"}</td>
                <td className="px-3 py-3 text-gray-800">{r.contact_phone || "—"}</td>
                <td className="px-3 py-3 font-semibold">{r.percentage ?? 0}%</td>
                <td className="px-3 py-3">
                  <QualPill q={r.qualification} />
                </td>
                <td className="px-3 py-3">
                  {r.converted_to_sale ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">Paid</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">Not yet</span>
                  )}
                </td>
                <td className="px-3 py-3 text-gray-800">{fmtDate(r.completed_at)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewId(r.id)} className="rounded-md border border-gray-200 px-3 py-1.5 text-[13px] hover:bg-gray-50">
                      View
                    </button>
                    <button
                      onClick={() => remove(r)}
                      aria-label={`Delete ${r.contact_name || "response"}`}
                      className="rounded-md bg-red-500 p-1.5 text-white hover:bg-red-600"
                    >
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                  No responses match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {deposit === "all" && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between px-3 text-[14px] text-gray-600">
            <span>
              Page {page} of {totalPages} · {total} responses
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-gray-200 px-3 py-1.5 disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-gray-200 px-3 py-1.5 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {viewId && (
        <DetailModal
          orgSlug={orgSlug}
          id={viewId}
          onClose={() => setViewId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

