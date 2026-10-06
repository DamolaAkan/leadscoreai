import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase";
import { getClaude, isClaudeConfigured } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { logFeatureRequest, requireBuilderUser, uniqueQuizSlug } from "@/lib/builder-server";
import { addUsage, costUsd, emptyUsage, getCreditStatus, loadOrgForCredits, recordEdit, type CreditStatus } from "@/lib/credits";
import { isStarter, PLAN_LIMITS } from "@/lib/paystack";
import { track } from "@/lib/track";
import { isTemplateKey, pickTemplate } from "@/lib/quiz-templates";
import { describeAnswers, sanitizeAnswers } from "@/lib/signup-scorecard";
import {
  BUILDER_MODEL,
  BUILDER_SYSTEM_PROMPT,
  BUILDER_TURN_SCHEMA,
  BUILDER_TURN_SCHEMA_BASIC,
  BuilderConfig,
  BuilderTurn,
  NormalizedQuiz,
  normalizeDraft,
  normalizeTapQuestions,
  toDraftForPrompt,
} from "@/lib/builder";

export const dynamic = "force-dynamic";
// 300s (Vercel Pro max): local-language quizzes with heavy tone marks (Yoruba,
// Igbo, Hausa) generate more slowly and were hitting the old 120s cap.
export const maxDuration = 300;

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
    return NextResponse.json({ error: "The scorecard builder is not configured yet." }, { status: 503 });
  }

  // Cost guard: AI generations per business per hour.
  const { allowed } = await checkRateLimit(request, `builder_chat_${user.organizationId}`, 30);
  if (!allowed) {
    return NextResponse.json(
      { error: "You've made a lot of changes this hour. Take a break and try again soon." },
      { status: 429 }
    );
  }

  // AI edits: stop before calling Claude when the account has none left.
  const creditOrg = await loadOrgForCredits(user.organizationId);
  let credits: CreditStatus | null = creditOrg ? await getCreditStatus(creditOrg) : null;
  if (credits && credits.remaining <= 0) {
    await track("out_of_credits", { orgId: user.organizationId, props: { paid: credits.paid }, request });
    return NextResponse.json(
      {
        error: credits.paid
          ? "You've used this month's AI edits. Top up to keep building."
          : "You've used your free AI edits. Go Pro to keep building.",
        outOfCredits: true,
        credits,
      },
      { status: 402 }
    );
  }
  const usage = emptyUsage();
  // Log this call's real cost; `charged` = it used one of the owner's edits.
  const settle = async (charged: boolean, savedQuizId: string | null) => {
    if (!credits) return null;
    credits = await recordEdit({
      organizationId: user.organizationId,
      quizId: savedQuizId,
      usage,
      charged,
      status: credits,
    });
    return credits;
  };

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

  // Starter includes one Buyer Scorecard: a brand-new one is refused (before any
  // AI cost). Editing the existing scorecard, including a new version of one that
  // already has leads, is still allowed.
  if (!quizId && isStarter(creditOrg)) {
    const { count: owned } = await supabase
      .from("quizzes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", user.organizationId)
      .not("builder_config", "is", null);
    if ((owned ?? 0) >= PLAN_LIMITS.starter.scorecards) {
      await track("scorecard_limit", { orgId: user.organizationId, props: { tier: "starter" }, request });
      return NextResponse.json(
        {
          error: "Starter includes 1 Buyer Scorecard. Keep improving the one you have, or upgrade to Pro in Settings for unlimited scorecards.",
          code: "starter_limit",
        },
        { status: 403 }
      );
    }
  }

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
      return NextResponse.json({ error: "Scorecard not found." }, { status: 404 });
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
      .select("question_text, question_type, wtp_signal, options")
      .eq("quiz_id", current.id)
      .order("question_order", { ascending: true });
    const draft = toDraftForPrompt(current, qs || [], user.primaryColor || null);
    const last = messages[messages.length - 1];
    last.content = `<current_quiz>\n${JSON.stringify(draft)}\n</current_quiz>\n\n${last.content as string}`;
  }
  // What they told us in the sign-up scorecard, so the first questions skip it.
  const { data: signup } = await supabase
    .from("builder_events")
    .select("props")
    .eq("organization_id", user.organizationId)
    .eq("event", "signed_up")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const scorecard = sanitizeAnswers((signup?.props as { scorecard?: unknown } | null)?.scorecard);
  const businessContext =
    `The business owner's account is named "${user.orgName}".` +
    (scorecard
      ? `\n\nBefore signing up they answered a short scorecard:\n- ${describeAnswers(scorecard).join("\n- ")}\n` +
        `Use these answers: don't ask again for anything answered here, match the scorecard to their industry, ` +
        `and design it for where their enquiries come from (a WhatsApp link, an Instagram bio link or a website embed).`
      : "");

  let turn: BuilderTurn | null = null;
  let normalized: NormalizedQuiz | null = null;
  let errorsForRetry: string[] = [];

  // A local-language quiz (Yoruba, Igbo, Hausa, etc.) with full tone marks
  // generates far more slowly and was timing out at Cloudflare's ~100s limit.
  // Drop to "low" effort for those so the request finishes; the owner edits the
  // wording anyway. Normal English quizzes stay at "medium".
  const convoText = history.map((m) => m.content).join(" ").toLowerCase();
  const LANG_HINTS = [
    "yoruba", "yorùbá", "igbo", "ibo", "hausa", "pidgin", "swahili", "kiswahili",
    "french", "français", "francais", "twi", "zulu", "xhosa", "amharic", "arabic",
    "wolof", "lingala", "local language", "local dialect", "dialect", "mother tongue",
    "our language", "native language",
  ];
  const effort: "low" | "medium" = LANG_HINTS.some((w) => convoText.includes(w)) ? "low" : "medium";

  // Full schema (with the calculator field). If the API ever rejects it as too
  // large, fall back to the basic schema so the builder keeps working.
  const fullSchema = BUILDER_TURN_SCHEMA as unknown as Record<string, unknown>;
  const basicSchema = BUILDER_TURN_SCHEMA_BASIC as unknown as Record<string, unknown>;
  let turnSchema = fullSchema;

  // Up to two attempts: if the draft fails validation, tell Claude what to fix.
  for (let attempt = 0; attempt < 2; attempt++) {
    const attemptMessages = [...messages];
    if (errorsForRetry.length) {
      attemptMessages.push({ role: "assistant", content: JSON.stringify(turn) });
      attemptMessages.push({
        role: "user",
        content: `That scorecard can't be saved yet. Fix these problems and return the full scorecard again:\n- ${errorsForRetry.join("\n- ")}`,
      });
    }

    let response: Anthropic.Message | null = null;
    while (!response) {
      try {
        response = await getClaude().messages.create({
          model: BUILDER_MODEL,
          max_tokens: 16000,
          output_config: {
            effort,
            format: { type: "json_schema", schema: turnSchema },
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
        if (err instanceof Anthropic.BadRequestError && turnSchema === fullSchema && /grammar|schema/i.test(err.message)) {
          console.error("[builder/chat] full schema rejected, using the basic schema:", err.message);
          await track("builder_schema_fallback", { orgId: user.organizationId, quizId, props: { reason: "grammar" }, request });
          turnSchema = basicSchema;
          continue;
        }
        console.error("[builder/chat] Claude error:", err);
        return NextResponse.json({ error: "Something went wrong drafting your scorecard. Try again." }, { status: 502 });
      }
    }

    addUsage(usage, response.usage);
    if (response.stop_reason === "refusal") {
      return NextResponse.json({
        reply: "I can't help build a scorecard for that. Tell me about a different business or goal and I'll draft one.",
        quizId,
        credits: await settle(false, quizId),
      });
    }
    if (response.stop_reason === "max_tokens") {
      console.error("[builder/chat] hit max_tokens");
      await settle(false, quizId);
      return NextResponse.json({ error: "That scorecard came out too long. Ask for fewer questions." }, { status: 502 });
    }

    // Log token usage per AI edit so real cost replaces the estimates.
    console.log("[builder/chat] usage", JSON.stringify(response.usage));

    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text || "";
    try {
      turn = JSON.parse(text) as BuilderTurn;
    } catch {
      console.error("[builder/chat] invalid JSON from model");
      await settle(false, quizId);
      return NextResponse.json({ error: "Something went wrong drafting your scorecard. Try again." }, { status: 502 });
    }

    if (!turn.quiz) break; // Claude needs more info; nothing to save.
    const result = normalizeDraft(turn.quiz, turn.calculator, turn.result_details);
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
  // Tap-question turns and passed-on feature requests are free; other replies cost 1 edit.
  if (!turn?.quiz) {
    const charged = questions.length === 0 && !featureRequest;
    await track(featureRequest ? "feature_request" : questions.length ? "tap_questions" : "chat_reply", {
      orgId: user.organizationId,
      quizId,
      props: featureRequest ? { request: featureRequest } : { questions: questions.length },
      request,
    });
    return NextResponse.json({ reply, questions, quizId, credits: await settle(charged, quizId) });
  }
  if (!normalized) {
    console.error("[builder/chat] draft still invalid:", errorsForRetry);
    await track("chat_error", { orgId: user.organizationId, quizId, props: { reason: "invalid_draft" }, request });
    return NextResponse.json({
      reply: "I had trouble putting that scorecard together. Could you describe it a little differently?",
      quizId,
      credits: await settle(false, quizId),
    });
  }

  // Design template: an edit keeps the quiz's current look; a brand-new quiz
  // gets the template that suits the business (Classic when nothing matches).
  const template = isTemplateKey(current?.builder_config?.template)
    ? current!.builder_config.template
    : pickTemplate(
        `${normalized.name} ${normalized.start_headline}`,
        history.find((m) => m.role === "user")?.content || "",
        scorecard ? describeAnswers(scorecard).join(" ") : "",
        user.orgName
      );

  const quizRow = {
    name: normalized.name,
    start_headline: normalized.start_headline,
    start_subheadline: normalized.start_subheadline,
    start_cta_text: normalized.start_cta_text,
    max_score: normalized.max_score,
    cta_url: normalized.cta_url,
    // Owner photos stay with the scorecard across AI edits (and new versions).
    builder_config: { ...normalized.builder_config, template, ...(current?.builder_config?.images ? { images: current.builder_config.images } : {}) },
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
      console.error("[builder/chat] scorecard update error:", upErr.message);
      await settle(false, current.id);
      return NextResponse.json({ error: "Could not save your scorecard. Try again." }, { status: 500 });
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
      console.error("[builder/chat] scorecard insert error:", insErr?.message);
      await settle(false, null);
      return NextResponse.json({ error: "Could not save your scorecard. Try again." }, { status: 500 });
    }
    savedId = created.id;
  }

  const { error: qErr } = await supabase
    .from("quiz_questions")
    .insert(normalized.questions.map((q) => ({ ...q, quiz_id: savedId })));
  if (qErr) {
    console.error("[builder/chat] questions insert error:", qErr.message);
    await settle(false, savedId);
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

  await track(forked ? "quiz_forked" : current ? "quiz_edited" : "quiz_built", {
    orgId: user.organizationId,
    quizId: savedId,
    props: {
      kind: normalized.builder_config.kind,
      questions: normalized.questions.length,
      cost_usd: Number(costUsd(usage).toFixed(4)),
    },
    request,
  });

  return NextResponse.json({
    reply: forked
      ? `${reply}\n\n(Your live scorecard already has leads, so I saved these changes as a new version. Publish it when you're ready.)`
      : reply,
    questions,
    quizId: savedId,
    forked,
    credits: await settle(true, savedId),
  });
}
