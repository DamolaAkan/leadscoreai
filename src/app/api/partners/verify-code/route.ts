import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeWhatsApp, waLink } from "@/lib/builder-server";
import { FOUNDER_ALERTS, lagosNow, sendTeamAlert } from "@/lib/builder-emails";
import { createPartnerSession, newRefCode, partnerCodeKey } from "@/lib/partners";

export const dynamic = "force-dynamic";

// Checks the emailed code. New partners are created here (with their details
// from the sign-up form) and everyone gets a dashboard session.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const norm = String(body.email || "").trim().toLowerCase();
  const { allowed } = await checkRateLimit(request, "partner_verify", 20);
  if (!allowed) return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("builder_codes")
    .select("id, code_hash, expires_at")
    .eq("email", partnerCodeKey(norm))
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: "That code expired. Request a new one." }, { status: 401 });
  }
  if (!(await bcrypt.compare(String(body.code || "").trim(), row.code_hash))) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }
  await supabase.from("builder_codes").update({ used: true }).eq("id", row.id);

  let { data: partner } = await supabase.from("partners").select("id, status").eq("email", norm).maybeSingle();
  if (partner?.status === "disabled") {
    return NextResponse.json({ error: "This partner account is paused. Contact us on WhatsApp." }, { status: 403 });
  }

  if (!partner) {
    const name = String(body.full_name || "").trim().slice(0, 80);
    const country = String(body.country || "");
    if (name.length < 2 || !/^[A-Z]{2}$/.test(country) || (country !== "NG" && body.confirmed_ngn !== true)) {
      return NextResponse.json({ error: "Please fill in the sign-up form again." }, { status: 400 });
    }
    const whatsapp = normalizeWhatsApp(String(body.whatsapp || "")) || String(body.whatsapp || "").trim();
    for (let i = 0; i < 5 && !partner; i++) {
      const { data, error } = await supabase
        .from("partners")
        .insert({
          ref_code: newRefCode(name),
          full_name: name,
          email: norm,
          whatsapp,
          country,
          confirmed_ngn_payouts: country === "NG" || body.confirmed_ngn === true,
        })
        .select("id, status, ref_code")
        .single();
      if (data) {
        partner = data;
        await sendTeamAlert(`🤝 New partner: ${name}`, [
          ["Name", name],
          ["Email", norm],
          ["WhatsApp", whatsapp ? waLink(whatsapp) : ""],
          ["Country", country],
          ["Referral link", `https://app.leadscoreai.com/?ref=${data.ref_code}`],
          ["When", lagosNow()],
        ], FOUNDER_ALERTS);
      } else if (error?.code !== "23505") {
        console.error("[partners/verify-code] create error:", error?.message);
        return NextResponse.json({ error: "Could not create your partner account. Try again." }, { status: 500 });
      }
    }
    if (!partner) return NextResponse.json({ error: "Could not create your partner account. Try again." }, { status: 500 });
  }

  return NextResponse.json({ session_id: await createPartnerSession(partner.id) });
}
