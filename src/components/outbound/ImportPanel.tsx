"use client";

import { useState } from "react";
import {
  IMPORT_BATCH,
  IMPORT_FIELDS,
  IMPORT_FIELD_LABEL,
  ImportField,
  ImportResult,
  ImportRow,
  SEGMENTS,
  SEGMENT_LABEL,
  Segment,
  guessMapping,
  parseCsv,
} from "@/lib/outbound";

const EMPTY: ImportResult = {
  received: 0,
  companies_created: 0,
  contacts_created: 0,
  contacts_merged: 0,
  duplicates_in_file: 0,
  suppressed: 0,
  company_only: 0,
  invalid: 0,
};

export default function ImportPanel({
  authHeaders,
  onDone,
  onClose,
}: {
  authHeaders: () => Record<string, string>;
  onDone: () => void;
  onClose: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, number>>>({});
  const [segment, setSegment] = useState<Segment | "">("");
  const [source, setSource] = useState("explee");
  const [niche, setNiche] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function onFile(f: File | undefined) {
    setError("");
    setResult(null);
    if (!f) return;
    if (f.size > 25_000_000) {
      setError("That file is over 25 MB. Split it and import the parts.");
      return;
    }
    const text = await f.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setError("No data rows found in that file.");
      return;
    }
    setFileName(f.name);
    setHeaders(parsed[0].map((h) => h.trim()));
    setRows(parsed.slice(1));
    setMapping(guessMapping(parsed[0]));
    if (/apollo/i.test(f.name)) setSource("apollo");
  }

  function mapped(r: string[]): ImportRow {
    const out: ImportRow = {};
    for (const f of IMPORT_FIELDS) {
      const i = mapping[f];
      if (i !== undefined && r[i] !== undefined && r[i].trim() !== "") out[f] = r[i];
    }
    return out;
  }

  const canImport =
    !!segment && rows.length > 0 && (mapping.company_name !== undefined || mapping.website !== undefined || mapping.email !== undefined);

  async function runImport() {
    if (!canImport) return;
    setBusy(true);
    setError("");
    setProgress(0);
    const total: ImportResult = { ...EMPTY };
    try {
      for (let i = 0; i < rows.length; i += IMPORT_BATCH) {
        const batch = rows.slice(i, i + IMPORT_BATCH).map(mapped);
        const res = await fetch("/api/internal-outbound/import", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ rows: batch, defaults: { segment, source, niche, country } }),
        });
        const data = await res.json().catch(() => ({}));
        const r: ImportResult | undefined = data.result;
        if (r) for (const k of Object.keys(total) as (keyof ImportResult)[]) total[k] += r[k] || 0;
        if (!res.ok) throw new Error([data.error, data.detail].filter(Boolean).join(": ") || "Import failed");
        setProgress(Math.min(rows.length, i + IMPORT_BATCH));
      }
      setResult(total);
      onDone();
    } catch (e) {
      setResult(total);
      setError(`${e instanceof Error ? e.message : "Import failed"}. Rows before this point were saved; importing the same file again will not duplicate them.`);
    } finally {
      setBusy(false);
    }
  }

  const preview = rows.slice(0, 3).map(mapped);

  return (
    <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#111827]">Import a CSV</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Explee or Apollo exports. Contacts are matched by email, then by name at the same company domain. Rows on the
            do-not-contact list are skipped and never stored.
          </p>
        </div>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-700">Close</button>
      </div>

      <input
        type="file"
        accept=".csv,text/csv"
        disabled={busy}
        onChange={(e) => onFile(e.target.files?.[0])}
        className="block text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#7C3AED] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
      />

      {headers.length > 0 && (
        <>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{fileName}</span>: {rows.length.toLocaleString()} rows, {headers.length} columns
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="text-xs text-gray-500">
              Segment <span className="text-red-500">*</span>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value as Segment)}
                className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
              >
                <option value="">Pick one</option>
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>{SEGMENT_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-500">
              Source
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
              />
            </label>
            <label className="text-xs text-gray-500">
              Niche for rows without one
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. solar financiers"
                className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
              />
            </label>
            <label className="text-xs text-gray-500">
              Country for rows without one
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Kenya"
                className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Columns (guessed from the headers; check them)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {IMPORT_FIELDS.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 text-gray-600">{IMPORT_FIELD_LABEL[f]}</span>
                  <select
                    value={mapping[f] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => {
                        const next = { ...m };
                        if (e.target.value === "") delete next[f];
                        else next[f] = Number(e.target.value);
                        return next;
                      })
                    }
                    className="flex-1 min-w-0 rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-800"
                  >
                    <option value="">Not in file</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          {preview.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs font-medium text-gray-500 mb-1">First rows as they will import</p>
              <table className="text-xs text-gray-700 min-w-full">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="pr-3 py-1">Name</th>
                    <th className="pr-3 py-1">Title</th>
                    <th className="pr-3 py-1">Email</th>
                    <th className="pr-3 py-1">Company</th>
                    <th className="pr-3 py-1">Website</th>
                    <th className="pr-3 py-1">Country</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="pr-3 py-1">{p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ")}</td>
                      <td className="pr-3 py-1">{p.title}</td>
                      <td className="pr-3 py-1">{p.email}</td>
                      <td className="pr-3 py-1">{p.company_name}</td>
                      <td className="pr-3 py-1">{p.website}</td>
                      <td className="pr-3 py-1">{p.country || country}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={runImport}
              disabled={!canImport || busy}
              className="rounded-full bg-[#7C3AED] px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? `Importing ${progress.toLocaleString()} / ${rows.length.toLocaleString()}` : `Import ${rows.length.toLocaleString()} rows`}
            </button>
            {!segment && <span className="text-xs text-gray-400">Pick a segment first.</span>}
          </div>
        </>
      )}

      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      {result && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          {result.contacts_created.toLocaleString()} new contacts, {result.companies_created.toLocaleString()} new companies,{" "}
          {result.contacts_merged.toLocaleString()} already here (blanks filled), {result.duplicates_in_file.toLocaleString()} duplicates
          in the file, {result.suppressed.toLocaleString()} skipped (do not contact), {result.company_only.toLocaleString()} company-only
          rows, {result.invalid.toLocaleString()} unusable.
        </div>
      )}
    </div>
  );
}
