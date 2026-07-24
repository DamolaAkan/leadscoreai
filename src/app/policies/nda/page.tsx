export const metadata = { title: "Confidentiality & NDA — LeadScoreAI" };

const h2 = "text-base font-semibold text-[#1e293b] mt-7 mb-2";
const p = "text-sm text-[#475569] leading-relaxed mb-3";
const ul = "list-disc pl-5 text-sm text-[#475569] leading-relaxed space-y-1 mb-3";

export default function NdaPage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-[#111827]">Confidentiality and Non-Disclosure Agreement</h1>
      <p className="text-sm text-[#94a3b8] mt-1">Working draft · applies to all LeadScoreAI team members</p>

      <h2 className={h2}>1. Purpose</h2>
      <p className={p}>
        In your role you will have access to information that is private to LeadScoreAI, our clients, and the people who
        fill in our scorecards. This agreement sets out how you must protect that information, during and after your time
        with us.
      </p>

      <h2 className={h2}>2. What counts as confidential information</h2>
      <p className={p}>Confidential information includes, but is not limited to:</p>
      <ul className={ul}>
        <li>Client lists, deals, pricing, contracts, and commercial terms.</li>
        <li>Lead and prospect data, including names, contact details, and scorecard answers.</li>
        <li>Our methodology, scorecard designs, willingness-to-pay approach, and analytics.</li>
        <li>Product plans, source code, internal tools, and business strategy.</li>
        <li>Login credentials, API keys, and access to any company or client system.</li>
      </ul>

      <h2 className={h2}>3. Your obligations</h2>
      <ul className={ul}>
        <li>Keep confidential information secret and secure at all times.</li>
        <li>Use it only to do your job, and only to the extent you need to.</li>
        <li>Do not copy, share, forward, or store it outside approved company systems.</li>
        <li>Do not discuss client or lead information with anyone who does not need to know it.</li>
        <li>Report any suspected leak, loss, or unauthorised access immediately.</li>
      </ul>

      <h2 className={h2}>4. Personal data</h2>
      <p className={p}>
        Lead and client personal data must be handled with particular care. Only collect and use what is needed, never
        sell or misuse it, and never move it out of the platform. If you are unsure whether something is allowed, ask
        before you act.
      </p>

      <h2 className={h2}>5. How long this lasts</h2>
      <p className={p}>
        These obligations apply throughout your engagement with LeadScoreAI and continue after it ends. Confidentiality
        does not expire simply because you have left.
      </p>

      <h2 className={h2}>6. Returning information</h2>
      <p className={p}>
        When you leave, or whenever we ask, you must return or securely delete all confidential information and company
        property in your possession, and give up access to all systems.
      </p>

      <h2 className={h2}>7. Breach</h2>
      <p className={p}>
        Breaching this agreement is a serious matter and may lead to disciplinary action, termination, and legal
        remedies. If a breach causes loss to the company or a client, you may be held responsible for it.
      </p>

      <h2 className={h2}>8. Acceptance</h2>
      <p className={p}>
        By ticking the confidentiality acknowledgement on your onboarding form, you confirm that you have read,
        understood, and agree to be bound by this agreement.
      </p>
    </article>
  );
}
