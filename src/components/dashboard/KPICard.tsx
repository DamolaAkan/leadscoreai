interface KPICardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
}

// Metric tile — Snappit design language recolored to LeadScoreAI. Soft cool
// shadow, hairline border, a tinted accent chip up top, an uppercase muted
// label with letter-spacing, and a large tabular-nums figure.
export default function KPICard({
  label,
  value,
  sublabel,
  accent = "#6d28d9",
}: KPICardProps) {
  // ~12% tint of the accent for the top chip.
  const tint = `${accent}1f`;
  return (
    <div className="group relative bg-white rounded-xl p-5 border border-[#eceef2] shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_4px_10px_-2px_rgba(16,24,40,0.09),0_2px_4px_-2px_rgba(16,24,40,0.05)]">
      {/* accent chip */}
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-4"
        style={{ backgroundColor: tint }}
        aria-hidden
      >
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </span>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.06em]"
        style={{ color: "#667085" }}
      >
        {label}
      </p>
      <p
        className="text-[28px] leading-9 font-bold mt-1 tabular-nums"
        style={{ color: "#16202e" }}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-xs font-medium mt-1.5" style={{ color: "#98a2b3" }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}
