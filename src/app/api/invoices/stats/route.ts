import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateAdminSession, getAdminSessionFromRequest } from "@/lib/invoice-auth";

export async function GET(request: Request) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Total invoices
  const { count: totalInvoices } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  // Total revenue (paid invoices)
  const { data: paidInvoices } = await supabase
    .from("invoices")
    .select("subtotal")
    .eq("status", "paid");

  const totalRevenue = (paidInvoices || []).reduce((sum, inv) => sum + Number(inv.subtotal), 0);

  // Outstanding (sent but not paid)
  const { data: sentInvoices } = await supabase
    .from("invoices")
    .select("subtotal")
    .eq("status", "sent");

  const outstandingAmount = (sentInvoices || []).reduce((sum, inv) => sum + Number(inv.subtotal), 0);

  // Overdue count
  const { count: overdueCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("status", "overdue");

  return NextResponse.json({
    stats: {
      total_invoices: totalInvoices || 0,
      total_revenue: totalRevenue,
      outstanding_amount: outstandingAmount,
      overdue_count: overdueCount || 0,
    },
  });
}
