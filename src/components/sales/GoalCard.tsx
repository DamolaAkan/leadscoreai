"use client";

import { useEffect, useState } from "react";
import { slGet, slSend } from "@/lib/sl-client";
import { formatNaira } from "@/lib/sl-format";

interface GoalData {
  annual_target_naira: number;
  earned_year_naira: number;
  deals_closed_year: number;
  company: {
    monthly_deal_target: number;
    monthly_setup_target_naira: number;
    deals_this_month: number;
    setup_this_month_naira: number;
  };
}

const SCALE_COMMISSION = 25_000; // 2.5% of ₦1M Scale setup
const STARTER_COMMISSION = 12_500; // 2.5% of ₦500k Starter setup

export default function GoalCard() {
  const [data, setData] = useState<GoalData | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    slGet<GoalData>("/api/goals").then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const year = new Date().getFullYear();
  const target = data.annual_target_naira;
  const earned = data.earned_year_naira;
  const pct = target > 0 ? Math.min(100, Math.round((earned / target) * 100)) : 0;
  const remaining = Math.max(0, target - earned);
  const monthsLeft = Math.max(1, 12 - new Date().getMonth());
  const scaleDeals = Math.ceil(remaining / SCALE_COMMISSION);
  const starterDeals = Math.ceil(remaining / STARTER_COMMISSION);

  const c = data.company;
  const companyPct = Math.min(100, Math.round((c.deals_this_month / c.monthly_deal_target) * 100));

  async function save() {
    const value = Number(draft.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    try {
      await slSend("/api/goals", "PUT", { annual_target_naira: value });
      setData((d) => (d ? { ...d, annual_target_naira: value } : d));
      setEditing(false);
    } catch {
      /* keep editing open */
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-5 mb-6">
      <div className="flex flex-wrap gap-6 items-start justify-between">
        {/* Personal dream goal */}
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
              My {year} commission goal
            </p>
            {!editing && (
              <button
                onClick={() => {
                  setDraft(target > 0 ? String(target) : "");
                  setEditing(true);
                }}
                className="text-xs font-medium text-[#7C3AED] hover:underline"
              >
                {target > 0 ? "Edit" : "Set goal"}
              </button>
            )}
          </div>

          {editing ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                autoFocus
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. 1500000"
                className="border border-[#cbd5e1] rounded-md px-3 py-1.5 text-sm w-44"
              />
              <button
                onClick={save}
                disabled={saving}
                className="text-sm font-medium px-3 py-1.5 rounded-md bg-[#7C3AED] text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="text-sm text-gray-400">
                Cancel
              </button>
            </div>
          ) : target > 0 ? (
            <>
              <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">
                {formatNaira(earned)}{" "}
                <span className="text-sm font-medium text-[#94a3b8]">
                  of {formatNaira(target)} ({pct}%)
                </span>
              </p>
              <div className="h-2 rounded-full bg-[#f1f5f9] mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: "#7C3AED" }}
                />
              </div>
              <p className="text-xs text-[#64748b] mt-2">
                Your path: {remaining > 0 ? (
                  <>
                    ≈ <strong>{scaleDeals}</strong> Scale deals ({formatNaira(SCALE_COMMISSION)} each) or{" "}
                    <strong>{starterDeals}</strong> Starter deals to go — about{" "}
                    <strong>{Math.ceil(scaleDeals / monthsLeft)}</strong> Scale closes a month from here.
                  </>
                ) : (
                  <strong>Goal reached. Raise it. 🎉</strong>
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-[#64748b] mt-1">
              How much do you want to earn in commissions this year? Set it, and this card shows your
              path every time you log in.
            </p>
          )}
        </div>

        {/* Company target */}
        <div className="min-w-[240px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
            Company target · this month
          </p>
          <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">
            {c.deals_this_month}
            <span className="text-sm font-medium text-[#94a3b8]"> of {c.monthly_deal_target} deals</span>
          </p>
          <div className="h-2 rounded-full bg-[#f1f5f9] mt-2 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${companyPct}%`, backgroundColor: "#115e59" }}
            />
          </div>
          <p className="text-xs text-[#64748b] mt-2 tabular-nums">
            {formatNaira(c.setup_this_month_naira)} of {formatNaira(c.monthly_setup_target_naira)} setup
            revenue
          </p>
        </div>
      </div>
    </div>
  );
}
