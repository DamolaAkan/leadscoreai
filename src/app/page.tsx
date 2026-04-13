import type { Metadata } from "next";
import "./homepage.css";

const CALENDLY_URL = "https://calendly.com/akanbidamola";

export const metadata: Metadata = {
  title:
    "LeadscoreAI — A Full Pipeline of Pre-Qualified Buyers. Built and Running in 7 Days.",
  description:
    "Complete with automated lead scoring, AI voice calls, and email sequences that nurture your leads into paying clients — without you lifting a finger.",
};

function IncludedCard({
  num,
  title,
  sub,
}: {
  num: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="hp-included-card">
      <div className="hp-included-num">{num}</div>
      <div className="hp-included-title">{title}</div>
      <div className="hp-included-sub">{sub}</div>
    </div>
  );
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <div className="hp-plan-feature">
      <div className="hp-plan-dot" />
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="hp-body">
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;700;900&display=swap"
        rel="stylesheet"
      />

      {/* Nav */}
      <nav className="hp-nav">
        <a href="/" className="hp-logo">
          Leadscore<span>AI</span>
        </a>
        <div className="hp-nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#included">What&apos;s included</a>
          <a href="#pricing">Pricing</a>
          <a href="#cta" className="hp-nav-cta">
            Book a strategy call
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="hp-hero">
        <h1>
          A full pipeline of
          <br />
          <em>pre-qualified buyers.</em>
          <br />
          Built and running in 7 days.
        </h1>
        <p className="hp-hero-sub">
          Complete with automated lead scoring, AI voice calls, and email
          sequences that nurture your leads into paying clients — without you
          lifting a finger.
        </p>
        <p className="hp-hero-tagline">Stop selling to the wrong people.</p>
        <div className="hp-hero-cta">
          <a href="#cta" className="hp-btn-primary">
            Book a strategy call
          </a>
          <a href="#how-it-works" className="hp-btn-ghost">
            See how it works
          </a>
        </div>
        <div className="hp-hero-features">
          <div className="hp-hero-feat">
            <div className="hp-hero-feat-dot" />
            Custom quiz built for your business
          </div>
          <div className="hp-hero-feat">
            <div className="hp-hero-feat-dot" />
            AI voice calls within 60 seconds
          </div>
          <div className="hp-hero-feat">
            <div className="hp-hero-feat-dot" />
            Automated email nurture sequences
          </div>
          <div className="hp-hero-feat">
            <div className="hp-hero-feat-dot" />
            Live analytics dashboard
          </div>
        </div>
      </div>

      {/* How it works — Story Flow */}
      <section className="hp-section gray" id="how-it-works">
        <div className="hp-section-inner-narrow">
          <div className="hp-label">How it works</div>
          <h2 className="hp-h2">
            One system. From click
            <br />
            to <em>qualified conversation.</em>
          </h2>
          <p className="hp-sub">
            Every piece runs automatically. Your team only gets involved when a
            lead is already warm.
          </p>

          <div className="hp-funnel">
            {/* Step 1 — Quiz */}
            <div className="hp-funnel-step">
              <div className="hp-funnel-line">
                <div className="hp-funnel-dot">
                  <div className="hp-funnel-dot-inner" />
                </div>
                <div className="hp-funnel-connector" />
              </div>
              <div className="hp-funnel-card">
                <div className="hp-funnel-card-top">
                  <div className="hp-funnel-card-title">
                    Prospect takes your custom quiz
                  </div>
                  <div className="hp-tag hp-t-purple">Quiz</div>
                </div>
                <div className="hp-funnel-card-sub">
                  They answer questions built around your product, your buyers,
                  and the objections they face. Takes about 3 minutes.
                </div>
                <div className="hp-funnel-card-story">
                  Sarah lands on your quiz page. She answers every question.
                  She&apos;s curious what her results say.
                </div>
              </div>
            </div>

            {/* Step 2 — Scoring */}
            <div className="hp-funnel-step">
              <div className="hp-funnel-line">
                <div className="hp-funnel-dot">
                  <div className="hp-funnel-dot-inner" />
                </div>
                <div className="hp-funnel-connector" />
              </div>
              <div className="hp-funnel-card">
                <div className="hp-funnel-card-top">
                  <div className="hp-funnel-card-title">
                    AI scores and qualifies instantly
                  </div>
                  <div className="hp-tag hp-t-purple">Scoring</div>
                </div>
                <div className="hp-funnel-card-sub">
                  Every response is scored in real time. Sarah is classified as
                  HOT, WARM, or COLD at 98% accuracy — before she even sees her
                  results.
                </div>
                <div className="hp-funnel-card-story">
                  Sarah scores 78/100. She&apos;s a Warm Lead. The system knows
                  exactly what she needs next.
                </div>
              </div>
            </div>

            {/* Step 3 — Contact */}
            <div className="hp-funnel-step">
              <div className="hp-funnel-line">
                <div className="hp-funnel-dot amber">
                  <div className="hp-funnel-dot-inner" />
                </div>
                <div className="hp-funnel-connector amber" />
              </div>
              <div className="hp-funnel-card amber">
                <div className="hp-funnel-card-top">
                  <div className="hp-funnel-card-title">
                    She submits her contact details
                  </div>
                  <div className="hp-tag hp-t-amber">Contact</div>
                </div>
                <div className="hp-funnel-card-sub">
                  To unlock her personalised results, Sarah enters her name,
                  email, and phone number. This is where the automation begins.
                </div>
                <div className="hp-funnel-card-story amber">
                  She hits submit. Her results page loads. The clock starts.
                </div>
              </div>
            </div>

            {/* Step 4 — Email */}
            <div className="hp-funnel-step">
              <div className="hp-funnel-line">
                <div className="hp-funnel-dot amber">
                  <div className="hp-funnel-dot-inner" />
                </div>
                <div className="hp-funnel-connector amber" />
              </div>
              <div className="hp-funnel-card amber">
                <div className="hp-funnel-card-top">
                  <div className="hp-funnel-card-title">
                    Her results land in her inbox immediately
                  </div>
                  <div className="hp-tag hp-t-amber">Email</div>
                </div>
                <div className="hp-funnel-card-sub">
                  A branded results email arrives with her score, personalised
                  insights, and a clear next step — written specifically for her
                  tier.
                </div>
                <div className="hp-funnel-card-story amber">
                  Sarah opens her inbox. There is already an email from your
                  brand waiting. It knows exactly what she answered.
                </div>
              </div>
            </div>

            {/* Step 5 — Voice AI */}
            <div className="hp-funnel-step">
              <div className="hp-funnel-line">
                <div className="hp-funnel-dot green">
                  <div className="hp-funnel-dot-inner" />
                </div>
                <div className="hp-funnel-connector green" />
              </div>
              <div className="hp-funnel-card green">
                <div className="hp-funnel-card-top">
                  <div className="hp-funnel-card-title">
                    Maya calls her phone — 60 seconds later
                  </div>
                  <div className="hp-tag hp-t-green">Voice AI</div>
                </div>
                <div className="hp-funnel-card-sub">
                  An AI voice agent calls Sarah while she is still reading her
                  results. Maya already knows her score, her answers, and her
                  name. The conversation is warm from the first word.
                </div>
                <div className="hp-funnel-card-story green">
                  &ldquo;Hi Sarah, this is Maya — an AI assistant from [your
                  company]. I saw you just completed our assessment and scored 78
                  out of 100. Is now an okay time for a couple of quick
                  questions?&rdquo;
                </div>
                <div className="hp-timer-badge">
                  <div className="hp-timer-dot" />
                  60 seconds after form submit
                </div>
              </div>
            </div>

            {/* Step 6 — Nurture */}
            <div className="hp-funnel-step">
              <div className="hp-funnel-line">
                <div className="hp-funnel-dot green">
                  <div className="hp-funnel-dot-inner" />
                </div>
                <div className="hp-funnel-connector green" />
              </div>
              <div className="hp-funnel-card green">
                <div className="hp-funnel-card-top">
                  <div className="hp-funnel-card-title">
                    Email sequence nurtures her over 14 days
                  </div>
                  <div className="hp-tag hp-t-green">Nurture</div>
                </div>
                <div className="hp-funnel-card-sub">
                  If Sarah doesn&apos;t convert immediately, she enters a 14-day
                  email sequence tailored to her score. Hot, warm, and cold leads
                  get completely different journeys.
                </div>
                <div className="hp-funnel-card-story green">
                  Day 5 — Sarah gets an email referencing her specific answers.
                  Day 10 — a soft CTA. Day 14 — a final nudge. Each one feels
                  personal.
                </div>
              </div>
            </div>

            {/* Step 7 — Dashboard */}
            <div className="hp-funnel-step">
              <div className="hp-funnel-line">
                <div className="hp-funnel-dot blue">
                  <div className="hp-funnel-dot-inner" />
                </div>
              </div>
              <div className="hp-funnel-card blue">
                <div className="hp-funnel-card-top">
                  <div className="hp-funnel-card-title">
                    Your team sees everything in the dashboard
                  </div>
                  <div className="hp-tag hp-t-blue">Dashboard</div>
                </div>
                <div className="hp-funnel-card-sub">
                  Score, call transcript, email status, conversion — all visible
                  in real time. Your team only picks up the phone when a lead is
                  already warm and ready.
                </div>
                <div className="hp-funnel-card-story blue">
                  Your sales rep opens the dashboard Monday morning. Sarah is
                  flagged as interested. The call transcript shows she said yes
                  to the budget question. They call her first.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="hp-section" id="included">
        <div className="hp-section-inner">
          <div className="hp-label">What&apos;s included</div>
          <h2 className="hp-h2">
            Everything built for you.
            <br />
            <em>Nothing to figure out.</em>
          </h2>
          <p className="hp-sub">
            This is a done-for-you consulting service. We build every piece
            custom to your business — you just speak to qualified leads.
          </p>
          <div className="hp-included-grid">
            <IncludedCard
              num="01"
              title="Custom quiz built in 7 days"
              sub="Questions, scoring logic, and qualification tiers designed specifically for your product and ideal buyer."
            />
            <IncludedCard
              num="02"
              title="Branded results page"
              sub="A personalised report that reflects your brand and gives prospects insights that make them want to act."
            />
            <IncludedCard
              num="03"
              title="AI voice agent — Maya"
              sub="Calls hot and warm leads within 60 seconds. Qualifies, warms, and books the next step automatically."
            />
            <IncludedCard
              num="04"
              title="Email sequences by tier"
              sub="Hot, warm, and cold leads each get a different journey — written for your brand, automated from day one."
            />
            <IncludedCard
              num="05"
              title="Admin dashboard"
              sub="See all leads, scores, call transcripts, email status, and conversions in one place. Export any time."
            />
            <IncludedCard
              num="06"
              title="Ongoing management"
              sub="We monitor, optimise, and update your funnel as your business grows. You never touch the tech."
            />
          </div>
        </div>
      </section>

      {/* Value Stack + Pricing */}
      <section className="hp-section dark" id="pricing">
        <div className="hp-section-inner">
          <div className="hp-label white">The value stack</div>
          <h2 className="hp-h2 white">
            What this would cost
            <br />
            if you <em>built it yourself.</em>
          </h2>
          <p className="hp-sub" style={{ marginBottom: 40 }}>
            We combined tools and services that businesses normally pay $50,000+
            per year for — and built them into one custom system at a fraction of
            the cost.
          </p>

          <div className="hp-value-stack">
            {[
              [
                "Custom quiz design and development",
                "strategy, build, scoring logic",
                "$8,000 one-time",
              ],
              [
                "Enterprise CRM and lead scoring",
                "HubSpot / Salesforce equivalent",
                "$1,500/month",
              ],
              [
                "Branded results page",
                "UX design and custom development",
                "$3,500 one-time",
              ],
              [
                "Custom analytics dashboard",
                "design, build, and data integration",
                "$12,000 one-time",
              ],
              [
                "Email marketing and automation",
                "platform plus copywriting",
                "$1,200/month",
              ],
              [
                "AI outbound voice qualification",
                "enterprise voice AI platform",
                "$2,500/month",
              ],
              [
                "Dedicated agency management",
                "strategy, ops, and optimisation",
                "$4,000/month",
              ],
              [
                "Custom AI prompt engineering",
                "per campaign and persona build",
                "$3,000 one-time",
              ],
            ].map(([title, desc, price]) => (
              <div className="hp-value-row" key={title}>
                <div className="hp-value-item">
                  <strong>{title}</strong> — {desc}
                </div>
                <div className="hp-value-price-cross">{price}</div>
              </div>
            ))}
          </div>

          <div className="hp-value-total">
            <div className="hp-value-total-label">Total market value</div>
            <div className="hp-value-total-num">$50,000+/year</div>
          </div>
          <div className="hp-value-note">
            Conservative estimate based on mid-market agency and SaaS pricing —
            enterprise rates are significantly higher.
          </div>

          <div className="hp-label white" style={{ marginBottom: 24 }}>
            Pricing
          </div>
          <h2 className="hp-h2 white" style={{ marginBottom: 40 }}>
            Simple pricing.
            <br />
            <em>Serious results.</em>
          </h2>

          <div className="hp-pricing-grid">
            {/* Starter */}
            <div className="hp-plan">
              <div className="hp-plan-name">Starter</div>
              <div className="hp-plan-price">$500</div>
              <div className="hp-plan-period">per month</div>
              <div className="hp-plan-divider" />
              <PlanFeature>Up to 100 responses/month</PlanFeature>
              <PlanFeature>Custom quiz build</PlanFeature>
              <PlanFeature>Lead scoring and qualification</PlanFeature>
              <PlanFeature>Branded results page</PlanFeature>
              <PlanFeature>Admin dashboard</PlanFeature>
              <PlanFeature>Email sequences (all tiers)</PlanFeature>
              <PlanFeature>Voice calls not included</PlanFeature>
              <div className="hp-plan-annual">$4,800/yr — save 20%</div>
            </div>

            {/* Growth */}
            <div className="hp-plan featured">
              <div className="hp-plan-badge">Most popular</div>
              <div className="hp-plan-name">Growth</div>
              <div className="hp-plan-price">$2,500</div>
              <div className="hp-plan-period">per month</div>
              <div className="hp-plan-divider" />
              <PlanFeature>Up to 500 responses/month</PlanFeature>
              <PlanFeature>Everything in Starter</PlanFeature>
              <PlanFeature>AI voice calls — 200/month</PlanFeature>
              <PlanFeature>Advanced analytics</PlanFeature>
              <PlanFeature>Priority support</PlanFeature>
              <div className="hp-plan-annual">$24,000/yr — save 20%</div>
            </div>

            {/* Scale */}
            <div className="hp-plan">
              <div className="hp-plan-name">Scale</div>
              <div className="hp-plan-price">$5,000</div>
              <div className="hp-plan-period">per month</div>
              <div className="hp-plan-divider" />
              <PlanFeature>Up to 2,000 responses/month</PlanFeature>
              <PlanFeature>Everything in Growth</PlanFeature>
              <PlanFeature>AI voice calls — 1,000/month</PlanFeature>
              <PlanFeature>Agent attribution network</PlanFeature>
              <PlanFeature>Custom email copy</PlanFeature>
              <PlanFeature>Dedicated account manager</PlanFeature>
              <div className="hp-plan-annual">$48,000/yr — save 20%</div>
            </div>

            {/* Enterprise */}
            <div className="hp-plan enterprise">
              <div className="hp-plan-badge ent">Enterprise</div>
              <div className="hp-plan-name">Revenue OS</div>
              <div className="hp-plan-price">$10,000</div>
              <div className="hp-plan-period">per month</div>
              <div className="hp-plan-divider" />
              <PlanFeature>Unlimited responses</PlanFeature>
              <PlanFeature>Unlimited voice calls</PlanFeature>
              <PlanFeature>Up to 5 custom quizzes</PlanFeature>
              <PlanFeature>White-label — your brand only</PlanFeature>
              <PlanFeature>Custom AI voice persona</PlanFeature>
              <PlanFeature>CRM integration</PlanFeature>
              <PlanFeature>Weekly strategy call</PlanFeature>
              <div className="hp-plan-annual">
                Annual contract — call to discuss
              </div>
            </div>
          </div>

          {/* Enterprise offer */}
          <div className="hp-enterprise-offer">
            <div>
              <div className="hp-eo-tag">$10,000/month — Revenue OS</div>
              <div className="hp-eo-title">
                Not a tool.
                <br />
                An <em>AI revenue team</em> that never sleeps.
              </div>
              <div className="hp-eo-sub">
                At $10,000/month you get a fully managed AI system that
                qualifies every lead, calls every hot prospect within 60
                seconds, nurtures every cold lead automatically, and gives your
                team a live dashboard of exactly who to speak to and when.
                Unlimited everything. Weekly strategy with our team. Your own
                voice persona. Your own brand.
              </div>
            </div>
            <div className="hp-eo-right">
              <div className="hp-eo-price">$10k</div>
              <div className="hp-eo-period">per month</div>
              <a href="#cta" className="hp-btn-amethyst">
                Book an enterprise call
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="hp-cta-section" id="cta">
        <h2>
          Ready to fill your pipeline
          <br />
          with <em>buyers who are ready?</em>
        </h2>
        <p className="hp-cta-sub">
          Book a free strategy call. We will walk through your business and show
          you exactly what your LeadscoreAI funnel looks like — built and
          running in 7 days.
        </p>
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hp-btn-white"
        >
          Book your free strategy call
        </a>
        <p className="hp-cta-note">
          No setup fees. No long-term contracts on Starter and Growth. Cancel
          anytime.
        </p>
      </div>
    </div>
  );
}
