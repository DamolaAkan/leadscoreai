// Proof blocks and the coaches & consultants specialty picker for the
// builder landing pages.
import { COACH_BRANCHES } from "@/lib/coach-pages";

// Latseminary (Women & Marriage webinar): numbers from the original
// LeadScoreAI dashboard. Organisation name only.
export function LatseminaryProof() {
  const stats = [
    { n: "530", l: "leads in the first 2 weeks" },
    { n: "49%", l: "of ad clicks became leads" },
    { n: "648", l: "leads in total" },
    { n: "132", l: "clicked through to the webinar" },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 grid lg:grid-cols-2 gap-12 items-center [&>*]:min-w-0">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-600">Case study · a ministry</p>
        <h2 className="mt-3 text-[32px] sm:text-[44px] font-extrabold tracking-[-0.03em] leading-[1.08]">
          How Latseminary filled a Women &amp; Marriage webinar with one quiz.
        </h2>
        <p className="mt-6 text-[17px] leading-relaxed text-slate-600">
          Latseminary ran a 2-week Instagram campaign to a simple relationship quiz:{" "}
          <b className="text-slate-900">“Rate your communication skills in your relationships.”</b> People were curious
          about their own relationships, so they took it, left their email for a detailed report, and were invited to the
          webinar and the Latseminary community.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="text-[32px] font-extrabold tracking-[-0.03em] text-violet-600 leading-none">{s.n}</div>
              <div className="mt-1.5 text-[14px] text-slate-600 leading-snug">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-3xl overflow-hidden shadow-xl ring-1 ring-slate-200 bg-white">
          <div className="h-44 bg-gradient-to-b from-[#f59e0b] via-[#e2583e] to-[#5b2150] flex items-end justify-center">
            <span className="text-6xl mb-6" aria-hidden>
              💞
            </span>
          </div>
          <div className="p-6 text-center">
            <p className="text-[20px] font-extrabold leading-snug text-[#0B0B12]">Rate your communication skills in your relationships</p>
            <p className="mt-2 text-[14px] text-slate-500">
              Take this quiz to get a detailed report on your communication with your spouse and loved ones.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
              <span className="text-amber-500">✔</span> 1,084 people have taken this quiz
            </p>
            <div className="mt-5 rounded-xl bg-violet-600 py-3 text-[15px] font-bold text-white">Get started</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// "What kind of coach or consultant are you?": one tap to your own page.
export function CoachBranchPicker({ current }: { current: string }) {
  const groups: [string, "coach" | "consultant"][] = [
    ["Coaches", "coach"],
    ["Consultants", "consultant"],
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
      <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-8">
        <p className="text-[18px] sm:text-[22px] font-bold tracking-[-0.01em]">What kind of coach or consultant are you?</p>
        <p className="mt-1 text-[15px] text-slate-500">Pick yours to see quizzes made for your clients.</p>
        {groups.map(([title, group]) => (
          <div key={group} className="mt-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COACH_BRANCHES.filter((b) => b.group === group).map((b) => {
                const on = current === b.key;
                return (
                  <a
                    key={b.key}
                    href={`/build/coaches/${b.key}`}
                    aria-current={on ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-semibold transition ${
                      on ? "bg-[#0B0B12] text-white" : "bg-slate-100 text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                    }`}
                  >
                    <span>{b.emoji}</span>
                    {b.label}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
