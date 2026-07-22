"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthUser } from "@/lib/dashboard-types";

interface Props {
  user: AuthUser;
  accent: string;
  getAuthHeaders: () => Record<string, string>;
  isAdmin: boolean;
}

interface Persona {
  name: string;
  description: string;
  signals: string;
}
interface TargetMarket {
  market: string;
  why: string;
}
interface Dos {
  dangers: string[];
  opportunities: string[];
  strengths: string[];
}
interface AnalystData {
  configured: boolean;
  hasReport: boolean;
  generatedAt: string | null;
  model: string | null;
  totals: { completed: number; converted: number } | null;
  report: {
    personas: Persona[];
    targetMarkets: TargetMarket[];
    dos: Dos;
  } | null;
}

const CARD = "bg-white rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

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

  const report = data?.report;

  const DosColumn = ({
    title,
    items,
    color,
  }: {
    title: string;
    items: string[];
    color: string;
  }) => (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color }}>
        {title}
      </h4>
      <ul className="space-y-2">
        {(items || []).map((it, i) => (
          <li key={i} className="text-sm leading-relaxed flex gap-2" style={{ color: "#475569" }}>
            <span style={{ color }}>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Analyst</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            A short strategic read on your customers — the personas that pay, the markets to chase
            next, and a Dangers / Opportunities / Strengths snapshot.
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
            className="text-sm font-medium px-4 py-2 rounded-md text-white disabled:opacity-50 shrink-0"
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
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          The AI agent isn&apos;t connected yet (no API key configured).
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data?.configured && !data.hasReport && !generating && (
        <div className={`${CARD} text-center text-gray-500`}>
          No report yet. Click <span className="font-medium">Generate report</span> to have the AI
          analyze your leads and conversions.
        </div>
      )}

      {report && (
        <>
          {/* Personas */}
          <div>
            <h2 className="text-base font-semibold mb-1" style={{ color: "#1e293b" }}>
              Buyer personas
            </h2>
            <p className="text-sm text-gray-500 mb-4">The three profiles that actually pay.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.personas.map((p, i) => (
                <div key={i} className={CARD}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-6 h-6 rounded-md text-white text-xs flex items-center justify-center font-bold shrink-0"
                      style={{ backgroundColor: accent }}
                    >
                      {i + 1}
                    </span>
                    <h3 className="font-semibold" style={{ color: "#1e293b" }}>
                      {p.name}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
                    {p.description}
                  </p>
                  <p className="text-xs mt-3 leading-relaxed" style={{ color: "#94a3b8" }}>
                    <span className="font-semibold" style={{ color: "#64748b" }}>
                      Identify by:{" "}
                    </span>
                    {p.signals}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Target markets */}
          <div className={CARD}>
            <h2 className="text-base font-semibold" style={{ color: "#1e293b" }}>
              Target markets to focus on
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">Best opportunities first.</p>
            <ol className="space-y-3">
              {report.targetMarkets.map((m, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-semibold shrink-0"
                    style={{ backgroundColor: accent }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#1e293b" }}>
                      {m.market}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
                      {m.why}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* DOS */}
          <div className={CARD}>
            <h2 className="text-base font-semibold" style={{ color: "#1e293b" }}>
              DOS — Dangers · Opportunities · Strengths
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              What to eliminate, capture, and double down on.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DosColumn title="Dangers" items={report.dos.dangers} color="#dc2626" />
              <DosColumn title="Opportunities" items={report.dos.opportunities} color="#16a34a" />
              <DosColumn title="Strengths" items={report.dos.strengths} color="#2563eb" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
