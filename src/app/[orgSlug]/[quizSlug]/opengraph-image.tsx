import { ImageResponse } from "next/og";
import { createServiceClient } from "@/lib/supabase";

// The preview card WhatsApp/Facebook/X show when a quiz link is shared:
// brand-coloured, with the quiz headline and the business name.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Take the 2-minute check";

function shade(hex: string, f: number): string {
  const h = (hex || "#7C3AED").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16) || 0x7c3aed;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

export default async function OgImage({ params }: { params: { orgSlug: string; quizSlug: string } }) {
  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, primary_color")
    .eq("slug", params.orgSlug)
    .eq("is_active", true)
    .maybeSingle();
  const { data: quiz } = org
    ? await supabase
        .from("quizzes")
        .select("start_headline, start_cta_text")
        .eq("organization_id", org.id)
        .eq("slug", params.quizSlug)
        .eq("is_active", true)
        .maybeSingle()
    : { data: null };

  const color = org?.primary_color || "#7C3AED";
  const headline = quiz?.start_headline || "Take the 2-minute check";
  const name = org?.name || "LeadScoreAI";
  const cta = quiz?.start_cta_text || "Let's start";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `linear-gradient(135deg, ${shade(color, 0.18)} 0%, ${shade(color, 0.38)} 55%, ${shade(color, 0.62)} 100%)`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, opacity: 0.92 }}>{name}</div>
        </div>
        <div
          style={{
            fontSize: headline.length > 60 ? 58 : 72,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 1000,
            display: "flex",
          }}
        >
          {headline}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              background: color,
              borderRadius: 14,
              padding: "18px 34px",
              fontSize: 30,
              fontWeight: 700,
              display: "flex",
            }}
          >
            {cta} →
          </div>
          <div style={{ fontSize: 26, opacity: 0.75, display: "flex" }}>2 minutes · Free</div>
        </div>
      </div>
    ),
    size
  );
}
