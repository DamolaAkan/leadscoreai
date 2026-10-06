import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireBuilderUser } from "@/lib/builder-server";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

// Owner photos for the photo-led scorecard styles: "hero" (start screen) and
// "result" (results page). The studio resizes before upload; stored in the
// public org-logos bucket under scorecards/<org>/. Never costs an AI edit.

const SLOTS = new Set(["hero", "result"]);

async function loadQuiz(quizId: unknown, orgId: string) {
  if (typeof quizId !== "string") return null;
  const { data } = await createServiceClient()
    .from("quizzes")
    .select("id, builder_config")
    .eq("id", quizId)
    .eq("organization_id", orgId)
    .not("builder_config", "is", null)
    .maybeSingle();
  return data;
}

async function saveImages(quiz: { id: string; builder_config: unknown }, images: Record<string, string | null>) {
  const cfg = (quiz.builder_config ?? {}) as Record<string, unknown>;
  const { error } = await createServiceClient()
    .from("quizzes")
    .update({ builder_config: { ...cfg, images }, updated_at: new Date().toISOString() })
    .eq("id", quiz.id);
  return error;
}

export async function POST(request: Request) {
  const auth = await requireBuilderUser(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = await request.json().catch(() => ({}));
  if (!SLOTS.has(body.slot)) return NextResponse.json({ error: "Pick where the photo goes." }, { status: 400 });
  const quiz = await loadQuiz(body.quizId, user.organizationId);
  if (!quiz) return NextResponse.json({ error: "Scorecard not found." }, { status: 404 });

  const m = String(body.dataUrl || "").match(/^data:(image\/(png|jpe?g|webp));base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Please upload a PNG, JPG or WebP photo." }, { status: 400 });
  const buffer = Buffer.from(m[3], "base64");
  if (buffer.length > 4 * 1024 * 1024) return NextResponse.json({ error: "That photo is too large (max 4MB)." }, { status: 400 });
  const ext = m[2] === "png" ? "png" : m[2] === "webp" ? "webp" : "jpg";

  const supabase = createServiceClient();
  const path = `scorecards/${user.organizationId}/${quiz.id}-${body.slot}.${ext}`;
  const { error: upErr } = await supabase.storage.from("org-logos").upload(path, buffer, { contentType: m[1], upsert: true });
  if (upErr) return NextResponse.json({ error: "Could not upload the photo." }, { status: 500 });
  const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`; // cache-bust replacements

  const current = ((quiz.builder_config as { images?: Record<string, string | null> })?.images ?? {}) as Record<string, string | null>;
  const images = { ...current, [body.slot]: url };
  if (await saveImages(quiz, images)) return NextResponse.json({ error: "Could not save the photo." }, { status: 500 });
  await track("scorecard_photo", { orgId: user.organizationId, quizId: quiz.id, props: { slot: body.slot }, request });
  return NextResponse.json({ ok: true, images });
}

// Remove a photo; the style falls back to its designed panel.
export async function DELETE(request: Request) {
  const auth = await requireBuilderUser(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const body = await request.json().catch(() => ({}));
  if (!SLOTS.has(body.slot)) return NextResponse.json({ error: "Pick a photo to remove." }, { status: 400 });
  const quiz = await loadQuiz(body.quizId, user.organizationId);
  if (!quiz) return NextResponse.json({ error: "Scorecard not found." }, { status: 404 });
  const current = ((quiz.builder_config as { images?: Record<string, string | null> })?.images ?? {}) as Record<string, string | null>;
  const images = { ...current, [body.slot]: null };
  if (await saveImages(quiz, images)) return NextResponse.json({ error: "Could not remove the photo." }, { status: 500 });
  // Best-effort: delete the stored file too (any of the extensions we write).
  await createServiceClient()
    .storage.from("org-logos")
    .remove(["jpg", "png", "webp"].map((ext) => `scorecards/${user.organizationId}/${quiz.id}-${body.slot}.${ext}`))
    .catch(() => {});
  return NextResponse.json({ ok: true, images });
}
