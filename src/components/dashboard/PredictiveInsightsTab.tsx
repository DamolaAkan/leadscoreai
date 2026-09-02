"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthUser } from "@/lib/dashboard-types";
import KPICard from "./KPICard";

interface Props {
  user: AuthUser;
  accent: string;
  getAuthHeaders: () => Record<string, string>;
  isAdmin: boolean;
}

interface Signal {
  questionId: string;
  questionText: string;
  rationale: string;
  weights: { value: number; label: string; weight: number }[];
}

interface WtpData {
  configured: boolean;
  hasRubric: boolean;
  generatedAt: string | null;
  model: string | null;
  summary: string | null;
  threshold: number | null;
  suggestedQuestions: { question: string; why: string }[];
  signals: Signal[];
  stats: {
    superLeads: number;
    scored: number;
    topSuperLeads: {
      contact_name: string | null;
      qualification: string | null;
      wtp_score: number | null;
      converted_to_sale: boolean | null;
    }[];
  };
}

export default function PredictiveInsightsTab({ accent, getAuthHeaders, isAdmin }: Props) {
  const [data, setData] = useState<WtpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/wtp", { headers: getAuthHeaders() });
      setData(await res.json());
    } catch {
      setError("Failed to load insights.");
    }
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/wtp/generate", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || "Generation failed.");
      } else {
        await load();
      }
    } catch {
      setError("Generation failed.");
    }
    setGenerating(false);
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading insights...</div>;
  }

  const maxWeight = 10;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.01em]" style={{ color: "#16202e" }}>
            Predictive Insights
          </h1>
          <p className="text-sm text-[#667085] mt-1 max-w-2xl">
            Willingness-to-pay analysis — which answers reveal a lead can and will actually pay.
            This flags <span className="font-medium">super leads</span> to call first and never
            changes the scorecard tier.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={generate}
            disabled={generating || !data?.configured}
            className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50 shrink-0"
            style={{ backgroundColor: accent }}
          >
            {generating
              ? "Analyzing… (up to a minute)"
              : data?.hasRubric
              ? "Refresh analysis"
              : "Generate analysis"}
          </button>
        )}
      </div>

      {!data?.configured && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          The AI agent isn&apos;t connected yet (no API key configured). Insights will populate
          once it&apos;s set up.
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data?.configured && !data.hasRubric && !generating && (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 border border-[#eceef2] shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
          No analysis yet. Click <span className="font-medium">Generate analysis</span> to have the
          AI read this scorecard and your conversions, then score every lead&apos;s willingness to
          pay.
        </div>
      )}

      {data?.hasRubric && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard label="Super Leads" value={data.stats.superLeads} accent="#d99409" />
            <KPICard
              label="Leads Scored"
              value={data.stats.scored}
              sublabel={`threshold ${data.threshold}/100`}
              accent={accent}
            />
            <KPICard
              label="Last Analyzed"
              value={
                data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : "—"
              }
              sublabel={data.model || undefined}
              accent={accent}
            />
          </div>

          {data.summary && (
            <div className="rounded-lg bg-amber-50/60 p-5">
              <h2 className="text-amber-800 font-semibold mb-2 flex items-center gap-2">
                <span>⚡</span> What predicts payment
              </h2>
              <p className="text-gray-700 leading-relaxed">{data.summary}</p>
            </div>
          )}

          {/* Signal reasoning */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Willingness-to-pay signals</h2>
            <p className="text-sm text-gray-500 mb-4">
              How the agent weighted each answer, grounded in who actually converted.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.signals.map((s) => (
                <div key={s.questionId} className="bg-white rounded-lg p-6 border border-[#eceef2] shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
                  <h3 className="font-semibold text-gray-900">{s.questionText}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-4">{s.rationale}</p>
                  <div className="space-y-2">
                    {[...s.weights]
                      .sort((a, b) => b.weight - a.weight)
                      .map((w) => (
                        <div key={w.value} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 flex-1 truncate">{w.label}</span>
                          <div className="w-28 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(w.weight / maxWeight) * 100}%`,
                                backgroundColor: "#d99409",
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-6 text-right">{w.weight}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested questions */}
          {data.suggestedQuestions.length > 0 && (
            <div className="rounded-lg bg-white p-6 border border-[#eceef2] shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Questions worth adding
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                The agent suggests these would sharpen willingness-to-pay prediction.
              </p>
              <ul className="space-y-3">
                {data.suggestedQuestions.map((q, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-semibold shrink-0"
                      style={{ backgroundColor: accent }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-gray-900 font-medium">{q.question}</p>
                      <p className="text-sm text-gray-500">{q.why}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top super leads */}
          {data.stats.topSuperLeads.length > 0 && (
            <div className="rounded-lg bg-white p-6 border border-[#eceef2] shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top super leads — call first</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="py-2 pr-4 font-medium">Lead</th>
                      <th className="py-2 pr-4 font-medium">Tier</th>
                      <th className="py-2 pr-4 font-medium">WTP</th>
                      <th className="py-2 font-medium">Converted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stats.topSuperLeads.map((l, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-3 pr-4 text-gray-800">{l.contact_name || "—"}</td>
                        <td className="py-3 pr-4 text-gray-600">
                          {(l.qualification || "").replace("_", " ").toLowerCase() || "—"}
                        </td>
                        <td className="py-3 pr-4 font-semibold" style={{ color: "#d97706" }}>
                          {l.wtp_score}/100
                        </td>
                        <td className="py-3 text-gray-600">
                          {l.converted_to_sale ? "Yes" : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
