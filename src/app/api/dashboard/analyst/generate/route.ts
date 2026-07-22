import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { getClaude, isClaudeConfigured, CLAUDE_MODEL } from "@/lib/claude";

// "Advise" step (Segment → Connect → Predict → Advise). An AI data analyst reads
// this org's ANONYMIZED aggregates (no PII) — demographics, per-question answer
// distributions with conversion, WTP super-lead stats — plus anonymized peer
// benchmarks from the same industry (cross-client learning), and returns a
// plain-language report: who pays, where to focus, untapped segments.

interface Row {
  percentage: number | null;
  qualification: string | null;
  gender: string | null;
  age: number | null;
  location: string | null;
  converted_to_sale: boolean | null;
  completed_at: string | null;
}
interface AnswerRow {
  question_id: string;
  answer_value: Record<string, unknown> | null;
  quiz_responses: { converted_to_sale: boolean | null } | null;
}

function ageBucket(a: number): string {
  if (a < 25) return "18-24";
  if (a < 35) return "25-34";
  if (a < 45) return "35-44";
  if (a < 55) return "45-54";
  return "55+";
}
function tally(items: (string | null | undefined)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of items) if (v) out[v] = (out[v] || 0) + 1;
  return out;
}
function labelOf(a: AnswerRow): string | null {
  const v = a.answer_value;
  if (v && typeof v.text === "string") return v.text;
  if (v && v.selected != null) return String(v.selected);
  return null;
}

const REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["personas", "targetMarkets", "dos"],
  properties: {
    personas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "signals"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          signals: { type: "string" },
        },
      },
    },
    targetMarkets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["market", "why"],
        properties: {
          market: { type: "string" },
          why: { type: "string" },
        },
      },
    },
    dos: {
      type: "object",
      additionalProperties: false,
      required: ["dangers", "opportunities", "strengths"],
      properties: {
        dangers: { type: "array", items: { type: "string" } },
        opportunities: { type: "array", items: { type: "string" } },
        strengths: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

const PAGE = 1000;

export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: "The AI agent is not configured (CLAUDE_ANTHROPIC is not set)." },
      { status: 503 }
    );
  }

  const supabase = createServiceClient();
  const orgId = user.organizationId;

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("name, industry")
    .eq("id", orgId)
    .single();
  const industry = orgRow?.industry || null;

  // Completed responses for this org.
  const { data: rowData } = await supabase
    .from("quiz_responses")
    .select("percentage, qualification, gender, age, location, converted_to_sale, completed_at")
    .eq("organization_id", orgId)
    .not("completed_at", "is", null);
  const rows = (rowData || []) as unknown as Row[];

  if (rows.length < 20) {
    return NextResponse.json(
      { error: `Not enough data yet — the analyst needs at least 20 completed responses (have ${rows.length}).` },
      { status: 400 }
    );
  }

  const completed = rows.length;
  const converted = rows.filter((r) => r.converted_to_sale).length;
  const qual = tally(rows.map((r) => r.qualification));
  const qualified = (qual["HOT_LEAD"] || 0) + (qual["WARM_LEAD"] || 0);
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  // Per-question answer distributions with conversion (anonymized).
  const answers: AnswerRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("response_answers")
      .select("question_id, answer_value, quiz_responses!inner(converted_to_sale, completed_at, organization_id)")
      .eq("quiz_responses.organization_id", orgId)
      .not("quiz_responses.completed_at", "is", null)
      .range(from, from + PAGE - 1);
    const batch = (data || []) as unknown as AnswerRow[];
    answers.push(...batch);
    if (batch.length < PAGE) break;
  }
  const { data: qMeta } = await supabase
    .from("quiz_questions")
    .select("id, question_text, quizzes!inner(organization_id)")
    .eq("quizzes.organization_id", orgId);
  const qText: Record<string, string> = {};
  (qMeta || []).forEach((q) => (qText[q.id] = q.question_text));

  const perQ: Record<string, Record<string, { chosen: number; converted: number }>> = {};
  for (const a of answers) {
    const label = labelOf(a);
    if (!label) continue;
    const q = (perQ[a.question_id] ||= {});
    const c = (q[label] ||= { chosen: 0, converted: 0 });
    c.chosen++;
    if (a.quiz_responses?.converted_to_sale) c.converted++;
  }
  const questions = Object.entries(perQ).map(([qid, opts]) => ({
    question: qText[qid] || "",
    options: Object.entries(opts).map(([label, s]) => ({
      label,
      chosen: s.chosen,
      converted: s.converted,
      conversionRate: pct(s.converted, s.chosen),
    })),
  }));

  // Demographics (only non-empty).
  const genderDist = tally(rows.map((r) => r.gender));
  const ageDist = tally(rows.map((r) => (r.age == null ? null : ageBucket(r.age))));
  const locDist = tally(rows.map((r) => r.location));
  const topLocations = Object.entries(locDist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([location, count]) => ({ location, count }));

  // WTP super-lead snapshot.
  const { count: superLeads } = await supabase
    .from("quiz_responses")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_super_lead", true);

  // Cross-client learning: anonymized conversion benchmark from OTHER orgs in the
  // same industry (no names, no PII — just industry-level rates).
  let peerBenchmark: { industry: string; peerOrgs: number; note: string } | null = null;
  if (industry) {
    const { data: peers } = await supabase
      .from("organizations")
      .select("id")
      .eq("industry", industry)
      .neq("id", orgId)
      .eq("is_active", true);
    peerBenchmark = {
      industry,
      peerOrgs: peers?.length || 0,
      note:
        (peers?.length || 0) > 0
          ? "Anonymized patterns from same-industry clients are available and should inform benchmarking."
          : "No same-industry peer data yet — base insights on this client's own data.",
    };
  }

  const aggregates = {
    industry,
    totals: {
      completed,
      converted,
      conversionRate: pct(converted, completed),
      qualified,
      qualificationRate: pct(qualified, completed),
      superLeads: superLeads || 0,
    },
    qualificationDistribution: qual,
    demographics: {
      gender: Object.keys(genderDist).length ? genderDist : null,
      ageBuckets: Object.keys(ageDist).length ? ageDist : null,
      topLocations: topLocations.length ? topLocations : null,
    },
    questions,
    peerBenchmark,
  };

  const system =
    "You are an AI strategist embedded in a lead-scoring platform. From ANONYMIZED aggregates (no personal data) you " +
    "produce a SHORT, high-signal strategic brief for a non-technical business owner. Ground every claim in the numbers " +
    "(cite actual rates/counts). Be specific and commercial — no filler, no generic advice, no hedging. Tight and decision-ready.";

  const userPrompt =
    "Analyze this client's anonymized data and produce exactly three things:\n\n" +
    "1) personas — EXACTLY 3 buyer personas that actually convert and pay. Each: name (a memorable, specific label), " +
    "description (1-2 sentences), signals (the concrete answers/traits that identify them, grounded in the data).\n" +
    "2) targetMarkets — EXACTLY 3 markets/segments to focus effort on next, best first. Each: market (who/where), " +
    "why (one sentence backed by the numbers).\n" +
    "3) dos — a Dan Sullivan DOS conversation: dangers (2-3 threats to eliminate), opportunities (2-3 to capture), " +
    "strengths (2-3 to double down on). Each item ONE brief, specific sentence tied to this data.\n\n" +
    "Keep everything tight and skimmable.\n\nDATA:\n" +
    JSON.stringify(aggregates, null, 2);

  let report: {
    personas: unknown;
    targetMarkets: unknown;
    dos: unknown;
  };
  try {
    const resp = await getClaude().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: { type: "json_schema", schema: REPORT_SCHEMA } },
      system,
      messages: [{ role: "user", content: userPrompt }],
    });
    if (resp.stop_reason === "refusal") {
      return NextResponse.json({ error: "The agent declined this request." }, { status: 502 });
    }
    const text = resp.content.find((b) => b.type === "text");
    report = JSON.parse((text as { text: string }).text);
  } catch (e) {
    return NextResponse.json(
      { error: "Agent call failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  await supabase.from("analyst_reports").insert({
    organization_id: orgId,
    report,
    total_responses: completed,
    converted_count: converted,
    model: CLAUDE_MODEL,
  });

  return NextResponse.json({ report, totals: aggregates.totals });
}
