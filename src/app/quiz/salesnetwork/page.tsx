import { createServiceClient } from "@/lib/supabase";
import { Quiz, QuizQuestion } from "@/lib/types";
import { notFound } from "next/navigation";
import SalesNetworkForm from "./SalesNetworkForm";

export const dynamic = "force-dynamic";

export default async function SalesNetworkPage() {
  const supabase = createServiceClient();

  // Fetch quiz by slug
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*")
    .eq("slug", "salesnetwork")
    .eq("is_active", true)
    .single<Quiz>();

  if (!quiz) notFound();

  // Fetch questions ordered
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("question_order", { ascending: true })
    .returns<QuizQuestion[]>();

  if (!questions || questions.length === 0) notFound();

  return <SalesNetworkForm quiz={quiz} questions={questions} />;
}
