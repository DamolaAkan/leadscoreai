import {
  QUALIFICATION_COLORS,
  QUALIFICATION_LABELS,
} from "@/lib/dashboard-types";

interface QualificationBadgeProps {
  qualification: string | null;
}

export default function QualificationBadge({
  qualification,
}: QualificationBadgeProps) {
  if (!qualification) {
    return (
      <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
        Incomplete
      </span>
    );
  }

  const color = QUALIFICATION_COLORS[qualification] || "#6b7280";
  const label = QUALIFICATION_LABELS[qualification] || qualification;

  return (
    <span
      className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
