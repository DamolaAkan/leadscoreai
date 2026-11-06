import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";
import { loadDnc } from "@/lib/outbound-server";
import {
  IMPORT_BATCH,
  ImportDefaults,
  ImportResult,
  ImportRow,
  SEGMENTS,
  Segment,
  businessDomainFromEmail,
  clean,
  isSuppressed,
  nameKey,
  normDomain,
  normEmail,
} from "@/lib/outbound";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SB = ReturnType<typeof createServiceClient>;

interface Prepared {
  companyName: string;
  companyKey: string; // domain, or "name:<key>" when there is no domain
  domain: string | null;
  country: string | null;
  niche: string | null;
  notes: string | null;
  fullName: string | null;
  personKey: string;
  title: string | null;
  email: string | null;
  emailStatus: string | null;
  linkedin: string | null;
}

interface CompanyRec {
  id: string;
  domain: string | null;
  name_key: string;
  country: string | null;
  niche: string | null;
  notes: string | null;
}

interface ContactRec {
  id: string;
  company_id: string;
  email: string | null;
  name_key: string;
  full_name: string | null;
  title: string | null;
  linkedin_url: string | null;
  email_status: string | null;
}

function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function selectIn<T>(supabase: SB, table: string, cols: string, column: string, values: string[]): Promise<T[]> {
  const out: T[] = [];
  // Short chunks: the values go in the request URL.
  for (const part of chunks(values, 100)) {
    const { data, error } = await supabase.from(table).select(cols).in(column, part);
    if (error) throw new Error(error.message);
    out.push(...((data || []) as T[]));
  }
  return out;
}

// Fill only the fields that are empty on the existing record; never overwrite.
function blanks<T extends object>(existing: T, incoming: Partial<T>): Partial<T> {
  const patch: Partial<T> = {};
  for (const [k, v] of Object.entries(incoming) as [keyof T, T[keyof T]][]) {
    if (v !== null && v !== undefined && v !== "" && (existing[k] === null || existing[k] === undefined || existing[k] === "")) {
      patch[k] = v;
    }
  }
  return patch;
}

// POST /api/internal-outbound/import  { rows: ImportRow[], defaults: ImportDefaults }
// Staff only. One batch of mapped CSV rows. Dedupes contacts by email, then by
// name + company domain. Rows on the do-not-contact list are skipped, not stored.
export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows.slice(0, IMPORT_BATCH) : [];
  const d = (body.defaults || {}) as Partial<ImportDefaults>;
  if (!SEGMENTS.includes(d.segment as Segment)) {
    return NextResponse.json({ error: "Pick a segment (Africa or US/Canada thin-file)" }, { status: 400 });
  }
  const defaults: ImportDefaults = {
    segment: d.segment as Segment,
    source: clean(d.source, 60) || "csv",
    niche: clean(d.niche, 80) || undefined,
    country: clean(d.country, 80) || undefined,
  };

  let dnc;
  try {
    dnc = await loadDnc();
  } catch {
    return NextResponse.json({ error: "Could not read the do-not-contact list, so nothing was imported." }, { status: 500 });
  }

  const result: ImportResult = {
    received: rows.length,
    companies_created: 0,
    contacts_created: 0,
    contacts_merged: 0,
    duplicates_in_file: 0,
    suppressed: 0,
    company_only: 0,
    invalid: 0,
  };

  // 1. Normalise and drop suppressed / unusable rows.
  const prepared: Prepared[] = [];
  for (const r of rows) {
    const email = normEmail(r.email);
    const domain = normDomain(r.website) || businessDomainFromEmail(email);
    const companyName = clean(r.company_name, 200) || domain;
    const fullName =
      clean(r.full_name, 160) || clean([r.first_name, r.last_name].filter(Boolean).join(" "), 160);
    if (!companyName) {
      result.invalid++;
      continue;
    }
    if (isSuppressed(dnc, domain, email, companyName)) {
      result.suppressed++;
      continue;
    }
    prepared.push({
      companyName,
      companyKey: domain || "name:" + nameKey(companyName),
      domain,
      country: clean(r.country, 80) || defaults.country || null,
      niche: clean(r.niche, 80) || defaults.niche || null,
      notes: clean(r.notes, 1000),
      fullName,
      personKey: nameKey(fullName),
      title: clean(r.title, 200),
      email,
      emailStatus: clean(r.email_status, 40),
      linkedin: clean(r.linkedin_url, 300),
    });
  }

  const supabase = createServiceClient();
  try {
    // 2. Companies: find existing by domain, or by name when there is no domain.
    const byKey = new Map<string, CompanyRec>();
    const companyCols = "id, domain, name_key, country, niche, notes";
    const domains = Array.from(new Set(prepared.map((p) => p.domain).filter(Boolean))) as string[];
    for (const c of await selectIn<CompanyRec>(supabase, "outbound_companies", companyCols, "domain", domains)) {
      byKey.set(c.domain as string, c);
    }
    const nameOnly = Array.from(
      new Set(prepared.filter((p) => !p.domain).map((p) => p.companyKey.slice(5)).filter(Boolean))
    );
    for (const c of await selectIn<CompanyRec>(supabase, "outbound_companies", companyCols, "name_key", nameOnly)) {
      if (!c.domain && !byKey.has("name:" + c.name_key)) byKey.set("name:" + c.name_key, c);
    }

    const toCreate = new Map<string, Prepared>();
    for (const p of prepared) if (!byKey.has(p.companyKey) && !toCreate.has(p.companyKey)) toCreate.set(p.companyKey, p);
    if (toCreate.size) {
      const { data, error } = await supabase
        .from("outbound_companies")
        .insert(
          Array.from(toCreate.values()).map((p) => ({
            name: p.companyName,
            domain: p.domain,
            country: p.country,
            niche: p.niche,
            segment: defaults.segment,
            source: defaults.source,
            notes: p.notes,
          }))
        )
        .select(companyCols);
      if (error) throw new Error(error.message);
      for (const c of (data || []) as CompanyRec[]) byKey.set(c.domain || "name:" + c.name_key, c);
      result.companies_created += data?.length || 0;
    }

    // Fill blank company fields from this file (first value wins).
    const companyPatched = new Set<string>();
    for (const p of prepared) {
      const c = byKey.get(p.companyKey);
      if (!c || companyPatched.has(c.id) || toCreate.has(p.companyKey)) continue;
      const patch = blanks(c, { country: p.country, niche: p.niche, notes: p.notes });
      if (Object.keys(patch).length) {
        companyPatched.add(c.id);
        await supabase.from("outbound_companies").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", c.id);
        Object.assign(c, patch);
      }
    }

    // 3. Contacts: dedupe by email, then by name within the same company (domain).
    const people = prepared.filter((p) => p.email || p.personKey);
    result.company_only = prepared.length - people.length;

    const contactCols = "id, company_id, email, name_key, full_name, title, linkedin_url, email_status";
    const byEmail = new Map<string, ContactRec>();
    const byName = new Map<string, ContactRec>(); // `${company_id}|${name_key}`
    const emails = Array.from(new Set(people.map((p) => p.email).filter(Boolean))) as string[];
    for (const c of await selectIn<ContactRec>(supabase, "outbound_contacts", contactCols, "email", emails)) {
      if (c.email) byEmail.set(c.email, c);
    }
    const companyIds = Array.from(new Set(people.map((p) => byKey.get(p.companyKey)?.id).filter(Boolean))) as string[];
    for (const c of await selectIn<ContactRec>(supabase, "outbound_contacts", contactCols, "company_id", companyIds)) {
      if (c.name_key) byName.set(`${c.company_id}|${c.name_key}`, c);
    }

    const seen = new Set<string>();
    const inserts: Record<string, unknown>[] = [];
    for (const p of people) {
      const company = byKey.get(p.companyKey);
      if (!company) continue;
      const nameK = p.personKey ? `${company.id}|${p.personKey}` : "";
      const fileKeys = [p.email ? "e:" + p.email : "", nameK ? "n:" + nameK : ""].filter(Boolean);
      if (fileKeys.some((k) => seen.has(k))) {
        result.duplicates_in_file++;
        continue;
      }
      fileKeys.forEach((k) => seen.add(k));

      const existing = (p.email && byEmail.get(p.email)) || (nameK && byName.get(nameK)) || null;
      if (existing) {
        const patch = blanks(existing, {
          full_name: p.fullName,
          title: p.title,
          linkedin_url: p.linkedin,
          email_status: p.emailStatus,
          email: p.email,
        });
        if (Object.keys(patch).length) {
          const { error } = await supabase
            .from("outbound_contacts")
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (!error) Object.assign(existing, patch);
        }
        result.contacts_merged++;
        continue;
      }
      inserts.push({
        company_id: company.id,
        full_name: p.fullName,
        title: p.title,
        email: p.email,
        linkedin_url: p.linkedin,
        email_status: p.emailStatus,
        source: defaults.source,
      });
    }
    for (const part of chunks(inserts, 200)) {
      const { data, error } = await supabase.from("outbound_contacts").insert(part).select("id");
      if (error) throw new Error(error.message);
      result.contacts_created += data?.length || 0;
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Import stopped part way", detail: e instanceof Error ? e.message : String(e), result },
      { status: 500 }
    );
  }

  return NextResponse.json({ result });
}
