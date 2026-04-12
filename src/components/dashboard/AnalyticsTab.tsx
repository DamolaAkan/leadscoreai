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
  LineChart,
  Line,
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
  funnel: {
    started: number;
    completed: number;
    contacted: number;
    converted: number;
  };
  qualDistribution: Record<string, number>;
  scoreBuckets: Record<string, number>;
  dailyConversion: { date: string; completed: number; converted: number }[];
}

const QUAL_LABELS: Record<string, string> = {
  HOT_LEAD: "Hot",
  WARM_LEAD: "Warm",
  COLD_LEAD: "Cold",
  NOT_QUALIFIED: "N/Q",
};

export default function AnalyticsTab({
  accent,
  getAuthHeaders,
}: AnalyticsTabProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/analytics", { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [getAuthHeaders]);

  if (loading) {
    return (
      <div className="text-gray-500 py-8 text-center">
        Loading analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-gray-500 py-8 text-center">
        Failed to load analytics.
      </div>
    );
  }

  const pieData = Object.entries(data.qualDistribution).map(
    ([name, value]) => ({
      name: QUAL_LABELS[name] || name,
      value,
      fill: QUALIFICATION_COLORS[name] || "#6b7280",
    })
  );

  const barData = Object.entries(data.scoreBuckets).map(([range, count]) => ({
    range,
    count,
  }));

  const completionRate =
    data.funnel.started > 0
      ? Math.round((data.funnel.completed / data.funnel.started) * 100)
      : 0;

  const conversionRate =
    data.funnel.completed > 0
      ? Math.round((data.funnel.converted / data.funnel.completed) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {/* Funnel KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Started"
          value={data.funnel.started}
          accent={accent}
        />
        <KPICard
          label="Completed"
          value={data.funnel.completed}
          sublabel={`${completionRate}% completion rate`}
          accent={accent}
        />
        <KPICard
          label="Gave Contact"
          value={data.funnel.contacted}
          accent={accent}
        />
        <KPICard
          label="Converted"
          value={data.funnel.converted}
          sublabel={`${conversionRate}% conversion rate`}
          accent="#16a34a"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Qualification Distribution */}
        <div className="bg-white rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Qualification Distribution
          </h3>
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
        </div>

        {/* Score Distribution */}
        <div className="bg-white rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Conversion Line Chart */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Daily Completions & Conversions (Last 30 Days)
        </h3>
        {data.dailyConversion.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.dailyConversion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="completed"
                stroke={accent}
                strokeWidth={2}
                name="Completed"
              />
              <Line
                type="monotone"
                dataKey="converted"
                stroke="#16a34a"
                strokeWidth={2}
                name="Converted"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-center py-12">No data yet</p>
        )}
      </div>
    </div>
  );
}
