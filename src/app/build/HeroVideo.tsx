// Hero video in place of the phone demo (real estate: the mortgage calculator
// walkthrough). Muted + playsInline so it autoplays on phones; the poster shows
// until it loads.
export default function HeroVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[360px]">
      <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-violet-400/30 via-fuchsia-300/20 to-amber-200/30 blur-2xl" />
      <video
        className="relative w-full aspect-[4/5] rounded-[2rem] shadow-[0_40px_80px_-30px_rgba(76,29,149,0.55)] ring-1 ring-violet-200/60 bg-[#F8F6FF] object-cover"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
      />
    </div>
  );
}
