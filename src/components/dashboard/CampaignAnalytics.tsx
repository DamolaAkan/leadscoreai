"use client";

// How the promotion is going: four headline numbers, leads per day (qualified vs
// other) and spend per day, with one range filter above them and a table view.
// Spend is always the customer's price, never what Meta charges us.
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/money";

export interface DayPoint {
  date: string;
  spentKobo: number;
  leads: number;
  qualified: number;
  impressions: number;
  clicks: number;
}

// Categorical slots 1 and 2 of the reference palette, validated on white
// (CVD ΔE 24.7, normal-vision ΔE 33.6, both above 3:1).
const QUALIFIED = "#2a78d6";
const OTHER = "#eb6834";
const GRID = "#e1e0d9";
const AXIS = "#898781";
const SURFACE = "#ffffff";

const RANGES = [
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "all", label: "All time", days: Infinity },
] as const;

const naira = (kobo: number) => money(kobo / 100);
const compactNaira = (n: number) =>
  n >= 1_000_000 ? `₦${+(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `₦${Math.round(n / 1_000)}K` : `₦${n}`;
const compact = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1_000)}K` : n.toLocaleString("en-NG"));
const dayLabel = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {note && <p className="mt-0.5 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}

function TipBox({ title, rows }: { title: string; rows: { color?: string; label: string; value: string }[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="mt-1 flex items-center gap-1.5 text-gray-600">
          {r.color && <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: r.color }} aria-hidden />}
          <span>{r.label}</span>
          <span className="ml-auto pl-3 font-medium text-gray-900">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export function CampaignAnalytics({ daily }: { daily: DayPoint[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("30");
  const [table, setTable] = useState(false);

  const rows = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? 30;
    const slice = Number.isFinite(days) ? daily.slice(-days) : daily;
    return slice.map((d) => ({
      ...d,
      label: dayLabel(d.date),
      other: Math.max(0, d.leads - d.qualified),
      spent: Math.round(d.spentKobo / 100),
    }));
  }, [daily, range]);

  const t = rows.reduce(
    (a, d) => ({
      spentKobo: a.spentKobo + d.spentKobo,
      leads: a.leads + d.leads,
      qualified: a.qualified + d.qualified,
      impressions: a.impressions + d.impressions,
      clicks: a.clicks + d.clicks,
    }),
    { spentKobo: 0, leads: 0, qualified: 0, impressions: 0, clicks: 0 }
  );
  const qualifiedShare = t.leads ? Math.round((t.qualified / t.leads) * 100) : 0;

  return (
    <section className="space-y-4" aria-label="Campaign results">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Date range" className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-3 py-1.5 text-sm ${range === r.key ? "bg-gray-900 font-medium text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setTable(!table)} className="text-sm font-medium text-gray-600 underline-offset-2 hover:underline">
          {table ? "Show charts" : "Show as table"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Spent" value={naira(t.spentKobo)} />
        <Tile label="Leads" value={t.leads.toLocaleString("en-NG")} />
        <Tile label="Qualified leads" value={t.qualified.toLocaleString("en-NG")} note={t.leads ? `${qualifiedShare}% of leads` : undefined} />
        <Tile label="Cost per lead" value={t.leads ? naira(Math.round(t.spentKobo / t.leads)) : "None yet"} />
      </div>
      <p className="text-xs text-gray-500">
        Your ad was shown {compact(t.impressions)} times and clicked {compact(t.clicks)} times.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Your charts fill in once your campaign starts running.
        </div>
      ) : table ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Day</th>
                <th className="px-4 py-2 text-right font-medium">Spent</th>
                <th className="px-4 py-2 text-right font-medium">Leads</th>
                <th className="px-4 py-2 text-right font-medium">Qualified</th>
                <th className="px-4 py-2 text-right font-medium">Cost per lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 tabular-nums">
              {[...rows].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="px-4 py-2 text-gray-900">{d.label}</td>
                  <td className="px-4 py-2 text-right text-gray-900">{naira(d.spentKobo)}</td>
                  <td className="px-4 py-2 text-right text-gray-900">{d.leads}</td>
                  <td className="px-4 py-2 text-right text-gray-900">{d.qualified}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{d.leads ? naira(Math.round(d.spentKobo / d.leads)) : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Leads per day</h3>
              <div className="flex gap-3">
                <Key color={QUALIFIED} label="Qualified" />
                <Key color={OTHER} label="Other leads" />
              </div>
            </div>
            <div className="mt-3 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS, fontSize: 11 }} minTickGap={16} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 11 }} width={40} />
                  <Tooltip
                    cursor={{ fill: "#f3f4f6" }}
                    content={({ active, payload }) => {
                      const d = active && payload?.[0]?.payload;
                      if (!d) return null;
                      return (
                        <TipBox
                          title={d.label}
                          rows={[
                            { color: QUALIFIED, label: "Qualified", value: String(d.qualified) },
                            { color: OTHER, label: "Other leads", value: String(d.other) },
                            { label: "All leads", value: String(d.leads) },
                          ]}
                        />
                      );
                    }}
                  />
                  <Bar dataKey="qualified" stackId="leads" fill={QUALIFIED} stroke={SURFACE} strokeWidth={2} maxBarSize={24} />
                  <Bar dataKey="other" stackId="leads" fill={OTHER} stroke={SURFACE} strokeWidth={2} maxBarSize={24} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Spent per day</h3>
            <div className="mt-3 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS, fontSize: 11 }} minTickGap={16} />
                  <YAxis tickFormatter={compactNaira} tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 11 }} width={48} />
                  <Tooltip
                    cursor={{ fill: "#f3f4f6" }}
                    content={({ active, payload }) => {
                      const d = active && payload?.[0]?.payload;
                      if (!d) return null;
                      return (
                        <TipBox
                          title={d.label}
                          rows={[
                            { label: "Spent", value: naira(d.spentKobo) },
                            { label: "Leads", value: String(d.leads) },
                            { label: "Cost per lead", value: d.leads ? naira(Math.round(d.spentKobo / d.leads)) : "None" },
                          ]}
                        />
                      );
                    }}
                  />
                  <Bar dataKey="spent" fill={QUALIFIED} maxBarSize={24} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
