import type { Metadata } from "next";
import "./homepage.css";

const CALENDLY_URL = "https://calendly.com/leadscoreai";

export const metadata: Metadata = {
  title: "LeadscoreAI — A Full Pipeline of Pre-Qualified Buyers. Built and Running in 7 Days.",
  description:
    "Complete with automated lead scoring, AI voice calls, and email sequences that nurture your leads into paying clients — without you lifting a finger.",
};

function FunnelStep({
  title,
  sub,
  tag,
  tagClass,
  showConnector = true,
}: {
  title: string;
  sub: string;
  tag: string;
  tagClass: string;
  showConnector?: boolean;
}) {
  return (
    <div className="hp-funnel-step">
      <div className="hp-funnel-line">
        <div className="hp-funnel-dot">
          <div className="hp-funnel-dot-inner" />
        </div>
        {showConnector && <div className="hp-funnel-connector" />}
      </div>
      <div className="hp-funnel-card">
        <div>
          <div className="hp-funnel-card-title">{title}</div>
          <div className="hp-funnel-card-sub">{sub}</div>
        </div>
        <span className={`hp-tag ${tagClass}`}>{tag}</span>
      </div>
    </div>
  );
}

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
          <a href="#cta" className="hp-btn">
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
          <a href="#cta" className="hp-btn hp-btn-lg">
            Book a strategy call
          </a>
          <a href="#included" className="hp-btn-ghost">
            See what&apos;s included
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

      {/* How it works */}
      <section className="hp-section gray" id="how-it-works">
        <div className="hp-section-inner">
          <div className="hp-label">The complete funnel</div>
          <h2 className="hp-h2">
            One system. From click
            <br />
            to <em>qualified conversation.</em>
          </h2>
          <p className="hp-sub">
            Every piece is built for you, custom to your business, and running
            automatically from day one.
          </p>
          <div className="hp-funnel">
            <FunnelStep
              title="Custom AI marketing quiz"
              sub="Built around your product, your buyers, and your specific objections"
              tag="Quiz"
              tagClass="hp-t-purple"
            />
            <FunnelStep
              title="Instant AI lead scoring — 98% accuracy"
              sub="Every response qualified as hot, warm, or cold in real time"
              tag="Scoring"
              tagClass="hp-t-purple"
            />
            <FunnelStep
              title="Personalised results page"
              sub="Prospects see branded insights specific to their answers — not a generic score"
              tag="Results"
              tagClass="hp-t-amber"
            />
            <FunnelStep
              title="AI voice call — within 60 seconds"
              sub="Maya calls hot and warm leads automatically while they are still engaged"
              tag="Voice AI"
              tagClass="hp-t-green"
            />
            <FunnelStep
              title="Automated email sequences"
              sub="10–14 day nurture tracks by lead tier — written for your brand, automated from day one"
              tag="Email"
              tagClass="hp-t-amber"
            />
            <FunnelStep
              title="Live analytics dashboard"
              sub="Every lead, score, call transcript, and conversion visible in real time"
              tag="Dashboard"
              tagClass="hp-t-blue"
              showConnector={false}
            />
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

      {/* Pricing */}
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
              ["Custom quiz design and development", "strategy, build, scoring logic", "$8,000 one-time"],
              ["Enterprise CRM and lead scoring", "HubSpot / Salesforce equivalent", "$1,500/month"],
              ["Branded results page", "UX design and custom development", "$3,500 one-time"],
              ["Custom analytics dashboard", "design, build, and data integration", "$12,000 one-time"],
              ["Email marketing and automation", "platform plus copywriting", "$1,200/month"],
              ["AI outbound voice qualification", "enterprise voice AI platform", "$2,500/month"],
              ["Dedicated agency management", "strategy, ops, and optimisation", "$4,000/month"],
              ["Custom AI prompt engineering", "per campaign and persona build", "$3,000 one-time"],
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
          className="hp-btn hp-btn-white"
          style={{ fontSize: 16, padding: "18px 48px" }}
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
