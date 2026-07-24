"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { slGet, slSend, authHeaders } from "@/lib/sl-client";
import { StaffProfile, staffId } from "@/lib/staff-types";

interface Admin {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

const input =
  "w-full border border-[#cbd5e1] rounded-md px-3 py-2 text-sm text-[#1e293b] bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30";
const lbl = "block text-xs font-medium text-[#64748b] mb-1";

function buildVCard(a: { full_name: string; email: string }, p: Partial<StaffProfile>): string {
  const [first, ...rest] = (a.full_name || "").split(" ");
  const last = rest.join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${a.full_name}`,
    "ORG:LeadScoreAI",
    p.title ? `TITLE:${p.title}` : "",
    p.phone_primary ? `TEL;TYPE=CELL:${p.phone_primary}` : "",
    p.phone_secondary ? `TEL;TYPE=CELL:${p.phone_secondary}` : "",
    a.email ? `EMAIL;TYPE=WORK:${a.email}` : "",
    "URL:https://leadscoreai.com",
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}

const Mark = ({ h = 22 }: { h?: number }) => (
  <svg width={h} height={h} viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="0" y="18" width="5" height="10" rx="1.5" fill="#dc2626" />
    <rect x="7.67" y="13" width="5" height="15" rx="1.5" fill="#2563eb" />
    <rect x="15.33" y="8" width="5" height="20" rx="1.5" fill="#d99409" />
    <rect x="23" y="1" width="5" height="27" rx="1.5" fill="#16a34a" />
  </svg>
);

export default function ProfilePage() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [profile, setProfile] = useState<Partial<StaffProfile>>({});
  const [photo, setPhoto] = useState<string | null>(null); // data URL for rendering
  const [qr, setQr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<HTMLDivElement>(null);

  const loadPhoto = useCallback(async (url: string) => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => setPhoto(reader.result as string);
      reader.readAsDataURL(blob);
    } catch {
      setPhoto(url); // fallback to the raw URL
    }
  }, []);

  useEffect(() => {
    slGet<{ profile: StaffProfile | null; admin: Admin }>("/api/profile")
      .then((d) => {
        setAdmin(d.admin);
        if (d.profile) {
          setProfile(d.profile);
          if (d.profile.photo_url) loadPhoto(d.profile.photo_url);
        }
      })
      .catch(() => setError("Could not load your profile."));
  }, [loadPhoto]);

  // Regenerate the vCard QR whenever the contact details change.
  useEffect(() => {
    if (!admin) return;
    QRCode.toDataURL(buildVCard(admin, profile), { margin: 1, width: 480, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => {});
  }, [admin, profile]);

  const set = (k: keyof StaffProfile, v: string) => setProfile((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const d = await slSend<{ profile: StaffProfile }>("/api/profile", "PUT", {
        title: profile.title,
        phone_primary: profile.phone_primary,
        phone_secondary: profile.phone_secondary,
      });
      setProfile((p) => ({ ...p, ...d.profile }));
      setMsg("Profile saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
    setSaving(false);
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl); // instant preview
      try {
        const res = await fetch("/api/profile/photo", {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Upload failed");
        setProfile((p) => ({ ...p, photo_url: d.photo_url }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function download(node: HTMLDivElement | null, name: string) {
    if (!node) return;
    const url = await toPng(node, { pixelRatio: 3, cacheBust: true });
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  if (!admin) return <div className="text-gray-400 text-sm">Loading...</div>;

  const title = profile.title || admin.role.replace("_", " ");
  const idNo = staffId(profile.staff_no);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Your details power your company card and staff ID. Download them any time.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      {msg && <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-4">
          <h2 className="text-sm font-semibold text-[#1e293b]">Your details</h2>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#ede9fe] flex items-center justify-center shrink-0">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-[#6d28d9]">{admin.full_name[0]}</span>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-[#7C3AED] cursor-pointer hover:underline">
                {uploading ? "Uploading..." : "Upload photo"}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} className="hidden" />
              </label>
              <p className="text-xs text-[#94a3b8] mt-0.5">PNG or JPG, up to 5MB. Used on your ID.</p>
            </div>
          </div>

          <div>
            <label className={lbl}>Full name</label>
            <input value={admin.full_name} disabled className={`${input} bg-[#f8fafc] text-[#94a3b8]`} />
          </div>
          <div>
            <label className={lbl}>Job title</label>
            <input value={profile.title || ""} onChange={(e) => set("title", e.target.value)} className={input} placeholder="e.g. Sales Executive" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Phone (primary)</label>
              <input value={profile.phone_primary || ""} onChange={(e) => set("phone_primary", e.target.value)} className={input} placeholder="+234..." />
            </div>
            <div>
              <label className={lbl}>Phone (secondary)</label>
              <input value={profile.phone_secondary || ""} onChange={(e) => set("phone_secondary", e.target.value)} className={input} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className={lbl}>Work email</label>
            <input value={admin.email} disabled className={`${input} bg-[#f8fafc] text-[#94a3b8]`} />
          </div>

          <button onClick={save} disabled={saving} className="text-sm font-medium px-5 py-2.5 rounded-md text-white bg-[#7C3AED] hover:bg-[#6d28d9] disabled:opacity-50">
            {saving ? "Saving..." : "Save details"}
          </button>
        </div>

        {/* Previews */}
        <div className="space-y-6">
          {/* Business card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-[#1e293b]">Company card</h2>
              <button onClick={() => download(cardRef.current, "leadscoreai-card.png")} className="text-sm font-medium text-[#7C3AED] hover:underline">
                Download PNG
              </button>
            </div>
            <div className="flex justify-center">
              <div ref={cardRef} style={{ width: 340, background: "linear-gradient(180deg,#191622,#131019)", borderRadius: 18, padding: 24, color: "#fff", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Mark h={20} />
                  <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>
                    LeadScore<span style={{ color: "#8b5cf6" }}>AI</span>
                  </span>
                </div>
                <p style={{ marginTop: 10, color: "#a5a1b3", fontSize: 11.5 }}>Know which leads convert before you chase them.</p>
                <div style={{ height: 1, background: "rgba(255,255,255,.08)", margin: "16px 0" }} />
                <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{admin.full_name}</h3>
                <div style={{ marginTop: 3, color: "#8b5cf6", fontWeight: 600, fontSize: 12.5, textTransform: "capitalize" }}>{title}, LeadScoreAI</div>
                <div style={{ marginTop: 14, fontSize: 12.5, color: "#e8e6ef", lineHeight: 1.9 }}>
                  {profile.phone_primary && <div>{profile.phone_primary}</div>}
                  {profile.phone_secondary && <div>{profile.phone_secondary}</div>}
                  <div>{admin.email}</div>
                  <div>leadscoreai.com</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 18 }}>
                  <div style={{ background: "#fff", padding: 10, borderRadius: 12, width: 128, height: 128 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {qr && <img src={qr} alt="" style={{ width: "100%", height: "100%", display: "block" }} />}
                  </div>
                  <div style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 9.5, fontWeight: 700, color: "#a5a1b3" }}>Scan to save my contact</div>
                </div>
              </div>
            </div>
          </div>

          {/* ID card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-[#1e293b]">Staff ID</h2>
              <button onClick={() => download(idRef.current, "leadscoreai-id.png")} className="text-sm font-medium text-[#7C3AED] hover:underline">
                Download PNG
              </button>
            </div>
            <div className="flex justify-center">
              <div ref={idRef} style={{ width: 320, background: "#fff", borderRadius: 16, overflow: "hidden", fontFamily: "ui-sans-serif, system-ui, sans-serif", border: "1px solid #e2e8f0" }}>
                <div style={{ background: "linear-gradient(135deg,#6d28d9,#7C3AED)", padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em" }}>LeadScoreAI</span>
                  <span style={{ color: "rgba(255,255,255,.85)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em" }}>STAFF ID</span>
                </div>
                <div style={{ padding: "22px 18px 20px", textAlign: "center" }}>
                  <div style={{ width: 108, height: 108, borderRadius: 14, margin: "0 auto", overflow: "hidden", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #ede9fe" }}>
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 40, fontWeight: 800, color: "#6d28d9" }}>{admin.full_name[0]}</span>
                    )}
                  </div>
                  <h3 style={{ marginTop: 14, fontSize: 19, fontWeight: 800, color: "#111827" }}>{admin.full_name}</h3>
                  <div style={{ marginTop: 2, color: "#7C3AED", fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>{title}</div>
                  <div style={{ marginTop: 14, display: "inline-flex", flexDirection: "column", gap: 4, background: "#f8fafc", borderRadius: 10, padding: "10px 18px" }}>
                    <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Staff ID</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }}>{idNo}</span>
                  </div>
                </div>
                <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "9px 18px", textAlign: "center", color: "#94a3b8", fontSize: 10.5 }}>
                  leadscoreai.com · Valid while employed
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
