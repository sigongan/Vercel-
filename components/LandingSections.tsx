"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";

export function LandingSections() {
  const { language } = useLanguage();
  const t = translations[language];
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
    <div className="relative z-[1] w-full flex flex-col items-center gap-24 pt-12">
      {/* How it works */}
      <section className="w-full max-w-4xl flex flex-col items-center gap-10">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900 dark:text-stone-50">
          {t.howTitle}
        </h2>
        <ol className="grid w-full gap-4 sm:grid-cols-3">
          {[
            { title: t.how1Title, desc: t.how1Desc, icon: <DropIcon /> },
            { title: t.how2Title, desc: t.how2Desc, icon: <SparkIcon /> },
            { title: t.how3Title, desc: t.how3Desc, icon: <HeartIcon /> },
          ].map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900">
                  {step.icon}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-[15px] font-semibold text-stone-900 dark:text-stone-100">{step.title}</h3>
              <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing */}
      <section className="w-full max-w-4xl flex flex-col items-center gap-3">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900 dark:text-stone-50">
          {t.pricingTitle}
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">{t.pricingSubtitle}</p>

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
        {billingMsg && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{billingMsg}</p>}
      </section>

      {/* FAQ */}
      <section className="w-full max-w-2xl flex flex-col items-center gap-8">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900 dark:text-stone-50">
          {t.faqTitle}
        </h2>
        <dl className="w-full flex flex-col divide-y divide-stone-200 dark:divide-stone-800 border-y border-stone-200 dark:border-stone-800">
          {t.faq.map((item) => (
            <div key={item.q} className="py-5 flex flex-col gap-1.5">
              <dt className="text-[15px] font-semibold text-stone-900 dark:text-stone-100">{item.q}</dt>
              <dd className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
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
      className={`relative flex flex-col gap-5 rounded-2xl border p-6 ${
        highlight
          ? "border-amber-400 dark:border-amber-600 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/40 dark:to-stone-900 shadow-[0_8px_30px_rgba(245,158,11,0.15)]"
          : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          {badge}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400">{name}</h3>
        <p className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold tabular-nums text-stone-900 dark:text-stone-50">{price}</span>
          {unit && <span className="text-xs text-stone-400">{unit}</span>}
        </p>
      </div>
      <ul className="flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-300">
            <CheckIcon highlight={highlight} />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className={`w-full rounded-full py-2.5 text-sm font-semibold shadow-sm transition-colors ${
          highlight
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-stone-900 text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
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

function DropIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.7L19.5 10l-5.6 1.3L12 17l-1.9-5.7L4.5 10l5.6-1.3z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}
