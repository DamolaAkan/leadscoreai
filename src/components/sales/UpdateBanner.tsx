"use client";

import { useState, useEffect } from "react";

// Bump NOTICE_ID whenever there's a new announcement — it re-shows for everyone
// even if they dismissed the previous one. Dismissal is per-user (localStorage).
const NOTICE_ID = "pricing-2026-08";
const KEY = `lsai_notice_dismissed_${NOTICE_ID}`;

export default function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mb-5 rounded-xl border border-[#e4def7] bg-[#f5f2fe] p-4 sm:p-5 relative">
      <button
        onClick={dismiss}
        aria-label="Dismiss update"
        className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-[#8b7fb0] hover:bg-[#ebe4fb] hover:text-[#6d28d9] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="text-lg leading-none mt-0.5" aria-hidden="true">📢</span>
        <div>
          <p className="text-sm font-semibold text-[#4c2a97]">What&apos;s new — pricing &amp; flow update</p>
          <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-[#4a3f63]">
            <li>
              • The scorecard build is now <b>free</b> — no setup fee. Clients pay a simple monthly to run the engine and hosting.
            </li>
            <li>
              • <b>Core $100/mo</b> (₦130K) · <b>Pro $200/mo</b> (₦250K) · Custom is scoped &amp; quoted.
            </li>
            <li>
              • Lead every pitch with <b>&ldquo;free build, then a simple monthly.&rdquo;</b>
            </li>
            <li>
              • Commission is being updated to match the new model — final structure to follow.
            </li>
          </ul>
          <button
            onClick={dismiss}
            className="mt-2.5 text-xs font-semibold text-[#6d28d9] hover:underline"
          >
            Got it — dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
