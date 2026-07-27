/** A small looping "before/after" banner at the top of Home: a cluttered
 *  source page cross-fades into a tidy recipe card, so the app explains
 *  what it does visually instead of relying on the tagline text alone. */
export function HomeHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#E2E6D9] dark:border-stone-700 bg-gradient-to-br from-white to-[#F2F7E8] dark:from-stone-800 dark:to-stone-800 px-5 pt-5 pb-4">
      <div className="relative h-[120px] w-full">
        <MessyPanel />
        <CleanPanel />
      </div>
      <p className="mt-4 text-[15px] font-semibold text-[#232920] dark:text-stone-50">{title}</p>
      <p className="text-[13px] leading-relaxed text-[#5D6551] dark:text-stone-400">{subtitle}</p>
    </div>
  );
}

function MessyPanel() {
  return (
    <div className="animate-hero-panel-messy absolute inset-0 flex items-center gap-3 rounded-2xl bg-white/80 dark:bg-stone-900/50 p-3.5" style={{ transformOrigin: "50% 50%" }}>
      <div className="h-[60px] w-[60px] shrink-0 rounded-lg bg-[#E2E6D9] dark:bg-stone-700" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="inline-flex w-fit items-center rounded-sm bg-[#E2E6D9] dark:bg-stone-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#5D6551] dark:text-stone-400">
          Ad
        </span>
        <div className="h-2 w-[85%] rounded-full bg-[#E2E6D9] dark:bg-stone-700" />
        <div className="h-2 w-[95%] rounded-full bg-[#E2E6D9] dark:bg-stone-700" />
        <div className="h-2 w-[55%] rounded-full bg-[#E2E6D9] dark:bg-stone-700" />
        <div className="h-2 w-[70%] rounded-full bg-[#E2E6D9] dark:bg-stone-700" />
      </div>
    </div>
  );
}

function CleanPanel() {
  return (
    <div className="animate-hero-panel-clean absolute inset-0 flex items-center gap-3 rounded-2xl bg-white dark:bg-stone-900 p-3.5 shadow-[0_6px_20px_rgba(97,160,14,0.15)]">
      <div className="h-[60px] w-[60px] shrink-0 rounded-lg bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] dark:from-stone-700 dark:to-stone-700" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-2.5 w-[70%] rounded-full bg-[#232920] dark:bg-stone-100" />
        <IngredientLine width="90%" />
        <IngredientLine width="75%" />
        <IngredientLine width="60%" />
      </div>
    </div>
  );
}

function IngredientLine({ width }: { width: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-[#61A00E]">
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m20 6-11 11-5-5" />
        </svg>
      </span>
      <div className="h-1.5 rounded-full bg-[#E2E6D9] dark:bg-stone-700" style={{ width }} />
    </div>
  );
}
