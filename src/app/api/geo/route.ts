import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The visitor's country from Vercel's edge (ISO-2, or null locally). Landing
// pages use it, with the browser timezone, to show naira or USD pricing.
export async function GET(request: Request) {
  const c = request.headers.get("x-vercel-ip-country");
  return NextResponse.json(
    { country: c && /^[A-Z]{2}$/.test(c) ? c : null },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
