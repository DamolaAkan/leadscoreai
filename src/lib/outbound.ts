// Internal outbound (staff only): shared types and pure helpers used by the
// /internal-outbound page and its API routes. No server-only imports here.
//
// This tool never sends anything. It holds lender leads, writes first lines,
// tracks stages and exports a CSV for a separate sending tool.

export const STAGES = ["new", "researched", "contacted", "replied", "meeting", "not_a_fit"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  researched: "Researched",
  contacted: "Contacted",
  replied: "Replied",
  meeting: "Meeting",
  not_a_fit: "Not a fit",
};

export const SEGMENTS = ["africa", "us_thin_file"] as const;
export type Segment = (typeof SEGMENTS)[number];
export const SEGMENT_LABEL: Record<Segment, string> = {
  africa: "Africa",
  us_thin_file: "US/Canada thin-file",
};

export interface ContactRow {
  id: string;
  company_id: string;
  full_name: string | null;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  email_status: string | null;
  stage: Stage;
  contact_first_line: string | null;
  first_line: string | null;
  source: string | null;
  created_at: string;
  company_name: string;
  domain: string | null;
  country: string | null;
  niche: string | null;
  segment: Segment;
  researched_at: string | null;
  website_summary: string | null;
  suppressed: boolean;
}

export interface CompanyRow {
  id: string;
  name: string;
  domain: string | null;
  country: string | null;
  niche: string | null;
  segment: Segment;
  source: string | null;
  notes: string | null;
  first_line: string | null;
  website_summary: string | null;
  researched_at: string | null;
  created_at: string;
  contact_count?: number;
  suppressed?: boolean;
}

export interface DncEntry {
  id: string;
  domain: string | null;
  name_key: string | null;
  reason: string | null;
  locked: boolean;
  added_by: string | null;
  created_at: string;
}

// ---------- Import ----------

export const IMPORT_FIELDS = [
  "full_name",
  "first_name",
  "last_name",
  "title",
  "email",
  "email_status",
  "linkedin_url",
  "company_name",
  "website",
  "country",
  "niche",
  "notes",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type ImportRow = Partial<Record<ImportField, string>>;

export const IMPORT_FIELD_LABEL: Record<ImportField, string> = {
  full_name: "Full name",
  first_name: "First name",
  last_name: "Last name",
  title: "Job title",
  email: "Email",
  email_status: "Email status",
  linkedin_url: "LinkedIn URL",
  company_name: "Company name",
  website: "Website / domain",
  country: "Country",
  niche: "Niche",
  notes: "Notes",
};

export interface ImportDefaults {
  segment: Segment;
  source: string;
  niche?: string;
  country?: string;
}

export interface ImportResult {
  received: number;
  companies_created: number;
  contacts_created: number;
  contacts_merged: number;
  duplicates_in_file: number;
  suppressed: number;
  company_only: number;
  invalid: number;
}

export const IMPORT_BATCH = 250;

const HEADER_GUESSES: Record<ImportField, string[]> = {
  full_name: ["name", "fullname", "contactname", "personname", "person", "contact", "leadname"],
  first_name: ["firstname", "first", "givenname", "personfirstname"],
  last_name: ["lastname", "last", "surname", "familyname", "personlastname"],
  title: ["title", "jobtitle", "position", "role", "designation", "persontitle", "headline"],
  email: ["email", "emailaddress", "workemail", "personemail", "businessemail", "contactemail", "email1", "primaryemail"],
  email_status: ["emailstatus", "emailverification", "verificationstatus", "emailconfidence", "emailvalidation", "emailverified"],
  linkedin_url: ["linkedin", "linkedinurl", "personlinkedinurl", "linkedinprofile", "linkedinprofileurl", "profileurl", "contactlinkedin"],
  company_name: ["company", "companyname", "organization", "organisation", "organizationname", "organisationname", "account", "accountname", "employer", "lendername"],
  website: ["website", "domain", "companydomain", "companywebsite", "url", "websiteurl", "companyurl", "web", "site"],
  country: ["country", "companycountry", "hqcountry", "personcountry", "countryname", "location"],
  // Not "industry": Apollo's industry ("Financial Services") is not one of our niches.
  niche: ["niche", "category", "vertical", "lendertype"],
  notes: ["notes", "note", "comments"],
};

const headerKey = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

// Best guess of which CSV column feeds which field. Each column is used once.
export function guessMapping(headers: string[]): Partial<Record<ImportField, number>> {
  const keys = headers.map(headerKey);
  const used = new Set<number>();
  const out: Partial<Record<ImportField, number>> = {};
  for (const field of IMPORT_FIELDS) {
    for (const g of HEADER_GUESSES[field]) {
      const i = keys.findIndex((k, idx) => k === g && !used.has(idx));
      if (i >= 0) {
        out[field] = i;
        used.add(i);
        break;
      }
    }
  }
  // A bare "name" column next to a company column is the person; with first+last
  // present it is ambiguous, so let the first/last pair win.
  if (out.full_name !== undefined && out.first_name !== undefined && out.last_name !== undefined && keys[out.full_name] === "name") {
    used.delete(out.full_name);
    delete out.full_name;
  }
  return out;
}

// ---------- CSV ----------

// RFC 4180 parser: quotes, escaped quotes, newlines inside quotes, BOM, CRLF.
// Detects comma, semicolon or tab from the first line.
export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const firstLine = text.slice(0, text.search(/\r?\n/) === -1 ? text.length : text.search(/\r?\n/));
  const counts = { ",": 0, ";": 0, "\t": 0 } as Record<string, number>;
  let q = false;
  for (const ch of firstLine) {
    if (ch === '"') q = !q;
    else if (!q && ch in counts) counts[ch]++;
  }
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  // Stop spreadsheet formula injection when someone opens the export in Excel.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// ---------- Normalising ----------

const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.fr", "ymail.com", "hotmail.com",
  "hotmail.co.uk", "outlook.com", "live.com", "msn.com", "icloud.com", "me.com", "aol.com",
  "proton.me", "protonmail.com", "mail.com", "gmx.com", "zoho.com", "yandex.com",
]);

// Links that are not the company's own site.
const NOT_A_COMPANY_SITE = [
  "linkedin.com", "facebook.com", "instagram.com", "twitter.com", "x.com", "wa.me", "whatsapp.com",
  "google.com", "bit.ly", "linktr.ee", "youtube.com", "tiktok.com", "crunchbase.com",
];

export function normDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  if (!s) return null;
  if (s.includes("@") && !s.includes("/")) s = s.split("@").pop() || "";
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  s = s.split(/[/?#]/)[0];
  s = s.replace(/:\d+$/, "").replace(/\.$/, "").replace(/^www\d?\./, "");
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(s)) return null;
  if (NOT_A_COMPANY_SITE.some((d) => s === d || s.endsWith("." + d))) return null;
  return s;
}

export function normEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim().toLowerCase().replace(/^mailto:/, "");
  return /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/.test(s) ? s : null;
}

export function emailDomain(email: string | null): string | null {
  if (!email) return null;
  return email.split("@")[1] || null;
}

// A company's own domain from its email, unless it is a free mail provider.
export function businessDomainFromEmail(email: string | null): string | null {
  const d = emailDomain(email);
  if (!d || FREE_MAIL.has(d)) return null;
  return normDomain(d);
}

// Matches public.outbound_norm_name in the migration.
export function nameKey(s: string | null | undefined): string {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function clean(s: string | null | undefined, max = 500): string | null {
  if (s === null || s === undefined) return null;
  const t = String(s).replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
}

// ---------- Do not contact ----------

// Mirrors public.outbound_is_suppressed. Used to skip rows on import, to grey out
// rows in the list, and as a second check on export.
export function isSuppressed(
  dnc: Pick<DncEntry, "domain" | "name_key">[],
  domain: string | null | undefined,
  email: string | null | undefined,
  companyName: string | null | undefined
): boolean {
  const d = (domain || "").toLowerCase();
  const ed = (emailDomain(email ? email.toLowerCase() : null) || "").toLowerCase();
  const nk = nameKey(companyName);
  return dnc.some((e) => {
    if (e.domain) {
      const x = e.domain.toLowerCase();
      if (d && (d === x || d.endsWith("." + x))) return true;
      if (ed && (ed === x || ed.endsWith("." + x))) return true;
    }
    if (e.name_key && nk.includes(e.name_key)) return true;
    return false;
  });
}

// ---------- First-line wording guard ----------

// The scoring recipe never leaves the building, and the product is a Buyer
// Scorecard, never a quiz. A first line that trips this is rejected.
const FORBIDDEN = [
  /\bquiz/i,
  /\bweight(s|ed|ing)?\b/i,
  /\bpoints?\b/i,
  /\bcut-?offs?\b/i,
  /\bthresholds?\b/i,
  /deposit[- ]track/i,
  /\bscoring (model|recipe|formula)\b/i,
];

export function breaksWordingRules(s: string): boolean {
  return FORBIDDEN.some((re) => re.test(s));
}

export const EXPORT_HEADERS = [
  "email",
  "first_name",
  "last_name",
  "full_name",
  "title",
  "company",
  "domain",
  "country",
  "niche",
  "segment",
  "linkedin_url",
  "email_status",
  "first_line",
  "stage",
  "contact_id",
];

export function splitName(full: string | null): [string, string] {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], ""];
  return [parts[0], parts.slice(1).join(" ")];
}
