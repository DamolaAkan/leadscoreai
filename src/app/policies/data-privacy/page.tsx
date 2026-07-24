export const metadata = { title: "Data Privacy — LeadScoreAI" };

const h2 = "text-base font-semibold text-[#1e293b] mt-7 mb-2";
const p = "text-sm text-[#475569] leading-relaxed mb-3";
const ul = "list-disc pl-5 text-sm text-[#475569] leading-relaxed space-y-1 mb-3";

export default function DataPrivacyPage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-[#111827]">Data Privacy Notice</h1>
      <p className="text-sm text-[#94a3b8] mt-1">Working draft · how we handle your personal data as a team member</p>

      <h2 className={h2}>1. What we collect</h2>
      <p className={p}>Through onboarding and your work, we hold information such as:</p>
      <ul className={ul}>
        <li>Your name, date of birth, gender, address, phone, and personal email.</li>
        <li>Your government ID type and number, and a passport photograph.</li>
        <li>Your bank details, used to pay your salary and commissions.</li>
        <li>Next of kin and guarantor details.</li>
        <li>Your job title, staff ID, and work records.</li>
      </ul>

      <h2 className={h2}>2. Why we hold it</h2>
      <p className={p}>
        We use this information only to run the employment relationship: to set you up, pay you, meet legal and tax
        obligations, reach your emergency contacts if needed, and keep proper records. We do not sell it or use it for
        anything unrelated to your work.
      </p>

      <h2 className={h2}>3. Who can see it</h2>
      <p className={p}>
        Access is limited to the people who need it, mainly management and whoever runs HR and payroll. We share it
        outside the company only where required, for example with a bank to pay you or where the law requires it.
      </p>

      <h2 className={h2}>4. How we keep it safe</h2>
      <p className={p}>
        Your details are stored in our secured systems with restricted access. We take reasonable steps to protect them
        and to prevent unauthorised access.
      </p>

      <h2 className={h2}>5. How long we keep it</h2>
      <p className={p}>
        We keep your information for as long as you are engaged with us and for a reasonable period afterwards to meet
        legal, tax, and record-keeping needs, then remove it.
      </p>

      <h2 className={h2}>6. Your rights</h2>
      <p className={p}>
        You can ask to see the personal data we hold about you, and ask us to correct anything that is wrong or out of
        date. Speak to management or HR to do so.
      </p>

      <h2 className={h2}>7. Client and lead data</h2>
      <p className={p}>
        Separately from your own data, you will handle the personal data of clients and leads. That must be protected
        under our confidentiality agreement and used only for its intended purpose.
      </p>

      <h2 className={h2}>8. Consent</h2>
      <p className={p}>
        By ticking the data privacy acknowledgement on your onboarding form, you consent to LeadScoreAI holding and using
        your details as described here.
      </p>
    </article>
  );
}
