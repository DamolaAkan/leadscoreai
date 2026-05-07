"use client";

import Link from "next/link";
import { InvoiceClient } from "@/lib/invoice-types";

interface ClientTableProps {
  clients: InvoiceClient[];
}

export default function ClientTable({ clients }: ClientTableProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-black/50">
        <p>No clients yet.</p>
        <Link href="/invoices/clients/new" className="text-[#7C3AED] hover:underline text-sm mt-2 inline-block">
          Add your first client
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-black/[0.08]">
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Name</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Company</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Email</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Currency</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-black/[0.04] hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 text-sm text-[#111827] font-medium">{client.name}</td>
              <td className="py-3 px-4 text-sm text-gray-700">{client.company || "—"}</td>
              <td className="py-3 px-4 text-sm text-gray-500">{client.email}</td>
              <td className="py-3 px-4 text-sm text-gray-500">{client.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
