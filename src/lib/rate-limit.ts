import crypto from "crypto";
import { createServiceClient } from "./supabase";

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// Simple per-IP hourly rate limit backed by api_rate_limits. Fails open (allows)
// if the counter errors, so a DB hiccup never blocks a real user.
export async function checkRateLimit(
  request: Request,
  key: string,
  limit: number
): Promise<{ allowed: boolean; count: number }> {
  try {
    const ipHash = crypto.createHash("sha256").update(clientIp(request)).digest("hex").slice(0, 32);
    const bucket = `${key}:${ipHash}`;
    const now = new Date();
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("bump_rate_limit", {
      p_bucket: bucket,
      p_window: windowStart.toISOString(),
    });
    if (error) return { allowed: true, count: 0 };
    const count = (data as number) ?? 0;
    return { allowed: count <= limit, count };
  } catch {
    return { allowed: true, count: 0 };
  }
}
