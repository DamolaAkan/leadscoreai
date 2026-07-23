"use client";

import { useEffect, useState } from "react";
import { slGet, slSend } from "@/lib/sl-client";

interface Demo {
  id: string;
  slug: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  primary_color: string | null;
  responses: number;
}

const INDUSTRY_LABEL: Record<string, string> = {
  financing_asset_lending: "Financing & asset lending",
  insurance_credit: "Insurance & credit",
  real_estate: "Real estate",
  coaching_b2b: "Coaching & B2B",
};

export default function DemosPage() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    slGet<{ demos: Demo[] }>("/api/demos")
      .then((d) => setDemos(d.demos))
      .catch(() => setError("Could not load demos"))
      .finally(() => setLoading(false));
  }, []);

  async function enter(slug: string) {
    setEntering(slug);
    setError("");
    try {
      const r = await slSend<{ session_id: string; slug: string }>("/api/demos/enter", "POST", { slug });
      // Drop the freshly-minted org session where the client dashboard reads it, then land inside.
      localStorage.setItem("lsai-session", r.session_id);
      window.location.href = `/dashboard/${r.slug}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open demo");
      setEntering(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Demos</h1>
        <p className="text-sm text-gray-500 mt-1">
          One click drops you straight into a live client dashboard. Great for walkthroughs and pitches.
        </p>
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : demos.length === 0 ? (
        <div className="bg-white rounded-lg p-10 text-center text-gray-400 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          No demo dashboards yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {demos.map((d) => {
            const color = d.primary_color || "#7C3AED";
            return (
              <button
                key={d.id}
                onClick={() => enter(d.slug)}
                disabled={!!entering}
                className="text-left bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow disabled:opacity-60 group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                    style={{ backgroundColor: `${color}14` }}
                  >
                    {d.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.logo_url} alt="" className="w-7 h-7 object-contain" />
                    ) : (
                      <span className="text-lg font-bold" style={{ color }}>
                        {d.name[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1e293b] truncate">{d.name}</p>
                    <p className="text-xs text-[#94a3b8] truncate">
                      {d.industry ? INDUSTRY_LABEL[d.industry] || d.industry : "Demo client"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-[#64748b]">{d.responses} responses</span>
                  <span className="text-sm font-medium" style={{ color }}>
                    {entering === d.slug ? "Opening..." : "Open dashboard →"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
