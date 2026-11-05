"use client";

// Super-admin, read-only: does META_ADS_TOKEN reach the ad account and Page that
// press-play campaigns use? Not linked from the sidebar; open /meta-check directly.
import { useEffect, useState } from "react";
import { slGet } from "@/lib/sl-client";

interface Check {
  step: string;
  ok: boolean;
  detail: Record<string, unknown> | string;
}
interface Result {
  ok: boolean;
  error?: string;
  checks?: Check[];
}

const LABELS: Record<string, string> = { token: "Token", ad_account: "Ad account", page: "Facebook Page" };

export default function MetaCheckPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    slGet<Result>("/api/staff/meta-check").then(setResult, (e: Error) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Meta connection check</h1>
      <p className="mt-1 text-sm text-gray-500">Read-only. Nothing in Meta is changed.</p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!result && !error && <p className="mt-6 text-sm text-gray-500">Checking...</p>}
      {result?.error && <p className="mt-6 text-sm text-red-600">{result.error}</p>}

      <ul className="mt-6 space-y-3">
        {result?.checks?.map((c) => (
          <li key={c.step} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className={`font-semibold ${c.ok ? "text-emerald-700" : "text-red-600"}`}>
              {c.ok ? "OK" : "Failed"}: {LABELS[c.step] ?? c.step}
            </p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-600">
              {typeof c.detail === "string" ? c.detail : JSON.stringify(c.detail, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
