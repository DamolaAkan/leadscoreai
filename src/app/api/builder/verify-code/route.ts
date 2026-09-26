import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { generateDashboardSessionId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { EMAIL_RE, escapeLike, uniqueOrgSlug } from "@/lib/builder-server";

export const dynamic = "force-dynamic";

// Quiz builder step 2: verify the code, then sign in to the business that owns
// this email, or create a new one (on the free trial) if there isn't one.
export async function POST(request: Request) {
  const { email, code, businessName } = await request.json().catch(() => ({}));
  const norm = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(norm) || !code) {
    return NextResponse.json({ error: "Enter the code we emailed you." }, { status: 400 });
  }

  const { allowed } = await checkRateLimit(request, "builder_verify", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  }

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("builder_codes")
    .select("id, code_hash, expires_at")
    .eq("email", norm)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: "That code expired. Request a new one." }, { status: 401 });
  }
  const valid = await bcrypt.compare(String(code).trim(), row.code_hash);
  if (!valid) return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  await supabase.from("builder_codes").update({ used: true }).eq("id", row.id);

  // Existing business with this email (including accounts Stella onboarded)?
  let { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .ilike("email", escapeLike(norm))
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!org) {
    const name = String(businessName || "").trim().slice(0, 80) || norm.split("@")[0];
    const slug = await uniqueOrgSlug(name);
    const { data: created, error } = await supabase
      .from("organizations")
      .insert({
        name,
        slug,
        email: norm,
        primary_color: "#7C3AED",
        is_active: true,
        billing_tier: "trial", // trial lock applies (10 real leads or 30 days)
        signup_date: new Date().toISOString(),
        signup_source: "builder",
        self_serve: true,
      })
      .select("id, name, slug")
      .single();
    if (error || !created) {
      console.error("[builder/verify-code] org create error:", error?.message);
      return NextResponse.json({ error: "Could not create your account. Try again." }, { status: 500 });
    }
    org = created;
  }

  const sessionId = generateDashboardSessionId();
  const { error: sessErr } = await supabase.from("org_sessions").insert({
    organization_id: org.id,
    member_id: null,
    username: norm,
    full_name: org.name,
    role: "superadmin",
    session_id: sessionId,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (sessErr) return NextResponse.json({ error: "Could not start session" }, { status: 500 });

  return NextResponse.json({ session_id: sessionId, orgSlug: org.slug, orgName: org.name });
}
