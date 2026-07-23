"use client";

import Link from "next/link";
import DealForm from "@/components/sales/DealForm";

export default function NewDealPage() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/deals" className="text-sm text-[#64748b] hover:text-[#1e293b]">
          ← Back to deals
        </Link>
        <h1 className="text-2xl font-bold text-[#111827] mt-2">Add Deal</h1>
      </div>
      <DealForm />
    </div>
  );
}
