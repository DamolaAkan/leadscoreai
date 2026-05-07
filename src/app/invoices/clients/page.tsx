"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { InvoiceClient } from "@/lib/invoice-types";
import ClientTable from "@/components/invoices/ClientTable";

function getAuthHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem("lsai-admin-session");
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export default function ClientsPage() {
  const [clients, setClients] = useState<InvoiceClient[]>([]);

  useEffect(() => {
    fetch("/api/invoices/clients", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setClients(d.clients || []));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Clients</h1>
        <Link
          href="/invoices/clients/new"
          className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-full hover:bg-[#6D28D9] text-sm"
        >
          Add Client
        </Link>
      </div>
      <div className="bg-white border border-black/[0.08] rounded-2xl overflow-hidden shadow-sm">
        <ClientTable clients={clients} />
      </div>
    </div>
  );
}
