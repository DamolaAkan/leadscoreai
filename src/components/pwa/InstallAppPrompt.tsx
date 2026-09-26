"use client";

import { useEffect, useState } from "react";
import { trackClient } from "@/lib/track-client";

// "Get the app" card for owners on phones: one-tap install on Android/Chrome,
// Share → Add to Home Screen steps on iPhone. Hidden once installed or dismissed.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "lsai-install-dismissed";
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return !!at && Date.now() - at < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
}

export default function InstallAppPrompt() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    const ua = navigator.userAgent;
    // iPhone/iPad Safari (not in-app browsers like Instagram, which can't add to home screen).
    const ios = /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|FBAN|FBAV|Instagram/.test(ua);
    if (ios) {
      setMode("ios");
      trackClient("app_install_prompt", { platform: "ios" });
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android");
      trackClient("app_install_prompt", { platform: "android" });
    };
    const onInstalled = () => {
      setMode(null);
      trackClient("app_installed", {});
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mode) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setMode(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    setDeferred(null);
    if (outcome === "accepted") setMode(null);
  };

  return (
    <div className="md:hidden mb-5 rounded-2xl border border-violet-200 bg-white p-4 shadow-[0_8px_24px_-14px_rgba(109,40,217,0.4)]">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pwa/icon-192.png" alt="" className="w-11 h-11 rounded-xl border border-slate-100 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#16202e] text-[15px]">Get the LeadScoreAI app</p>
          {mode === "android" ? (
            <p className="text-[13px] text-[#667085] mt-0.5">Add it to your phone for one-tap access to your quizzes and leads.</p>
          ) : (
            <p className="text-[13px] text-[#667085] mt-0.5 leading-relaxed">
              Tap the <b>Share</b> button{" "}
              <svg className="inline w-4 h-4 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>{" "}
              at the bottom of Safari, then <b>Add to Home Screen</b>.
            </p>
          )}
        </div>
        <button onClick={dismiss} aria-label="Not now" className="shrink-0 w-8 h-8 -mr-1 -mt-1 rounded-full text-slate-400 text-xl leading-none">
          ×
        </button>
      </div>
      {mode === "android" && (
        <button
          onClick={install}
          className="mt-3 w-full rounded-full bg-[#6d28d9] text-white font-semibold text-[15px] py-3"
        >
          Install app
        </button>
      )}
    </div>
  );
}
