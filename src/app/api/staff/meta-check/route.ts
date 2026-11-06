import { NextResponse } from "next/server";
import { isSuperAdmin, requireAdmin } from "@/lib/invoice-auth";
import { checkMetaAccess, metaAdsConfigured } from "@/lib/meta-ads";

export const dynamic = "force-dynamic";

// Super-admin only, read-only: confirms META_ADS_TOKEN can see the ad account and
// Page that press-play campaigns use. Never returns the token.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin || !isSuperAdmin(admin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!metaAdsConfigured()) return NextResponse.json({ ok: false, error: "META_ADS_TOKEN is not set here" });

  const checks = await checkMetaAccess();
  return NextResponse.json({ ok: checks.every((c) => c.ok), checks });
}
