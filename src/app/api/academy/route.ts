import { NextResponse } from "next/server";
import { ACADEMY_CHANNEL_ID, ACADEMY_CHANNEL_URL, parseFeed, type AcademyVideo } from "@/lib/academy";

// GET /api/academy — the Academy lessons, read from the channel's public feed
// (refreshed every 30 minutes). Public content, so no sign-in needed.
export async function GET() {
  let videos: AcademyVideo[] = [];
  if (ACADEMY_CHANNEL_ID) {
    try {
      const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ACADEMY_CHANNEL_ID}`, {
        next: { revalidate: 1800 },
      });
      if (res.ok) videos = parseFeed(await res.text());
    } catch {
      // Feed unreachable: show the empty state rather than an error.
    }
  }
  return NextResponse.json({ channelUrl: ACADEMY_CHANNEL_URL, videos });
}
