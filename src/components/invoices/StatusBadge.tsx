"use client";

import { getStatusColor } from "@/lib/invoice-utils";


interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const color = getStatusColor(status);

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {status}
    </span>
  );
}
