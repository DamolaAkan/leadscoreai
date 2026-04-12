export type SequenceStep = {
  step: number;
  delayDays: number;
  subject: string;
  getHtml: (prospect: {
    firstName: string;
    score: number;
    percentage: number;
    tierLabel: string;
  }) => string;
};

export type SequenceConfig = {
  [track: string]: SequenceStep[];
};

export const TIER_LABELS: Record<string, string> = {
  HOT_LEAD: "Peak Performer",
  WARM_LEAD: "High Potential",
  COLD_LEAD: "Building Momentum",
  NOT_QUALIFIED: "Early Stage",
};

const ACCENT = "#0077B6";
const CALENDLY = "https://calendly.com/vitalicmetrics";

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VITALIC Metrics</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f8;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<!-- Header bar -->
<tr><td style="background-color:${ACCENT};padding:24px 40px;">
<h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">VITALIC Metrics</h1>
</td></tr>
<!-- Content -->
<tr><td style="padding:40px;">
${content}
</td></tr>
</table>
<!-- Footer -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 40px;text-align:center;">
<p style="margin:0;font-size:13px;color:#999999;">VITALIC Metrics</p>
<p style="margin:4px 0 0;font-size:12px;color:#bbbbbb;"><a href="#" style="color:#bbbbbb;text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function ctaButton(text: string, href: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 16px;">
<tr><td align="center">
<a href="${href}" style="display:inline-block;background-color:${ACCENT};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">${text}</a>
</td></tr>
</table>`;
}

function scoreBlock(score: number, percentage: number, tierLabel: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f0f9ff;border-radius:12px;border-left:4px solid ${ACCENT};">
<tr><td style="padding:20px 24px;">
<p style="margin:0 0 4px;font-size:13px;color:#666666;font-weight:500;">YOUR PERFORMANCE SCORE</p>
<p style="margin:0;font-size:36px;font-weight:700;color:${ACCENT};">${percentage}%</p>
<p style="margin:4px 0 0;font-size:14px;color:#888888;">${score} points &middot; ${tierLabel}</p>
</td></tr>
</table>`;
}

export const sequenceConfig: SequenceConfig = {
  // ─── HOT LEAD (3 emails) ───────────────────────────
  HOT_LEAD: [
    {
      step: 0,
      delayDays: 0,
      subject: "Your VITALIC performance score is in \u{1F525}",
      getHtml: ({ firstName, score, percentage, tierLabel }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Congratulations — your performance assessment is complete, and your results are <strong>impressive</strong>.</p>
${scoreBlock(score, percentage, tierLabel)}
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">You scored in our <strong>top tier</strong>. That tells us you already have the foundations of a peak performer — the discipline, the drive, the self-awareness.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">But here is what separates the top 1% from everyone else: <strong>a system</strong>. Talent gets you noticed. A system makes it consistent.</p>
<p style="margin:0 0 8px;font-size:17px;color:#1a1a1a;line-height:1.6;">Our 90-day High Performance Coaching Programme is built for people exactly at your level. It takes what is already working and makes it unshakeable.</p>
${ctaButton("Book Your Free Strategy Call", CALENDLY)}
<p style="margin:0;font-size:14px;color:#999999;text-align:center;">No obligation. 30 minutes. Let us show you the gap between good and elite.</p>
`),
    },
    {
      step: 1,
      delayDays: 3,
      subject: "We have 2 coaching spots left this week",
      getHtml: ({ firstName, score, percentage, tierLabel }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Quick follow-up on your performance score from earlier this week.</p>
${scoreBlock(score, percentage, tierLabel)}
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Your results tell us something important: <strong>you are ready for structured performance coaching</strong>. Not everyone is. Most people need more time to build the foundations first. You have already done that work.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">We take on a limited number of coaching clients each month to ensure every person gets the attention they deserve. Right now, we have <strong>2 spots left</strong> for this week's intake.</p>
<p style="margin:0 0 8px;font-size:17px;color:#1a1a1a;line-height:1.6;">Your window to act is this week. After that, the next cohort opens in 30 days.</p>
${ctaButton("Claim Your Spot", CALENDLY)}
`),
    },
    {
      step: 2,
      delayDays: 7,
      subject: "Your performance ceiling — are you okay with where it is?",
      getHtml: ({ firstName, score, percentage, tierLabel }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">I want to ask you something directly.</p>
${scoreBlock(score, percentage, tierLabel)}
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Your score showed real potential. But here is the honest truth: <strong>potential without action stays potential</strong>.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">The gap between knowing what to do and consistently doing it — that is exactly what the 90-day programme is designed to close. It is the difference between having good weeks and having a good system.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">You have already proven you have what it takes. The question is whether you are willing to invest 90 days to make it permanent.</p>
<p style="margin:0 0 8px;font-size:17px;color:#1a1a1a;line-height:1.6;">No more wondering "what if." Let us build the system together.</p>
${ctaButton("Start the Programme", CALENDLY)}
`),
    },
  ],

  // ─── WARM LEAD (4 emails) ──────────────────────────
  WARM_LEAD: [
    {
      step: 0,
      delayDays: 0,
      subject: "Your VITALIC performance score is in \u2B50",
      getHtml: ({ firstName, score, percentage, tierLabel }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Your performance assessment is complete — and there is a lot to be proud of here.</p>
${scoreBlock(score, percentage, tierLabel)}
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">You scored <strong>${percentage}%</strong> — solid foundations with some clear gaps. Here is the good news: <strong>those gaps are entirely fixable</strong>.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Our 90-day High Performance Coaching Programme is designed for people at exactly your stage. Strong enough to benefit from structured coaching, aware enough to know there is another level waiting.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">The programme covers performance habits, energy management, focused output, and recovery — the four pillars that separate consistent high performers from everyone else.</p>
${ctaButton("See How It Works", CALENDLY)}
`),
    },
    {
      step: 1,
      delayDays: 5,
      subject: "The one habit that separates high performers from the rest",
      getHtml: ({ firstName }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">There is one habit that separates people who perform at a high level from people who are simply busy. And it is not what most people think.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">It is not waking up earlier. It is not grinding harder. It is not productivity hacks.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;"><strong>It is protecting your recovery as fiercely as you protect your output.</strong></p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">The highest performers we work with understand that performance is not about doing more — it is about recovering smarter so that every hour of work counts. They design their days around energy, not just time.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">One practical shift you can make today: block 20 minutes after your most demanding task of the day. Not for another task — for nothing. Walk, breathe, reset. Watch what happens to your afternoon output.</p>
<p style="margin:0 0 8px;font-size:17px;color:#1a1a1a;line-height:1.6;">Small shift. Significant results.</p>
${ctaButton("Curious How Your Score Compares?", CALENDLY)}
`),
    },
    {
      step: 2,
      delayDays: 10,
      subject: "Ready to close the gap, {firstName}?",
      getHtml: ({ firstName, score, percentage, tierLabel }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">I wanted to check in personally.</p>
${scoreBlock(score, percentage, tierLabel)}
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Your score tells a clear story: you are someone who takes performance seriously. You already have strong foundations. But there is a gap between where you are and where you could be — and that gap is <strong>closable</strong>.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">The 90-day programme is built for people at your exact level. Strong enough to benefit from structured coaching, aware enough to want more. It is not about starting from scratch — it is about accelerating what is already working.</p>
<p style="margin:0 0 8px;font-size:17px;color:#1a1a1a;line-height:1.6;">Let us have a conversation about what that looks like for you.</p>
${ctaButton("Book a Free Call", CALENDLY)}
`),
    },
    {
      step: 3,
      delayDays: 14,
      subject: "Still thinking about it? No pressure.",
      getHtml: ({ firstName }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">I will keep this short.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">There is no hard sell here. If the timing is not right, that is completely okay. Life has seasons, and not every season is the right one to commit to a new programme.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">But if you are still thinking about your performance score — if it keeps coming back to mind — <strong>that is a signal worth listening to</strong>.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">The door is open. Whenever you are ready, we are here.</p>
${ctaButton("When You\u2019re Ready, We\u2019re Here", CALENDLY)}
`),
    },
  ],

  // ─── COLD LEAD (3 emails) ──────────────────────────
  COLD_LEAD: [
    {
      step: 0,
      delayDays: 0,
      subject: "Your VITALIC performance score is in",
      getHtml: ({ firstName, score, percentage, tierLabel }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Your performance assessment is complete. Thank you for taking the time.</p>
${scoreBlock(score, percentage, tierLabel)}
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Your score tells us you are in a demanding season right now — and <strong>that is completely okay</strong>. Recovery and reset are some of the most underrated parts of high performance. Sometimes the bravest thing you can do is acknowledge where you are.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">We put together a free resource — a simple 3-step daily reset that takes less than 10 minutes. No commitment, no pitch. Just something practical that can help right now.</p>
${ctaButton("Get the Free Reset Guide", CALENDLY)}
`),
    },
    {
      step: 1,
      delayDays: 7,
      subject: "One small shift that changes everything",
      getHtml: ({ firstName }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Here is something that costs nothing and changes everything: <strong>the last 30 minutes before you sleep</strong>.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Most people spend that time scrolling, watching the news, or answering one last email. High performers treat that window like sacred ground.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Try this tonight: 30 minutes before bed, put your phone in another room. Spend 10 minutes writing down three things that went well today. Then read something that has nothing to do with work.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">That is it. Do it for a week and pay attention to how you feel in the mornings.</p>
<p style="margin:0 0 8px;font-size:17px;color:#1a1a1a;line-height:1.6;">If you try it, reply and let us know how it goes. We read every reply.</p>
`),
    },
    {
      step: 2,
      delayDays: 14,
      subject: "Whenever you\u2019re ready",
      getHtml: ({ firstName }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">This is the last email in this series, and I want to keep it simple.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Performance is not a straight line. There are seasons of pushing hard and seasons of recovery. Wherever you are right now is exactly where you need to be.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">When the season shifts — and it will �� the door is open. Our 90-day High Performance Coaching Programme is here for when you are ready to take the next step.</p>
<p style="margin:0 0 8px;font-size:17px;color:#1a1a1a;line-height:1.6;">No rush. No pressure. Just an open invitation.</p>
${ctaButton("Learn About the Programme", CALENDLY)}
`),
    },
  ],

  // ─── NOT QUALIFIED (1 email) ───────────────────────
  NOT_QUALIFIED: [
    {
      step: 0,
      delayDays: 0,
      subject: "Your VITALIC results \u2014 a good place to start",
      getHtml: ({ firstName, score, percentage, tierLabel }) =>
        emailWrapper(`
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Thank you for completing the VITALIC Performance Assessment. It takes courage to take an honest look at where you are — and that alone puts you ahead of most people.</p>
${scoreBlock(score, percentage, tierLabel)}
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">Your score shows you are earlier in the performance journey. And that is perfectly fine — <strong>everyone starts somewhere</strong>. The people who reach the top tier all started with a first step.</p>
<p style="margin:0 0 16px;font-size:17px;color:#1a1a1a;line-height:1.6;">We have put together a collection of free resources — practical tips on energy, focus, and daily habits — that can help you start building momentum right now. No commitment required.</p>
${ctaButton("Start With Our Free Guide", CALENDLY)}
<p style="margin:0;font-size:14px;color:#999999;text-align:center;">This is the only email we will send. No spam, ever.</p>
`),
    },
  ],
};
