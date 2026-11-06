import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";
import { isClaudeConfigured } from "@/lib/claude";
import { loadDnc, readWebsite, writeFirstLine } from "@/lib/outbound-server";
import { Segment, breaksWordingRules, clean, isSuppressed } from "@/lib/outbound";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/internal-outbound/first-line  { company_id }
// Staff only. Reads the company's public website, asks Claude for one opening
// line about what they finance and where, saves it on the company, and moves that
// company's "new" contacts to "researched". Nothing is sent.
//
// PATCH /api/internal-outbound/first-line  { company_id, first_line }
// Staff edit of the company's first line.
export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isClaudeConfigured()) return NextResponse.json({ error: "Claude is not configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const companyId = typeof body.company_id === "string" ? body.company_id : "";
  if (!companyId) return NextResponse.json({ error: "No company picked" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: company, error } = await supabase
    .from("outbound_companies")
    .select("id, name, domain, country, niche, segment")
    .eq("id", companyId)
    .single();
  if (error || !company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  let dnc;
  try {
    dnc = await loadDnc();
  } catch {
    return NextResponse.json({ error: "Could not read the do-not-contact list" }, { status: 500 });
  }
  if (isSuppressed(dnc, company.domain, null, company.name)) {
    return NextResponse.json({ error: "This company is on the do-not-contact list" }, { status: 403 });
  }
  if (!company.domain) return NextResponse.json({ error: "No website on file for this company" }, { status: 400 });

  let siteText: string;
  try {
    siteText = await readWebsite(company.domain);
  } catch (e) {
    return NextResponse.json(
      { error: `Could not read ${company.domain}: ${e instanceof Error ? e.message : "unknown error"}` },
      { status: 502 }
    );
  }
  if (siteText.replace(/\s+/g, "").length < 150) {
    return NextResponse.json(
      { error: `${company.domain} has too little readable text (it may be built in JavaScript). Write this one by hand.` },
      { status: 422 }
    );
  }

  try {
    const out = await writeFirstLine({
      companyName: company.name,
      domain: company.domain,
      country: company.country,
      niche: company.niche,
      segment: company.segment as Segment,
      siteText,
    });
    const now = new Date().toISOString();
    const summary = [out.finances, out.where].filter(Boolean).join(" | ") + (out.confident ? "" : " (unsure)");
    await supabase
      .from("outbound_companies")
      .update({ first_line: out.first_line, website_summary: summary, researched_at: now, updated_at: now })
      .eq("id", company.id);
    await supabase
      .from("outbound_contacts")
      .update({ stage: "researched", updated_at: now })
      .eq("company_id", company.id)
      .eq("stage", "new");
    return NextResponse.json({ ...out, summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Claude could not write this one" }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const companyId = typeof body.company_id === "string" ? body.company_id : "";
  if (!companyId) return NextResponse.json({ error: "No company picked" }, { status: 400 });
  const line = clean(body.first_line, 400);
  if (line && breaksWordingRules(line)) {
    return NextResponse.json(
      { error: "That line mentions scoring mechanics or the word quiz. Call it the Buyer Scorecard and leave the recipe out." },
      { status: 400 }
    );
  }
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("outbound_companies")
    .update({ first_line: line, updated_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
