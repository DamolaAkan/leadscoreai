"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthUser } from "@/lib/dashboard-types";
import { QuizResponse } from "@/lib/types";
import KPICard from "./KPICard";
import FilterBar from "./FilterBar";
import ResponseTable from "./ResponseTable";
import ResponseDetailPanel from "./ResponseDetailPanel";
import ConfirmDialog from "./ConfirmDialog";

interface ResponsesTabProps {
  user: AuthUser;
  accent: string;
  getAuthHeaders: () => Record<string, string>;
}

export default function ResponsesTab({
  accent,
  getAuthHeaders,
}: ResponsesTabProps) {
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    converted: 0,
    qualified: 0,
    conversionRate: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [qualification, setQualification] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  // Detail panel
  const [detailId, setDetailId] = useState<string | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    matched: number;
    unmatched: number;
    invalid: number;
  } | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateMsg, setCalibrateMsg] = useState("");

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });
    if (qualification) params.set("qualification", qualification);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/dashboard/responses?${params}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setResponses(data.responses || []);
      setStats(
        data.stats || {
          total: data.total || 0,
          converted: 0,
          qualified: 0,
          conversionRate: 0,
        }
      );
      setTotalPages(data.totalPages || 1);
    } catch {
      // Ignore
    }
    setLoading(false);
  }, [page, qualification, dateFrom, dateTo, search, getAuthHeaders]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleToggleConverted = async (id: string, current: boolean) => {
    // Optimistic update — row + the full-set "Converted" KPI
    setResponses((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, converted_to_sale: !current } : r
      )
    );
    setStats((prev) => {
      const converted = prev.converted + (current ? -1 : 1);
      return {
        ...prev,
        converted,
        conversionRate:
          prev.total > 0 ? Math.round((converted / prev.total) * 100) : 0,
      };
    });

    const res = await fetch(`/api/dashboard/responses/${id}`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ converted_to_sale: !current }),
    });

    // Revert on failure
    if (!res.ok) {
      setResponses((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, converted_to_sale: current } : r
        )
      );
      setStats((prev) => {
        const converted = prev.converted + (current ? 1 : -1);
        return {
          ...prev,
          converted,
          conversionRate:
            prev.total > 0 ? Math.round((converted / prev.total) * 100) : 0,
        };
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/dashboard/responses/${deleteId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    setDeleteId(null);
    fetchResponses();
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (qualification) params.set("qualification", qualification);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (search) params.set("search", search);

    const res = await fetch(`/api/dashboard/responses/export?${params}`, {
      headers: getAuthHeaders(),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `responses-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Minimal CSV parser (quote-aware) → array of {header: value} rows.
  function parseCsv(text: string): Record<string, string>[] {
    const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const splitLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
        } else if (c === "," && !inQ) { out.push(cur); cur = ""; } else cur += c;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };
    const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = splitLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
      return row;
    });
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      const rows = parsed.map((r) => ({
        email: r.email || "",
        phone: r.phone || "",
        converted: r.converted ?? r.conversion ?? "true",
      }));
      const res = await fetch("/api/dashboard/outcomes/import", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const d = await res.json();
      if (res.ok) {
        setImportResult(d);
        fetchResponses();
      } else {
        setImportResult({ total: rows.length, matched: 0, unmatched: 0, invalid: rows.length });
      }
    } catch {
      setImportResult({ total: 0, matched: 0, unmatched: 0, invalid: 0 });
    }
    setImporting(false);
  }

  async function recalibrate() {
    setCalibrating(true);
    setCalibrateMsg("");
    try {
      const res = await fetch("/api/dashboard/wtp/calibrate", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const d = await res.json();
      if (!res.ok) {
        setCalibrateMsg("Not permitted.");
      } else if (d.calibrated) {
        setCalibrateMsg(`Calibrated on ${d.trainingSize} conversions · re-scored ${d.rescored} leads.`);
        fetchResponses();
      } else {
        setCalibrateMsg(`${d.trainingSize}/${d.needed} conversions — score stays a directional index until then.`);
      }
    } catch {
      setCalibrateMsg("Something went wrong.");
    }
    setCalibrating(false);
  }

  function downloadTemplate() {
    const csv =
      "email,phone,converted\n" +
      "borrower@example.com,,yes\n" +
      ",+2348012345678,yes\n" +
      "notqualified@example.com,,no\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "conversions-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Responses</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Responses" value={stats.total} accent={accent} />
        <KPICard
          label="Converted"
          value={stats.converted}
          sublabel={`of ${stats.total} total`}
          accent="#16a34a"
        />
        <KPICard
          label="Qualified Leads"
          value={stats.qualified}
          sublabel="Hot + Warm"
          accent="#f59e0b"
        />
        <KPICard
          label="Conversion Rate"
          value={`${stats.conversionRate}%`}
          accent={accent}
        />
      </div>

      {/* Bulk outcome import */}
      <div className="bg-white rounded-xl p-4 flex flex-wrap items-center gap-3 border border-gray-100">
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-semibold text-gray-900">Import conversions</p>
          <p className="text-xs text-gray-500">
            Upload a CSV of who converted to calibrate WTP. Matched to leads by email or phone.{" "}
            <button onClick={downloadTemplate} className="font-medium underline" style={{ color: accent }}>
              Download template
            </button>
          </p>
        </div>
        {importResult && (
          <span className="text-xs text-gray-600 tabular-nums">
            {importResult.matched} matched · {importResult.unmatched} unmatched · {importResult.invalid} invalid
          </span>
        )}
        <button
          onClick={recalibrate}
          disabled={calibrating}
          className="text-sm font-medium px-4 py-2 rounded-md border disabled:opacity-50"
          style={{ borderColor: accent, color: accent }}
        >
          {calibrating ? "Calibrating…" : "Recalibrate WTP"}
        </button>
        <label
          className="text-sm font-medium px-4 py-2 rounded-md text-white cursor-pointer"
          style={{ backgroundColor: accent, opacity: importing ? 0.6 : 1 }}
        >
          {importing ? "Importing…" : "Import CSV"}
          <input type="file" accept=".csv,text/csv" onChange={handleImportFile} disabled={importing} className="hidden" />
        </label>
        {calibrateMsg && <span className="text-xs text-gray-600 w-full">{calibrateMsg}</span>}
      </div>

      {/* Filters */}
      <FilterBar
        qualification={qualification}
        dateFrom={dateFrom}
        dateTo={dateTo}
        search={searchInput}
        onQualificationChange={(v) => {
          setQualification(v);
          setPage(1);
        }}
        onDateFromChange={(v) => {
          setDateFrom(v);
          setPage(1);
        }}
        onDateToChange={(v) => {
          setDateTo(v);
          setPage(1);
        }}
        onSearchChange={setSearchInput}
        onExport={handleExport}
        accent={accent}
      />

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          Loading responses...
        </div>
      ) : (
        <ResponseTable
          responses={responses}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onView={setDetailId}
          onToggleConverted={handleToggleConverted}
          onDelete={setDeleteId}
          accent={accent}
        />
      )}

      {/* Detail Panel */}
      <ResponseDetailPanel
        responseId={detailId}
        onClose={() => setDetailId(null)}
        getAuthHeaders={getAuthHeaders}
        accent={accent}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Response"
        message="Are you sure you want to delete this response? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
