import { translations } from "@/lib/i18n";
import { PricingSection } from "@/components/PricingSection";

const t = translations.en;

export function LandingSections() {
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

      <PricingSection />

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
