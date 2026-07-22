interface KPICardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
}

// Design-system metric card (per mockups): straight-edge white box, subtle
// shadow, no border, no left accent. Uppercase muted label → big value → helper.
export default function KPICard({ label, value, sublabel }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "#94a3b8" }}
      >
        {label}
      </p>
      <p className="text-3xl font-bold mt-2" style={{ color: "#1e293b" }}>
        {value}
      </p>
      {sublabel && (
        <p className="text-xs font-medium mt-2" style={{ color: "#94a3b8" }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}
