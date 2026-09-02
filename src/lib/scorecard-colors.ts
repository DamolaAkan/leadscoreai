// Deterministic scorecard badge colors drawn from the LeadScoreAI logo palette
// (the four ascending bars: red, blue, amber, green — plus purple/teal to widen
// the cycle). Two flagship scorecards get fixed hues; every other scorecard is
// assigned a stable color by hashing its slug, so the same scorecard always
// reads the same across reloads.
//
// Badges use the 15%-tint pattern: a ~14% alpha tint of the hue as background
// with AA-dark text of the same hue. `solid` is the full-strength hue for
// legends / dots / chart fills.

export interface BadgeColor {
  /** ~14% alpha tint — badge background */
  bg: string;
  /** AA-dark text of the same hue */
  text: string;
  /** full-strength hue — dots, legends, chart fills */
  solid: string;
}

const HUES: Record<string, BadgeColor> = {
  amber: { solid: "#d99409", bg: "rgba(217,148,9,0.14)", text: "#92510a" },
  green: { solid: "#16a34a", bg: "rgba(22,163,74,0.14)", text: "#166534" },
  blue: { solid: "#2563eb", bg: "rgba(37,99,235,0.14)", text: "#1e40af" },
  red: { solid: "#dc2626", bg: "rgba(220,38,38,0.14)", text: "#991b1b" },
  purple: { solid: "#6d28d9", bg: "rgba(109,40,217,0.14)", text: "#5b21b6" },
  teal: { solid: "#0e9384", bg: "rgba(14,147,132,0.14)", text: "#0b7568" },
};

// Slugs that aren't the two flagship scorecards cycle through these four.
const CYCLE = ["blue", "red", "purple", "teal"] as const;

// Stable string hash (deterministic across reloads / servers).
function hashSlug(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function scorecardColor(slug: string | null | undefined): BadgeColor {
  const s = (slug || "").toLowerCase();
  if (!s) return HUES.purple;
  if (s.includes("solar")) return HUES.amber;
  if (s.includes("mortgage")) return HUES.green;
  return HUES[CYCLE[hashSlug(s) % CYCLE.length]];
}
