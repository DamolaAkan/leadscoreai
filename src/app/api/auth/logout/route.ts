import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getSessionIdFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ success: true });
  }

  const supabase = createServiceClient();
  await supabase.from("org_sessions").delete().eq("session_id", sessionId);

  return NextResponse.json({ success: true });
}
