// Self-serve lifecycle emails: welcome, the 7-day nudge series (stops once they
// pay), Pro welcome, renewal reminder, lapsed plan, plus team alerts for new
// sign-ups and purchases. Every owner email is claimed in builder_email_log
// first, so each one sends at most once however often the triggers fire.
import { createServiceClient } from "./supabase";
import { getResendKey } from "./builder-server";
import { sendSequenceEmail } from "./email";
import { GO_LIVE_DISCOUNT_NAIRA, TIERS } from "./paystack";
import { WHO_ITS_FOR, WHO_ITS_FOR_INTRO, WHO_ITS_FOR_TITLE, type Block } from "./who-its-for";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.leadscoreai.com";
const FROM = { fromEmail: "hello@leadscoreai.com", fromName: "LeadScoreAI" };
const SUPPORT = "stella@leadscoreai.com";
export const TEAM_ALERTS = ["akanbi@leadscoreai.com", "stella@leadscoreai.com"];

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" });

export interface EmailOrg {
  id: string;
  name: string;
  slug: string;
  email: string | null;
}

const builderUrl = (o: EmailOrg) => `${APP_URL}/dashboard/${o.slug}?tab=builder`;
const settingsUrl = (o: EmailOrg) => `${APP_URL}/dashboard/${o.slug}?tab=settings`;

// One branded layout for every owner email: heading, paragraphs, one button.
function layout(opts: { heading: string; body: string[]; cta?: { label: string; href: string }; ps?: string }): string {
  const paras = opts.body.map((p) => `<p style="margin:0 0 14px;">${p}</p>`).join("");
  const button = opts.cta
    ? `<p style="margin:22px 0 6px;"><a href="${opts.cta.href}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:999px;">${opts.cta.label}</a></p>`
    : "";
  const ps = opts.ps ? `<p style="margin:18px 0 0;color:#667085;font-size:14px;">${opts.ps}</p>` : "";
  return `
<div style="background:#f5f3ff;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;padding:28px 24px;color:#1f2533;font-size:15.5px;line-height:1.6;">
    <p style="margin:0 0 18px;font-weight:800;font-size:16px;color:#16202e;">
      <img src="${APP_URL}/logo/favicon-64.png" width="22" height="22" alt="" style="vertical-align:-5px;border-radius:6px;margin-right:6px;">LeadScoreAI
    </p>
    <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#16202e;">${opts.heading}</h1>
    ${paras}${button}${ps}
  </div>
  <p style="max-width:520px;margin:14px auto 0;text-align:center;color:#98a2b3;font-size:12px;line-height:1.5;">
    You're getting this because you signed up to LeadScoreAI. Questions? Just reply, or talk to support at ${SUPPORT}.
  </p>
</div>`;
}

// ── Owner emails ────────────────────────────────────────────────────────────

export type OwnerEmailKind =
  | "welcome"
  | "nudge_d1"
  | "nudge_d3"
  | "nudge_d5"
  | "nudge_d7"
  | "pro_welcome"
  | "who_its_for"
  | "renewal_due"
  | "lapsed";

export interface EmailContext {
  hasQuiz: boolean;
  offerEndsAt: string | null; // live go-live offer, if any
  periodEnd?: string | null; // Pro: paid until
  amountPaid?: number;
  quizLive?: boolean;
  price?: number; // this owner's Pro price (tierPriceFor); defaults to the current price
}

// The "Who it's for" statement as email paragraphs (same words as /who-its-for).
function whoItsForHtml(): string[] {
  const lead = (l: string | undefined, t: string) => `${l ? `<b>${esc(l)}</b>` : ""}${esc(t)}`;
  const block = (b: Block): string =>
    b.kind === "h3"
      ? `<b>${esc(b.text)}</b>`
      : b.kind === "list"
        ? b.items.map((it) => `• ${lead(it.lead, it.text)}`).join("<br>")
        : lead(b.lead, b.text);
  return WHO_ITS_FOR.flatMap((s) => [
    `<span style="display:block;margin-top:10px;font-size:18px;font-weight:800;color:#16202e;">${esc(s.heading)}</span>`,
    ...s.blocks.map(block),
  ]);
}

function offerLine(ctx: EmailContext): string {
  const PRO = ctx.price ?? TIERS.builder.naira;
  return ctx.offerEndsAt
    ? `Go live before <b>${day(ctx.offerEndsAt)}</b> and your first month is <b>${naira(PRO - GO_LIVE_DISCOUNT_NAIRA)}</b> instead of ${naira(PRO)}.`
    : `Go live on Pro for ${naira(PRO)} a month. Build your first quiz and go live within 48 hours to save ${naira(GO_LIVE_DISCOUNT_NAIRA)} on your first month.`;
}

export function ownerEmail(kind: OwnerEmailKind, o: EmailOrg, ctx: EmailContext): { subject: string; html: string } {
  const name = esc(o.name);
  const PRO = ctx.price ?? TIERS.builder.naira;
  switch (kind) {
    case "welcome":
      return {
        subject: `Welcome to LeadScoreAI, ${o.name} 👋`,
        html: layout({
          heading: "You're in. Let's find your serious buyers.",
          body: [
            `Welcome, ${name}. Describe your business in the chat and LeadScoreAI builds a quiz that tells you what each customer wants and whether they're ready to pay.`,
            `You have <b>30 free AI edits</b> to build and try it. Every quiz includes a few willingness-to-pay questions, so every lead comes in with a score from 0 to 100.`,
            `When you're happy with it, go live on Pro for ${naira(PRO)} a month. Go live within 48 hours of building your first quiz and your first month is ${naira(PRO - GO_LIVE_DISCOUNT_NAIRA)}.`,
            `LeadScoreAI isn't for every business. <a href="${APP_URL}/who-its-for" style="color:#6d28d9;">Read who it's for</a> before you start.`,
          ],
          cta: { label: "Build my first quiz", href: builderUrl(o) },
          ps: "Tip: start with one sentence like “I sell hair extensions in Lagos and want to know who's ready to buy.”",
        }),
      };
    case "who_its_for":
      return {
        subject: "Who LeadScoreAI is for (and who it isn't)",
        html: layout({
          heading: esc(WHO_ITS_FOR_TITLE),
          body: [esc(WHO_ITS_FOR_INTRO), ...whoItsForHtml(), `<span style="color:#667085;">Damola Akanbi, founder of LeadScoreAI</span>`],
          cta: { label: ctx.hasQuiz ? "Open my builder" : "Build my first quiz", href: builderUrl(o) },
          ps: `Want to print it or share it? It's on our website: <a href="${APP_URL}/who-its-for" style="color:#6d28d9;">${APP_URL.replace(/^https?:\/\//, "")}/who-its-for</a>`,
        }),
      };
    case "nudge_d1":
      return ctx.hasQuiz
        ? {
            subject: "Your quiz is ready. Put it in front of customers",
            html: layout({
              heading: "Your quiz is built. Now let it find your buyers.",
              body: [
                `Nice work, ${name}. Your quiz is ready to try in the builder. The next step is getting it in front of real customers on WhatsApp, Instagram or your website.`,
                offerLine(ctx),
              ],
              cta: { label: "Go live now", href: builderUrl(o) },
            }),
          }
        : {
            subject: "Your first quiz is one message away",
            html: layout({
              heading: "Build your first quiz in one chat",
              body: [
                `Hi ${name}, you haven't built your first quiz yet. It takes about a minute: tell the builder what you sell and who your customers are, and it drafts everything.`,
                `Try one of these:<br>• “I install solar in Abuja. Tell me which homes can afford it.”<br>• “I run a clinic. Help people find the right health check.”<br>• “I sell wigs. Match customers to the perfect hair.”`,
              ],
              cta: { label: "Start building", href: builderUrl(o) },
            }),
          };
    case "nudge_d3":
      return {
        subject: "Know who's ready to pay before you reply",
        html: layout({
          heading: "Not just a quiz. A quiz that finds your buyer.",
          body: [
            `Every LeadScoreAI quiz asks a few willingness-to-pay questions about budget, timing and commitment, in your brand's voice. Each lead gets a score from 0 to 100, so you call the ready ones first.`,
            `<i>“With LeadScoreAI we were able to determine our prospects' willingness to pay. We were able to build our own data.”</i><br>Seni Olayemi, CEO, Oríkì Energy`,
            offerLine(ctx),
          ],
          cta: { label: ctx.hasQuiz ? "Go live" : "Build my quiz", href: builderUrl(o) },
        }),
      };
    case "nudge_d5":
      return {
        subject: "Share your quiz where your customers already are",
        html: layout({
          heading: "One tap to WhatsApp",
          body: [
            `Once your quiz is live, you can share it on WhatsApp with a proper preview card, put the link in your Instagram bio or status, or add it to your website with one line of code.`,
            `Every answer lands in your dashboard, scored Hot, Warm or Cold with a willingness-to-pay score, so you know exactly who to message first.`,
            offerLine(ctx),
          ],
          cta: { label: ctx.hasQuiz ? "Go live and share" : "Build my quiz", href: builderUrl(o) },
        }),
      };
    case "nudge_d7":
      return {
        subject: "Ready when you are",
        html: layout({
          heading: `Ready when you are, ${name}`,
          body: [
            `It's been a week since you joined. Your quiz and your free AI edits are still waiting for you.`,
            `Pro is ${naira(PRO)} a month and includes 2,000 leads a month, 10 live quizzes, 150 AI edits a month and a willingness-to-pay score on every lead.`,
            `Stuck, or need something the builder can't do? Reply to this email and our support team will help.`,
          ],
          cta: { label: "Open my builder", href: builderUrl(o) },
        }),
      };
    case "pro_welcome":
      return {
        subject: "You're in: LeadScoreAI Pro is active 🎉",
        html: layout({
          heading: "Congratulations, you're on Pro 🎉",
          body: [
            `Thanks, ${name}. ${ctx.amountPaid ? `We've received your payment of <b>${naira(ctx.amountPaid)}</b> and ` : ""}Pro is active${ctx.periodEnd ? ` until <b>${day(ctx.periodEnd)}</b>` : ""}.`,
            ctx.quizLive
              ? `Your quiz is now <b>live</b>. Share it on WhatsApp from the builder and watch your leads come in.`
              : `You can now publish your quizzes. Open the builder, tap Publish, and share it on WhatsApp.`,
            `Your plan includes 2,000 leads a month, 10 live quizzes and 150 AI edits a month. We'll remind you a few days before it's time to renew.`,
          ],
          cta: { label: "Open my dashboard", href: builderUrl(o) },
        }),
      };
    case "renewal_due":
      return {
        subject: `Your Pro plan renews on ${ctx.periodEnd ? day(ctx.periodEnd) : "soon"}`,
        html: layout({
          heading: "Your Pro plan is due for renewal",
          body: [
            `Hi ${name}, your LeadScoreAI Pro plan runs until <b>${ctx.periodEnd ? day(ctx.periodEnd) : "soon"}</b>.`,
            `Renew for ${naira(PRO)} to keep your quizzes live and your leads coming in. Pay by bank transfer, card or USSD in Settings.`,
          ],
          cta: { label: "Renew my plan", href: settingsUrl(o) },
        }),
      };
    case "lapsed":
      return {
        subject: "Your Pro plan has ended: your quizzes are paused",
        html: layout({
          heading: "We didn't receive your renewal",
          body: [
            `Hi ${name}, your LeadScoreAI Pro plan ended${ctx.periodEnd ? ` on <b>${day(ctx.periodEnd)}</b>` : ""} and we didn't receive a renewal payment, so your quizzes are paused and aren't taking new answers.`,
            `Everything is saved. Renew for ${naira(PRO)} and your quizzes go straight back to work.`,
            `If you paid and still see this, reply to this email and we'll sort it out.`,
          ],
          cta: { label: "Renew my plan", href: settingsUrl(o) },
        }),
      };
  }
}

// Claim the (org, kind, key) slot, then send. Returns true if an email went out.
export async function sendOwnerEmailOnce(
  kind: OwnerEmailKind,
  o: EmailOrg,
  ctx: EmailContext,
  dedupeKey = ""
): Promise<boolean> {
  if (!o.email) return false;
  const supabase = createServiceClient();
  const { data: claim, error: claimErr } = await supabase
    .from("builder_email_log")
    .insert({ organization_id: o.id, kind, dedupe_key: dedupeKey })
    .select("id")
    .single();
  if (claimErr || !claim) return false; // already sent (unique) or insert failed
  try {
    const apiKey = await getResendKey();
    if (!apiKey) throw new Error("no Resend key");
    const { subject, html } = ownerEmail(kind, o, ctx);
    const res = await sendSequenceEmail({ to: o.email, subject, html, apiKey, ...FROM, replyTo: SUPPORT });
    if (res.error) throw new Error(res.error);
    await supabase.from("builder_email_log").update({ resend_id: res.id }).eq("id", claim.id);
    return true;
  } catch (e) {
    console.error(`[builder-emails] ${kind} for ${o.id} failed:`, e);
    // Release the claim so the next run retries.
    await supabase.from("builder_email_log").delete().eq("id", claim.id);
    return false;
  }
}

// ── Team alerts (Damola + Stella) ─────────────────────────────────────────

export async function sendTeamAlert(subject: string, rows: [string, string][]): Promise<void> {
  try {
    const apiKey = await getResendKey();
    if (!apiKey) return;
    const table = rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#667085;white-space:nowrap;">${esc(k)}</td><td style="padding:6px 0;color:#16202e;font-weight:600;">${esc(v)}</td></tr>`
      )
      .join("");
    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;"><p style="margin:0 0 10px;font-weight:700;">${esc(subject)}</p><table style="border-collapse:collapse;">${table}</table></div>`;
    await sendSequenceEmail({ to: TEAM_ALERTS, subject, html, apiKey, fromEmail: FROM.fromEmail, fromName: "LeadScoreAI Alerts" });
  } catch (e) {
    console.error("[builder-emails] team alert failed:", e);
  }
}

export const lagosNow = () =>
  new Date().toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });
