import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";
import { loadDnc } from "@/lib/outbound-server";
import { CompanyRow, SEGMENTS, STAGES, Stage, isSuppressed } from "@/lib/outbound";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

// A search term safe inside a PostgREST or() filter: drop the characters that
// have meaning there (and LIKE wildcards), then quote it.
function orTerm(q: string): string {
  return `"%${q.replace(/["\\%_,()*]/g, " ").trim()}%"`;
}

// GET /api/internal-outbound?view=contacts|companies&niche&country&segment&stage&q&page
// Staff only. Lists contacts (with company fields) or companies, plus filter values.
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const view = url.searchParams.get("view") === "companies" ? "companies" : "contacts";
  const niche = url.searchParams.get("niche") || "";
  const country = url.searchParams.get("country") || "";
  const segment = url.searchParams.get("segment") || "";
  const stage = url.searchParams.get("stage") || "";
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);
  const from = page * PAGE_SIZE;

  const supabase = createServiceClient();

  const [facetsRes, dnc] = await Promise.all([
    supabase.from("outbound_company_facets").select("kind, value, n"),
    loadDnc().catch(() => null),
  ]);
  if (facetsRes.error) {
    return NextResponse.json(
      { error: "Outbound tables are not set up yet. The migration has not been applied.", detail: facetsRes.error.message },
      { status: 500 }
    );
  }
  const facets = {
    niches: (facetsRes.data || []).filter((f) => f.kind === "niche").sort((a, b) => b.n - a.n),
    countries: (facetsRes.data || []).filter((f) => f.kind === "country").sort((a, b) => b.n - a.n),
  };

  if (view === "contacts") {
    let query = supabase
      .from("outbound_contact_rows")
      .select("*", { count: "exact" })
      .order("company_name")
      .order("full_name")
      .range(from, from + PAGE_SIZE - 1);
    if (niche) query = query.eq("niche", niche);
    if (country) query = query.eq("country", country);
    if (SEGMENTS.includes(segment as never)) query = query.eq("segment", segment);
    if (STAGES.includes(stage as Stage)) query = query.eq("stage", stage);
    if (q) {
      const t = orTerm(q);
      query = query.or(`full_name.ilike.${t},email.ilike.${t},company_name.ilike.${t},domain.ilike.${t},title.ilike.${t}`);
    }
    const { data, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ view, rows: data || [], total: count || 0, pageSize: PAGE_SIZE, facets, dnc });
  }

  let query = supabase
    .from("outbound_companies")
    .select("*, outbound_contacts(count)", { count: "exact" })
    .order("name")
    .range(from, from + PAGE_SIZE - 1);
  if (niche) query = query.eq("niche", niche);
  if (country) query = query.eq("country", country);
  if (SEGMENTS.includes(segment as never)) query = query.eq("segment", segment);
  if (q) {
    const t = orTerm(q);
    query = query.or(`name.ilike.${t},domain.ilike.${t}`);
  }
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows: CompanyRow[] = (data || []).map((c: Record<string, unknown>) => {
    const { outbound_contacts, name_key: _nk, ...rest } = c as Record<string, unknown> & {
      outbound_contacts?: { count: number }[];
      name_key?: string;
    };
    void _nk;
    const co = rest as unknown as CompanyRow;
    return {
      ...co,
      contact_count: outbound_contacts?.[0]?.count ?? 0,
      // Fail closed: if the list could not be read, treat everything as blocked.
      suppressed: dnc ? isSuppressed(dnc, co.domain, null, co.name) : true,
    };
  });
  return NextResponse.json({ view, rows, total: count || 0, pageSize: PAGE_SIZE, facets, dnc });
}
