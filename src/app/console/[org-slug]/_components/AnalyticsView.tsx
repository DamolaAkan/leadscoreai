"use client";

import { useEffect, useState } from "react";
import type { QuizResponse } from "@/lib/types";
import { Icon, QUAL, api } from "../_lib";

interface Analytics {
  kpis: { totalAssessments: number; avgScore: number; hotLeads: number; converted: number; conversionRate: number };
  qualDistribution: Record<string, number>;
  scoreBuckets: Record<string, number>;
  genderDistribution: Record<string, number>;
  ageDistribution: Record<string, number>;
  topLocations: { location: string; count: number }[];
  leadToSaleDays: number | null;
}

interface QuestionBreakdown {
  questionId: string;
  order: number;
  text: string;
  total: number;
  avgPoints?: number;
  maxPoints?: number;
  options: { label: string; count: number; pct: number; converted?: number; conversionRate?: number }[];
}

const BAR = "linear-gradient(90deg, #EAB308, #F97316)";
const AGE_ORDER = ["18-24", "25-34", "35-44", "45-54", "55+"];

function Card({ title, icon, children }: { title: string; icon?: "chart" | "trend" | "pin" | "check"; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-[20px] font-bold">
        {icon && <Icon name={icon} className="w-5 h-5" />}
        {title}
      </h3>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Columns({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-56 items-end gap-3 border-b border-l border-gray-200 pl-2">
      {data.map((d) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[12px] text-gray-600">{d.value}</span>
          <div className="w-full rounded-t" style={{ height: `${(d.value / max) * 85}%`, background: color, minHeight: d.value ? 4 : 0 }} />
          <span className="whitespace-nowrap pb-1 text-[11px] text-gray-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function RankList({ items, dot }: { items: { label: string; value: number | string }[]; dot: string }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={it.label} className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: dot }}>
            {i + 1}
          </span>
          <span className="flex-1 text-[15px] text-gray-800">{it.label}</span>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[13px] font-semibold text-gray-800">{it.value}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AnalyticsView({ orgSlug }: { orgSlug: string }) {
  const [a, setA] = useState<Analytics | null>(null);
  const [questions, setQuestions] = useState<QuestionBreakdown[]>([]);
  const [rows, setRows] = useState<QuizResponse[]>([]);

  useEffect(() => {
    api<Analytics>(orgSlug, "/api/dashboard/analytics").then(setA).catch(() => {});
    api<{ questions: QuestionBreakdown[] }>(orgSlug, "/api/dashboard/analytics/questions")
      .then((d) => setQuestions(d.questions))
      .catch(() => {});
    api<{ responses: QuizResponse[] }>(orgSlug, "/api/dashboard/responses?page=1&pageSize=1000")
      .then((d) => setRows(d.responses))
      .catch(() => {});
  }, [orgSlug]);

  if (!a) return <div className="rounded-lg bg-white p-10 text-center text-gray-500 shadow-sm">Loading analytics…</div>;

  // 10%-buckets from the API, folded into five 20% bands.
  const scoreBands = [0, 20, 40, 60, 80].map((lo) => ({
    label: `${lo}-${lo + 20}%`,
    value: Object.entries(a.scoreBuckets).reduce((s, [k, v]) => {
      const start = parseInt(k, 10);
      return start >= lo && start < lo + 20 ? s + v : s;
    }, 0),
  }));
  const ages = AGE_ORDER.map((k) => ({ label: k, value: a.ageDistribution[k] || 0 }));
  const genderTotal = Object.values(a.genderDistribution).reduce((s, v) => s + v, 0) || 1;
  const male = Math.round(((a.genderDistribution.Male || 0) / genderTotal) * 100);

  // Deposit rate by qualification: proof the score predicts who pays.
  const tiers = ["HOT_LEAD", "WARM_LEAD", "COLD_LEAD", "NOT_QUALIFIED"].map((t) => {
    const inTier = rows.filter((r) => r.qualification === t);
    const paid = inTier.filter((r) => r.converted_to_sale).length;
    return { tier: t, n: inTier.length, rate: inTier.length ? Math.round((paid / inTier.length) * 100) : 0 };
  });

  const total = a.kpis.totalAssessments || 0;
  const hotRate = total ? Math.round(((a.qualDistribution.HOT_LEAD || 0) / total) * 100) : 0;
  const qualifiedRate = total
    ? Math.round((((a.qualDistribution.HOT_LEAD || 0) + (a.qualDistribution.WARM_LEAD || 0)) / total) * 100)
    : 0;
  const topAge = [...ages].sort((x, y) => y.value - x.value)[0];
  const topState = a.topLocations[0]?.location || "—";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: <Icon name="users" className="w-8 h-8 text-blue-500" />, v: total, l: "Total Responses" },
          { icon: <Icon name="trend" className="w-8 h-8 text-green-500" />, v: `${a.kpis.avgScore}%`, l: "Average Score" },
          { icon: <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-[18px]">🔥</span>, v: a.kpis.hotLeads, l: "Hot Leads" },
          { icon: <Icon name="chart" className="w-8 h-8 text-purple-500" />, v: `${Math.round(a.kpis.conversionRate)}%`, l: "Deposit Rate" },
        ].map((k) => (
          <div key={k.l} className="flex flex-col items-center rounded-lg border border-gray-100 bg-white py-7 shadow-sm">
            {k.icon}
            <div className="mt-3 text-[32px] font-bold leading-none">{k.v}</div>
            <div className="mt-2 text-[15px] text-gray-600">{k.l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Score Distribution" icon="chart">
          <Columns data={scoreBands} color="#3B82F6" />
        </Card>
        <Card title="Question Performance" icon="trend">
          <Columns
            data={[...questions].sort((x, y) => x.order - y.order).map((q) => ({ label: `Q${q.order}`, value: q.avgPoints ?? 0 }))}
            color="#22C55E"
          />
          <p className="mt-2 text-[12px] text-gray-500">Average points earned per question</p>
        </Card>
        <Card title="Age Distribution">
          <Columns data={ages} color="#8B5CF6" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Gender Distribution">
          <div className="flex items-center justify-center gap-6 py-6">
            <span className="text-[16px] text-green-600">Male: {male}%</span>
            <div
              className="h-36 w-36 rounded-full"
              style={{ background: `conic-gradient(#22C55E 0 ${male}%, #EAB308 ${male}% 100%)` }}
              aria-label={`Male ${male}%, Female ${100 - male}%`}
            />
            <span className="text-[16px] text-amber-600">Female: {100 - male}%</span>
          </div>
        </Card>
        <Card title="Deposit Rate by Qualification" icon="check">
          <div className="space-y-4">
            {tiers.map((t) => (
              <div key={t.tier}>
                <div className="flex justify-between text-[14px]">
                  <span className="text-gray-700">
                    {QUAL[t.tier].icon} {QUAL[t.tier].label} <span className="text-gray-400">({t.n})</span>
                  </span>
                  <span className="font-semibold">{t.rate}% paid</span>
                </div>
                <div className="mt-1.5 h-2.5 rounded-full bg-gray-100">
                  <div className="h-2.5 rounded-full" style={{ width: `${t.rate}%`, background: BAR }} />
                </div>
              </div>
            ))}
            {a.leadToSaleDays != null && (
              <p className="pt-1 text-[13px] text-gray-500">Average {a.leadToSaleDays} days from scorecard to deposit</p>
            )}
          </div>
        </Card>
        <Card title="Top States" icon="pin">
          <RankList items={a.topLocations.slice(0, 8).map((l) => ({ label: l.location, value: l.count }))} dot="linear-gradient(135deg,#22D3EE,#0EA5E9)" />
        </Card>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-[22px] font-bold">
          <Icon name="chart" className="w-5 h-5" />
          All Questions Analysis
        </h3>
        <p className="mt-1 text-[15px] text-gray-600">How every question is answered, and how many of each answer went on to pay the deposit</p>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...questions]
            .sort((x, y) => x.order - y.order)
            .map((q) => (
              <div key={q.questionId} className="rounded-lg border border-gray-100 p-5 shadow-sm">
                <div className="text-[13px] text-gray-400">Question {q.order}</div>
                <div className="mt-0.5 text-[15px] font-semibold text-gray-900">{q.text}</div>
                <div className="mt-4 space-y-3.5">
                  {q.options.map((o) => (
                    <div key={o.label}>
                      <div className="flex justify-between gap-3 text-[13px]">
                        <span className="text-gray-700">{o.label}</span>
                        <span className="whitespace-nowrap text-gray-700">
                          {o.count} ({o.pct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full" style={{ width: `${o.pct}%`, background: BAR }} />
                      </div>
                      {o.count > 0 && (
                        <div className="mt-1 text-[12px] text-green-700">{o.conversionRate ?? 0}% paid deposit</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-[22px] font-bold">Key Insights</h3>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { v: `${hotRate}%`, l: "Hot Lead Rate", c: "text-green-600", bg: "bg-green-50" },
            { v: `${qualifiedRate}%`, l: "Qualified Leads", c: "text-amber-600", bg: "bg-amber-50" },
            { v: topAge?.label || "—", l: "Top Age Group", c: "text-blue-700", bg: "bg-blue-50" },
            { v: topState, l: "Top State", c: "text-purple-600", bg: "bg-purple-50" },
          ].map((k) => (
            <div key={k.l} className={`rounded-lg ${k.bg} py-6 text-center`}>
              <div className={`text-[28px] font-bold ${k.c}`}>{k.v}</div>
              <div className="mt-1 text-[15px] text-gray-700">{k.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
