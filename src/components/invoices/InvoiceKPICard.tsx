"use client";

interface InvoiceKPICardProps {
  label: string;
  value: string;
  subtext?: string;
}

export default function InvoiceKPICard({ label, value, subtext }: InvoiceKPICardProps) {
  return (
    <div className="bg-[#141425] border border-[#2a2a3d] rounded-xl p-5 border-l-4 border-l-[#7C3AED]">
      <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}
