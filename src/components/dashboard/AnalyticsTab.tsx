"use client";

import { useState, useEffect } from "react";
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <h3 className="text-base font-semibold mb-4" style={{ color: "#1e293b" }}>
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

  useEffect(() => {
    const headers = getAuthHeaders();
    Promise.all([
      fetch("/api/dashboard/analytics", { headers }).then((r) => r.json()),
      fetch("/api/dashboard/analytics/questions", { headers })
        .then((r) => r.json())
        .catch(() => ({ questions: [] })),
    ])
      .then(([a, q]) => {
        setData(a);
        setQuestions(q.questions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [getAuthHeaders]);

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading analytics...</div>;
  }
  if (!data || !data.kpis) {
    return <div className="text-gray-500 py-8 text-center">Failed to load analytics.</div>;
  }

  const { kpis } = data;

  const pieData = Object.entries(data.qualDistribution).map(([name, value]) => ({
    name: QUAL_LABELS[name] || name,
    value,
    fill: QUALIFICATION_COLORS[name] || "#6b7280",
  }));

  const scoreData = Object.entries(data.scoreBuckets).map(([range, count]) => ({ range, count }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {/* KPIs — the essentials only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Assessments" value={kpis.totalAssessments} />
        <KPICard label="Hot Leads" value={kpis.hotLeads} />
        <KPICard
          label="Sales Converted"
          value={kpis.converted}
          sublabel={`${kpis.conversionRate}% conversion rate`}
        />
        <KPICard
          label="Lead-to-Sale Time"
          value={data.leadToSaleDays !== null ? `${data.leadToSaleDays} days` : "—"}
          sublabel={
            data.leadToSaleDays !== null
              ? "avg completion → conversion"
              : "no conversions yet"
          }
        />
      </div>

      {/* Distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Qualification Distribution">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">No data yet</p>
          )}
        </ChartCard>

        <ChartCard title="Score Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* Key Questions Analysis — dynamic, one card per categorical question */}
      {questions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Key Questions Analysis</h2>
          <p className="text-sm text-gray-500 mb-4">
            How respondents answered each scorecard question.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {questions.map((q) => (
              <div
                key={q.questionId}
                className="bg-white rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                <h3 className="text-base font-semibold mb-4" style={{ color: "#1e293b" }}>
                  {q.text}
                </h3>
                <div className="space-y-3">
                  {q.options.map((o) => (
                    <div key={o.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700">{o.label}</span>
                        <span className="text-gray-500">
                          {o.count} <span className="text-gray-400">({o.pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
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
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Month</th>
                  <th className="py-2 pr-4 font-medium">Surveys Completed</th>
                  <th className="py-2 pr-4 font-medium">Conversions</th>
                  <th className="py-2 pr-4 font-medium">Conversion Rate</th>
                  <th className="py-2 font-medium">Avg Days to Convert</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyBreakdown.map((m) => (
                  <tr key={m.month} className="border-b border-gray-50">
                    <td className="py-3 pr-4 text-gray-800">{formatMonth(m.month)}</td>
                    <td className="py-3 pr-4 text-gray-700">{m.completed}</td>
                    <td className="py-3 pr-4 text-gray-700">{m.converted}</td>
                    <td
                      className="py-3 pr-4 font-semibold"
                      style={{ color: m.conversionRate > 0 ? "#16a34a" : "#9ca3af" }}
                    >
                      {m.conversionRate}%
                    </td>
                    <td className="py-3 text-gray-700">
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
