"use client";

import Link from "next/link";
import { InvoiceClient } from "@/lib/invoice-types";

interface ClientTableProps {
  clients: InvoiceClient[];
}

export default function ClientTable({ clients }: ClientTableProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
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
          <tr className="border-b border-[#2a2a3d]">
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Company</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Currency</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-[#2a2a3d]/50 hover:bg-[#1a1a2e]/50 transition-colors">
              <td className="py-3 px-4 text-sm text-white font-medium">{client.name}</td>
              <td className="py-3 px-4 text-sm text-gray-300">{client.company || "—"}</td>
              <td className="py-3 px-4 text-sm text-gray-400">{client.email}</td>
              <td className="py-3 px-4 text-sm text-gray-400">{client.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
