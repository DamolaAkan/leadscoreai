"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthUser } from "@/lib/dashboard-types";
import { QuizResponse } from "@/lib/types";
import KPICard from "./KPICard";
import FilterBar from "./FilterBar";
import ResponseTable, { EmailSequenceInfo } from "./ResponseTable";
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
  const [sequenceMap, setSequenceMap] = useState<Record<string, EmailSequenceInfo>>({});
  const [total, setTotal] = useState(0);
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
      setSequenceMap(data.sequenceMap || {});
      setTotal(data.total || 0);
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
    // Optimistic update
    setResponses((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, converted_to_sale: !current } : r
      )
    );

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

  const convertedCount = responses.filter((r) => r.converted_to_sale).length;
  const qualifiedCount = responses.filter(
    (r) => r.qualification === "HOT_LEAD" || r.qualification === "WARM_LEAD"
  ).length;
  const conversionRate =
    total > 0 ? Math.round((convertedCount / responses.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Responses</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Responses" value={total} accent={accent} />
        <KPICard
          label="Converted"
          value={convertedCount}
          sublabel={`of ${responses.length} on this page`}
          accent="#16a34a"
        />
        <KPICard
          label="Qualified Leads"
          value={qualifiedCount}
          sublabel="Hot + Warm"
          accent="#f59e0b"
        />
        <KPICard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          accent={accent}
        />
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
          sequenceMap={sequenceMap}
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
