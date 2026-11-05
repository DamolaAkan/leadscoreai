import { NextResponse } from "next/server";
import { PressPlayError, orgOwnerFromRequest, pause, play, state } from "@/lib/press-play";
import { pressPlayEnabled } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function guard(request: Request) {
  if (!pressPlayEnabled()) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const user = await orgOwnerFromRequest(request);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { user };
}

function fail(e: unknown) {
  if (e instanceof PressPlayError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  console.error("[press-play]", e);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}

// The campaign screen: balance, spend, leads, status.
export async function GET(request: Request) {
  const g = await guard(request);
  if (g.error) return g.error;
  try {
    return NextResponse.json(await state(g.user));
  } catch (e) {
    return fail(e);
  }
}

// { action: "play", quizId, areas: string[] } or { action: "pause" }
export async function POST(request: Request) {
  const g = await guard(request);
  if (g.error) return g.error;
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "play") {
      const result = await play(g.user, String(body.quizId || ""), Array.isArray(body.areas) ? body.areas.map(String) : []);
      return NextResponse.json({ ok: true, ...result });
    }
    if (body.action === "pause") {
      await pause(g.user);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return fail(e);
  }
}
