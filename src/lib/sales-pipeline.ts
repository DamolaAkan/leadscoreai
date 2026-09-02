import { createServiceClient } from "@/lib/supabase";

// Pushes qualified scorecard leads into Stella's sales pipeline (sl_deals) the
// moment they complete, so she can work them and give feedback immediately.
// Best-effort everywhere: never throws, never blocks the funnel.
const STELLA_ID = "b5260c85-7c52-4cdb-879d-8056ba5d9e1f"; // stella@leadscoreai.com
const SCORECARD_PRODUCT_ID = "2f4e948b-ca99-4b5f-8491-c2b579cd489c"; // LeadScoreAI Scorecard

const TIER: Record<string, string> = {
  HOT_LEAD: "HOT FIT",
  WARM_LEAD: "Strong fit",
  COLD_LEAD: "Warm fit",
};
// The scored answers that decide the deal (enquiries, become-customers, how-soon,
// ₦130k commit) — their question_order differs by funnel.
const KEY_ORDERS_BY_FUNNEL: Record<string, number[]> = { solar: [1, 2, 7, 8], mortgage: [1, 2, 6, 7] };

export interface PipelineLead {
  funnel: "solar" | "mortgage";
  responseId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  score: number;
  qualification: string;
  answers: { order: number; text: string }[];
}

// Soft "is this a real, ready business?" signals for the rep to eyeball — never
// a gate (qualification is purely score >= 50), just a heads-up in the notes.
function validitySignals(lead: PipelineLead): string[] {
  const flags: string[] = [];
  const a = (o: number) => (lead.answers.find((x) => x.order === o)?.text || "").toLowerCase();
  if (lead.funnel === "solar") {
    if (a(5).includes("nothing yet")) flags.push("no marketing budget");
    if (a(3).includes("mostly supply")) flags.push("supplies, doesn't install");
  }
  if (!lead.website) flags.push("no website/socials");
  return flags;
}

export async function pushLeadToPipeline(lead: PipelineLead): Promise<void> {
  try {
    // The pipeline is for workable deals; disqualified leads stay in the
    // scorecard dashboard only.
    if (lead.qualification === "NOT_QUALIFIED") return;

    const supabase = createServiceClient();
    const email = lead.email.trim().toLowerCase();

    // One open deal per email — the same firm may take both scorecards.
    const { data: existing } = await supabase
      .from("sl_deals")
      .select("id")
      .ilike("contact_email", email)
      .is("deleted_at", null)
      .neq("stage", "lost")
      .limit(1);
    if (existing && existing.length) {
      console.log("[pipeline] open deal already exists for", email, "— skipping");
      return;
    }

    const byOrder = new Map(lead.answers.map((a) => [a.order, a.text]));
    const funnelLabel = lead.funnel === "solar" ? "Solar" : "Mortgage";
    const key = (KEY_ORDERS_BY_FUNNEL[lead.funnel] || []).map((o) => byOrder.get(o)).filter(Boolean).join(" · ");
    const all = lead.answers
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((a) => `Q${a.order}: ${a.text || "—"}`)
      .join("\n");
    const flags = validitySignals(lead);
    const notes = [
      `Inbound · ${funnelLabel} Fit scorecard · ${lead.score}/100 · ${TIER[lead.qualification] || lead.qualification}`,
      flags.length ? `⚠️ Verify before investing time: ${flags.join(", ")}` : "",
      lead.website ? `Website/socials: ${lead.website}` : "",
      key ? `Key answers: ${key}` : "",
      all,
      `Scorecard response: ${lead.responseId}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabase.from("sl_deals").insert({
      owner_id: STELLA_ID,
      product_id: SCORECARD_PRODUCT_ID,
      contact_name: lead.name.trim() || email,
      contact_email: email,
      contact_phone: lead.phone?.trim() || null,
      company_name: lead.company?.trim() || null,
      currency: "NGN",
      setup_fee: 0,
      monthly_amount: 0,
      stage: "prospecting",
      notes,
    });
    if (error) console.error("[pipeline] insert error:", error.message);
  } catch (e) {
    console.error("[pipeline] error:", e);
  }
}

// The lead clicked "Claim my free scorecard" — surface that intent on the deal.
export async function markDealInterested(email: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("sl_deals")
      .update({ interested_at: new Date().toISOString() })
      .ilike("contact_email", email.trim().toLowerCase())
      .is("deleted_at", null)
      .is("interested_at", null);
    if (error) console.error("[pipeline] interested error:", error.message);
  } catch (e) {
    console.error("[pipeline] interested exception:", e);
  }
}
