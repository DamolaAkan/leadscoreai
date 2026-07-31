import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";
import { calibrateOrg } from "@/lib/wtp-calibrate";

export const dynamic = "force-dynamic";

// POST /api/dashboard/wtp/calibrate — train the WTP score against this org's real
// outcomes and re-score every lead. Graduates the score from "index" to
// "calibrated". No-op (returns needed count) until the outcome threshold is met.
export async function POST(request: Request) {
  const user = await validateSession(getSessionIdFromRequest(request) || "");
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await calibrateOrg(createServiceClient(), user.organizationId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[wtp/calibrate] error:", err);
    return NextResponse.json({ error: "Calibration failed" }, { status: 500 });
  }
}
