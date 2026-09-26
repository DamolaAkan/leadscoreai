"use client";

import { useEffect, useRef } from "react";

// One-off confetti burst for celebratory moments (first quiz preview). Canvas,
// no dependencies; skipped entirely for people who prefer reduced motion.
const COLORS = ["#7C3AED", "#A78BFA", "#F472B6", "#FBBF24", "#34D399", "#60A5FA", "#F87171"];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  shape: "rect" | "circle";
}

export default function Confetti({ onDone, duration = 3200 }: { onDone?: () => void; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone?.();
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const count = w < 640 ? 120 : 200;
    // Two cannons from the bottom corners, aimed up and inwards.
    const pieces: Piece[] = Array.from({ length: count }, (_, i) => {
      const left = i % 2 === 0;
      const angle = (left ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7;
      const speed = (h * 0.018 + Math.random() * h * 0.012) * (w < 640 ? 1 : 1.1);
      return {
        x: left ? w * 0.05 : w * 0.95,
        y: h * 0.95,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        shape: Math.random() < 0.7 ? "rect" : "circle",
      };
    });

    const start = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, w, h);
      const fade = elapsed > duration - 700 ? Math.max(0, (duration - elapsed) / 700) : 1;
      for (const p of pieces) {
        p.vy += 0.32; // gravity
        p.vx *= 0.992;
        p.vy *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (elapsed < duration) frame = requestAnimationFrame(tick);
      else onDone?.();
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60] w-full h-full" />;
}
