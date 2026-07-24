"use client";

import { useEffect, useState, useCallback } from "react";
import { slGet } from "@/lib/sl-client";
import { StaffOnboarding, StaffProfile, staffId } from "@/lib/staff-types";
import { formatDate } from "@/lib/sl-format";

interface TeamRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  onboarding_status: string;
  submitted_at: string | null;
  title: string | null;
  staff_no: number | null;
  photo_url: string | null;
}
interface Detail {
  admin: { full_name: string; email: string; role: string };
  onboarding: StaffOnboarding | null;
  profile: StaffProfile | null;
}

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  submitted: { label: "Submitted", bg: "#ccfbf1", text: "#115e59" },
  draft: { label: "Draft", bg: "#fef9c3", text: "#854d0e" },
  not_started: { label: "Not started", bg: "#f1f5f9", text: "#64748b" },
};

export default function TeamPage() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    slGet<{ team: TeamRow[] }>("/api/team")
      .then((d) => {
        setRows(d.team);
        setAllowed(true);
      })
      .catch(() => setAllowed(false));
  }, []);

  const openDetail = useCallback(async (id: string) => {
    setOpenId(id);
    setDetail(null);
    try {
      setDetail(await slGet<Detail>(`/api/team/${id}`));
    } catch {
      /* ignore */
    }
  }, []);

  if (allowed === false) return <div className="text-sm text-[#64748b]">You do not have access to the team area.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Team</h1>
        <p className="text-sm text-gray-500 mt-1">Everyone on the team and their onboarding documents.</p>
      </div>

      <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
              {["Name", "Staff ID", "Role", "Onboarding", "Submitted", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-medium text-xs uppercase tracking-wide text-[#64748b]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = STATUS_META[r.onboarding_status] || STATUS_META.not_started;
              return (
                <tr key={r.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-[#ede9fe] text-[#6d28d9] text-xs font-bold flex items-center justify-center">
                          {r.full_name?.[0] || "?"}
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-[#1e293b]">{r.full_name}</p>
                        <p className="text-xs text-[#94a3b8]">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[#475569]">{r.staff_no ? staffId(r.staff_no) : "—"}</td>
                  <td className="px-4 py-3 text-[#475569] capitalize">{r.role.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: s.bg, color: s.text }}>
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">{r.submitted_at ? formatDate(r.submitted_at) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openDetail(r.id)} className="text-sm font-medium text-[#7C3AED] hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenId(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl p-6">
            {!detail ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : (
              <DetailView detail={detail} onClose={() => setOpenId(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailView({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const o = detail.onboarding;
  const Row = ({ l, v }: { l: string; v: string | null | undefined }) => (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[#f1f5f9]">
      <span className="text-[#64748b] text-sm">{l}</span>
      <span className="text-[#1e293b] text-sm text-right">{v || "—"}</span>
    </div>
  );
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8] mb-1">{title}</h3>
      {children}
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">{detail.admin.full_name}</h2>
          <p className="text-sm text-[#64748b]">
            {detail.admin.email} · <span className="capitalize">{detail.admin.role.replace("_", " ")}</span>
            {detail.profile?.staff_no ? ` · ${staffId(detail.profile.staff_no)}` : ""}
          </p>
        </div>
        <button onClick={onClose} className="text-[#94a3b8] hover:text-[#1e293b] text-xl leading-none">×</button>
      </div>

      {!o ? (
        <p className="text-sm text-[#94a3b8] mt-6">This person has not started their onboarding yet.</p>
      ) : (
        <>
          <Section title="Personal">
            <Row l="Full name" v={o.full_name} />
            <Row l="Date of birth" v={o.date_of_birth} />
            <Row l="Gender" v={o.gender} />
            <Row l="Phone" v={o.phone} />
            <Row l="Email" v={o.personal_email} />
            <Row l="Address" v={o.address} />
          </Section>
          <Section title="Identity">
            <Row l="ID" v={o.id_type ? `${o.id_type} · ${o.id_number || ""}` : null} />
          </Section>
          <Section title="Bank">
            <Row l="Bank" v={o.bank_name} />
            <Row l="Account number" v={o.account_number} />
            <Row l="Account name" v={o.account_name} />
          </Section>
          <Section title="Next of kin">
            <Row l="Name" v={o.nok_name} />
            <Row l="Relationship" v={o.nok_relationship} />
            <Row l="Phone" v={o.nok_phone} />
            <Row l="Address" v={o.nok_address} />
          </Section>
          <Section title="Guarantor">
            <Row l="Name" v={o.guarantor_name} />
            <Row l="Occupation" v={o.guarantor_occupation} />
            <Row l="Phone" v={o.guarantor_phone} />
            <Row l="Address" v={o.guarantor_address} />
          </Section>
          <Section title="Acknowledgements">
            <Row l="Employment terms" v={o.ack_employment ? "Accepted" : "No"} />
            <Row l="NDA" v={o.ack_nda ? "Accepted" : "No"} />
            <Row l="Code of conduct" v={o.ack_conduct ? "Accepted" : "No"} />
            <Row l="Data privacy" v={o.ack_privacy ? "Accepted" : "No"} />
          </Section>
        </>
      )}
    </div>
  );
}
