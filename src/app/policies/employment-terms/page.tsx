export const metadata = { title: "Employment Terms — LeadScoreAI" };

const h2 = "text-base font-semibold text-[#1e293b] mt-7 mb-2";
const p = "text-sm text-[#475569] leading-relaxed mb-3";
const ul = "list-disc pl-5 text-sm text-[#475569] leading-relaxed space-y-1 mb-3";

export default function EmploymentTermsPage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-[#111827]">Employment Terms</h1>
      <p className="text-sm text-[#94a3b8] mt-1">Working draft · summary of your engagement with LeadScoreAI</p>

      <p className={`${p} mt-4`}>
        These terms summarise the basis of your engagement. Your individual offer letter sets your specific role, start
        date, and pay, and takes precedence where it differs from this summary.
      </p>

      <h2 className={h2}>1. Your role</h2>
      <p className={p}>
        You are engaged in the role and title stated in your offer. You agree to perform your duties diligently, act in
        the company&apos;s best interests, and follow reasonable instructions from management.
      </p>

      <h2 className={h2}>2. Probation</h2>
      <p className={p}>
        New team members serve a probation period as stated in the offer. During probation, either side may end the
        engagement with short notice while fit and performance are assessed.
      </p>

      <h2 className={h2}>3. Pay and commission</h2>
      <ul className={ul}>
        <li>Your base pay and schedule are set out in your offer.</li>
        <li>
          Sales roles earn commission on the LeadScoreAI Scorecard: 2.5% of the setup fee on deals you close and that are
          approved.
        </li>
        <li>
          Setup fees charged in dollars are converted to naira for commission at a maximum of 1,350 naira per dollar. The
          actual CBN rate on the clearance date is kept on record.
        </li>
        <li>Commissions are approved and paid through the commission ledger. SiteFlip and Practice Interactions do not earn commission.</li>
      </ul>

      <h2 className={h2}>4. Working arrangement</h2>
      <p className={p}>
        Your hours, location, and any remote arrangement are as agreed in your offer. You are expected to be reachable
        and responsive during agreed working hours.
      </p>

      <h2 className={h2}>5. Leave</h2>
      <p className={p}>
        You are entitled to annual leave and statutory public holidays as set out in your offer or the staff handbook.
        Leave should be requested and approved in advance.
      </p>

      <h2 className={h2}>6. Confidentiality and conduct</h2>
      <p className={p}>
        Your engagement is subject to our confidentiality and non-disclosure agreement and our code of conduct, which
        form part of your terms.
      </p>

      <h2 className={h2}>7. Ending the engagement</h2>
      <p className={p}>
        Either side may end the engagement by giving the notice stated in your offer. The company may end it without
        notice for serious misconduct. On leaving, you must return company property and hand over your work.
      </p>

      <h2 className={h2}>8. Acceptance</h2>
      <p className={p}>
        By ticking the employment acknowledgement on your onboarding form, you confirm your details are correct and that
        you accept these terms together with your offer letter.
      </p>
    </article>
  );
}
