import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";
import { loadDnc } from "@/lib/outbound-server";
import { ContactRow, EXPORT_HEADERS, SEGMENTS, STAGES, Stage, isSuppressed, splitName, toCsv } from "@/lib/outbound";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS = 20000;

// POST /api/internal-outbound/export  { niche, country, segment, stage, ids? }
// Staff only. CSV of the filtered list (or the picked contacts) for an external
// sending tool. Reads only outbound_exportable_contacts (which already drops
// do-not-contact, no-email, invalid-email and "not a fit" rows), then checks the
// do-not-contact list again here before writing a row. This route sends nothing.
export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const niche = str(body.niche);
  const country = str(body.country);
  const segment = str(body.segment);
  const stage = str(body.stage);
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.filter((x: unknown): x is string => typeof x === "string").slice(0, 500)
    : [];

  let dnc;
  try {
    dnc = await loadDnc();
  } catch {
    return NextResponse.json({ error: "Could not read the do-not-contact list, so nothing was exported." }, { status: 500 });
  }

  const supabase = createServiceClient();
  const filtered = () => {
    let query = supabase.from("outbound_exportable_contacts").select("*").order("company_name").order("id");
    if (niche) query = query.eq("niche", niche);
    if (country) query = query.eq("country", country);
    if (SEGMENTS.includes(segment as never)) query = query.eq("segment", segment);
    if (STAGES.includes(stage as Stage)) query = query.eq("stage", stage);
    return query;
  };

  const rows: ContactRow[] = [];
  if (ids.length) {
    // Picked rows: small id chunks keep the request URL short.
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await filtered().in("id", ids.slice(i, i + 100));
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      rows.push(...((data || []) as ContactRow[]));
    }
  } else {
    for (let from = 0; from < MAX_ROWS; from += 1000) {
      const { data, error } = await filtered().range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      rows.push(...((data || []) as ContactRow[]));
      if (!data || data.length < 1000) break;
    }
  }

  const safe = rows.filter((r) => !r.suppressed && r.email && !isSuppressed(dnc, r.domain, r.email, r.company_name));
  const csv = toCsv(
    EXPORT_HEADERS,
    safe.map((r) => {
      const [first, last] = splitName(r.full_name);
      return [
        r.email, first, last, r.full_name, r.title, r.company_name, r.domain, r.country, r.niche,
        r.segment, r.linkedin_url, r.email_status, r.first_line, r.stage, r.id,
      ];
    })
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="outbound-${stamp}.csv"`,
      "Cache-Control": "no-store",
      "X-Row-Count": String(safe.length),
    },
  });
}
