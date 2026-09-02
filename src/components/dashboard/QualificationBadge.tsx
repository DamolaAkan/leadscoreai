import { QUALIFICATION_BADGE, QUALIFICATION_LABELS } from "@/lib/dashboard-types";

interface QualificationBadgeProps {
  qualification: string | null;
}

// Status badge — 15%-tint fill, AA-dark text, a leading status dot, soft radius.
export default function QualificationBadge({ qualification }: QualificationBadgeProps) {
  if (!qualification) {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium px-2.5 py-1 rounded-md"
        style={{ backgroundColor: "#f2f4f7", color: "#667085" }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#98a2b3" }} />
        Incomplete
      </span>
    );
  }

  const c = QUALIFICATION_BADGE[qualification] || { bg: "#f2f4f7", text: "#667085" };
  const label = QUALIFICATION_LABELS[qualification] || qualification;

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-md"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.text }} />
      {label}
    </span>
  );
}
