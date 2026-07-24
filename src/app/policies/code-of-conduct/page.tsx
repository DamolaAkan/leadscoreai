export const metadata = { title: "Code of Conduct — LeadScoreAI" };

const h2 = "text-base font-semibold text-[#1e293b] mt-7 mb-2";
const p = "text-sm text-[#475569] leading-relaxed mb-3";
const ul = "list-disc pl-5 text-sm text-[#475569] leading-relaxed space-y-1 mb-3";

export default function CodeOfConductPage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-[#111827]">Code of Conduct</h1>
      <p className="text-sm text-[#94a3b8] mt-1">Working draft · how we work at LeadScoreAI</p>

      <p className={`${p} mt-4`}>
        LeadScoreAI helps businesses find the leads that will actually convert. That only works when our clients and
        their prospects can trust us. This code sets out the standards we hold each other to.
      </p>

      <h2 className={h2}>1. Integrity first</h2>
      <p className={p}>
        Be honest in everything you do, whether or not anyone is watching. Do not exaggerate results, mislead a client,
        or promise what we cannot deliver. If you make a mistake, own it early.
      </p>

      <h2 className={h2}>2. Respect people and their data</h2>
      <ul className={ul}>
        <li>Treat clients, leads, colleagues, and partners with courtesy and respect.</li>
        <li>Protect the personal data of leads and clients, and only use it for its intended purpose.</li>
        <li>Never share client or lead information with anyone who does not need it.</li>
      </ul>

      <h2 className={h2}>3. Honest selling</h2>
      <p className={p}>
        Represent our products and pricing accurately. Set realistic expectations about what a scorecard can and cannot
        do. A satisfied client who understood what they bought is worth more than a quick, oversold deal.
      </p>

      <h2 className={h2}>4. Conflicts of interest</h2>
      <p className={p}>
        Avoid situations where your personal interests clash with the company or a client. If a conflict is possible, for
        example working with a competitor or a family business, disclose it to management before proceeding.
      </p>

      <h2 className={h2}>5. Gifts and anti-bribery</h2>
      <p className={p}>
        Do not offer, give, ask for, or accept bribes, kickbacks, or improper payments to win or keep business. Modest,
        openly given business courtesies are fine; anything that could look like buying influence is not.
      </p>

      <h2 className={h2}>6. Company systems and property</h2>
      <ul className={ul}>
        <li>Use company accounts, tools, and devices for legitimate work only.</li>
        <li>Keep your logins secure and never share credentials.</li>
        <li>Follow our confidentiality agreement when handling any company or client information.</li>
      </ul>

      <h2 className={h2}>7. A safe and fair workplace</h2>
      <p className={p}>
        We do not tolerate harassment, discrimination, or bullying of any kind. Everyone deserves to work in a safe,
        inclusive, and professional environment.
      </p>

      <h2 className={h2}>8. Speak up</h2>
      <p className={p}>
        If you see something that breaks this code, or that just does not feel right, raise it with your manager or
        management. Concerns raised in good faith will be taken seriously and never held against you.
      </p>

      <h2 className={h2}>9. Acceptance</h2>
      <p className={p}>
        By ticking the code of conduct acknowledgement on your onboarding form, you confirm that you have read and accept
        these standards.
      </p>
    </article>
  );
}
