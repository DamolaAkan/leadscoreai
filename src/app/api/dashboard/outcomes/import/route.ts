import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { calibrateOrg } from "@/lib/wtp-calibrate";

export const dynamic = "force-dynamic";

interface ImportRow {
  email?: string;
  phone?: string;
  converted?: string | boolean;
}

const MAX_ROWS = 20000;

// POST /api/dashboard/outcomes/import — bulk-mark conversions from a CSV upload.
// One binary outcome, matched to the caller's own leads by email or phone. This
// is how an MFB doing thousands of loans marks who converted without per-lead
// clicking. Conversions are the label that calibrates WTP.
export async function POST(request: Request) {
  const user = await validateSession(getSessionIdFromRequest(request) || "");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  let matched = 0;
  let unmatched = 0;
  let invalid = 0;

  for (const r of rows as ImportRow[]) {
    const email = (r.email || "").trim().toLowerCase();
    const phone = (r.phone || "").replace(/[^0-9+]/g, "");
    if (!email && !phone) {
      invalid++;
      continue;
    }
    // A blank/true "converted" column means converted; "no"/"false"/"0" means not.
    const val = String(r.converted ?? "true").trim().toLowerCase();
    const converted = !["no", "false", "0", "n"].includes(val);

    let query = supabase
      .from("quiz_responses")
      .select("id")
      .eq("organization_id", user.organizationId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1);
    query = email ? query.ilike("contact_email", email) : query.eq("contact_phone", phone);
    const { data: match } = await query.single();

    if (!match) {
      unmatched++;
      continue;
    }
    await supabase
      .from("quiz_responses")
      .update({ converted_to_sale: converted, converted_at: converted ? now : null })
      .eq("id", match.id);
    matched++;
  }

  // New conversions may cross the calibration threshold — best-effort retrain.
  let calibration = null;
  if (matched > 0) {
    try {
      calibration = await calibrateOrg(supabase, user.organizationId);
    } catch (e) {
      console.error("[outcomes/import] calibration error:", e);
    }
  }

  return NextResponse.json({ ok: true, total: rows.length, matched, unmatched, invalid, calibration });
}
