import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";
import { STAGES, Stage, breaksWordingRules, clean } from "@/lib/outbound";

export const dynamic = "force-dynamic";

// PATCH /api/internal-outbound/contacts
//   { ids: string[], stage }            move contacts to a stage (up to 500)
//   { id: string, first_line: string }  set or clear one contact's own first line
// Staff only. Changes records only; nothing is ever sent from here.
export async function PATCH(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  if (Array.isArray(body.ids) && body.stage !== undefined) {
    if (!STAGES.includes(body.stage as Stage)) return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
    const ids = body.ids.filter((x: unknown) => typeof x === "string").slice(0, 500);
    if (!ids.length) return NextResponse.json({ error: "No contacts picked" }, { status: 400 });
    let updated = 0;
    // Short chunks: the ids go in the request URL.
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await supabase
        .from("outbound_contacts")
        .update({ stage: body.stage, updated_at: now })
        .in("id", ids.slice(i, i + 100))
        .select("id");
      if (error) return NextResponse.json({ error: error.message, updated }, { status: 500 });
      updated += data?.length || 0;
    }
    return NextResponse.json({ updated });
  }

  if (typeof body.id === "string" && body.first_line !== undefined) {
    const line = clean(body.first_line, 400);
    if (line && breaksWordingRules(line)) {
      return NextResponse.json(
        { error: "That line mentions scoring mechanics or the word quiz. Call it the Buyer Scorecard and leave the recipe out." },
        { status: 400 }
      );
    }
    const { error } = await supabase
      .from("outbound_contacts")
      .update({ first_line: line, updated_at: now })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
}
