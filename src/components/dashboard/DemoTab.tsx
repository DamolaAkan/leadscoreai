"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthUser } from "@/lib/dashboard-types";

interface Props {
  user: AuthUser;
  accent: string;
  getAuthHeaders: () => Record<string, string>;
}

interface QuizLink {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export default function DemoTab({ accent, getAuthHeaders }: Props) {
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<QuizLink[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/quiz-link", { headers: getAuthHeaders() });
      const data = await res.json();
      setOrgSlug(data.orgSlug);
      setQuizzes(data.quizzes || []);
      if (data.quizzes?.[0]) setSelected(data.quizzes[0].slug);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading demo...</div>;
  }

  if (!orgSlug || quizzes.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-gray-500">
        No active scorecard to demo yet.
      </div>
    );
  }

  const path = `/${orgSlug}/${selected}`;
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demo the scorecard</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            This is the live scorecard prospects fill in. Complete it (with an email and phone at the
            gate) and the new lead appears in <span className="font-medium">Responses</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {quizzes.length > 1 && (
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setReloadKey((k) => k + 1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.slug}>
                  {q.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Restart
          </button>
          <button
            onClick={copy}
            className="text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <a
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium px-3 py-2 rounded-lg text-white"
            style={{ backgroundColor: accent }}
          >
            Open in new tab ↗
          </a>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
        <iframe
          key={reloadKey}
          src={path}
          title="Live scorecard"
          className="w-full"
          style={{ height: "72vh", border: "none" }}
        />
      </div>

      <p className="text-xs text-gray-400">
        Public link: <span className="font-mono">{fullUrl}</span>
      </p>
    </div>
  );
}
