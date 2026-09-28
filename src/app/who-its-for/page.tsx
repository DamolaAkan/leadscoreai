import type { Metadata } from "next";
import { WHO_ITS_FOR, WHO_ITS_FOR_INTRO, WHO_ITS_FOR_TITLE, type Block } from "@/lib/who-its-for";
import PrintButton from "./PrintButton";

export const metadata: Metadata = {
  title: WHO_ITS_FOR_TITLE, // the root layout appends "| LeadScoreAI"
  description: WHO_ITS_FOR_INTRO,
};

function Lead({ lead, text }: { lead?: string; text: string }) {
  return (
    <>
      {lead && <b className="font-semibold text-slate-900">{lead}</b>}
      {text}
    </>
  );
}

function renderBlock(b: Block, i: number) {
  if (b.kind === "h3") {
    return (
      <h3 key={i} className="mt-8 text-[20px] font-bold tracking-[-0.01em] text-slate-900">
        {b.text}
      </h3>
    );
  }
  if (b.kind === "list") {
    return (
      <ul key={i} className="mt-4 space-y-2.5 list-disc pl-6 marker:text-violet-500">
        {b.items.map((it) => (
          <li key={it.lead ?? it.text}>
            <Lead lead={it.lead} text={it.text} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p key={i} className="mt-4">
      <Lead lead={b.lead} text={b.text} />
    </p>
  );
}

// Plain, printable statement of what people enrol in when they join LeadScoreAI.
export default function WhoItsForPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFB] text-[#0B0B12] print:bg-white">
      <header className="print:hidden sticky top-0 z-40 px-3 pt-3">
        <nav className="max-w-3xl mx-auto flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] pl-3 pr-1.5 py-1.5">
          <a href="/" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/favicon-64.png" alt="" className="w-8 h-8 rounded-lg" />
            <span className="font-bold tracking-tight max-[359px]:hidden">LeadScoreAI</span>
          </a>
          <div className="ml-auto flex items-center gap-1">
            <PrintButton />
            <a
              href="/"
              className="rounded-full bg-violet-600 hover:bg-violet-700 text-white text-[13px] sm:text-[14px] font-semibold px-3.5 sm:px-4 py-2.5 whitespace-nowrap"
            >
              Find my serious buyers
            </a>
          </div>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-5 sm:px-6 pt-12 sm:pt-16 pb-20 text-[17px] sm:text-[18px] leading-relaxed text-slate-700 print:pt-0 print:text-[12pt]">
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-600 print:text-slate-500">
          LeadScoreAI
        </p>
        <h1 className="mt-3 text-[36px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900">
          {WHO_ITS_FOR_TITLE}
        </h1>
        <p className="mt-6 text-[19px] sm:text-[21px] leading-relaxed text-slate-800">{WHO_ITS_FOR_INTRO}</p>

        {WHO_ITS_FOR.map((s) => (
          <section key={s.heading} className="mt-12 break-inside-avoid-page">
            <h2 className="text-[26px] sm:text-[30px] font-extrabold tracking-[-0.02em] text-slate-900">{s.heading}</h2>
            {s.blocks.map(renderBlock)}
          </section>
        ))}

        <p className="mt-12 text-slate-500">Damola Akanbi, founder of LeadScoreAI</p>

        <div className="print:hidden mt-12 rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 text-center">
          <p className="text-[20px] font-bold text-slate-900">Sounds like you?</p>
          <p className="mt-2 text-slate-600">Build your first quiz free. You only pay when you put it live.</p>
          <a
            href="/"
            className="mt-5 inline-block rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[16px] px-7 py-4"
          >
            Find my serious buyers
          </a>
        </div>
      </main>
    </div>
  );
}
