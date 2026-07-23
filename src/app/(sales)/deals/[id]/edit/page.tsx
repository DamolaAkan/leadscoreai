"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { slGet } from "@/lib/sl-client";
import { SlDeal } from "@/lib/sl-types";
import DealForm from "@/components/sales/DealForm";

export default function EditDealPage() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<SlDeal | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    slGet<{ deal: SlDeal }>(`/api/deals/${id}`)
      .then((d) => setDeal(d.deal))
      .catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (!deal) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/deals/${id}`} className="text-sm text-[#64748b] hover:text-[#1e293b]">
          ← Back to deal
        </Link>
        <h1 className="text-2xl font-bold text-[#111827] mt-2">Edit Deal</h1>
      </div>
      <DealForm deal={deal} />
    </div>
  );
}
