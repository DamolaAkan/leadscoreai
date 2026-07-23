import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, canManage, isSuperAdmin } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// GET /api/deals/meta — products for the deal form, and (managers only) the rep list
// used by owner filters and payout runs.
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: products } = await supabase
    .from("sl_products")
    .select("id,name,slug,is_commission_eligible,commission_rate,is_active")
    .eq("is_active", true)
    .order("name");

  let reps: { id: string; full_name: string; role: string }[] = [];
  if (canManage(user)) {
    const { data } = await supabase
      .from("admin_users")
      .select("id,full_name,role")
      .order("full_name");
    reps = data || [];
  }

  return NextResponse.json({
    products: products || [],
    reps,
    me: {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      canManage: canManage(user),
      superAdmin: isSuperAdmin(user),
    },
  });
}
