import { scorecardColor } from "@/lib/scorecard-colors";

interface ScorecardBadgeProps {
  name: string | null | undefined;
  slug: string | null | undefined;
}

// Color-coded scorecard (quiz) badge — stable hue per slug from the LeadScoreAI
// logo palette, 15%-tint background with a leading solid dot.
export default function ScorecardBadge({ name, slug }: ScorecardBadgeProps) {
  if (!name) {
    return <span style={{ color: "#98a2b3" }}>—</span>;
  }
  const c = scorecardColor(slug);
  // Drop generic suffixes so "Mortgage Fit Assessment" reads "Mortgage Fit".
  const label = name.replace(/\s+(Assessment|Scorecard|Check|Quiz)$/i, "");
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-md max-w-[200px]"
      style={{ backgroundColor: c.bg, color: c.text }}
      title={name}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: c.solid }}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
