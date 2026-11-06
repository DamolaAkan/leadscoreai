import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, isSuperAdmin } from "@/lib/invoice-auth";
import { loadDnc } from "@/lib/outbound-server";
import { clean, nameKey, normDomain } from "@/lib/outbound";

export const dynamic = "force-dynamic";

// GET  /api/internal-outbound/dnc                      the do-not-contact list
// POST /api/internal-outbound/dnc { value, kind, reason }  add a domain or company name (any staff)
// DELETE /api/internal-outbound/dnc?id=                 remove an unlocked entry (super admin only)
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ dnc: await loadDnc() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const kind = body.kind === "name" ? "name" : "domain";
  const reason = clean(body.reason, 200);
  let row: { domain: string | null; name_key: string | null };
  if (kind === "domain") {
    const d = normDomain(body.value);
    if (!d) return NextResponse.json({ error: "That does not look like a domain (example.com)" }, { status: 400 });
    row = { domain: d, name_key: null };
  } else {
    const k = nameKey(body.value);
    if (k.length < 4) return NextResponse.json({ error: "Company name is too short to block safely" }, { status: 400 });
    row = { domain: null, name_key: k };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("outbound_dnc")
    .insert({ ...row, reason, locked: false, added_by: user.email });
  if (error && !/duplicate|unique/i.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ dnc: await loadDnc() });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(user)) return NextResponse.json({ error: "Only a super admin can remove an entry" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "No entry picked" }, { status: 400 });
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("outbound_dnc")
    .delete()
    .eq("id", id)
    .eq("locked", false)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "That entry is locked and cannot be removed here" }, { status: 403 });
  return NextResponse.json({ dnc: await loadDnc() });
}
