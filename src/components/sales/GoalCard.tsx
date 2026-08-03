"use client";

import { useEffect, useState } from "react";
import { slGet, slSend } from "@/lib/sl-client";
import { formatNaira } from "@/lib/sl-format";

interface GoalData {
  annual_target_naira: number;
  earned_year_naira: number;
  deals_closed_year: number;
  company: {
    monthly_setup_target_naira: number;
    setup_this_month_naira: number;
    deals_this_month: number;
    my_setup_this_month_naira: number;
    my_monthly_floor_naira: number;
    my_monthly_target_naira: number;
  };
}

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

  const c = data.company;
  const salesPct =
    c.my_monthly_target_naira > 0
      ? Math.min(100, Math.round((c.my_setup_this_month_naira / c.my_monthly_target_naira) * 100))
      : 0;

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Personal dream goal */}
        <div className="min-w-0">
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
            </>
          ) : (
            <p className="text-sm text-[#64748b] mt-1">
              How much do you want to earn in commissions this year? Set it to track your progress.
            </p>
          )}
        </div>

        {/* Personal sales target — the rep's own setup-fee closes this month */}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
            Sales target · this month
          </p>
          <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">
            {formatNaira(c.my_setup_this_month_naira)}
            <span className="text-sm font-medium text-[#94a3b8]">
              {" "}
              of {formatNaira(c.my_monthly_target_naira)} ({salesPct}%)
            </span>
          </p>
          <div className="h-2 rounded-full bg-[#f1f5f9] mt-2 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${salesPct}%`, backgroundColor: "#115e59" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
