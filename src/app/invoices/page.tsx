"use client";

import { useState, useEffect } from "react";
import { Invoice, InvoiceDashboardStats } from "@/lib/invoice-types";
import { formatCurrency } from "@/lib/invoice-utils";
import InvoiceKPICard from "@/components/invoices/InvoiceKPICard";
import InvoiceTable from "@/components/invoices/InvoiceTable";

function getAuthHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem("lsai-admin-session");
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export default function InvoiceDashboard() {
  const [stats, setStats] = useState<InvoiceDashboardStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const headers = getAuthHeaders();

    fetch("/api/invoices/stats", { headers })
      .then((r) => r.json())
      .then((d) => setStats(d.stats));

    fetch(`/api/invoices?status=${filter}`, { headers })
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices || []));
  }, [filter]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <InvoiceKPICard
          label="Total Invoices"
          value={stats?.total_invoices?.toString() || "0"}
        />
        <InvoiceKPICard
          label="Revenue"
          value={stats ? formatCurrency(stats.total_revenue) : "$0.00"}
          subtext="Paid invoices"
        />
        <InvoiceKPICard
          label="Outstanding"
          value={stats ? formatCurrency(stats.outstanding_amount) : "$0.00"}
          subtext="Awaiting payment"
        />
        <InvoiceKPICard
          label="Overdue"
          value={stats?.overdue_count?.toString() || "0"}
          subtext="Past due date"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {["all", "draft", "sent", "paid", "overdue"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
              filter === s
                ? "bg-[#7C3AED]/10 text-[#7C3AED] font-medium"
                : "text-gray-400 hover:text-white hover:bg-[#1a1a2e]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Invoice Table */}
      <div className="bg-[#141425] border border-[#2a2a3d] rounded-xl overflow-hidden">
        <InvoiceTable invoices={invoices} />
      </div>
    </div>
  );
}
