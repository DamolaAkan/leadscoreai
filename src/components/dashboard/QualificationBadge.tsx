import { QUALIFICATION_BADGE, QUALIFICATION_LABELS } from "@/lib/dashboard-types";

interface QualificationBadgeProps {
  qualification: string | null;
}

// Design-system status badge: soft tint fill, dark text, straight edges, no border.
export default function QualificationBadge({ qualification }: QualificationBadgeProps) {
  if (!qualification) {
    return (
      <span
        className="inline-block text-xs font-medium px-2.5 py-1 rounded-md"
        style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
      >
        Incomplete
      </span>
    );
  }

  const c = QUALIFICATION_BADGE[qualification] || { bg: "#f3f4f6", text: "#6b7280" };
  const label = QUALIFICATION_LABELS[qualification] || qualification;

  return (
    <span
      className="inline-block whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-md"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {label}
    </span>
  );
}
