import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateAdminSession, getAdminSessionFromRequest } from "@/lib/invoice-auth";

export async function POST(request: Request) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId, isActive } = await request.json();

  if (!templateId || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "templateId and isActive are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("recurring_invoices")
    .update({ is_active: isActive })
    .eq("id", templateId);

  if (error) {
    console.error("[invoices/recurring/toggle] Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({ success: true, is_active: isActive });
}
