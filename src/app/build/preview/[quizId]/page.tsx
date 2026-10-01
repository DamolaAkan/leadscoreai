import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import { Organization, Quiz, QuizQuestion } from "@/lib/types";
import QuizFlow from "@/app/[orgSlug]/[quizSlug]/QuizFlow";
import { isTemplateKey } from "@/lib/quiz-templates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Live preview of a builder quiz, draft or published. Runs entirely in the
// browser (preview mode): no lead is created and nobody is emailed.
export default async function BuilderPreviewPage({
  params,
  searchParams,
}: {
  params: { quizId: string };
  searchParams?: { template?: string; demo?: string };
}) {
  if (!UUID_RE.test(params.quizId)) notFound();
  const supabase = createServiceClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", params.quizId)
    .not("builder_config", "is", null)
    .maybeSingle<Quiz & { organization_id: string }>();
  if (!quiz) notFound();

  const [{ data: org }, { data: questions }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", quiz.organization_id).single<Organization>(),
    supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quiz.id)
      .order("question_order", { ascending: true })
      .returns<QuizQuestion[]>(),
  ]);
  if (!org || !questions?.length) notFound();

  // ?template=… previews another design without saving it.
  const t = searchParams?.template;
  const shown = isTemplateKey(t) && quiz.builder_config ? { ...quiz, builder_config: { ...quiz.builder_config, template: t } } : quiz;
  const flow = <QuizFlow org={org} quiz={shown} questions={questions} preview />;
  if (searchParams?.demo !== "1") return flow;

  // ?demo=1: the free demo link a marketer sends a client before they pay.
  const partnerId = (org as Organization & { partner_id?: string | null }).partner_id;
  const { data: partner } = partnerId
    ? await supabase.from("partners").select("full_name").eq("id", partnerId).maybeSingle()
    : { data: null };
  return (
    <>
      <div
        style={{ background: "#EDE9FE", color: "#5B21B6", fontFamily: "system-ui, sans-serif" }}
        className="px-4 py-2.5 text-center text-[13px] leading-snug"
      >
        Demo preview{partner?.full_name ? ` by ${partner.full_name}` : ""}. Answers aren&apos;t saved. Go live to start collecting leads.
      </div>
      {flow}
    </>
  );
}
