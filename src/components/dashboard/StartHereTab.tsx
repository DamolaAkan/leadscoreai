"use client";

import { AuthUser } from "@/lib/dashboard-types";

const LOOM_ID = "eddf84b7b873474cb1067c06959acec5";

// Onboarding landing: a walkthrough video + the three things a new client needs
// to get value. Shown first so every client sees it when they log in.
export default function StartHereTab({
  user,
  accent,
}: {
  user: AuthUser;
  accent: string;
  getAuthHeaders?: () => Record<string, string>;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const scorecardUrl = `${origin}/${user.orgSlug}/savings-check`;

  const steps = [
    {
      n: "1",
      title: "Share your scorecard link",
      body: "Put it in your WhatsApp status, Instagram bio, ads and website. Everyone who fills it becomes a scored lead here.",
    },
    {
      n: "2",
      title: "Watch leads land in Responses",
      body: "Each lead arrives with their name, phone, email and a 0–100 score — ranked and ready to work.",
    },
    {
      n: "3",
      title: "Call your hottest leads first",
      body: "The higher the score, the more ready and able they are to buy. Start there instead of chasing everyone.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-[#16202e] mb-1">Welcome, {user.orgName} 👋</h2>
      <p className="text-[#667085] mb-6">
        Watch this quick walkthrough, then you&apos;re ready to start getting scored leads.
      </p>

      <div
        className="rounded-2xl overflow-hidden bg-black mb-6"
        style={{ position: "relative", paddingBottom: "62.5%", height: 0, boxShadow: "0 12px 34px -18px rgba(0,0,0,.4)" }}
      >
        <iframe
          src={`https://www.loom.com/embed/${LOOM_ID}?hideEmbedTopBar=true`}
          title="Dashboard walkthrough"
          allowFullScreen
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {steps.map((s) => (
          <div key={s.n} className="bg-white rounded-xl border border-[#eceef2] p-4">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mb-2"
              style={{ backgroundColor: accent + "1a", color: accent }}
            >
              {s.n}
            </div>
            <div className="font-semibold text-[#16202e] text-sm mb-1">{s.title}</div>
            <div className="text-sm text-[#667085] leading-relaxed">{s.body}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#eceef2] p-5">
        <div className="text-sm text-[#667085] mb-1">Your scorecard link — share this to collect leads</div>
        <a href={scorecardUrl} target="_blank" rel="noreferrer" className="font-semibold break-all" style={{ color: accent }}>
          {scorecardUrl}
        </a>
      </div>
    </div>
  );
}
