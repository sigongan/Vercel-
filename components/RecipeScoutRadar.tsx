import { AvocadoMark } from "@/lib/avocadoMark";

const BLIPS = [
  { left: "22%", top: "28%", delay: "0s" },
  { left: "72%", top: "62%", delay: "0.65s" },
  { left: "58%", top: "18%", delay: "1.3s" },
];

/**
 * Recipe Scout's signature loading state: a radar sweep with fading blips,
 * standing in for "actively checking sites out there" — replaces the plain
 * avocado spinner specifically for the web-scanning wait, since that wait
 * is inherently longer (real network searches) and benefits from feeling
 * purposeful rather than generic.
 */
export function RecipeScoutRadar({ size = 120 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border border-[#C0DC8C] dark:border-stone-700" />
      <div className="absolute inset-[14%] rounded-full border border-[#C0DC8C]/70 dark:border-stone-700/70" />
      <div className="absolute inset-[28%] rounded-full border border-[#C0DC8C]/50 dark:border-stone-700/50" />
      <div
        className="animate-radar-sweep absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(97,160,14,0.4), rgba(97,160,14,0.05) 30%, transparent 45%)",
        }}
      />
      {BLIPS.map((blip, i) => (
        <span
          key={i}
          className="animate-radar-blip absolute h-2 w-2 rounded-full bg-[#61A00E] dark:bg-lime-500"
          style={{ left: blip.left, top: blip.top, animationDelay: blip.delay }}
        />
      ))}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <AvocadoMark size={Math.round(size * 0.24)} />
      </div>
    </div>
  );
}
