import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, canManage } from "@/lib/invoice-auth";
import { notifyDealAssigned } from "@/lib/sl-notify";

export const dynamic = "force-dynamic";

const DEAL_SELECT =
  "*, product:sl_products(id,name,slug,is_commission_eligible,commission_rate), owner:admin_users!sl_deals_owner_id_fkey(id,full_name)";

// GET /api/deals — list. Reps see only their own; managers see all (owner filter).
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const stage = url.searchParams.get("stage");
  const productId = url.searchParams.get("product_id");
  const ownerFilter = url.searchParams.get("owner_id");
  const search = url.searchParams.get("search")?.trim();
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  const supabase = createServiceClient();
  let q = supabase
    .from("sl_deals")
    .select(DEAL_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Access control: a rep is locked to their own rows regardless of any owner filter.
  if (!canManage(user)) {
    q = q.eq("owner_id", user.id);
  } else if (ownerFilter) {
    q = q.eq("owner_id", ownerFilter);
  }

  if (stage) q = q.eq("stage", stage);
  if (productId) q = q.eq("product_id", productId);
  if (dateFrom) q = q.gte("created_at", dateFrom);
  if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59.999Z`);
  if (search) {
    const s = search.replace(/[,()]/g, " ");
    q = q.or(
      `contact_name.ilike.%${s}%,company_name.ilike.%${s}%,contact_email.ilike.%${s}%`
    );
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deals: data || [] });
}

// POST /api/deals — create a deal owned by the current rep (or a chosen owner for managers).
export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const contactName = (body.contact_name || "").trim();
  if (!contactName) {
    return NextResponse.json({ error: "Contact name is required" }, { status: 400 });
  }
  if (!body.product_id) {
    return NextResponse.json({ error: "Product is required" }, { status: 400 });
  }
  const currency = body.currency === "USD" ? "USD" : "NGN";

  // Managers may assign a deal to another rep; reps always own their own.
  const ownerId = canManage(user) && body.owner_id ? body.owner_id : user.id;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sl_deals")
    .insert({
      owner_id: ownerId,
      product_id: body.product_id,
      contact_name: contactName,
      contact_email: body.contact_email?.trim() || null,
      contact_phone: body.contact_phone?.trim() || null,
      company_name: body.company_name?.trim() || null,
      currency,
      setup_fee: Number(body.setup_fee) || 0,
      monthly_amount: Number(body.monthly_amount) || 0,
      notes: body.notes?.trim() || null,
    })
    .select(DEAL_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If a manager assigned this deal to a different rep, email that rep.
  if (ownerId !== user.id) {
    const { data: owner } = await supabase
      .from("admin_users")
      .select("email, full_name")
      .eq("id", ownerId)
      .single();
    if (owner?.email) {
      await notifyDealAssigned({
        ownerEmail: owner.email,
        ownerName: owner.full_name || "there",
        assignerName: user.full_name,
        deal: {
          id: data.id,
          contact_name: data.contact_name,
          company_name: data.company_name,
          setup_fee: data.setup_fee,
          currency: data.currency,
        },
      });
    }
  }

  return NextResponse.json({ deal: data });
}
