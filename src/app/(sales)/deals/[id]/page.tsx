"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { slGet, slSend } from "@/lib/sl-client";
import { SlDeal, SlCommission, STAGE_ORDER, STAGE_META, USD_COMMISSION_RATE_CAP } from "@/lib/sl-types";
import { formatMoney, formatNaira, formatDate } from "@/lib/sl-format";
import { StageBadge, StatusBadge } from "@/components/sales/Badges";

interface DealNote {
  id: string;
  body: string;
  created_at: string;
  author?: { id: string; full_name: string } | null;
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deal, setDeal] = useState<SlDeal | null>(null);
  const [commission, setCommission] = useState<SlCommission | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ action: string; title: string; message: string; cta: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await slGet<{ deal: SlDeal; commission: SlCommission | null }>(`/api/deals/${id}`);
      setDeal(d.deal);
      setCommission(d.commission);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function advance(action: string, lost_reason?: string) {
    setBusy(true);
    try {
      await slSend(`/api/deals/${id}/stage`, "POST", { action, lost_reason });
      await load();
      setLostOpen(false);
      setConfirm(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
    setBusy(false);
  }

  async function del() {
    setBusy(true);
    try {
      await slSend(`/api/deals/${id}`, "DELETE");
      router.push("/deals");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete");
      setConfirm(null);
      setBusy(false);
    }
  }

  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (!deal) return <div className="text-gray-400 text-sm">Loading...</div>;

  const stampFor: Record<string, string | null> = {
    prospecting: deal.created_at,
    contact_added: deal.interested_at || deal.created_at,
    meeting_booked: deal.meeting_booked_at,
    proposal_sent: deal.proposal_sent_at,
    paid: deal.paid_at,
  };
  const currentIdx = STAGE_ORDER.indexOf(deal.stage as (typeof STAGE_ORDER)[number]);
  const isLost = deal.stage === "lost";
  const isPaid = deal.stage === "paid";
  const eligible = deal.product?.is_commission_eligible;
  const canGoBack =
    deal.stage === "contact_added" ||
    deal.stage === "meeting_booked" ||
    deal.stage === "proposal_sent";
  // The single "next" step in the funnel (undefined at the end, or when next is Paid,
  // which needs the payment modal rather than a one-click advance).
  const nextStage = STAGE_ORDER[currentIdx + 1];
  const nextAdvance = nextStage ? NEXT_ACTION[nextStage] : undefined;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/deals" className="text-sm text-[#64748b] hover:text-[#1e293b]">
          ← Back to deals
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">{deal.contact_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{deal.company_name || "No company"}</p>
          </div>
          <div className="flex items-center gap-2">
            <StageBadge stage={deal.stage} />
            {!isPaid && (
              <Link
                href={`/deals/${id}/edit`}
                className="text-sm font-medium px-3 py-1.5 rounded-md border border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc]"
              >
                Edit
              </Link>
            )}
            <button
              onClick={() =>
                setConfirm({
                  action: "delete",
                  title: "Delete this deal?",
                  message: `This removes "${deal.contact_name}" from the pipeline. You can only undo this from the database.`,
                  cta: "Delete deal",
                })
              }
              className="text-sm font-medium px-3 py-1.5 rounded-md border border-[#fecaca] text-[#dc2626] hover:bg-[#fef2f2]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <h2 className="text-sm font-semibold text-[#1e293b] mb-4">Pipeline</h2>
        {isLost ? (
          <div className="rounded-md bg-[#f3f4f6] p-4 text-sm text-[#6b7280] flex items-center justify-between gap-3 flex-wrap">
            <span>
              Marked lost on {formatDate(deal.lost_at)}
              {deal.lost_reason ? ` — ${deal.lost_reason}` : ""}.
            </span>
            <button
              onClick={() =>
                setConfirm({
                  action: "back",
                  title: "Reopen this deal?",
                  message: "This moves the deal back to Contact Added so you can work it again.",
                  cta: "Reopen deal",
                })
              }
              className="text-sm font-medium px-3 py-1.5 rounded-md border border-[#e2e8f0] text-[#475569] hover:bg-white"
            >
              Reopen deal
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start">
              {STAGE_ORDER.map((s, i) => {
                const filled = i <= currentIdx;
                const current = i === currentIdx;
                const isNext = i === currentIdx + 1 && !!NEXT_ACTION[s];
                return (
                  <div key={s} className="flex-1 flex items-start last:flex-none min-w-0">
                    <div
                      className={`flex flex-col items-center text-center ${isNext ? "cursor-pointer" : ""}`}
                      onClick={isNext && !busy ? () => setConfirm(NEXT_ACTION[s]) : undefined}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition"
                        style={
                          filled
                            ? {
                                backgroundColor: STAGE_META[s].bg,
                                color: STAGE_META[s].text,
                                boxShadow: current ? "0 0 0 3px #ede9fe" : "none",
                                border: current ? "2px solid #7C3AED" : "2px solid transparent",
                              }
                            : isNext
                            ? { backgroundColor: "#fff", color: "#7C3AED", border: "2px dashed #7C3AED" }
                            : { backgroundColor: "#f1f5f9", color: "#cbd5e1", border: "2px solid transparent" }
                        }
                      >
                        {filled ? "✓" : isNext ? "→" : i + 1}
                      </div>
                      <span
                        className="text-[11px] mt-1.5 w-20"
                        style={{ color: isNext ? "#7C3AED" : "#475569", fontWeight: isNext ? 600 : 400 }}
                      >
                        {STAGE_META[s].label}
                      </span>
                      <span className="text-[10px] mt-0.5" style={{ color: isNext ? "#7C3AED" : "#94a3b8" }}>
                        {isNext ? "click to advance" : stampFor[s] ? formatDate(stampFor[s]) : ""}
                      </span>
                    </div>
                    {i < STAGE_ORDER.length - 1 && (
                      <div className="flex-1 h-0.5 mx-1 mt-4" style={{ backgroundColor: i < currentIdx ? "#a78bfa" : "#e2e8f0" }} />
                    )}
                  </div>
                );
              })}
            </div>

            {!isPaid && (
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[#f1f5f9] flex-wrap">
                <span className="text-xs text-[#94a3b8]">
                  {nextAdvance ? (
                    <>
                      Click <span className="font-semibold text-[#64748b]">{STAGE_META[nextStage].label}</span> above to advance.
                    </>
                  ) : (
                    "Final step — mark it paid when payment lands."
                  )}
                </span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button onClick={() => setPayOpen(true)} disabled={busy} className={miniPay}>
                    Mark as Paid
                  </button>
                  <button onClick={() => setLostOpen(true)} disabled={busy} className={miniGhost}>
                    Mark as Lost
                  </button>
                  {canGoBack && (
                    <button
                      onClick={() =>
                        setConfirm({
                          action: "back",
                          title: "Move back a stage?",
                          message: "This steps the deal back one stage and clears that stage's date.",
                          cta: "Move back",
                        })
                      }
                      disabled={busy}
                      className={miniGhost}
                    >
                      ← Back
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Money + commission */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748b] mb-3">Deal value</h3>
          <div className="space-y-2 text-sm">
            <Row
              label="Setup fee"
              value={deal.setup_fee > 0 ? formatMoney(deal.setup_fee, deal.currency) : "Not set yet"}
            />
            <Row label="Currency" value={deal.currency} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748b] mb-3">Commission</h3>
          {commission ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">Status</span>
                <StatusBadge status={commission.status} />
              </div>
              {commission.cbn_rate && <Row label="CBN rate" value={`₦${Number(commission.cbn_rate).toLocaleString()}/$`} />}
              <Row label="Naira base" value={formatNaira(commission.setup_fee_naira)} />
              <Row label="Rate" value={`${(commission.commission_rate * 100).toFixed(1)}%`} />
              <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9]">
                <span className="font-medium text-[#1e293b]">Commission</span>
                <span className="font-semibold tabular-nums text-[#1e293b]">{formatNaira(commission.commission_naira)}</span>
              </div>
            </div>
          ) : isPaid ? (
            <p className="text-sm text-[#64748b]">This product does not earn commission.</p>
          ) : (
            <p className="text-sm text-[#94a3b8]">
              {eligible
                ? `Earns ${((deal.product?.commission_rate || 0) * 100).toFixed(1)}% of the setup fee once paid.`
                : "This product does not earn commission."}
            </p>
          )}
        </div>
      </div>

      {/* Contact + description */}
      <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-2 text-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748b] mb-2">Contact</h3>
        <Row label="Email" value={deal.contact_email || "—"} />
        <Row label="Phone" value={deal.contact_phone || "—"} />
        {deal.owner && <Row label="Rep" value={deal.owner.full_name} />}
        {deal.notes && (
          <div className="pt-2 border-t border-[#f1f5f9]">
            <span className="text-[#64748b]">Description</span>
            <p className="text-[#475569] mt-1 whitespace-pre-wrap">{deal.notes}</p>
          </div>
        )}
      </div>

      {/* Notes thread */}
      <NotesThread dealId={id} />

      {payOpen && (
        <MarkPaidDialog
          deal={deal}
          onClose={() => setPayOpen(false)}
          onDone={async () => {
            setPayOpen(false);
            await load();
          }}
        />
      )}

      {lostOpen && <LostDialog busy={busy} onCancel={() => setLostOpen(false)} onConfirm={(r) => advance("lost", r)} />}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          cta={confirm.cta}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => (confirm.action === "delete" ? del() : advance(confirm.action))}
        />
      )}
    </div>
  );
}

const btnPrimary = "text-sm font-medium px-4 py-2 rounded-md text-white bg-[#7C3AED] hover:bg-[#6d28d9] disabled:opacity-50";
const btnPay = "text-sm font-medium px-4 py-2 rounded-md text-white bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-50";
const miniPay = "text-xs font-semibold px-3 py-1.5 rounded-md text-[#0d9488] bg-[#f0fdfa] hover:bg-[#ccfbf1] border border-[#99f6e4] disabled:opacity-50";
const miniGhost = "text-xs font-semibold px-3 py-1.5 rounded-md text-[#64748b] bg-white hover:bg-[#f8fafc] border border-[#e2e8f0] disabled:opacity-50";

// The one-click "next step" advance for each target stage in the funnel. Paid is
// deliberately absent — it needs the payment modal, not a plain advance.
const NEXT_ACTION: Record<string, { action: string; title: string; message: string; cta: string }> = {
  contact_added: {
    action: "interested",
    title: "Mark as interested?",
    message: "Moves the deal from Prospecting to Interested and stamps today's date.",
    cta: "Yes, interested",
  },
  meeting_booked: {
    action: "meeting_booked",
    title: "Mark meeting booked?",
    message: "Moves the deal to Meeting Booked and stamps today's date.",
    cta: "Yes, meeting booked",
  },
  proposal_sent: {
    action: "proposal_sent",
    title: "Mark proposal sent?",
    message: "Moves the deal to Proposal Sent and stamps today's date.",
    cta: "Yes, proposal sent",
  },
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#64748b]">{label}</span>
      <span className="text-[#1e293b] tabular-nums">{value}</span>
    </div>
  );
}

function NotesThread({ dealId }: { dealId: string }) {
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await slGet<{ notes: DealNote[] }>(`/api/deals/${dealId}/notes`);
      setNotes(d.notes);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      await slSend(`/api/deals/${dealId}/notes`, "POST", { body: text });
      setBody("");
      await load();
    } catch {
      /* ignore */
    }
    setBusy(false);
  }

  return (
    <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748b] mb-3">Notes</h3>

      <div className="space-y-3 mb-4">
        {loaded && notes.length === 0 && (
          <p className="text-sm text-[#94a3b8]">No notes yet. Add the first one below.</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="rounded-md bg-[#f8fafc] p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-[#475569]">{n.author?.full_name || "Staff"}</span>
              <span className="text-[11px] text-[#94a3b8]">
                {new Date(n.created_at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm text-[#1e293b] whitespace-pre-wrap">{n.body}</p>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add a note..."
          className="flex-1 border border-[#cbd5e1] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") add();
          }}
        />
        <button
          onClick={add}
          disabled={busy || !body.trim()}
          className="text-sm font-medium px-4 py-2 rounded-md text-white bg-[#7C3AED] hover:bg-[#6d28d9] disabled:opacity-50 shrink-0"
        >
          {busy ? "Adding..." : "Add note"}
        </button>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  cta,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  cta: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Overlay onClose={onCancel}>
      <h3 className="text-lg font-bold text-[#111827]">{title}</h3>
      <p className="text-sm text-[#64748b] mt-1">{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onCancel} className="text-sm font-medium px-4 py-2 text-[#64748b] hover:text-[#1e293b]">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={busy} className={btnPrimary}>
          {busy ? "Working..." : cta}
        </button>
      </div>
    </Overlay>
  );
}

function MarkPaidDialog({ deal, onClose, onDone }: { deal: SlDeal; onClose: () => void; onDone: () => void }) {
  const [cbn, setCbn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isUsd = deal.currency === "USD";
  const eligible = deal.product?.is_commission_eligible;
  const rate = deal.product?.commission_rate || 0;

  const enteredRate = Number(cbn) || 0;
  const effectiveRate = isUsd ? Math.min(enteredRate, USD_COMMISSION_RATE_CAP) : 1;
  const capped = isUsd && enteredRate > USD_COMMISSION_RATE_CAP;
  const naira = isUsd ? effectiveRate * deal.setup_fee : deal.setup_fee;
  const commission = eligible ? naira * rate : 0;

  async function confirm() {
    setError("");
    if (isUsd && !(Number(cbn) > 0)) return setError("Enter the CBN rate to continue");
    setBusy(true);
    try {
      await slSend(`/api/deals/${deal.id}/pay`, "POST", { cbn_rate: isUsd ? Number(cbn) : null });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-lg font-bold text-[#111827]">Mark as Paid</h3>
      <p className="text-sm text-[#64748b] mt-1">Confirm this deal has been paid.</p>

      {isUsd && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-[#64748b] mb-1">CBN rate (₦ per $1)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={cbn}
            onChange={(e) => setCbn(e.target.value)}
            className="w-full border border-[#cbd5e1] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
            placeholder="e.g. 1650"
          />
          <p className="text-[11px] text-[#94a3b8] mt-1.5">
            The CBN official rate on the date the payment cleared. This is frozen permanently once saved.
            Commission is converted at a maximum of ₦{USD_COMMISSION_RATE_CAP.toLocaleString()}/$.
          </p>
        </div>
      )}

      <div className="mt-4 rounded-md bg-[#f8fafc] p-4 text-sm space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[#64748b]">Setup fee</span>
          <span className="tabular-nums text-[#1e293b]">{formatMoney(deal.setup_fee, deal.currency)}</span>
        </div>
        {isUsd && (
          <div className="flex justify-between">
            <span className="text-[#64748b]">
              Naira base{capped ? ` (capped at ₦${USD_COMMISSION_RATE_CAP.toLocaleString()}/$)` : ""}
            </span>
            <span className="tabular-nums text-[#1e293b]">{formatNaira(naira)}</span>
          </div>
        )}
        {eligible ? (
          <div className="flex justify-between pt-1.5 border-t border-[#e2e8f0]">
            <span className="font-medium text-[#1e293b]">Commission ({(rate * 100).toFixed(1)}%)</span>
            <span className="font-semibold tabular-nums text-[#0d9488]">{formatNaira(commission)}</span>
          </div>
        ) : (
          <p className="text-[#64748b] pt-1.5 border-t border-[#e2e8f0]">This product does not earn commission.</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="text-sm font-medium px-4 py-2 text-[#64748b] hover:text-[#1e293b]">
          Cancel
        </button>
        <button onClick={confirm} disabled={busy} className={btnPay}>
          {busy ? "Saving..." : "Confirm paid"}
        </button>
      </div>
    </Overlay>
  );
}

function LostDialog({ busy, onCancel, onConfirm }: { busy: boolean; onCancel: () => void; onConfirm: (r: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Overlay onClose={onCancel}>
      <h3 className="text-lg font-bold text-[#111827]">Mark as Lost</h3>
      <p className="text-sm text-[#64748b] mt-1">Add a short reason so we can learn from it.</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Reason (optional)"
        className="w-full mt-4 border border-[#cbd5e1] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
      />
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onCancel} className="text-sm font-medium px-4 py-2 text-[#64748b] hover:text-[#1e293b]">
          Cancel
        </button>
        <button onClick={() => onConfirm(reason)} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-md text-white bg-[#6b7280] hover:bg-[#4b5563] disabled:opacity-50">
          {busy ? "Saving..." : "Confirm lost"}
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md">{children}</div>
    </div>
  );
}
