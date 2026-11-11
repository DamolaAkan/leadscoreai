import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { BOOK_SIZES, COUNTRIES, FINANCES, ROLES } from "@/lib/repayment-score";
import { decrypt } from "@/lib/encryption";
import { isLeadAlertEnabled, isPlanEmailEnabled, scoreSubmission, type DetailsIn } from "@/lib/repayment-score-server";

export const dynamic = "force-dynamic";

// Public Repayment Score submission. The browser sends option ids only; the
// score, part scores, plan and hot flag are worked out here.
//
// Saving FAILS OPEN: if the table is missing (migration not applied yet) or the
// insert errors, the visitor still gets their result and we log the error.
//
// Email: the lead gets their plan PDF, and akanbi@leadscoreai.com gets an alert
// for every lead. Turn either off with REPAYMENT_SCORE_EMAIL=off or
// REPAYMENT_SCORE_ALERT=off. No SMS or WhatsApp is ever sent from here.

// Same key lookup as the solar alerts: the stored LeadScoreAI Resend key
// (leadscoreai.com is verified on that account), env key as a last resort.
async function resendKey(): Promise<string | undefined> {
  try {
    const { data } = await createServiceClient()
      .from("org_features")
      .select("resend_api_key")
      .not("resend_api_key", "is", null)
      .limit(1)
      .single();
    if (data?.resend_api_key) return decrypt(data.resend_api_key);
  } catch (e) {
    console.error("[repayment-score/submit] key lookup error:", e);
  }
  return process.env.RESEND_API_KEY || undefined;
}

const ROLE_IDS = new Set(ROLES.map((r) => r.id));
const FIN_IDS = new Set(FINANCES.map((f) => f.id));
const BOOK_IDS = new Set(BOOK_SIZES.map((b) => b.id));
const COUNTRY_SET = new Set(COUNTRIES);

const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const d = body?.details || {};
    const details: DetailsIn = {
      name: str(d.name, 120),
      company: str(d.company, 160),
      role: str(d.role, 40),
      email: str(d.email, 200).toLowerCase(),
      whatsapp: str(d.whatsapp, 30),
      finances: str(d.finances, 40),
      country: str(d.country, 60),
      bookSize: str(d.bookSize, 40),
      raising: d.raising === true,
      consent: d.consent === true,
    };

    const bad =
      details.name.length < 2 ||
      details.company.length < 2 ||
      !ROLE_IDS.has(details.role) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email) ||
      details.whatsapp.replace(/\D/g, "").length < 8 ||
      !FIN_IDS.has(details.finances) ||
      !COUNTRY_SET.has(details.country) ||
      !BOOK_IDS.has(details.bookSize) ||
      typeof d.raising !== "boolean" ||
      !details.consent;
    if (bad) return NextResponse.json({ error: "Please complete every field." }, { status: 400 });

    const scored = scoreSubmission(body?.answers, details);
    if (!scored) return NextResponse.json({ error: "Please answer all 21 questions." }, { status: 400 });

    const { allowed } = await checkRateLimit(request, "repayment_score_submit", 30);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const emailEnabled = isPlanEmailEnabled();
    let saved = false;
    let leadId: string | null = null;

    try {
      const supabase = createServiceClient();
      const url = str(body?.source?.url, 500) || null;
      const { data, error } = await supabase
        .from("repayment_score_leads")
        .insert({
          name: details.name,
          company: details.company,
          role: details.role,
          email: details.email,
          whatsapp: details.whatsapp,
          finances: details.finances,
          country: details.country,
          book_size: details.bookSize,
          book_over_1m: scored.bookOver1m,
          raising_money: details.raising,
          consent: details.consent,
          consent_at: new Date().toISOString(),
          total_score: scored.result.total,
          part_scores: scored.partScores,
          weakest_part: scored.result.weakest.key,
          weakest_score: scored.result.weakest.score,
          answers: scored.answers,
          is_hot: scored.isHot,
          hot_reasons: scored.hotReasons,
          source_url: url,
          referrer: str(body?.source?.referrer, 500) || null,
        })
        .select("id")
        .single();
      if (error) console.error("[repayment-score/submit] insert error:", error.message);
      else {
        saved = true;
        leadId = data?.id ?? null;
      }
    } catch (e) {
      console.error("[repayment-score/submit] save exception:", e);
    }

    // Emails: the plan to the lead (with consent) and an alert to the team for
    // every lead. Both are best-effort and never block the result.
    let emailSent = false;
    const alertEnabled = isLeadAlertEnabled();
    if ((emailEnabled && details.consent) || alertEnabled) {
      try {
        const [{ buildRepaymentPlanPdf }, emails, { sendSequenceEmail }] = await Promise.all([
          import("@/lib/repayment-score-pdf"),
          import("@/lib/repayment-score-email"),
          import("@/lib/email"),
        ]);
        const apiKey = await resendKey();
        if (!apiKey) {
          console.error("[repayment-score/submit] no Resend key available");
        } else {
          const base = { apiKey, fromEmail: "hello@leadscoreai.com", fromName: "LeadScoreAI" };
          const jobs: Promise<void>[] = [];
          if (emailEnabled && details.consent) {
            const pdf = Buffer.from(buildRepaymentPlanPdf(scored.result).output("arraybuffer"));
            const { subject, html } = emails.planEmail(scored.result);
            jobs.push(
              sendSequenceEmail({
                ...base,
                to: details.email,
                subject,
                html,
                replyTo: emails.REPLY_TO,
                attachments: [{ filename: "repayment-score-90-day-plan.pdf", content: pdf }],
              }).then(async (sent) => {
                if (sent.error) return console.error("[repayment-score/submit] plan email error:", sent.error);
                emailSent = true;
                if (leadId) {
                  await createServiceClient()
                    .from("repayment_score_leads")
                    .update({ plan_emailed_at: new Date().toISOString() })
                    .eq("id", leadId);
                }
              })
            );
          }
          if (alertEnabled && emails.ALERT_TO.length) {
            const { subject, html } = emails.alertEmail(scored.result, details, scored.isHot, scored.hotReasons);
            jobs.push(
              sendSequenceEmail({ ...base, to: emails.ALERT_TO, subject, html, replyTo: details.email }).then((sent) => {
                if (sent.error) console.error("[repayment-score/submit] alert email error:", sent.error);
              })
            );
          }
          await Promise.allSettled(jobs);
        }
      } catch (e) {
        console.error("[repayment-score/submit] email exception:", e);
      }
    }

    return NextResponse.json({ result: { ...scored.result, emailSent, saved } });
  } catch (err) {
    console.error("[repayment-score/submit] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
