"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AuthUser, QUALIFICATION_COLORS } from "@/lib/dashboard-types";
import KPICard from "./KPICard";

interface AnalyticsTabProps {
  user: AuthUser;
  accent: string;
  getAuthHeaders: () => Record<string, string>;
}

interface AnalyticsData {
  kpis: {
    totalAssessments: number;
    avgScore: number;
    hotLeads: number;
    converted: number;
    conversionRate: number;
    leadQualificationRate: number;
  };
  funnel: { started: number; completed: number; contacted: number; converted: number };
  rates: {
    leadQualificationRate: number;
    salesConversionAll: number;
    salesConversionQualified: number;
    salesCloseRate: number;
    trueConversionRate: number;
  };
  qualified: number;
  leadToSaleDays: number | null;
  qualDistribution: Record<string, number>;
  scoreBuckets: Record<string, number>;
  genderDistribution: Record<string, number>;
  ageDistribution: Record<string, number>;
  topLocations: { location: string; count: number }[];
  dailyConversion: { date: string; completed: number; converted: number }[];
  monthlyBreakdown: {
    month: string;
    completed: number;
    converted: number;
    conversionRate: number;
    avgDaysToConvert: number | null;
  }[];
}

interface QuestionBreakdown {
  questionId: string;
  order: number;
  text: string;
  type: string;
  total: number;
  options: { label: string; count: number; pct: number }[];
}

const QUAL_LABELS: Record<string, string> = {
  HOT_LEAD: "Hot",
  WARM_LEAD: "Warm",
  COLD_LEAD: "Cold",
  NOT_QUALIFIED: "N/Q",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[parseInt(m) - 1] || m} ${y}`;
}

// Color a score bucket by the qualification tier its lower bound falls into
// (ties the Score Distribution to the logo palette: red → blue → amber → green).
function scoreBucketColor(range: string): string {
  const lb = parseInt(range);
  if (lb >= 80) return "#16a34a";
  if (lb >= 60) return "#d99409";
  if (lb >= 40) return "#2563eb";
  return "#dc2626";
}

const cardClass =
  "bg-white rounded-xl p-6 border border-[#eceef2] shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]";

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cardClass}>
      <h3 className="text-[15px] font-semibold mb-4" style={{ color: "#16202e" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function AnalyticsTab({ accent, getAuthHeaders }: AnalyticsTabProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [questions, setQuestions] = useState<QuestionBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizId, setQuizId] = useState("");
  const [quizzes, setQuizzes] = useState<{ id: string; name: string; slug: string }[]>([]);

  // Org scorecards, for the Analytics scorecard selector.
  useEffect(() => {
    fetch("/api/dashboard/quiz-link", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setQuizzes(d.quizzes || []))
      .catch(() => {});
  }, [getAuthHeaders]);

  const load = useCallback(() => {
    setLoading(true);
    const headers = getAuthHeaders();
    const qs = quizId ? `?quizId=${quizId}` : "";
    Promise.all([
      fetch(`/api/dashboard/analytics${qs}`, { headers }).then((r) => r.json()),
      fetch(`/api/dashboard/analytics/questions${qs}`, { headers })
        .then((r) => r.json())
        .catch(() => ({ questions: [] })),
    ])
      .then(([a, q]) => {
        setData(a);
        setQuestions(q.questions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [getAuthHeaders, quizId]);

  useEffect(() => {
    load();
  }, [load]);

  const header = (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.01em]" style={{ color: "#16202e" }}>
          Analytics
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#667085" }}>
          How your scorecards perform — from completion to closed sale.
        </p>
      </div>
      {quizzes.length > 1 && (
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085] mb-1.5">
            Scorecard
          </label>
          <select
            value={quizId}
            onChange={(e) => setQuizId(e.target.value)}
            className="px-3 py-2 border border-[#e9ebf0] rounded-lg text-sm text-[#16202e] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/30 focus:border-[#6d28d9]"
          >
            <option value="">All scorecards</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="text-[#667085] py-8 text-center">Loading analytics...</div>
      </div>
    );
  }
  if (!data || !data.kpis) {
    return (
      <div className="space-y-6">
        {header}
        <div className="text-[#667085] py-8 text-center">Failed to load analytics.</div>
      </div>
    );
  }

  const { kpis } = data;

  const pieData = Object.entries(data.qualDistribution).map(([name, value]) => ({
    name: QUAL_LABELS[name] || name,
    value,
    fill: QUALIFICATION_COLORS[name] || "#98a2b3",
  }));

  const scoreData = Object.entries(data.scoreBuckets).map(([range, count]) => ({ range, count }));

  return (
    <div className="space-y-6">
      {header}

      {/* KPIs — the essentials only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Assessments" value={kpis.totalAssessments} accent={accent} />
        <KPICard label="Hot Leads" value={kpis.hotLeads} accent="#16a34a" />
        <KPICard
          label="Sales Converted"
          value={kpis.converted}
          sublabel={`${kpis.conversionRate}% conversion rate`}
          accent="#2563eb"
        />
        <KPICard
          label="Lead-to-Sale Time"
          value={data.leadToSaleDays !== null ? `${data.leadToSaleDays} days` : "—"}
          sublabel={
            data.leadToSaleDays !== null
              ? "avg completion → conversion"
              : "no conversions yet"
          }
          accent="#d99409"
        />
      </div>

      {/* Distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Qualification Distribution">
          {pieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e9ebf0",
                      boxShadow: "0 4px 10px -2px rgba(16,24,40,0.09)",
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex sm:flex-col flex-wrap gap-2.5 sm:pr-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-sm text-[#475467]">{d.name}</span>
                    <span className="text-sm font-semibold tabular-nums text-[#16202e]">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[#98a2b3] text-center py-12">No data yet</p>
          )}
        </ChartCard>

        <ChartCard title="Score Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={scoreData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f7" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11, fill: "#667085" }}
                axisLine={{ stroke: "#e9ebf0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#667085" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(109,40,217,0.06)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e9ebf0",
                  boxShadow: "0 4px 10px -2px rgba(16,24,40,0.09)",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                {scoreData.map((d, i) => (
                  <Cell key={i} fill={scoreBucketColor(d.range)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#f2f4f7]">
            {[
              { c: "#dc2626", l: "Not qualified" },
              { c: "#2563eb", l: "Cold" },
              { c: "#d99409", l: "Warm" },
              { c: "#16a34a", l: "Hot" },
            ].map((x) => (
              <div key={x.l} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: x.c }} />
                <span className="text-xs text-[#667085]">{x.l}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Key Questions Analysis — dynamic, one card per categorical question */}
      {questions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-1" style={{ color: "#16202e" }}>
            Key Questions Analysis
          </h2>
          <p className="text-sm text-[#667085] mb-4">
            How respondents answered each scorecard question.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {questions.map((q) => (
              <div key={q.questionId} className={cardClass}>
                <h3 className="text-[15px] font-semibold mb-4" style={{ color: "#16202e" }}>
                  {q.text}
                </h3>
                <div className="space-y-3">
                  {q.options.map((o) => (
                    <div key={o.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[#344054]">{o.label}</span>
                        <span className="text-[#667085] tabular-nums">
                          {o.count} <span className="text-[#98a2b3]">({o.pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#f2f4f7] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${o.pct}%`, backgroundColor: accent }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly breakdown */}
      {data.monthlyBreakdown.length > 0 && (
        <ChartCard title="Conversion Rate — Monthly Breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[#e9ebf0]">
                  <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085]">Month</th>
                  <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085]">Surveys Completed</th>
                  <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085]">Conversions</th>
                  <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085]">Conversion Rate</th>
                  <th className="py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085]">Avg Days to Convert</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyBreakdown.map((m) => (
                  <tr key={m.month} className="border-b border-[#f2f4f7]">
                    <td className="py-3 pr-4 text-[#16202e] font-medium">{formatMonth(m.month)}</td>
                    <td className="py-3 pr-4 text-[#475467] tabular-nums">{m.completed}</td>
                    <td className="py-3 pr-4 text-[#475467] tabular-nums">{m.converted}</td>
                    <td
                      className="py-3 pr-4 font-semibold tabular-nums"
                      style={{ color: m.conversionRate > 0 ? "#16a34a" : "#98a2b3" }}
                    >
                      {m.conversionRate}%
                    </td>
                    <td className="py-3 text-[#475467] tabular-nums">
                      {m.avgDaysToConvert !== null ? `${m.avgDaysToConvert} days` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  );
}
