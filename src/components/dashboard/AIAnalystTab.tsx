"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthUser } from "@/lib/dashboard-types";

interface Props {
  user: AuthUser;
  accent: string;
  getAuthHeaders: () => Record<string, string>;
  isAdmin: boolean;
}

interface Insight {
  insight: string;
  evidence: string;
  action: string;
}
interface Section {
  summary: string;
  insights: Insight[];
}
interface AnalystData {
  configured: boolean;
  hasReport: boolean;
  generatedAt: string | null;
  model: string | null;
  totals: { completed: number; converted: number } | null;
  report: {
    whoPays: Section;
    whereToFocus: Section;
    untappedSegments: Section;
  } | null;
}

const SECTIONS: { key: keyof NonNullable<AnalystData["report"]>; title: string; emoji: string }[] = [
  { key: "whoPays", title: "Who actually pays", emoji: "💰" },
  { key: "whereToFocus", title: "Where to focus", emoji: "🎯" },
  { key: "untappedSegments", title: "Untapped segments", emoji: "🌱" },
];

export default function AIAnalystTab({ accent, getAuthHeaders, isAdmin }: Props) {
  const [data, setData] = useState<AnalystData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/analyst", { headers: getAuthHeaders() });
      setData(await res.json());
    } catch {
      setError("Failed to load the report.");
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
      const res = await fetch("/api/dashboard/analyst/generate", {
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
    return <div className="text-gray-500 py-8 text-center">Loading analyst...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Analyst</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            A live read on your own customers — who pays, where to focus, and which segments you&apos;re
            missing. Generated from anonymized data; refreshes as you gather more.
          </p>
          {data?.generatedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last generated {new Date(data.generatedAt).toLocaleString()} · {data.model}
              {data.totals ? ` · ${data.totals.completed} responses` : ""}
            </p>
          )}
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
              : data?.hasReport
              ? "Refresh report"
              : "Generate report"}
          </button>
        )}
      </div>

      {!data?.configured && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          The AI agent isn&apos;t connected yet (no API key configured).
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data?.configured && !data.hasReport && !generating && (
        <div className="rounded-xl bg-white p-8 text-center text-gray-500">
          No report yet. Click <span className="font-medium">Generate report</span> to have the AI
          analyze your leads and conversions.
        </div>
      )}

      {data?.report &&
        SECTIONS.map(({ key, title, emoji }) => {
          const section = data.report![key];
          if (!section) return null;
          return (
            <div key={key} className="rounded-2xl border border-gray-100 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>{emoji}</span> {title}
              </h2>
              <p className="text-gray-600 mt-1 mb-4">{section.summary}</p>
              <div className="space-y-4">
                {section.insights.map((ins, i) => (
                  <div
                    key={i}
                    className="border-l-4 pl-4 py-1"
                    style={{ borderLeftColor: accent }}
                  >
                    <p className="text-gray-900 font-medium">{ins.insight}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium text-gray-600">Evidence:</span> {ins.evidence}
                    </p>
                    <p className="text-sm mt-1" style={{ color: accent }}>
                      <span className="font-medium">→ Action:</span> {ins.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
