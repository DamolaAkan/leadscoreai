"use client";

import { useEffect, useMemo, useState } from "react";
import type { AcademyVideo } from "@/lib/academy";

// Academy: daily lessons on running ads that send people to a Buyer Scorecard,
// pulled from the YouTube channel. Filter by segment, play in place.
export default function AcademyTab({ accent }: { accent: string }) {
  const [videos, setVideos] = useState<AcademyVideo[] | null>(null);
  const [channelUrl, setChannelUrl] = useState("");
  const [segment, setSegment] = useState("All");
  const [playing, setPlaying] = useState<AcademyVideo | null>(null);

  useEffect(() => {
    fetch("/api/academy")
      .then((r) => r.json())
      .then((d) => {
        setVideos(d.videos || []);
        setChannelUrl(d.channelUrl || "");
      })
      .catch(() => setVideos([]));
  }, []);

  const segments = useMemo(() => {
    const seen = Array.from(new Set((videos || []).map((v) => v.segment)));
    return seen.length > 1 ? ["All", ...seen] : [];
  }, [videos]);

  const shown = (videos || []).filter((v) => segment === "All" || v.segment === segment);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academy</h1>
          <p className="text-[#667085] mt-1">
            Learn to run ads that send serious buyers to your Buyer Scorecard. A new lesson every day.
          </p>
        </div>
        {channelUrl && (
          <a
            href={channelUrl}
            target="_blank"
            rel="noreferrer"
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white bg-[#FF0000] hover:bg-[#d90000] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
            </svg>
            Subscribe
          </a>
        )}
      </div>

      {segments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
          {segments.map((s) => {
            const on = s === segment;
            return (
              <button
                key={s}
                onClick={() => setSegment(s)}
                className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors"
                style={on ? { backgroundColor: accent, borderColor: accent, color: "white" } : { borderColor: "#e4e7ec", color: "#475467", backgroundColor: "white" }}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}

      {videos === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-[#eceef2] overflow-hidden animate-pulse">
              <div className="aspect-video bg-[#f2f4f7]" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-20 rounded bg-[#f2f4f7]" />
                <div className="h-4 w-full rounded bg-[#f2f4f7]" />
              </div>
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#eceef2] p-8 text-center">
          <div className="text-3xl mb-2">🎬</div>
          <div className="font-semibold text-[#16202e]">The first lesson is on its way</div>
          <p className="text-sm text-[#667085] mt-1">Lessons on running ads for your Buyer Scorecard will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shown.map((v) => (
            <button
              key={v.id}
              onClick={() => setPlaying(v)}
              className="group text-left rounded-2xl bg-white border border-[#eceef2] overflow-hidden hover:shadow-[0_12px_30px_-16px_rgba(16,24,40,0.35)] transition-shadow"
            >
              <div className="relative aspect-video bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-14 h-14 rounded-full bg-black/60 group-hover:bg-black/75 flex items-center justify-center transition-colors">
                    <svg className="w-6 h-6 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5.5v13l10-6.5-10-6.5z" />
                    </svg>
                  </span>
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs mb-1.5">
                  <span className="rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: "#f3effe", color: accent }}>
                    {v.segment}
                  </span>
                  <span className="text-[#98a2b3]">{when(v.published)}</span>
                </div>
                <div className="font-semibold text-[#16202e] leading-snug line-clamp-2">{v.title}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {playing && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPlaying(null)}
          role="dialog"
          aria-modal="true"
          aria-label={playing.title}
        >
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="text-white font-semibold leading-snug">{playing.title}</div>
              <button
                onClick={() => setPlaying(null)}
                className="shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${playing.id}?autoplay=1&rel=0`}
                title={playing.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function when(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
