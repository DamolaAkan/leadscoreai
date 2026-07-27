// Founder note sent from Damola after someone completes the Loan Doctor
// check-up. Personal, plain, tier-aware. Mirrors the on-screen health tiers so
// the email matches the result they just saw, then ties it to Manifesto No. 1.

const MANIFESTO_URL = "https://leadscoreai.com/manifesto/episode1";
const CALENDLY_URL = "https://calendly.com/leadscoreai/30min?back=1";
const ACCENT = "#6d28d9";

function tierFor(percentage: number): { label: string; take: string } {
  if (percentage >= 80)
    return {
      label: "Healthy",
      take:
        "That is a strong, well-run book. The next level is using AI to pre-score every applicant for repayment and benchmark your book against other MFBs.",
    };
  if (percentage >= 60)
    return {
      label: "Fair",
      take:
        "A solid base, with room to tighten. More data and pre-screening would cut defaults and free your officers from chasing applicants who never qualify.",
    };
  if (percentage >= 40)
    return {
      label: "Needs work",
      take:
        "There are real gaps costing you money — too many bad loans and too much officer time slipping through. Pre-scoring applicants before approval would close most of it.",
    };
  return {
    label: "At risk",
    take:
      "Your book is exposed — approvals lean on gut and officers bleed time into applicants who never qualify. That is exactly where defaults come from, and it is fixable.",
  };
}

export function buildFounderEmail({
  firstName,
  percentage,
}: {
  firstName: string;
  percentage: number;
}): { subject: string; html: string } {
  const name = firstName || "there";
  const tier = tierFor(percentage);
  const subject = `${name}, here's what your loan-book check-up tells me`;

  const p = "margin:0 0 18px;font-size:16px;line-height:1.65;color:#1e293b;";
  const btn = `display:inline-block;font-size:15px;font-weight:600;text-decoration:none;padding:13px 24px;border-radius:8px;`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f6f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f4fb;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:14px;border:1px solid #ece7f6;">
        <tr><td style="padding:36px 40px 8px;">
          <p style="${p}">Hi ${name},</p>
          <p style="${p}">Thanks for taking the Loan Doctor check-up. I read every result that comes through, so I wanted to reach out personally.</p>
          <p style="${p}">Your loan book scored <strong>${percentage}%</strong> — <strong style="color:${ACCENT};">${tier.label}</strong>. ${tier.take}</p>
          <p style="${p}">Here's the thing most microfinance banks and lenders miss: a bad loan isn't lost at collection, it's decided at approval. By the time repayment stops, the decision was already made. The lenders with the healthiest books don't chase harder — they qualify better. They pre-score every applicant on willingness <em>and</em> ability to repay, work only the ready-and-able, and let their own data predict who pays back, not gut feel.</p>
          <p style="${p}">That's the whole idea behind LeadScoreAI. I wrote it up in our first manifesto — worth three minutes if this resonates:</p>
          <p style="margin:0 0 26px;">
            <a href="${MANIFESTO_URL}" style="${btn}color:${ACCENT};border:2px solid ${ACCENT};background:#ffffff;">Read Manifesto No. 1 &rarr;</a>
          </p>
          <p style="${p}">If you'd like, I'll walk through your specific situation and show you how to pre-score your applicants for repayment, live on your own pipeline:</p>
          <p style="margin:0 0 30px;">
            <a href="${CALENDLY_URL}" style="${btn}color:#ffffff;background:${ACCENT};">Book a 30-minute call &rarr;</a>
          </p>
          <p style="${p}">Either way, thanks for taking the time.</p>
          <p style="margin:0 0 2px;font-size:16px;line-height:1.5;color:#1e293b;font-weight:600;">Damola Akanbi</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#64748b;">Founder, LeadScoreAI &middot; <a href="https://leadscoreai.com" style="color:${ACCENT};text-decoration:none;">leadscoreai.com</a></p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#a3a0ad;">You received this because you took the Loan Doctor check-up at leadscoreai.com.</p>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html };
}
