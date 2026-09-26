"use client";

// Product mockups for the builder landing page, drawn in HTML so they stay
// crisp on phones and always match the real product. Examples deliberately
// span different industries.
import { useEffect, useState } from "react";
import type { IndustryPage } from "@/lib/builder-industries";

// Hero phone: one industry's sample quiz, or a rotation through several.
export function PhoneQuiz({ demos }: { demos: IndustryPage["demo"][] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (demos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % demos.length), 3500);
    return () => clearInterval(t);
  }, [demos.length]);
  const demo = demos[idx % demos.length];
  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]">
      <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-violet-400/30 via-fuchsia-300/20 to-amber-200/30 blur-2xl" />
      <div className="relative rounded-[2.6rem] bg-[#0B0B12] p-2.5 shadow-[0_40px_80px_-30px_rgba(76,29,149,0.55)]">
        <div className="rounded-[2.1rem] overflow-hidden bg-gradient-to-b from-[#2A1356] to-[#150A2E] text-white">
          <div className="flex justify-center pt-2.5">
            <span className="h-5 w-24 rounded-full bg-black/80" />
          </div>
          <div key={idx} className="px-5 pt-4 pb-6 animate-[fadeIn_0.5s_ease]">
            <div className="flex items-center justify-between text-[11px] text-violet-200/80">
              <span className="font-semibold">{demo.brand}</span>
              <span>Question 2 of 6</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10">
              <div className="h-full w-1/3 rounded-full bg-violet-400" />
            </div>
            <p className="mt-6 text-[19px] font-bold leading-snug">{demo.question}</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
              {demo.options.map((o, i) => (
                <div
                  key={o.text}
                  className={`rounded-2xl px-3 py-4 text-center border ${
                    i === 0 ? "bg-violet-500/25 border-violet-300 ring-2 ring-violet-400/50" : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="text-[28px] leading-none">{o.emoji}</div>
                  <div className="mt-2 text-[12px] font-semibold leading-tight">{o.text}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-violet-500 py-3 text-center text-[13px] font-bold">Next →</div>
          </div>
        </div>
      </div>
      {demos.length > 1 && (
        <div className="relative mt-5 flex justify-center gap-1.5">
          {demos.map((d, i) => (
            <button
              key={d.brand}
              onClick={() => setIdx(i)}
              aria-label={d.brand}
              className={`h-1.5 rounded-full transition-all ${i === idx % demos.length ? "w-6 bg-violet-600" : "w-1.5 bg-slate-300"}`}
            />
          ))}
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

export function ChatVisual() {
  return (
    <div className="rounded-3xl bg-[#0E1525] p-5 sm:p-6 text-[14px] text-[#F5F9FC] shadow-xl space-y-3">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-3">
        I sell homes in Lekki. I want a quiz that shows which buyers have the budget and timeline to buy before I book viewings.
      </div>
      <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-[#1C2333] border border-[#2B3245] px-4 py-3">
        Love it. Two quick choices before I build:
        <p className="mt-3 text-[12px] font-semibold text-[#9DA2A6]">Buyers, renters or both?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-violet-500/20 ring-1 ring-violet-400 px-3 py-1.5 text-[12.5px] text-violet-100">
            Buyers only
          </span>
          <span className="rounded-full bg-white/5 ring-1 ring-white/10 px-3 py-1.5 text-[12.5px]">Both</span>
        </div>
        <p className="mt-3 text-[12px] font-semibold text-[#9DA2A6]">Pictures on the answers?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-violet-500/20 ring-1 ring-violet-400 px-3 py-1.5 text-[12.5px] text-violet-100">
            Emoji picture cards
          </span>
          <span className="rounded-full bg-white/5 ring-1 ring-white/10 px-3 py-1.5 text-[12.5px]">Text only</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-[#9DA2A6]">
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse [animation-delay:300ms]" />
        </span>
        Drafting your 6 questions…
      </div>
    </div>
  );
}

export function ShareVisual() {
  return (
    <div className="rounded-3xl bg-[#E7DED4] p-5 sm:p-6 shadow-xl">
      <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-[#D9FDD3] p-2 shadow-sm">
        <div className="rounded-xl overflow-hidden bg-white">
          <div className="h-28 bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-white">
            <div className="text-center px-4">
              <div className="text-[11px] uppercase tracking-widest opacity-80">Luxe Hair Lagos</div>
              <div className="mt-1 text-[17px] font-extrabold leading-tight">Find your perfect hair for December 👑</div>
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="text-[13px] font-semibold text-[#111B21]">Find your perfect hair | Luxe Hair Lagos</div>
            <div className="text-[12px] text-[#667781]">Answer 6 quick questions and get your perfect look.</div>
          </div>
        </div>
        <p className="px-1.5 pt-2 text-[14px] text-[#111B21]">
          Hey babe! Take our 2-minute hair quiz and find the look made for you 💜
        </p>
        <p className="px-1.5 text-right text-[11px] text-[#667781]">09:41 ✓✓</p>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-[14px] font-bold text-[#07361E]">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.3c0-.1-.2-.2-.5-.3z" />
        </svg>
        Share on WhatsApp
      </div>
    </div>
  );
}

export function ResultVisual() {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xl">
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-5 text-white">
        <div className="text-[11px] font-bold uppercase tracking-widest opacity-80">Your match</div>
        <div className="mt-1 text-[22px] font-extrabold leading-tight">Full health screening 🩺</div>
        <p className="mt-2 text-[13px] opacity-90">A good next step for someone who hasn&apos;t had a check-up in over 3 years.</p>
      </div>
      <p className="mt-5 text-[12px] font-bold uppercase tracking-wider text-slate-400">Why this fits you</p>
      <ul className="mt-2 space-y-2 text-[14px] text-slate-700">
        <li className="flex gap-2"><span className="text-emerald-500">✓</span> Your last full check was over 3 years ago</li>
        <li className="flex gap-2"><span className="text-emerald-500">✓</span> Blood pressure runs in your family</li>
        <li className="flex gap-2"><span className="text-amber-500">!</span> This is a guide, not a diagnosis</li>
      </ul>
      <div className="mt-5 rounded-xl bg-violet-600 py-3 text-center text-[14px] font-bold text-white">
        Book my screening on WhatsApp →
      </div>
    </div>
  );
}

export function LeadsVisual() {
  const rows = [
    { name: "Adaeze O.", note: "UK Masters · funds ready · Jan intake", tag: "Hot", color: "#16a34a", bg: "rgba(22,163,74,0.12)", pct: 92 },
    { name: "Kwame A.", note: "Canada · IELTS booked · comparing agents", tag: "Warm", color: "#b7791f", bg: "rgba(217,148,9,0.14)", pct: 71 },
    { name: "Tolu B.", note: "Just exploring · no funding yet", tag: "Cold", color: "#1e40af", bg: "rgba(37,99,235,0.12)", pct: 44 },
    { name: "Fatima S.", note: "UK Nursing · sponsor ready · Sept intake", tag: "Hot", color: "#16a34a", bg: "rgba(22,163,74,0.12)", pct: 86 },
  ];
  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xl">
      <div className="flex items-center justify-between px-1 pb-3">
        <span className="text-[14px] font-bold text-slate-900">New leads · BrightPath Education</span>
        <span className="text-[12px] text-slate-400">Today</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 px-1 py-3">
            <span className="w-9 h-9 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-[13px] font-bold text-slate-600">
              {r.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-slate-900">{r.name}</div>
              <div className="text-[12px] text-slate-500 truncate">{r.note}</div>
            </div>
            <span className="text-right leading-none">
              <span className="block text-[14px] font-bold text-slate-800">{r.pct}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">WTP</span>
            </span>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: r.color, backgroundColor: r.bg }}>
              {r.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WtpVisual() {
  const factors = [
    { label: "Monthly fuel spend", pct: 90 },
    { label: "Install timeline", pct: 80 },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-b from-[#2A1356] to-[#150A2E] p-5 sm:p-6 text-white shadow-xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 ring-1 ring-amber-300/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200">
          💰 Willingness-to-pay question
        </span>
        <p className="mt-4 text-[18px] font-bold leading-snug">How much do you spend on fuel for your generator each month?</p>
        <div className="mt-4 grid grid-cols-2 gap-2 [&>*]:min-w-0">
          {[
            ["⛽", "Over ₦150,000"],
            ["🔋", "₦50,000 to ₦150,000"],
            ["💡", "Under ₦50,000"],
            ["🤷", "Not sure"],
          ].map(([e, t], i) => (
            <div
              key={t}
              className={`rounded-xl px-3 py-3 text-center border text-[12px] font-semibold ${
                i === 0 ? "bg-violet-500/25 border-violet-300" : "bg-white/5 border-white/10"
              }`}
            >
              <div className="text-xl leading-none">{e}</div>
              <div className="mt-1.5">{t}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-xl ring-1 ring-slate-200 text-[#0B0B12]">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">C</span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Chidi E.</div>
            <div className="text-[12px] text-slate-500 truncate">SunPower Solutions · 5kVA hybrid system</div>
          </div>
          <div className="text-right">
            <div className="text-[26px] font-extrabold leading-none text-emerald-600">86</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WTP / 100</div>
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {factors.map((f) => (
            <div key={f.label}>
              <div className="flex justify-between text-[12px] text-slate-500">
                <span>{f.label}</span>
                <span>{f.pct}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${f.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
