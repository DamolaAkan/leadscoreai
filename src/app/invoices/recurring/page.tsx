"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RecurringInvoice } from "@/lib/invoice-types";
import RecurringTable from "@/components/invoices/RecurringTable";

function getAuthHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem("lsai-admin-session");
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export default function RecurringPage() {
  const [templates, setTemplates] = useState<RecurringInvoice[]>([]);

  useEffect(() => {
    fetch("/api/invoices/recurring", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Recurring Templates</h1>
        <Link
          href="/invoices/recurring/new"
          className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] text-sm"
        >
          New Template
        </Link>
      </div>
      <div className="bg-[#141425] border border-[#2a2a3d] rounded-xl overflow-hidden">
        <RecurringTable templates={templates} />
      </div>
    </div>
  );
}
