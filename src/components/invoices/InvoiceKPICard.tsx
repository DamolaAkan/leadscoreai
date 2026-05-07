"use client";

interface InvoiceKPICardProps {
  label: string;
  value: string;
  subtext?: string;
}

export default function InvoiceKPICard({ label, value, subtext }: InvoiceKPICardProps) {
  return (
    <div className="bg-white border border-black/[0.08] rounded-2xl p-5 border-l-4 border-l-[#7C3AED] shadow-sm">
      <p className="text-xs text-black/50 uppercase font-medium tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[#111827] mt-1">{value}</p>
      {subtext && <p className="text-xs text-black/50 mt-1">{subtext}</p>}
    </div>
  );
}
