import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { track } from "@/lib/track";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Browser-side funnel events (landing views, clicks, previews, shares). Only
// these names are accepted so the log can't be filled with junk.
const CLIENT_EVENTS = new Set([
  "landing_view",
  "cta_click",
  "signup_sheet_open",
  "industry_tab",
  "studio_open",
  "preview_opened",
  "share_whatsapp",
  "link_copied",
  "embed_copied",
  "paywall_shown",
  "go_live_clicked",
  "credits_opened",
  "topup_clicked",
  "login_view",
]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const event = String(body.event || "");
  if (!CLIENT_EVENTS.has(event)) return NextResponse.json({ ok: false }, { status: 400 });

  const { allowed } = await checkRateLimit(request, "track", 600);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  // Signed-in owners: tie the event to their account.
  let orgId: string | null = null;
  const sid = getSessionIdFromRequest(request);
  if (sid) orgId = (await validateSession(sid))?.organizationId ?? null;

  const props = body.props && typeof body.props === "object" && !Array.isArray(body.props) ? body.props : {};
  const trimmed = Object.fromEntries(
    Object.entries(props as Record<string, unknown>)
      .slice(0, 12)
      .map(([k, v]) => [k.slice(0, 40), typeof v === "string" ? v.slice(0, 200) : typeof v === "number" || typeof v === "boolean" ? v : null])
  );

  await track(event, {
    orgId,
    visitorId: body.visitorId,
    quizId: typeof body.quizId === "string" && /^[0-9a-f-]{36}$/i.test(body.quizId) ? body.quizId : null,
    path: body.path,
    props: trimmed,
    request,
  });
  return NextResponse.json({ ok: true });
}
