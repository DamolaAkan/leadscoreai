import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { pressPlayEnabled } from "@/lib/wallet";
import { readWebsite } from "@/lib/website-read";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sign-up step 1: read the installer's website to fill in their details.
// Public, so rate-limited; any failure just means they type it in themselves.
export async function POST(request: Request) {
  if (!pressPlayEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { allowed } = await checkRateLimit(request, "press_play_read_site", 10);
  if (!allowed) return NextResponse.json({ error: "Too many tries. Fill in your details below." }, { status: 429 });

  const { url } = await request.json().catch(() => ({}));
  try {
    return NextResponse.json(await readWebsite(String(url || "").slice(0, 300)));
  } catch (e) {
    const message = e instanceof Error && !e.message.startsWith("[") ? e.message : "We couldn't read that website.";
    console.error("[press-play/read-website]", e);
    return NextResponse.json({ error: `${message} Fill in your details below.` }, { status: 422 });
  }
}
