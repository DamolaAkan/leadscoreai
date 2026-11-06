"use client";

import { useState } from "react";
import { DncEntry } from "@/lib/outbound";

export default function DncPanel({
  dnc,
  canRemove,
  authHeaders,
  onChange,
  onClose,
}: {
  dnc: DncEntry[];
  canRemove: boolean;
  authHeaders: () => Record<string, string>;
  onChange: (dnc: DncEntry[]) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<"domain" | "name">("domain");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/internal-outbound/dnc", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ kind, value, reason }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not add");
    setValue("");
    setReason("");
    onChange(data.dnc || []);
  }

  async function remove(id: string) {
    if (!confirm("Remove this entry? Matching contacts become exportable again.")) return;
    const res = await fetch(`/api/internal-outbound/dnc?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Could not remove");
    onChange(data.dnc || []);
  }

  return (
    <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#111827]">Do not contact</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            A domain blocks the company, its subdomains and every email at it. A company name blocks any company whose name
            contains it. Blocked rows are skipped on import, cannot be researched and never appear in an export.
          </p>
        </div>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-700">Close</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "domain" | "name")}
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        >
          <option value="domain">Domain</option>
          <option value="name">Company name</option>
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={kind === "domain" ? "example.com" : "Example Finance"}
          className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        />
        <button
          onClick={add}
          disabled={busy || !value.trim()}
          className="rounded-full bg-[#111827] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {error && <div className="rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-700">{error}</div>}

      <ul className="divide-y divide-gray-100 text-sm">
        {dnc.map((e) => (
          <li key={e.id} className="py-2 flex items-center gap-3">
            <span className="font-mono text-[13px] text-gray-800">{e.domain || `name contains "${e.name_key}"`}</span>
            <span className="text-xs text-gray-400 truncate flex-1">{e.reason}</span>
            {e.locked ? (
              <span className="text-[11px] rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">Locked</span>
            ) : canRemove ? (
              <button onClick={() => remove(e.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
