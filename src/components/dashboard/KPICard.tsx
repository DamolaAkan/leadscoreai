interface KPICardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
}

export default function KPICard({ label, value, sublabel, accent }: KPICardProps) {
  return (
    <div
      className="bg-white rounded-xl p-5 border-l-4"
      style={{ borderLeftColor: accent || "#6366f1" }}
    >
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </div>
  );
}
