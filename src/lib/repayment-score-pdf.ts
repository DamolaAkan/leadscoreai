// Builds the Repayment Score plan as a PDF. Runs in the browser (download
// button) and on the server (email attachment, behind the switch). It only
// uses the result the server already returned, never the scoring recipe.

import { jsPDF } from "jspdf";
import { DIAGNOSTIC_BOOKING_URL, RS_COPY, type RSResult } from "./repayment-score";

const PURPLE = "#6d28d9";
const INK = "#15131c";
const MUTED = "#6b6577";
const LINE = "#e7e3ef";
const TRACK = "#efeaf8";

function barColor(score: number) {
  if (score < 40) return "#dc2626";
  if (score < 70) return "#d99409";
  return "#16a34a";
}

export function buildRepaymentPlanPdf(r: Pick<RSResult, "total" | "parts" | "weakest" | "nextSteps" | "plan" | "firstName" | "company" | "bookOver1m">): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const CW = W - M * 2;
  let y = M;

  const ensure = (h: number) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const para = (text: string, size: number, color: string, style: "normal" | "bold" = "normal", gap = 6) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, CW) as string[];
    const lh = size * 1.35;
    ensure(lines.length * lh);
    doc.text(lines, M, y + size);
    y += lines.length * lh + gap;
  };

  // Header band
  doc.setFillColor(PURPLE);
  doc.rect(0, 0, W, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(PURPLE);
  doc.text("LEADSCOREAI  |  REPAYMENT SCORE", M, y + 4);
  y += 22;

  const who = [r.firstName, r.company].filter(Boolean).join(", ");
  para("Your 90-day repayment plan", 22, INK, "bold", 4);
  if (who) para(`Prepared for ${who}`, 11, INK, "normal", 2);
  para(RS_COPY.byline, 10, MUTED, "normal", 14);

  // Score + bars
  doc.setDrawColor(LINE);
  doc.setLineWidth(1);
  doc.roundedRect(M, y, CW, 64, 8, 8, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(PURPLE);
  doc.text(String(r.total), M + 20, y + 42);
  const tw = doc.getTextWidth(String(r.total));
  doc.setFontSize(11);
  doc.setTextColor(MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("out of 100", M + 20 + tw + 6, y + 42);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(INK);
  doc.setFontSize(12);
  doc.text(`Number one repayment block: ${r.weakest.name}`, M + 190, y + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  doc.text(`${r.weakest.name} scored ${r.weakest.score} out of 100`, M + 190, y + 44);
  y += 84;

  para("Your seven parts", 13, INK, "bold", 8);
  for (const p of r.parts) {
    ensure(24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(INK);
    doc.text(p.name, M, y + 10);
    const bx = M + 110, bw = CW - 150;
    doc.setFillColor(TRACK);
    doc.roundedRect(bx, y + 3, bw, 8, 4, 4, "F");
    doc.setFillColor(barColor(p.score));
    if (p.score > 0) doc.roundedRect(bx, y + 3, Math.max(8, (bw * p.score) / 100), 8, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.text(String(p.score), M + CW - 22, y + 10);
    y += 22;
  }
  y += 10;

  para(`Why ${r.weakest.name} is holding back your collections`, 13, INK, "bold", 6);
  para(r.weakest.explanation, 10.5, INK, "normal", 12);

  para("Your three next steps", 13, INK, "bold", 6);
  r.nextSteps.forEach((s, i) => para(`${i + 1}.  ${s}`, 10.5, INK, "normal", 4));
  y += 10;

  para("Your 90-day plan", 13, INK, "bold", 8);
  for (const ph of r.plan) {
    ensure(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(PURPLE);
    doc.text(`${ph.phase.toUpperCase()}  -  ${ph.days}`, M, y + 11);
    y += 20;
    ph.items.forEach((it) => para(`-  ${it}`, 10.5, INK, "normal", 3));
    y += 8;
  }

  ensure(90);
  y += 6;
  doc.setFillColor("#f6f2fd");
  doc.roundedRect(M, y, CW, 80, 8, 8, "F");
  const yy = y;
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(INK);
  doc.text(RS_COPY.diagnosticTitle, M + 16, y + 6);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  const lines = doc.splitTextToSize(RS_COPY.diagnosticBody, CW - 32) as string[];
  doc.text(lines, M + 16, y + 8);
  doc.setTextColor(PURPLE);
  doc.textWithLink(`Book: ${DIAGNOSTIC_BOOKING_URL}`, M + 16, yy + 70, { url: DIAGNOSTIC_BOOKING_URL });

  return doc;
}
