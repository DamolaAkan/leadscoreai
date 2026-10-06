"use client";

// Scorecard styles v2: the start screen, question screen and results hero for
// builder scorecards, one layout per style (src/lib/quiz-styles-v2.ts). QuizFlow
// keeps the state and logic; these components only draw.

import type { ReactNode, CSSProperties } from "react";
import type { StyleV2 } from "@/lib/quiz-styles-v2";
import type { QuizOption } from "@/lib/types";
import type { DetailLine } from "@/lib/builder";

export interface V2Ctx {
  v: StyleV2;
  btn: string;
  btnInk: string;
  sel: string;
  selInk: string;
  emph: string;
}

// The last words of a headline get the style's highlight.
function split(text: string): [string, string] {
  const words = text.trim().split(/\s+/);
  const n = words.length;
  const k = n <= 3 ? 1 : n <= 6 ? 2 : 3;
  return [words.slice(0, n - k).join(" "), words.slice(n - k).join(" ")];
}

export function Emph({ text, color, italic = false }: { text: string; color: string; italic?: boolean }) {
  const [head, tail] = split(text);
  return (
    <>
      {head}
      {head ? " " : ""}
      <span style={{ color, fontStyle: italic ? "italic" : "normal" }}>{tail}</span>
    </>
  );
}

function Photo({ src, style, fallback }: { src?: string | null; style?: CSSProperties; fallback: ReactNode }) {
  return (
    <div style={{ overflow: "hidden", ...style }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        fallback
      )}
    </div>
  );
}

const WA_PATH =
  "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.2.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.7-.1 1.2Z";
export const WaIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={WA_PATH} />
  </svg>
);

// ─────────────────────────────── Screen frame ───────────────────────────────

export function Screen({
  bg,
  font,
  children,
  embed,
  topRight,
}: {
  bg: string;
  font: string;
  children: ReactNode;
  embed?: boolean;
  topRight?: ReactNode;
}) {
  return (
    <div className={`${embed ? "min-h-[600px]" : "min-h-screen"} w-full relative overflow-hidden`} style={{ background: bg, fontFamily: font }}>
      {topRight}
      <div className="relative mx-auto w-full max-w-[480px] min-h-[inherit] flex flex-col">{children}</div>
    </div>
  );
}

// ─────────────────────────────── Start screen ───────────────────────────────

export function StyledStart({
  ctx,
  orgName,
  logo,
  initial,
  headline,
  sub,
  ctaText,
  count,
  topics,
  heroImg,
  onStart,
  busy,
  embed,
  banner,
}: {
  ctx: V2Ctx;
  orgName: string;
  logo: (size: number, radius: number) => ReactNode;
  initial: string;
  headline: string;
  sub: string;
  ctaText: string;
  count: number;
  topics: string[];
  heroImg?: string | null;
  onStart: () => void;
  busy: boolean;
  embed?: boolean;
  banner?: ReactNode;
}) {
  const { v, btn, btnInk, emph } = ctx;
  const head: CSSProperties = { fontFamily: v.headFont, fontWeight: v.headWeight, margin: 0 };
  const meta = `${count} questions · 2 minutes · Free`;
  const label = busy ? "Loading…" : ctaText;
  const three = topics.filter(Boolean).slice(0, 3);
  const cta = (extra: CSSProperties = {}, text: ReactNode = label) => (
    <button
      onClick={onStart}
      disabled={busy}
      className="w-full flex items-center justify-center font-bold text-[17px] transition-transform active:scale-[0.99] disabled:opacity-60"
      style={{ height: 58, borderRadius: v.radius, background: btn, color: btnInk, ...extra }}
    >
      {text}
    </button>
  );
  const metaP = (color = v.faint) => (
    <p className="text-center text-[13.5px] font-medium" style={{ color }}>
      {meta}
    </p>
  );
  const pad = "px-6 pt-8 pb-8";

  switch (v.start) {
    case "arch":
      return (
        <Screen bg={v.bg} font={v.bodyFont} embed={embed}>
          {banner}
          <div className={`${pad} flex-1 flex flex-col items-center text-center gap-5`}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em]" style={{ color: v.faint }}>
              {orgName}
            </p>
            <Photo
              src={heroImg}
              style={{ width: 250, height: 290, borderRadius: "125px 125px 20px 20px", background: v.tint }}
              fallback={
                <div className="w-full h-full flex items-center justify-center" style={{ background: `radial-gradient(circle at 50% 30%, #fff, ${v.tint})` }}>
                  {logo(88, 999)}
                </div>
              }
            />
            <h1 style={{ ...head, fontSize: 40, lineHeight: 1.04, color: v.ink }}>
              <Emph text={headline} color={emph} italic />
            </h1>
            <p className="text-[16px] leading-relaxed" style={{ color: v.sub }}>
              {sub}
            </p>
            <div className="mt-auto w-full flex flex-col gap-3">
              {cta()}
              {metaP()}
            </div>
          </div>
        </Screen>
      );

    case "letter":
      return (
        <Screen bg={v.bg} font={v.bodyFont} embed={embed}>
          {banner}
          <div className={`${pad} flex-1 flex flex-col gap-5`}>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-[20px] flex-shrink-0"
                style={{ border: `2px solid ${v.ink}`, boxShadow: `inset 0 0 0 3px ${v.bg}, inset 0 0 0 4px ${v.ink}`, color: v.ink, fontFamily: v.headFont, fontWeight: 700 }}
              >
                {initial}
              </div>
              <p className="font-bold text-[15px]" style={{ color: v.ink }}>
                {orgName}
              </p>
            </div>
            <div style={{ height: 4, borderTop: `1px solid ${v.ink}`, borderBottom: `1px solid ${v.ink}` }} />
            <h1 style={{ ...head, fontSize: 40, lineHeight: 1.08, color: v.ink }}>
              <Emph text={headline} color={emph} italic />
            </h1>
            <p className="text-[16px] leading-relaxed" style={{ color: v.sub }}>
              {sub}
            </p>
            {three.length === 3 && (
              <div style={{ borderTop: `1px solid ${v.border}` }}>
                {three.map((t, i) => (
                  <div key={t} className="flex gap-4 items-baseline py-3.5" style={{ borderBottom: `1px solid ${v.border}` }}>
                    <span className="w-7 text-[18px]" style={{ fontFamily: v.headFont, fontStyle: "italic", fontWeight: 600, color: v.accent2 }}>
                      {["I.", "II.", "III."][i]}
                    </span>
                    <span className="text-[16px] font-medium" style={{ color: v.ink }}>
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-auto flex flex-col gap-3">
              {cta({ letterSpacing: "0.02em" })}
              {metaP()}
            </div>
          </div>
        </Screen>
      );

    case "photo":
      return (
        <Screen bg={v.bg} font={v.bodyFont} embed={embed}>
          {banner}
          <div className="relative flex-1 flex flex-col" style={{ minHeight: embed ? 600 : "100vh" }}>
            <Photo
              src={heroImg}
              style={{ position: "absolute", left: 0, right: 0, top: 0, height: "62%" }}
              fallback={
                <div
                  className="w-full h-full"
                  style={{ background: `radial-gradient(circle at 70% 25%, ${btn}88, transparent 55%), radial-gradient(circle at 15% 70%, ${v.accent2}44, transparent 50%), ${v.bg}` }}
                />
              }
            />
            <div className="absolute left-0 right-0" style={{ top: "38%", height: "26%", background: `linear-gradient(180deg, transparent, ${v.bg})` }} />
            <div className="relative px-6 pt-6">
              <span className="inline-block text-[13px] font-semibold uppercase tracking-[0.2em] px-3.5 py-2 rounded-full" style={{ background: "rgba(11,7,9,.6)", color: v.accent2 }}>
                {orgName}
              </span>
            </div>
            <div className="relative mt-auto px-6 pb-8 flex flex-col gap-4">
              <h1 style={{ ...head, fontSize: 46, lineHeight: 1.0, color: v.ink }}>
                <Emph text={headline} color={emph} />
              </h1>
              <p className="text-[15px] leading-relaxed" style={{ color: v.sub }}>
                {sub}
              </p>
              {cta({ boxShadow: `0 12px 30px -8px ${btn}99` }, `${label} →`)}
              {metaP()}
            </div>
          </div>
        </Screen>
      );

    case "framed":
      return (
        <Screen bg={v.bg} font={v.bodyFont} embed={embed}>
          {banner}
          <div className={`${pad} flex-1 flex flex-col gap-5`}>
            <div className="flex items-center gap-2.5 text-[17px] uppercase tracking-[0.08em]" style={{ fontFamily: v.headFont, color: v.ink }}>
              <div className="w-[30px] h-[30px] flex items-center justify-center text-[16px]" style={{ background: v.accent2, color: "#fff" }}>
                {initial}
              </div>
              {orgName}
            </div>
            <div style={{ height: 230, border: `1px solid ${v.ink}`, padding: 6 }}>
              <Photo
                src={heroImg}
                style={{ width: "100%", height: "100%" }}
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-[72px]" style={{ background: v.tint, color: v.accent2, fontFamily: v.headFont }}>
                    {initial}
                  </div>
                }
              />
            </div>
            <h1 style={{ ...head, fontSize: 38, lineHeight: 1.08, color: v.ink }}>{headline}</h1>
            <p className="text-[16px] leading-relaxed" style={{ color: v.sub }}>
              {sub}
            </p>
            <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${v.ink}`, borderBottom: `1px solid ${v.border}` }}>
              {[
                [String(count), "Questions"],
                ["2", "Minutes"],
                ["Free", "Cost"],
              ].map(([n, l], i) => (
                <div key={l} className="py-3 flex flex-col gap-0.5" style={i ? { borderLeft: `1px solid ${v.border}`, paddingLeft: 14 } : {}}>
                  <span className="text-[24px]" style={{ fontFamily: v.headFont, color: v.ink }}>
                    {n}
                  </span>
                  <span className="text-[12px] font-medium uppercase tracking-[0.1em]" style={{ color: v.faint }}>
                    {l}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-auto">
              {cta(
                { justifyContent: "space-between", padding: "0 22px" },
                <>
                  <span>{label}</span>
                  <span style={{ color: "#D7B57F", fontSize: 20 }}>→</span>
                </>
              )}
            </div>
          </div>
        </Screen>
      );

    case "destination":
      return (
        <Screen bg={v.bg} font={v.bodyFont} embed={embed}>
          {banner}
          <div className="relative flex-shrink-0" style={{ height: 380, borderRadius: "0 0 36px 36px", overflow: "hidden" }}>
            <Photo
              src={heroImg}
              style={{ width: "100%", height: "100%" }}
              fallback={
                <div className="w-full h-full flex items-center justify-center text-[64px]" style={{ background: "linear-gradient(170deg, #7CC6E0 0%, #F7B28A 70%, #F26B4F 100%)" }}>
                  ✈️
                </div>
              }
            />
            <span className="absolute left-5 top-5 text-[13px] font-bold px-3.5 py-2 rounded-full" style={{ background: "rgba(255,255,255,.92)", color: v.ink }}>
              ✈ {orgName}
            </span>
          </div>
          <div className="px-6 pt-6 pb-8 flex-1 flex flex-col gap-4">
            <h1 style={{ ...head, fontSize: 40, lineHeight: 1.04, color: v.ink }}>
              <Emph text={headline} color={emph} italic />
            </h1>
            <p className="text-[16px] leading-relaxed" style={{ color: v.sub }}>
              {sub}
            </p>
            {three.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {three.map((t) => (
                  <span key={t} className="text-[13px] font-semibold px-3 py-1.5 rounded-full" style={{ background: v.tint, color: v.accent2 }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-auto flex flex-col gap-3">
              {cta({ boxShadow: `0 12px 24px -10px ${btn}b3` }, `${label} →`)}
              {metaP()}
            </div>
          </div>
        </Screen>
      );

    case "coach":
      return (
        <Screen bg={v.bg} font={v.bodyFont} embed={embed}>
          {banner}
          <div className={`${pad} flex-1 flex flex-col gap-5`}>
            <div className="flex items-center gap-3.5">
              <Photo
                src={heroImg}
                style={{ width: 60, height: 60, borderRadius: 999, background: v.tint, flexShrink: 0 }}
                fallback={<div className="w-full h-full flex items-center justify-center">{logo(60, 999)}</div>}
              />
              <div>
                <p className="font-bold text-[16px]" style={{ color: v.ink }}>
                  {orgName}
                </p>
                <p className="text-[14px] font-medium" style={{ color: v.faint }}>
                  A 2-minute check
                </p>
              </div>
            </div>
            <h1 className="mt-6" style={{ ...head, fontSize: 44, lineHeight: 1.03, color: v.ink }}>
              <Emph text={headline} color={emph} italic />
            </h1>
            <p className="text-[17px] leading-relaxed" style={{ color: v.sub }}>
              {sub}
            </p>
            {three.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold" style={{ color: v.sel }}>
                {three.map((t, i) => (
                  <span key={t} className="flex items-center gap-2">
                    {i > 0 && <span style={{ color: emph }}>→</span>}
                    <span className="px-3 py-2 rounded-full" style={{ background: v.tint }}>
                      {t}
                    </span>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-auto flex flex-col gap-3">
              {cta()}
              {metaP()}
            </div>
          </div>
        </Screen>
      );

    case "sticker":
      return (
        <Screen bg={v.startBg ?? v.bg} font={v.bodyFont} embed={embed}>
          {banner}
          <div className={`${pad} flex-1 flex flex-col gap-5`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[17px] px-4 py-2 rounded-full" style={{ fontFamily: v.headFont, fontWeight: 800, background: "#FFF6E5", border: "2.5px solid #1A1A1A", color: "#1A1A1A" }}>
                {orgName}
              </span>
              <span className="text-[13px] font-extrabold px-2.5 py-1.5" style={{ background: v.accent2, border: "2.5px solid #1A1A1A", borderRadius: 10, transform: "rotate(6deg)", color: "#1A1A1A" }}>
                2-minute check!
              </span>
            </div>
            <Photo
              src={heroImg}
              style={{ alignSelf: "center", width: 240, height: 240, borderRadius: 999, border: "3px solid #1A1A1A", boxShadow: "6px 6px 0 #1A1A1A", background: "#FFF6E5" }}
              fallback={
                <div className="w-full h-full flex items-center justify-center text-[96px]" style={{ fontFamily: v.headFont, fontWeight: 800, color: "#FF5A1F" }}>
                  {initial}
                </div>
              }
            />
            <h1 style={{ ...head, fontSize: 42, lineHeight: 0.98, letterSpacing: "-0.03em", color: "#1A1A1A" }}>{headline}</h1>
            <p className="text-[16px] font-medium leading-snug" style={{ color: "#1A1A1A" }}>
              {sub}
            </p>
            <div className="mt-auto flex flex-col gap-3">
              {cta({ background: "#1A1A1A", color: "#FFF6E5", boxShadow: `4px 4px 0 ${v.accent2}` }, `${label} →`)}
              {metaP("#1A1A1A")}
            </div>
          </div>
        </Screen>
      );

    case "fintech":
      return (
        <Screen
          bg={v.bg}
          font={v.bodyFont}
          embed={embed}
          topRight={<div className="absolute pointer-events-none" style={{ right: -160, top: -120, width: 480, height: 480, borderRadius: 999, background: `radial-gradient(circle, ${btn}59, transparent 65%)` }} />}
        >
          {banner}
          <div className={`${pad} flex-1 flex flex-col gap-5`}>
            <div className="flex items-center gap-2.5 font-bold text-[16px]" style={{ fontFamily: v.headFont, color: v.ink }}>
              {logo(34, 10)}
              {orgName}
            </div>
            <h1 className="mt-4" style={{ ...head, fontSize: 40, lineHeight: 1.03, letterSpacing: "-0.03em", color: v.ink }}>
              <Emph text={headline} color={emph} />
            </h1>
            <p className="text-[16px] leading-relaxed" style={{ color: v.sub }}>
              {sub}
            </p>
            <div className="flex flex-col gap-2.5 rounded-[22px] p-5" style={{ background: v.surface, border: `1px solid ${v.border}` }}>
              {["Takes about 2 minutes", "Your result straight away", "Free, no commitment"].map((t) => (
                <div key={t} className="flex items-center gap-2.5 text-[15px] font-medium" style={{ color: "#D5DCEB" }}>
                  <span style={{ color: v.accent2 }}>✓</span>
                  {t}
                </div>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-3">
              {cta({ boxShadow: `0 12px 30px -10px ${btn}cc` })}
              {metaP()}
            </div>
          </div>
        </Screen>
      );

    default: {
      // classic
      return (
        <Screen
          bg={v.bg}
          font={v.bodyFont}
          embed={embed}
          topRight={<div className="absolute pointer-events-none" style={{ left: -120, top: -180, width: 560, height: 520, borderRadius: 999, background: `radial-gradient(circle, ${btn}40, transparent 65%)` }} />}
        >
          {banner}
          <div className={`${pad} flex-1 flex flex-col gap-5`}>
            <div className="flex items-center gap-2.5 font-bold text-[16px]" style={{ color: v.ink }}>
              {logo(36, 10)}
              {orgName}
            </div>
            <h1 className="mt-6" style={{ ...head, fontSize: 42, lineHeight: 1.03, letterSpacing: "-0.04em", color: v.ink }}>
              <Emph text={headline} color={emph} />
            </h1>
            <p className="text-[17px] leading-relaxed" style={{ color: v.sub }}>
              {sub}
            </p>
            <div className="rounded-[20px] p-[18px] flex flex-col gap-3.5" style={{ background: v.tint }}>
              <p className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: v.accent2 }}>
                In 2 minutes you&apos;ll get
              </p>
              {["A personal recommendation", "Your score out of 100", "A clear next step"].map((t) => (
                <div key={t} className="flex items-center gap-3 text-[16px] font-medium" style={{ color: v.ink }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0" style={{ background: btn, color: btnInk }}>
                    ✓
                  </span>
                  {t}
                </div>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-3">
              {cta({ boxShadow: `0 12px 24px -8px ${btn}8c` }, `${label} →`)}
              {metaP()}
            </div>
          </div>
        </Screen>
      );
    }
  }
}

// ─────────────────────────────── Question screen ───────────────────────────────

export function StyledProgress({ ctx, index, total, topic, onBack }: { ctx: V2Ctx; index: number; total: number; topic: string; onBack: () => void }) {
  const { v, btn } = ctx;
  const n = index + 1;
  const pct = Math.round((n / total) * 100);
  const backBtn = (style: CSSProperties) => (
    <button onClick={onBack} aria-label="Back" className="flex-shrink-0 flex items-center justify-center text-[20px] font-semibold" style={{ width: 44, height: 44, color: v.ink, ...style }}>
      ←
    </button>
  );
  switch (v.progress) {
    case "line":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: v.faint }}>
            <span>{topic}</span>
            <span>
              {n} of {total}
            </span>
          </div>
          <div style={{ height: 2, background: v.track }}>
            <div style={{ width: `${pct}%`, height: "100%", background: ctx.sel }} />
          </div>
        </div>
      );
    case "dots":
      return (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold uppercase tracking-[0.16em] truncate" style={{ color: v.accent2 }}>
            {topic}
          </span>
          <div className="flex gap-1.5 items-center flex-shrink-0">
            {Array.from({ length: total }, (_, i) =>
              i === index ? (
                <span key={i} style={{ width: 20, height: 8, borderRadius: 4, background: v.accent2 }} />
              ) : (
                <span key={i} style={{ width: 8, height: 8, borderRadius: 999, ...(i < index ? { background: v.ink } : { border: `1.5px solid ${v.ink}` }) }} />
              )
            )}
          </div>
        </div>
      );
    case "glow":
      return (
        <div className="flex items-center gap-3.5">
          <div className="flex-1 rounded" style={{ height: 4, background: v.track }}>
            <div className="h-full rounded" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${btn}, ${v.accent2})` }} />
          </div>
          <span className="text-[14px] font-semibold" style={{ color: v.accent2 }}>
            {n} / {total}
          </span>
        </div>
      );
    case "fraction":
      return (
        <div className="flex items-end justify-between pb-3.5" style={{ borderBottom: `1px solid ${v.ink}` }}>
          <div className="text-[44px] leading-none" style={{ fontFamily: v.headFont, color: v.ink }}>
            {String(n).padStart(2, "0")}
            <span style={{ color: v.accent2 }}>/{String(total).padStart(2, "0")}</span>
          </div>
          <div className="flex gap-1 pb-1.5">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} style={{ width: 16, height: 3, background: i < index ? v.ink : i === index ? v.accent2 : v.border }} />
            ))}
          </div>
        </div>
      );
    case "plane":
      return (
        <div className="flex items-center gap-2.5 text-[13px] font-bold" style={{ color: v.accent2 }}>
          <span>Start</span>
          <div className="flex-1 relative" style={{ height: 2, background: `repeating-linear-gradient(90deg, ${v.track} 0 6px, transparent 6px 11px)` }}>
            <div className="absolute left-0 top-0" style={{ width: `${pct}%`, height: 2, background: v.accent2 }} />
            <span className="absolute text-[18px]" style={{ left: `${pct}%`, top: -12, marginLeft: -10 }}>
              ✈️
            </span>
          </div>
          <span style={{ color: v.faint }}>
            {n} of {total}
          </span>
        </div>
      );
    case "bar":
      return (
        <div className="flex flex-col gap-2.5">
          <span className="text-[14px] font-semibold" style={{ color: v.faint }}>
            Question {n} of {total}
          </span>
          <div className="rounded" style={{ height: 4, background: v.track }}>
            <div className="h-full rounded" style={{ width: `${pct}%`, background: ctx.sel }} />
          </div>
        </div>
      );
    case "chunky":
      return (
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 16, border: "2.5px solid #1A1A1A", background: "#fff" }}>
            <div className="h-full" style={{ width: `${pct}%`, background: btn, borderRight: pct < 100 ? "2.5px solid #1A1A1A" : "none" }} />
          </div>
          <span className="text-[15px] font-extrabold" style={{ color: "#1A1A1A" }}>
            {n}/{total}
          </span>
        </div>
      );
    case "percent":
      return (
        <div className="flex items-center gap-3.5">
          {backBtn({ borderRadius: 12, background: v.surface, border: `1px solid ${v.border}` })}
          <div className="flex-1 rounded" style={{ height: 6, background: v.track }}>
            <div className="h-full rounded" style={{ width: `${pct}%`, background: btn }} />
          </div>
          <span className="text-[14px] font-semibold" style={{ fontFamily: v.headFont, color: ctx.emph }}>
            {pct}%
          </span>
        </div>
      );
    default:
      // segments (classic)
      return (
        <div className="flex items-center gap-3.5">
          {backBtn({ borderRadius: 999, background: "#F3F4F6" })}
          <div className="flex-1 flex gap-[5px]">
            {Array.from({ length: total }, (_, i) => (
              <div key={i} className="flex-1 rounded" style={{ height: 6, background: i <= index ? btn : v.track }} />
            ))}
          </div>
          <span className="text-[14px] font-semibold" style={{ color: v.faint }}>
            {n}/{total}
          </span>
        </div>
      );
  }
}

const LETTERS = "ABCDEFGHIJ";

export function StyledAnswers({ ctx, options, selected, onSelect }: { ctx: V2Ctx; options: QuizOption[]; selected: string | null; onSelect: (v: string) => void }) {
  const { v, sel, selInk } = ctx;
  const allEmoji = options.every((o) => o.emoji);
  const check = (bg: string, ink: string, size = 22) => (
    <span className="flex-shrink-0 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ width: size, height: size, background: bg, color: ink }}>
      ✓
    </span>
  );
  const ring = (color: string) => <span className="flex-shrink-0 rounded-full" style={{ width: 22, height: 22, border: `2px solid ${color}` }} />;

  const tileGrid = (render: (o: QuizOption, on: boolean) => ReactNode) => (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button key={o.value} onClick={() => onSelect(o.value)} className="text-left transition-transform active:scale-[0.98]">
          {render(o, selected === o.value)}
        </button>
      ))}
    </div>
  );
  const rowList = (render: (o: QuizOption, on: boolean, i: number) => ReactNode, gap = 10) => (
    <div className="flex flex-col" style={{ gap }}>
      {options.map((o, i) => (
        <button key={o.value} onClick={() => onSelect(o.value)} className="w-full text-left transition-transform active:scale-[0.99]">
          {render(o, selected === o.value, i)}
        </button>
      ))}
    </div>
  );

  switch (allEmoji ? v.answers : v.answers === "tiles" || v.answers === "glow" || v.answers === "sticker" ? "rows" : v.answers) {
    case "tiles":
      return tileGrid((o, on) => (
        <div
          className="relative flex flex-col items-center justify-center gap-3 text-center"
          style={{ minHeight: 140, borderRadius: 22, background: v.surface, border: on ? `2px solid ${sel}` : `1.5px solid ${v.border}`, boxShadow: on ? `0 10px 24px -12px ${sel}80` : "none", padding: 12 }}
        >
          {on && <span className="absolute top-3 right-3">{check(sel, selInk)}</span>}
          <span className="w-14 h-14 rounded-full flex items-center justify-center text-[26px]" style={{ background: v.tint }}>
            {o.emoji}
          </span>
          <span className="text-[15.5px] leading-snug" style={{ color: v.ink, fontWeight: on ? 600 : 500 }}>
            {o.text}
          </span>
        </div>
      ));
    case "glow":
      return tileGrid((o, on) => (
        <div
          className="relative flex flex-col justify-end gap-2.5"
          style={{
            minHeight: 150,
            borderRadius: 24,
            padding: 18,
            background: on ? `linear-gradient(160deg, ${sel}33, ${v.surface})` : v.surface,
            border: on ? `2px solid ${sel}` : `1.5px solid ${v.border}`,
            boxShadow: on ? `0 0 30px -6px ${sel}99` : "none",
          }}
        >
          {on && <span className="absolute top-3.5 right-3.5">{check(v.accent2, "#1A0610", 26)}</span>}
          <span className="text-[44px] leading-none">{o.emoji}</span>
          <span className="text-[15px] font-semibold leading-snug" style={{ color: v.ink }}>
            {o.text}
          </span>
        </div>
      ));
    case "sticker":
      return tileGrid((o, on) => (
        <div
          className="flex flex-col items-center justify-center gap-2.5 text-center"
          style={{
            minHeight: 136,
            borderRadius: 20,
            padding: 12,
            border: "2.5px solid #1A1A1A",
            background: on ? sel : "#fff",
            boxShadow: on ? "5px 5px 0 #1A1A1A" : "none",
            transform: on ? "translate(-2px,-2px)" : "none",
          }}
        >
          <span className="text-[44px] leading-none">{o.emoji}</span>
          <span className="text-[16px] leading-snug" style={{ color: "#1A1A1A", fontWeight: on ? 800 : 700 }}>
            {o.text}
          </span>
        </div>
      ));
    case "lettered":
      return rowList((o, on, i) => (
        <div
          className="flex items-center gap-4"
          style={{ minHeight: 64, padding: "12px 18px", borderRadius: 6, background: on ? sel : v.surface, border: `1px solid ${on ? sel : v.border}`, color: on ? selInk : v.ink }}
        >
          <span
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[14px]"
            style={{ fontFamily: v.headFont, fontWeight: 700, ...(on ? { background: selInk, color: sel } : { border: `1.5px solid ${v.ink}` }) }}
          >
            {LETTERS[i]}
          </span>
          <span className="flex-1 text-[16px]" style={{ fontWeight: on ? 600 : 500 }}>
            {o.text}
          </span>
          {on && <span className="font-bold">✓</span>}
        </div>
      ));
    case "numbered":
      return (
        <div style={{ borderTop: `1px solid ${v.border}` }}>
          {rowList(
            (o, on, i) => (
              <div className="flex items-center gap-4" style={{ minHeight: 64, padding: "12px 14px", borderBottom: `1px solid ${v.border}`, background: on ? sel : "transparent", color: on ? selInk : v.ink }}>
                <span className="text-[15px]" style={{ fontFamily: v.headFont, color: on ? "#D7B57F" : v.emph }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-[16px]" style={{ fontWeight: on ? 600 : 500 }}>
                  {o.text}
                </span>
                <span style={{ color: on ? selInk : "#A39C90" }}>{on ? "✓" : "→"}</span>
              </div>
            ),
            0
          )}
        </div>
      );
    case "pills":
      return rowList((o, on) => (
        <div
          className="flex items-center gap-3.5"
          style={{ minHeight: 70, padding: "10px 14px", borderRadius: 20, background: on ? sel : v.surface, color: on ? selInk : v.ink, boxShadow: on ? `0 10px 24px -12px ${sel}b3` : "0 2px 8px rgba(11,42,58,.06)" }}
        >
          {o.emoji && (
            <span className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-[24px] flex-shrink-0" style={{ background: on ? "rgba(255,255,255,.18)" : v.tint }}>
              {o.emoji}
            </span>
          )}
          <span className="flex-1 text-[16px]" style={{ fontWeight: on ? 700 : 600 }}>
            {o.text}
          </span>
          {on && <span>✓</span>}
        </div>
      ));
    case "soft":
      return rowList((o, on) => (
        <div
          className="flex items-center gap-3.5"
          style={{ minHeight: 64, padding: "10px 18px", borderRadius: 18, background: on ? sel : v.surface, border: on ? `1.5px solid ${sel}` : `1.5px solid ${v.border}`, color: on ? selInk : v.ink }}
        >
          {o.emoji && <span className="text-[22px]">{o.emoji}</span>}
          <span className="flex-1 text-[16px]" style={{ fontWeight: on ? 600 : 500 }}>
            {o.text}
          </span>
          {on && check(ctx.emph, "#fff", 24)}
        </div>
      ));
    case "dark":
      return rowList((o, on) => (
        <div
          className="flex items-center gap-3.5"
          style={{ minHeight: 66, padding: "10px 16px", borderRadius: 16, background: on ? `${sel}24` : v.surface, border: `1.5px solid ${on ? sel : v.border}`, color: v.ink }}
        >
          {o.emoji && (
            <span className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[20px] flex-shrink-0" style={{ background: on ? sel : v.tint }}>
              {o.emoji}
            </span>
          )}
          <span className="flex-1 text-[16px]" style={{ fontWeight: on ? 600 : 500 }}>
            {o.text}
          </span>
          {on && check(sel, "#fff")}
        </div>
      ));
    default:
      // rows (classic)
      return rowList((o, on) => (
        <div
          className="flex items-center gap-3.5"
          style={{ minHeight: 68, padding: "10px 16px", borderRadius: 16, border: `2px solid ${on ? sel : v.border}`, background: on ? `${sel}12` : v.surface }}
        >
          {o.emoji && (
            <span className="w-11 h-11 rounded-xl flex items-center justify-center text-[24px] flex-shrink-0" style={{ background: on ? "#fff" : v.tint }}>
              {o.emoji}
            </span>
          )}
          <span className="flex-1 text-[16px] font-semibold" style={{ color: v.ink }}>
            {o.text}
          </span>
          {on ? check(sel, selInk) : ring("#D1D5DB")}
        </div>
      ));
  }
}

// Back + next under the answers (styles that don't put Back in the progress row).
export function StyledNav({ ctx, onBack, onNext, label, disabled }: { ctx: V2Ctx; onBack: () => void; onNext: () => void; label: string; disabled: boolean }) {
  const { v, btn, btnInk } = ctx;
  const next = (style: CSSProperties = {}, text: ReactNode = label) => (
    <button
      onClick={onNext}
      disabled={disabled}
      className="flex items-center justify-center font-bold text-[16px] disabled:opacity-45 transition-transform active:scale-[0.99]"
      style={{ height: 58, borderRadius: v.radius, background: btn, color: btnInk, padding: "0 32px", ...style }}
    >
      {text}
    </button>
  );
  const back = (style: CSSProperties, text: ReactNode = "←") => (
    <button onClick={onBack} aria-label="Back" className="flex items-center justify-center font-semibold flex-shrink-0" style={{ height: 58, color: v.ink, ...style }}>
      {text}
    </button>
  );
  switch (v.progress) {
    case "segments":
    case "percent":
      return next({ width: "100%" });
    case "line":
    case "bar":
      return (
        <div className="flex items-center justify-between">
          {back({ fontSize: 15, color: v.sub }, "← Back")}
          {next()}
        </div>
      );
    case "dots":
      return (
        <div className="flex gap-3">
          {back({ padding: "0 22px", borderRadius: v.radius, border: `1px solid ${v.ink}`, fontSize: 15 }, "Back")}
          {next({ flex: 1 })}
        </div>
      );
    case "fraction":
      return (
        <div className="flex gap-2.5">
          {back({ width: 58, border: `1px solid ${v.ink}`, fontSize: 20 })}
          {next(
            { flex: 1, justifyContent: "space-between", padding: "0 22px" },
            <>
              <span>{label}</span>
              <span style={{ color: "#D7B57F", fontSize: 20 }}>→</span>
            </>
          )}
        </div>
      );
    case "chunky":
      return (
        <div className="flex gap-3">
          {back({ width: 60, borderRadius: 16, border: "2.5px solid #1A1A1A", background: "#fff", fontSize: 20 })}
          {next({ flex: 1, border: "2.5px solid #1A1A1A", boxShadow: "4px 4px 0 #1A1A1A" })}
        </div>
      );
    default:
      // glow, plane: round back + wide next
      return (
        <div className="flex gap-3">
          {back({ width: 58, borderRadius: 999, background: v.progress === "plane" ? "#fff" : "transparent", border: v.progress === "plane" ? "none" : `1.5px solid ${v.border}`, fontSize: 20 })}
          {next({ flex: 1 })}
        </div>
      );
  }
}

export function QuestionEyebrow({ ctx, topic, index, total }: { ctx: V2Ctx; topic: string; index: number; total: number }) {
  const { v } = ctx;
  if (v.progress === "segments" && topic)
    return (
      <p className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: v.accent2 }}>
        {topic}
      </p>
    );
  if (v.progress === "dots")
    return (
      <p className="text-[14px] font-medium" style={{ color: v.faint }}>
        Question {index + 1} of {total}
      </p>
    );
  if (v.progress === "fraction" && topic)
    return (
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: v.emph }}>
        {topic}
      </p>
    );
  if (v.progress === "percent")
    return (
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em]" style={{ color: v.faint }}>
        {topic ? `${topic} · ` : ""}
        {index + 1} of {total}
      </p>
    );
  return null;
}

// ─────────────────────────────── Results hero ───────────────────────────────

export interface ResultCta {
  href: string;
  label: string;
  isWa: boolean;
}

export function StyledResultHero({
  ctx,
  percentage,
  tierLabel,
  tierColor,
  headline,
  body,
  firstName,
  orgName,
  details,
  price,
  bars,
  insights,
  steps,
  cta,
  resultImg,
  isMatch = false,
}: {
  ctx: V2Ctx;
  isMatch?: boolean;
  percentage: number;
  tierLabel: string;
  tierColor: string;
  headline: string;
  body: string;
  firstName: string;
  orgName: string;
  details: DetailLine[];
  price: string;
  bars: { topic: string; ratio: number }[];
  insights: { topic: string; text: string; good: boolean }[];
  steps: string[];
  cta: ResultCta | null;
  resultImg?: string | null;
}) {
  const { v, btn, btnInk, emph } = ctx;
  const head: CSSProperties = { fontFamily: v.headFont, fontWeight: v.headWeight, margin: 0 };
  const ctaBtn = (style: CSSProperties = {}, text?: ReactNode) =>
    cta ? (
      <a
        href={cta.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 w-full font-bold text-[17px] text-center leading-snug transition-transform active:scale-[0.99]"
        style={{ minHeight: 58, padding: "12px 20px", borderRadius: v.radius, background: cta.isWa ? "#25D366" : btn, color: cta.isWa ? "#fff" : btnInk, ...style }}
      >
        {text ?? (
          <>
            {cta.isWa && <WaIcon />}
            <span>{cta.label}</span>
          </>
        )}
      </a>
    ) : null;
  const detailRows = (color: string, valueColor: string, line: string, font?: string) =>
    details.map((d, i) => (
      <div key={i} className="flex justify-between gap-4 py-2.5 text-[15px]" style={{ borderTop: i ? `1px solid ${line}` : "none", color }}>
        <span>{d.label}</span>
        <b className="text-right" style={{ color: valueColor, fontFamily: font }}>
          {d.value}
        </b>
      </div>
    ));

  switch (v.result) {
    case "ritual":
      return (
        <div className="flex flex-col gap-5">
          <div className="text-center flex flex-col items-center gap-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: v.faint }}>
              {firstName}, your result
            </p>
            <p className="text-[64px] leading-none" style={{ fontFamily: v.headFont, fontStyle: "italic", fontWeight: 500, color: emph }}>
              {percentage}%
            </p>
            <p className="text-[14px] font-medium" style={{ color: v.sub }}>
              {tierLabel}
            </p>
            <h2 className="mt-1.5" style={{ ...head, fontSize: 34, lineHeight: 1.06, color: v.ink }}>
              {headline}
            </h2>
          </div>
          <div className="rounded-[24px] px-5 py-1.5" style={{ background: v.surface }}>
            {details.length ? (
              details.map((d, i) => (
                <div key={i} className="flex gap-4 items-center py-3.5" style={{ borderTop: i ? `1px solid ${v.border}` : "none" }}>
                  <span className="w-7 text-[24px]" style={{ fontFamily: v.headFont, fontStyle: "italic", fontWeight: 600, color: emph }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold" style={{ color: v.ink }}>
                      {d.label}
                    </p>
                    <p className="text-[13px]" style={{ color: v.faint }}>
                      {d.value}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-[15.5px] leading-relaxed" style={{ color: v.sub }}>
                {body}
              </p>
            )}
          </div>
          {details.length > 0 && (
            <p className="text-[15px] leading-relaxed px-1" style={{ color: v.sub }}>
              {body}
            </p>
          )}
          {price && (
            <div className="flex justify-between items-center px-1 text-[15px] font-medium" style={{ color: v.sub }}>
              <span>Total</span>
              <span className="text-[26px]" style={{ fontFamily: v.headFont, fontWeight: 600, color: v.ink }}>
                {price}
              </span>
            </div>
          )}
          {ctaBtn()}
        </div>
      );

    case "letter":
      return (
        <div className="flex flex-col gap-4">
          <div className="relative rounded-[6px] p-6 pt-7 flex flex-col gap-3.5" style={{ background: v.surface, boxShadow: `inset 0 0 0 6px ${v.surface}, inset 0 0 0 7px #C9BFA8` }}>
            <div
              className="absolute top-[18px] right-[18px] w-[76px] h-[76px] rounded-full flex flex-col items-center justify-center"
              style={{ background: v.accent2, color: "#fff", boxShadow: `inset 0 0 0 4px ${v.accent2}, inset 0 0 0 5px rgba(255,255,255,.6)` }}
            >
              <span className="text-[26px] leading-none" style={{ fontFamily: v.headFont, fontWeight: 700 }}>
                {percentage}
              </span>
              <span className="text-[9px] font-semibold tracking-[0.14em]">OUT OF 100</span>
            </div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: v.accent2 }}>
              {tierLabel}
            </p>
            <h2 className="pr-[84px]" style={{ ...head, fontSize: 28, lineHeight: 1.1, color: v.ink }}>
              {headline}
            </h2>
            <p className="text-[15px] leading-relaxed" style={{ color: v.sub }}>
              {body}
            </p>
            {(insights.length > 0 || details.length > 0) && <div style={{ height: 1, background: v.border }} />}
            {details.length > 0
              ? detailRows(v.sub, v.ink, v.border)
              : insights.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex gap-3 text-[15px] leading-snug" style={{ color: v.ink }}>
                    <span className="font-bold" style={{ color: r.good ? "#15803D" : "#B45309" }}>
                      {r.good ? "✓" : "!"}
                    </span>
                    <span>
                      <b>{r.topic}.</b> {r.text}
                    </span>
                  </div>
                ))}
            {price && (
              <div className="flex justify-between items-baseline text-[15px]" style={{ color: v.sub }}>
                <span>Total</span>
                <b className="text-[22px]" style={{ fontFamily: v.headFont, color: v.ink }}>
                  {price}
                </b>
              </div>
            )}
            <div style={{ height: 1, background: v.border }} />
            <p className="text-[16px]" style={{ fontFamily: v.headFont, fontStyle: "italic", fontWeight: 500, color: v.sub }}>
              The {orgName} team
            </p>
          </div>
          {ctaBtn()}
        </div>
      );

    case "match":
      return (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: v.accent2 }}>
              {isMatch ? <>{firstName}, it&apos;s a match</> : <>{firstName}, your result</>}
            </p>
            <span className="text-[13px] font-bold px-3 py-1.5 rounded-full" style={{ border: `1.5px solid ${v.accent2}`, color: v.accent2 }}>
              {isMatch ? `${percentage}% match` : `${percentage} / 100`}
            </span>
          </div>
          {resultImg && (
            <Photo src={resultImg} style={{ height: 290, borderRadius: 28, background: v.surface }} fallback={null} />
          )}
          <h2 style={{ ...head, fontSize: 50, lineHeight: 0.98, color: v.ink }}>
            <Emph text={headline} color={emph} />
          </h2>
          {details.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {details.map((d, i) => (
                <span key={i} className="text-[14px] font-medium px-3.5 py-2 rounded-full" style={{ background: v.surface, border: `1px solid ${v.border}`, color: v.ink }}>
                  {d.value}
                </span>
              ))}
            </div>
          )}
          <p className="text-[15.5px] leading-relaxed" style={{ color: v.sub }}>
            {body}
          </p>
          {price && (
            <div className="flex justify-between items-baseline text-[14px]" style={{ color: v.faint }}>
              <span>Price</span>
              <span className="text-[28px]" style={{ fontFamily: v.headFont, color: v.ink }}>
                {price}
              </span>
            </div>
          )}
          {ctaBtn(cta && !cta.isWa ? {} : { background: btn, color: btnInk })}
        </div>
      );

    case "readiness":
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: v.faint }}>
              <span>{tierLabel}</span>
              <span style={{ color: v.ink }}>{percentage} / 100</span>
            </div>
            <div className="grid grid-cols-10 gap-[3px]">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} style={{ height: 8, background: i < Math.round(percentage / 10) ? v.accent2 : v.border }} />
              ))}
            </div>
          </div>
          <h2 style={{ ...head, fontSize: 36, lineHeight: 1.05, color: v.ink }}>{headline}</h2>
          <p className="text-[15px] leading-relaxed" style={{ color: v.sub }}>
            {body}
          </p>
          {details.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {details.map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-3.5" style={{ background: "#fff" }}>
                  <span className="text-[15px] font-semibold" style={{ color: v.ink }}>
                    {d.label}
                  </span>
                  <span className="text-[17px]" style={{ fontFamily: v.headFont, color: v.ink }}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          {price && (
            <div className="flex justify-between items-baseline text-[15px]" style={{ color: v.sub }}>
              <span>From</span>
              <span className="text-[24px]" style={{ fontFamily: v.headFont, color: v.ink }}>
                {price}
              </span>
            </div>
          )}
          {ctaBtn(
            { background: v.accent2, color: "#1C1C1E", justifyContent: "space-between" },
            cta ? (
              <>
                <span className="flex items-center gap-2">
                  {cta.isWa && <WaIcon />}
                  {cta.label}
                </span>
                <span>→</span>
              </>
            ) : undefined
          )}
        </div>
      );

    case "ticket":
      return (
        <div className="flex flex-col gap-4">
          <div className="px-1 flex flex-col gap-1.5">
            <p className="text-[13px] font-bold uppercase tracking-[0.16em]" style={{ color: "#FFB8A6" }}>
              {isMatch ? `${percentage}% match` : `${tierLabel} · ${percentage}/100`}
            </p>
            <h2 style={{ ...head, fontSize: 36, lineHeight: 1.03, color: "#fff" }}>
              <Emph text={headline} color="#FFB8A6" italic />
            </h2>
          </div>
          <div className="rounded-[24px] overflow-hidden flex flex-col" style={{ background: "#fff" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: v.accent2, color: "#fff" }}>
              <span className="text-[15px] font-bold">{firstName}</span>
              <span className="text-[22px]">✈</span>
              <span className="text-[15px] font-bold">{orgName}</span>
            </div>
            <div className="px-5 py-4">
              {details.length ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
                  {details.map((d, i) => (
                    <div key={i}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#7FA6B5" }}>
                        {d.label}
                      </p>
                      <p className="text-[16px] font-bold" style={{ color: v.ink }}>
                        {d.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[15px] leading-relaxed" style={{ color: v.sub }}>
                  {body}
                </p>
              )}
            </div>
            <div className="relative flex items-center" style={{ height: 24 }}>
              <span className="absolute -left-3 w-6 h-6 rounded-full" style={{ background: v.resultBg }} />
              <span className="absolute -right-3 w-6 h-6 rounded-full" style={{ background: v.resultBg }} />
              <span className="flex-1 mx-5" style={{ borderTop: "2px dashed #CFE3EA" }} />
            </div>
            <div className="px-5 pt-2 pb-5 flex justify-between items-center gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#7FA6B5" }}>
                  {price ? "From" : "Your score"}
                </p>
                <p className="text-[28px]" style={{ fontFamily: v.headFont, color: v.ink }}>
                  {price || `${percentage}/100`}
                </p>
              </div>
              <span className="text-[13px] font-bold px-3 py-1.5 rounded-full" style={{ background: "#E6F7EC", color: "#15803D" }}>
                {tierLabel}
              </span>
            </div>
          </div>
          {details.length > 0 && (
            <p className="text-[15px] leading-relaxed px-1" style={{ color: "#C9DCE5" }}>
              {body}
            </p>
          )}
          {ctaBtn({ background: btn, color: btnInk })}
        </div>
      );

    case "plan":
      return (
        <div className="flex flex-col gap-4">
          <div className="rounded-[26px] p-[22px] flex flex-col gap-3.5" style={{ background: ctx.sel, color: v.bg }}>
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: v.accent2 }}>
                {tierLabel}
              </span>
              <span className="text-[40px] leading-none" style={{ fontFamily: v.headFont, fontWeight: 500 }}>
                {percentage}
              </span>
            </div>
            <h2 style={{ ...head, fontSize: 28, lineHeight: 1.08, color: v.bg }}>{headline}</h2>
            {bars.length > 0 && (
              <div className="flex flex-col gap-2">
                {bars.slice(0, 3).map((b) => (
                  <div key={b.topic} className="flex items-center gap-2.5 text-[13px] font-medium">
                    <span className="w-[72px] truncate">{b.topic}</span>
                    <div className="flex-1 rounded" style={{ height: 5, background: "rgba(255,255,255,.15)" }}>
                      <div className="h-full rounded" style={{ width: `${Math.max(8, Math.round(b.ratio * 100))}%`, background: v.accent2 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[15.5px] leading-relaxed px-1" style={{ color: v.sub }}>
            {body}
          </p>
          {details.length > 0 && <div className="rounded-[20px] px-5 py-1" style={{ background: v.surface }}>{detailRows(v.sub, v.ink, v.border)}</div>}
          {price && (
            <div className="flex justify-between items-baseline px-1 text-[15px]" style={{ color: v.sub }}>
              <span>Investment</span>
              <span className="text-[24px]" style={{ fontFamily: v.headFont, fontWeight: 600, color: v.ink }}>
                {price}
              </span>
            </div>
          )}
          {steps.length > 0 && (
            <>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] px-1" style={{ color: v.faint }}>
                Your next steps
              </p>
              <div className="flex flex-col px-1">
                {steps.map((s, i) => (
                  <div key={i} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <span className="w-3.5 h-3.5 rounded-full" style={i === 0 ? { background: ctx.sel } : { border: `2px solid ${ctx.sel}` }} />
                      {i < steps.length - 1 && <span className="flex-1 w-0.5" style={{ background: v.border }} />}
                    </div>
                    <p className="pb-4 text-[15px] leading-snug" style={{ color: v.ink }}>
                      {s}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          {ctaBtn()}
        </div>
      );

    case "receipt":
      return (
        <div className="flex flex-col gap-4">
          <h2 className="px-1" style={{ ...head, fontSize: 36, lineHeight: 1.0, letterSpacing: "-0.02em", color: "#1A1A1A" }}>
            {headline}
          </h2>
          <div className="relative rounded-[20px] p-5 flex flex-col gap-3" style={{ background: "#FFF6E5", border: "2.5px solid #1A1A1A", boxShadow: "6px 6px 0 #1A1A1A" }}>
            <div
              className="absolute -top-3.5 right-4 w-[78px] h-[78px] rounded-full flex flex-col items-center justify-center"
              style={{ background: v.accent2, border: "2.5px solid #1A1A1A", transform: "rotate(10deg)", color: "#1A1A1A" }}
            >
              <span className="text-[24px] leading-none" style={{ fontFamily: v.headFont, fontWeight: 800 }}>
                {percentage}%
              </span>
              <span className="text-[10px] font-extrabold tracking-[0.08em]">{isMatch ? "MATCH" : "SCORE"}</span>
            </div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.14em] pr-20" style={{ color: "#1A1A1A" }}>
              {firstName}, your result
            </p>
            <div style={{ borderTop: "2px dashed #1A1A1A" }} />
            {details.length ? (
              details.map((d, i) => (
                <div key={i} className="flex justify-between gap-3 text-[16px] font-semibold" style={{ color: "#1A1A1A" }}>
                  <span>{d.label}</span>
                  <span>{d.value}</span>
                </div>
              ))
            ) : (
              <p className="text-[15px] leading-relaxed" style={{ color: v.sub }}>
                {body}
              </p>
            )}
            {(price || details.length > 0) && <div style={{ borderTop: "2px dashed #1A1A1A" }} />}
            {price && (
              <div className="flex justify-between items-baseline" style={{ color: "#1A1A1A" }}>
                <span className="text-[15px] font-bold">Total from</span>
                <span className="text-[30px]" style={{ fontFamily: v.headFont, fontWeight: 800 }}>
                  {price}
                </span>
              </div>
            )}
            {details.length > 0 && (
              <p className="text-[14px] font-medium" style={{ color: v.sub }}>
                {body}
              </p>
            )}
          </div>
          {ctaBtn({ border: "2.5px solid #1A1A1A", boxShadow: "4px 4px 0 #1A1A1A", color: "#1A1A1A", background: cta?.isWa ? "#25D366" : "#FFD23F" })}
        </div>
      );

    case "offer":
      return (
        <div className="flex flex-col gap-4">
          <span className="self-start text-[13px] font-semibold px-3 py-1.5 rounded-full" style={{ background: `${v.accent2}24`, color: v.accent2 }}>
            ● {tierLabel}
          </span>
          <h2 style={{ ...head, fontSize: 36, lineHeight: 1.05, letterSpacing: "-0.02em", color: v.ink }}>
            <Emph text={headline} color={emph} />
          </h2>
          {price && (
            <p className="text-[46px] leading-none" style={{ fontFamily: v.headFont, fontWeight: 700, letterSpacing: "-0.03em", color: v.ink }}>
              {price}
            </p>
          )}
          <p className="text-[15.5px] leading-relaxed" style={{ color: v.sub }}>
            {body}
          </p>
          {details.length > 0 && (
            <div className="rounded-[20px] px-[18px] py-1.5" style={{ background: v.surface, border: `1px solid ${v.border}` }}>
              {detailRows(v.sub, v.ink, v.border, v.headFont)}
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between text-[14px] font-medium" style={{ color: v.sub }}>
              <span>Your score</span>
              <span style={{ fontFamily: v.headFont, fontWeight: 600, color: v.ink }}>{percentage} / 100</span>
            </div>
            <div className="rounded" style={{ height: 6, background: v.track }}>
              <div className="h-full rounded" style={{ width: `${percentage}%`, background: `linear-gradient(90deg, ${btn}, ${v.accent2})` }} />
            </div>
          </div>
          {ctaBtn(cta?.isWa ? {} : {})}
        </div>
      );

    default: {
      // banner (classic)
      const deep = "#1E1240";
      return (
        <div className="flex flex-col gap-4">
          <div className="rounded-[28px] p-6 flex flex-col gap-3.5 text-white" style={{ background: `linear-gradient(160deg, ${deep}, ${btn})` }}>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold" style={{ color: "#DDD6FE" }}>
                {firstName}, your result
              </span>
              <span className="text-[13px] font-bold px-3 py-1.5 rounded-full" style={{ background: "#fff", color: tierColor }}>
                {tierLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[72px] font-extrabold leading-none tracking-[-0.04em]">{percentage}</span>
              <span className="text-[18px] font-semibold" style={{ color: "#DDD6FE" }}>
                /100
              </span>
            </div>
            <h2 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em]">{headline}</h2>
          </div>
          <div className="rounded-[20px] p-5 flex flex-col gap-3 bg-white" style={{ boxShadow: "0 4px 16px rgba(20,10,50,.06)" }}>
            <p className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: v.accent2 }}>
              What this means
            </p>
            <p className="text-[15.5px] leading-relaxed" style={{ color: v.sub }}>
              {body}
            </p>
            {details.length > 0 && <div style={{ borderTop: "1px solid #F0EEF5" }}>{detailRows(v.sub, v.ink, "#F0EEF5")}</div>}
            {price && (
              <div className="flex justify-between text-[15px] pt-2" style={{ borderTop: "1px solid #F0EEF5", color: v.sub }}>
                <span>Price</span>
                <b style={{ color: v.ink }}>{price}</b>
              </div>
            )}
          </div>
          {ctaBtn()}
        </div>
      );
    }
  }
}
