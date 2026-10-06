// Scorecard styles v2: each template's own LAYOUT for builder scorecards (start
// screen, progress, answers and results hero), from the Claude Design rework of
// October 2026. Colours and fonts live here too so a style reads as one system.
// quiz-templates.ts keeps the picker metadata and the shared section tokens.

import type { TemplateKey } from "./quiz-templates";

export interface StyleV2 {
  fonts: string | null; // Google Fonts stylesheet (null = the app's Inter)
  headFont: string;
  bodyFont: string;
  headWeight: number;
  start: "classic" | "arch" | "letter" | "photo" | "framed" | "destination" | "coach" | "sticker" | "fintech";
  answers: "rows" | "tiles" | "lettered" | "glow" | "numbered" | "pills" | "soft" | "sticker" | "dark";
  progress: "segments" | "line" | "dots" | "glow" | "fraction" | "plane" | "bar" | "chunky" | "percent";
  result: "banner" | "ritual" | "letter" | "match" | "readiness" | "ticket" | "plan" | "receipt" | "offer";
  radius: number; // buttons
  dark: boolean; // question screen is dark
  bg: string; // start + question screens
  startBg?: string;
  qBg?: string;
  resultBg: string;
  resultDark: boolean;
  ink: string;
  sub: string;
  faint: string;
  surface: string; // answer cards and panels
  tint: string; // emoji wells, chips
  border: string;
  sel: string; // selected answer / filled rows (brand colour overrides)
  btn: string; // primary button (brand colour overrides)
  btnInk: string;
  emph: string; // the highlighted words in headlines
  accent2: string; // secondary: gold, brass, crimson, sunshine, green
  track: string;
}

const INTER = "var(--font-inter), 'Inter', system-ui, sans-serif";

export const STYLES_V2: Record<TemplateKey, StyleV2> = {
  classic: {
    fonts: null,
    headFont: INTER,
    bodyFont: INTER,
    headWeight: 800,
    start: "classic",
    answers: "rows",
    progress: "segments",
    result: "banner",
    radius: 16,
    dark: false,
    bg: "#FFFFFF",
    resultBg: "#F6F5FA",
    resultDark: false,
    ink: "#0A0A0F",
    sub: "#4B5563",
    faint: "#6B7280",
    surface: "#FFFFFF",
    tint: "#F7F5FC",
    border: "#E5E7EB",
    sel: "#7C3AED",
    btn: "#7C3AED",
    btnInk: "#FFFFFF",
    emph: "#7C3AED",
    accent2: "#6D28D9",
    track: "#E5E7EB",
  },
  "soft-luxe": {
    fonts:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap",
    headFont: "'Cormorant Garamond', Georgia, serif",
    bodyFont: "'Hanken Grotesk', system-ui, sans-serif",
    headWeight: 500,
    start: "arch",
    answers: "tiles",
    progress: "line",
    result: "ritual",
    radius: 999,
    dark: false,
    bg: "#F8F0EA",
    resultBg: "#F8F0EA",
    resultDark: false,
    ink: "#3E2820",
    sub: "#6B4F44",
    faint: "#8A6B5E",
    surface: "#FFFAF7",
    tint: "#F3E1D8",
    border: "#EADBD2",
    sel: "#5A3A2E",
    btn: "#5A3A2E",
    btnInk: "#FFF7F2",
    emph: "#9A5B47",
    accent2: "#9A5B47",
    track: "#E6D3C9",
  },
  heritage: {
    fonts:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Work+Sans:wght@400;500;600;700&display=swap",
    headFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Work Sans', system-ui, sans-serif",
    headWeight: 600,
    start: "letter",
    answers: "lettered",
    progress: "dots",
    result: "letter",
    radius: 4,
    dark: false,
    bg: "#F6F1E4",
    resultBg: "#13294B",
    resultDark: true,
    ink: "#13294B",
    sub: "#3D4B63",
    faint: "#6E6A5E",
    surface: "#FFFDF8",
    tint: "#EFE8DA",
    border: "#D8CFBC",
    sel: "#13294B",
    btn: "#9B1C31",
    btnInk: "#FFFFFF",
    emph: "#9B1C31",
    accent2: "#9B1C31",
    track: "#D8CFBC",
  },
  noir: {
    fonts: "https://fonts.googleapis.com/css2?family=Gloock&family=Poppins:wght@400;500;600;700&display=swap",
    headFont: "'Gloock', Georgia, serif",
    bodyFont: "'Poppins', system-ui, sans-serif",
    headWeight: 400,
    start: "photo",
    answers: "glow",
    progress: "glow",
    result: "match",
    radius: 999,
    dark: true,
    bg: "#0B0709",
    resultBg: "#0B0709",
    resultDark: true,
    ink: "#FFFFFF",
    sub: "#D9C8D0",
    faint: "#B8A3AE",
    surface: "#1E1016",
    tint: "#2A1A22",
    border: "#33202A",
    sel: "#FF4FA3",
    btn: "#FF4FA3",
    btnInk: "#1A0610",
    emph: "#FF4FA3",
    accent2: "#E5B769",
    track: "#2A1A22",
  },
  stone: {
    fonts: "https://fonts.googleapis.com/css2?family=Marcellus&family=DM+Sans:wght@400;500;600;700&display=swap",
    headFont: "'Marcellus', Georgia, serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    headWeight: 400,
    start: "framed",
    answers: "numbered",
    progress: "fraction",
    result: "readiness",
    radius: 0,
    dark: false,
    bg: "#EEEAE3",
    resultBg: "#EEEAE3",
    resultDark: false,
    ink: "#1C1C1E",
    sub: "#4A463F",
    faint: "#6B655B",
    surface: "#FFFFFF",
    tint: "#E3DDD2",
    border: "#C9C2B6",
    sel: "#1C1C1E",
    btn: "#1C1C1E",
    btnInk: "#FFFFFF",
    emph: "#8A6636",
    accent2: "#A9814A",
    track: "#C9C2B6",
  },
  horizon: {
    fonts:
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap",
    headFont: "'DM Serif Display', Georgia, serif",
    bodyFont: "'Manrope', system-ui, sans-serif",
    headWeight: 400,
    start: "destination",
    answers: "pills",
    progress: "plane",
    result: "ticket",
    radius: 999,
    dark: false,
    bg: "#F4FAFC",
    qBg: "linear-gradient(180deg, #DDF1FA 0%, #F4FAFC 45%)",
    resultBg: "#0B2A3A",
    resultDark: true,
    ink: "#0B2A3A",
    sub: "#3F6475",
    faint: "#5A7A89",
    surface: "#FFFFFF",
    tint: "#DDF1FA",
    border: "#DCEAF0",
    sel: "#0E6E8C",
    btn: "#F26B4F",
    btnInk: "#FFFFFF",
    emph: "#F26B4F",
    accent2: "#0E6E8C",
    track: "#9CC9D9",
  },
  grove: {
    fonts:
      "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;1,6..72,500&family=Figtree:wght@400;500;600;700&display=swap",
    headFont: "'Newsreader', Georgia, serif",
    bodyFont: "'Figtree', system-ui, sans-serif",
    headWeight: 500,
    start: "coach",
    answers: "soft",
    progress: "bar",
    result: "plan",
    radius: 999,
    dark: false,
    bg: "#F7F3EA",
    resultBg: "#F7F3EA",
    resultDark: false,
    ink: "#1E3A2F",
    sub: "#4A5C52",
    faint: "#5E6E64",
    surface: "#FFFDF8",
    tint: "#E3EBE4",
    border: "#DDD6C6",
    sel: "#24473A",
    btn: "#24473A",
    btnInk: "#F7F3EA",
    emph: "#B08D57",
    accent2: "#D9C29A",
    track: "#E0DACB",
  },
  citrus: {
    fonts:
      "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
    headFont: "'Bricolage Grotesque', system-ui, sans-serif",
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    headWeight: 800,
    start: "sticker",
    answers: "sticker",
    progress: "chunky",
    result: "receipt",
    radius: 16,
    dark: false,
    bg: "#FFF6E5",
    startBg: "#FF5A1F",
    resultBg: "#FF5A1F",
    resultDark: false,
    ink: "#1A1A1A",
    sub: "#5A4A33",
    faint: "#7A5B2E",
    surface: "#FFFFFF",
    tint: "#FFF6E5",
    border: "#1A1A1A",
    sel: "#FFD23F",
    btn: "#FF5A1F",
    btnInk: "#1A1A1A",
    emph: "#FF5A1F",
    accent2: "#FFD23F",
    track: "#FFFFFF",
  },
  midnight: {
    fonts:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Geist:wght@400;500;600;700&display=swap",
    headFont: "'Space Grotesk', system-ui, sans-serif",
    bodyFont: "'Geist', 'Inter', system-ui, sans-serif",
    headWeight: 700,
    start: "fintech",
    answers: "dark",
    progress: "percent",
    result: "offer",
    radius: 14,
    dark: true,
    bg: "#070D1F",
    resultBg: "#070D1F",
    resultDark: true,
    ink: "#FFFFFF",
    sub: "#A8B3CC",
    faint: "#7C88A3",
    surface: "#111A30",
    tint: "#1A2440",
    border: "#1F2A47",
    sel: "#5B8CFF",
    btn: "#5B8CFF",
    btnInk: "#FFFFFF",
    emph: "#8FB0FF",
    accent2: "#3DDC97",
    track: "#1F2A47",
  },
};

export function styleV2For(key: TemplateKey): StyleV2 {
  return STYLES_V2[key] ?? STYLES_V2.classic;
}
