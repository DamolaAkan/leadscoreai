import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase";
import { getClaude, isClaudeConfigured } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { logFeatureRequest, requireBuilderUser, uniqueQuizSlug } from "@/lib/builder-server";
import {
  BUILDER_MODEL,
  BUILDER_SYSTEM_PROMPT,
  BUILDER_TURN_SCHEMA,
  BuilderConfig,
  BuilderTurn,
  NormalizedQuiz,
  normalizeDraft,
  normalizeTapQuestions,
  toDraftForPrompt,
} from "@/lib/builder";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CurrentQuiz {
  id: string;
  name: string;
  builder_config: BuilderConfig;
  start_headline: string | null;
  start_subheadline: string | null;
  start_cta_text: string | null;
  cta_url: string | null;
}

// One builder turn: the owner's chat → Claude drafts/edits the quiz → we
// validate it and save it as a draft (is_active = false) until they publish.
export async function POST(request: Request) {
  const auth = await requireBuilderUser(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isClaudeConfigured()) {
    return NextResponse.json({ error: "The quiz builder is not configured yet." }, { status: 503 });
  }

  // Cost guard: AI generations per business per hour.
  const { allowed } = await checkRateLimit(request, `builder_chat_${user.organizationId}`, 30);
  if (!allowed) {
    return NextResponse.json(
      { error: "You've made a lot of changes this hour. Take a break and try again soon." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const quizId: string | null = typeof body.quizId === "string" ? body.quizId : null;
  const history: ChatMessage[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m: ChatMessage) =>
        (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim()
    )
    .slice(-20)
    .map((m: ChatMessage) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Send a message to start." }, { status: 400 });
  }
  if (history[0].role !== "user") history.shift();

  const supabase = createServiceClient();

  // Load the current draft (if editing) so Claude edits it rather than starting over.
  let current: CurrentQuiz | null = null;
  let currentHasLeads = false;
  if (quizId) {
    const { data: q } = await supabase
      .from("quizzes")
      .select("id, name, builder_config, start_headline, start_subheadline, start_cta_text, cta_url")
      .eq("id", quizId)
      .eq("organization_id", user.organizationId)
      .maybeSingle();
    if (!q || !q.builder_config) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }
    current = q as CurrentQuiz;
    const { count } = await supabase
      .from("quiz_responses")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId);
    currentHasLeads = (count || 0) > 0;
  }

  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  if (current) {
    const { data: qs } = await supabase
      .from("quiz_questions")
      .select("question_text, wtp_signal, options")
      .eq("quiz_id", current.id)
      .order("question_order", { ascending: true });
    const draft = toDraftForPrompt(current, qs || [], user.primaryColor || null);
    const last = messages[messages.length - 1];
    last.content = `<current_quiz>\n${JSON.stringify(draft)}\n</current_quiz>\n\n${last.content as string}`;
  }
  const businessContext = `The business owner's account is named "${user.orgName}".`;

  let turn: BuilderTurn | null = null;
  let normalized: NormalizedQuiz | null = null;
  let errorsForRetry: string[] = [];

  // Up to two attempts: if the draft fails validation, tell Claude what to fix.
  for (let attempt = 0; attempt < 2; attempt++) {
    const attemptMessages = [...messages];
    if (errorsForRetry.length) {
      attemptMessages.push({ role: "assistant", content: JSON.stringify(turn) });
      attemptMessages.push({
        role: "user",
        content: `That quiz can't be saved yet. Fix these problems and return the full quiz again:\n- ${errorsForRetry.join("\n- ")}`,
      });
    }

    let response: Anthropic.Message;
    try {
      response = await getClaude().messages.create({
        model: BUILDER_MODEL,
        max_tokens: 16000,
        output_config: {
          effort: "medium",
          format: { type: "json_schema", schema: BUILDER_TURN_SCHEMA as unknown as Record<string, unknown> },
        },
        system: [
          { type: "text", text: BUILDER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          { type: "text", text: businessContext },
        ],
        messages: attemptMessages,
      });
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        return NextResponse.json({ error: "The builder is busy. Try again in a minute." }, { status: 503 });
      }
      console.error("[builder/chat] Claude error:", err);
      return NextResponse.json({ error: "Something went wrong drafting your quiz. Try again." }, { status: 502 });
    }

    if (response.stop_reason === "refusal") {
      return NextResponse.json({
        reply: "I can't help build a quiz for that. Tell me about a different business or goal and I'll draft one.",
        quizId,
      });
    }
    if (response.stop_reason === "max_tokens") {
      console.error("[builder/chat] hit max_tokens");
      return NextResponse.json({ error: "That quiz came out too long. Ask for fewer questions." }, { status: 502 });
    }

    // Log token usage per AI edit so real cost replaces the estimates.
    console.log("[builder/chat] usage", JSON.stringify(response.usage));

    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text || "";
    try {
      turn = JSON.parse(text) as BuilderTurn;
    } catch {
      console.error("[builder/chat] invalid JSON from model");
      return NextResponse.json({ error: "Something went wrong drafting your quiz. Try again." }, { status: 502 });
    }

    if (!turn.quiz) break; // Claude needs more info; nothing to save.
    const result = normalizeDraft(turn.quiz);
    if (result.ok) {
      normalized = result.quiz;
      break;
    }
    errorsForRetry = result.errors;
  }

  const reply = String(turn?.reply || "").slice(0, 2000);
  const questions = normalizeTapQuestions(turn?.questions);

  // Out-of-scope asks double as product feedback: log them and tell Stella.
  const featureRequest = typeof turn?.feature_request === "string" ? turn.feature_request.trim().slice(0, 500) : "";
  if (featureRequest) {
    await logFeatureRequest({
      organizationId: user.organizationId,
      orgName: user.orgName,
      ownerEmail: user.username,
      quizId,
      request: featureRequest,
      ownerMessage: history[history.length - 1].content,
    });
  }
  // Asking before (or pausing during) a build: nothing to save, current quiz untouched.
  if (!turn?.quiz) return NextResponse.json({ reply, questions, quizId });
  if (!normalized) {
    console.error("[builder/chat] draft still invalid:", errorsForRetry);
    return NextResponse.json({
      reply: "I had trouble putting that quiz together. Could you describe it a little differently?",
      quizId,
    });
  }

  const quizRow = {
    name: normalized.name,
    start_headline: normalized.start_headline,
    start_subheadline: normalized.start_subheadline,
    start_cta_text: normalized.start_cta_text,
    max_score: normalized.max_score,
    cta_url: normalized.cta_url,
    builder_config: normalized.builder_config,
    result_mode: "lead",
    collect_company: false,
    updated_at: new Date().toISOString(),
  };

  // Edit in place only while the quiz has no leads. Replacing questions would
  // cascade-delete leads' answers, so a quiz with leads is forked instead.
  let savedId: string;
  let forked = false;
  if (current && !currentHasLeads) {
    const { error: upErr } = await supabase.from("quizzes").update(quizRow).eq("id", current.id);
    if (upErr) {
      console.error("[builder/chat] quiz update error:", upErr.message);
      return NextResponse.json({ error: "Could not save your quiz. Try again." }, { status: 500 });
    }
    await supabase.from("quiz_questions").delete().eq("quiz_id", current.id);
    savedId = current.id;
  } else {
    forked = !!current;
    const slug = await uniqueQuizSlug(user.organizationId, normalized.name);
    const { data: created, error: insErr } = await supabase
      .from("quizzes")
      .insert({ ...quizRow, organization_id: user.organizationId, slug, is_active: false })
      .select("id")
      .single();
    if (insErr || !created) {
      console.error("[builder/chat] quiz insert error:", insErr?.message);
      return NextResponse.json({ error: "Could not save your quiz. Try again." }, { status: 500 });
    }
    savedId = created.id;
  }

  const { error: qErr } = await supabase
    .from("quiz_questions")
    .insert(normalized.questions.map((q) => ({ ...q, quiz_id: savedId })));
  if (qErr) {
    console.error("[builder/chat] questions insert error:", qErr.message);
    return NextResponse.json({ error: "Could not save your questions. Try again." }, { status: 500 });
  }

  // First draft for a brand-new account: adopt Claude's suggested brand colour
  // if the owner hasn't picked one yet (still the default purple).
  if (normalized.suggested_color && (user.primaryColor || "").toUpperCase() === "#7C3AED") {
    await supabase
      .from("organizations")
      .update({ primary_color: normalized.suggested_color })
      .eq("id", user.organizationId);
  }

  return NextResponse.json({
    reply: forked
      ? `${reply}\n\n(Your live quiz already has leads, so I saved these changes as a new version. Publish it when you're ready.)`
      : reply,
    questions,
    quizId: savedId,
    forked,
  });
}
