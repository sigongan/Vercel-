"use client";

import { useState } from "react";
import { translations } from "@/lib/i18n";

const t = translations.en;

export function PricingSection() {
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

  async function startCheckout(path: "/api/stripe/subscribe" | "/api/stripe/checkout") {
    setBillingMsg(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (res.status === 401) {
        window.dispatchEvent(new Event("avocato:open-signin"));
        window.scrollTo({ top: 0, behavior: "smooth" });
        setBillingMsg(t.pricingSignInFirst);
        return;
      }
      setBillingMsg(data.error || t.subscribeUnavailable);
    } catch {
      setBillingMsg(t.subscribeUnavailable);
    }
  }

  return (
    <section className="w-full max-w-4xl flex flex-col items-center gap-3">
      <h2 className="font-display italic text-3xl sm:text-4xl tracking-tight text-[#7a4a3a] dark:text-stone-50">
        {t.pricingTitle}
      </h2>
      <p className="text-sm text-[#a97e6b] dark:text-stone-400">{t.pricingSubtitle}</p>

      <div className="mt-7 grid w-full gap-4 sm:grid-cols-3">
        <PlanCard
          name={t.planFreeName}
          price={t.planFreePrice}
          features={t.planFreeFeatures}
          cta={t.planFreeCta}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        />
        <PlanCard
          name={t.planProName}
          price={t.planProPrice}
          unit={t.planProUnit}
          badge={t.planProBadge}
          features={t.planProFeatures}
          cta={t.planProCta}
          highlight
          onClick={() => startCheckout("/api/stripe/subscribe")}
        />
        <PlanCard
          name={t.planCreditsName}
          price={t.planCreditsPrice}
          unit={t.planCreditsUnit}
          features={t.planCreditsFeatures}
          cta={t.planCreditsCta}
          onClick={() => startCheckout("/api/stripe/checkout")}
        />
      </div>
      {billingMsg && <p className="mt-2 text-xs text-[#c98a6f] dark:text-amber-400">{billingMsg}</p>}
    </section>
  );
}

function PlanCard({
  name,
  price,
  unit,
  badge,
  features,
  cta,
  highlight = false,
  onClick,
}: {
  name: string;
  price: string;
  unit?: string;
  badge?: string;
  features: readonly string[];
  cta: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`relative flex flex-col gap-5 rounded-3xl border p-6 ${
        highlight
          ? "border-[#f3a480] dark:border-amber-600 bg-gradient-to-b from-[#fdf3ec] to-white dark:from-amber-950/40 dark:to-stone-900 shadow-[0_10px_30px_rgba(224,120,86,0.18)]"
          : "border-transparent dark:border-stone-800 bg-white dark:bg-stone-900 shadow-[0_6px_20px_rgba(190,130,100,0.10)] dark:shadow-none"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-[#f3a480] to-[#e07856] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          {badge}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#d9b8a8]">{name}</h3>
        <p className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold tabular-nums text-[#7a4a3a] dark:text-stone-50">{price}</span>
          {unit && <span className="text-xs text-[#c3a08d]">{unit}</span>}
        </p>
      </div>
      <ul className="flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-[#8a6555] dark:text-stone-300">
            <CheckIcon highlight={highlight} />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className={`w-full rounded-full py-2.5 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 ${
          highlight
            ? "bg-gradient-to-br from-[#f3a480] to-[#e07856] text-white"
            : "bg-[#6b4a3f] text-stone-50 dark:bg-stone-100 dark:text-stone-900"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

function CheckIcon({ highlight = false }: { highlight?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`mt-0.5 shrink-0 ${highlight ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
