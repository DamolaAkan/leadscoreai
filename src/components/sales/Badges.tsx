import { STAGE_META, COMMISSION_STATUS_META, SlStage, SlCommissionStatus } from "@/lib/sl-types";

export function StageBadge({ stage }: { stage: SlStage }) {
  const m = STAGE_META[stage];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: m.bg, color: m.text }}
    >
      {m.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: SlCommissionStatus }) {
  const m = COMMISSION_STATUS_META[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: m.bg, color: m.text }}
    >
      {m.label}
    </span>
  );
}
