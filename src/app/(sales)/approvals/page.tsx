"use client";

import { useEffect, useState, useCallback } from "react";
import { slGet, slSend } from "@/lib/sl-client";
import { SlCommission } from "@/lib/sl-types";
import { formatNaira, formatMoney, formatDate } from "@/lib/sl-format";

interface Meta {
  me: { id: string; canManage: boolean };
}

export default function ApprovalsPage() {
  const [rows, setRows] = useState<SlCommission[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [voidFor, setVoidFor] = useState<SlCommission | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const d = await slGet<{ commissions: SlCommission[] }>("/api/commissions?status=pending");
    setRows(d.commissions);
  }, []);

  useEffect(() => {
    slGet<Meta>("/api/deals/meta")
      .then((m) => {
        setMeId(m.me.id);
        setAllowed(m.me.canManage);
        if (m.me.canManage) load();
      })
      .catch(() => setAllowed(false));
  }, [load]);

  async function approve(id: string) {
    setBusy(id);
    setError("");
    try {
      await slSend(`/api/commissions/${id}/approve`, "POST");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
    setBusy(null);
  }

  async function doVoid(id: string, reason: string) {
    setBusy(id);
    setError("");
    try {
      await slSend(`/api/commissions/${id}/void`, "POST", { reason });
      setVoidFor(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
    setBusy(null);
  }

  if (allowed === false) {
    return <div className="text-sm text-[#64748b]">You do not have access to approvals.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Approvals</h1>
        <p className="text-sm text-gray-500 mt-1">{rows.length} commission{rows.length === 1 ? "" : "s"} awaiting approval.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-3">
        {rows.map((c) => {
          const isOwn = c.owner_id === meId;
          return (
            <div key={c.id} className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-[#1e293b]">{c.deal?.contact_name || "—"}</p>
                  <p className="text-sm text-[#64748b]">
                    {c.deal?.company_name || "No company"} · Rep: {c.owner?.full_name} · {formatDate(c.created_at)}
                  </p>
                  <div className="mt-3 text-sm text-[#475569] flex flex-wrap gap-x-6 gap-y-1">
                    <span>Setup: <span className="tabular-nums">{formatMoney(c.setup_fee_original, c.currency)}</span></span>
                    {c.cbn_rate && <span>CBN: <span className="tabular-nums">{Number(c.cbn_rate).toLocaleString()}</span></span>}
                    <span>Base: <span className="tabular-nums">{formatNaira(c.setup_fee_naira)}</span></span>
                    <span>Rate: {(c.commission_rate * 100).toFixed(1)}%</span>
                    <span className="font-medium text-[#1e293b]">Commission: <span className="tabular-nums">{formatNaira(c.commission_naira)}</span></span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(c.id)}
                      disabled={isOwn || busy === c.id}
                      title={isOwn ? "You cannot approve your own commission" : ""}
                      className="text-sm font-medium px-4 py-2 rounded-md text-white bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setVoidFor(c)}
                      disabled={busy === c.id}
                      className="text-sm font-medium px-4 py-2 rounded-md border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] disabled:opacity-50"
                    >
                      Void
                    </button>
                  </div>
                  {isOwn && <p className="text-[11px] text-[#94a3b8]">You cannot approve your own commission.</p>}
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && allowed && (
          <div className="bg-white rounded-lg p-10 text-center text-gray-400 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            Nothing pending. All caught up.
          </div>
        )}
      </div>

      {voidFor && (
        <VoidDialog
          commission={voidFor}
          busy={busy === voidFor.id}
          onCancel={() => setVoidFor(null)}
          onConfirm={(r) => doVoid(voidFor.id, r)}
        />
      )}
    </div>
  );
}

function VoidDialog({
  commission,
  busy,
  onCancel,
  onConfirm,
}: {
  commission: SlCommission;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-[#111827]">Void commission</h3>
        <p className="text-sm text-[#64748b] mt-1">
          {formatNaira(commission.commission_naira)} for {commission.deal?.contact_name}. This is for refunds or reversals.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason (required)"
          className="w-full mt-4 border border-[#cbd5e1] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
        />
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="text-sm font-medium px-4 py-2 text-[#64748b] hover:text-[#1e293b]">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={busy || !reason.trim()}
            className="text-sm font-medium px-4 py-2 rounded-md text-white bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50"
          >
            {busy ? "Voiding..." : "Confirm void"}
          </button>
        </div>
      </div>
    </div>
  );
}
