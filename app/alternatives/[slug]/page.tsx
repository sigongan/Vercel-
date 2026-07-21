import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_NAME } from "@/lib/siteConfig";
import { ALTERNATIVES, getAlternative } from "@/lib/alternatives";
import { GoProButton } from "@/components/GoProButton";

export function generateStaticParams() {
  return ALTERNATIVES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const alt = getAlternative(slug);
  if (!alt) return {};
  return {
    title: `${SITE_NAME} vs ${alt.name} — Which Should You Use?`,
    description: `An honest, feature-by-feature comparison of ${SITE_NAME} and ${alt.name} for extracting and organizing recipes.`,
  };
}

export default async function AlternativePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const alt = getAlternative(slug);
  if (!alt) notFound();

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-900 px-5 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-14">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            ← {SITE_NAME}
          </Link>
          <Link href="/alternatives" className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            All comparisons
          </Link>
        </div>

        <header className="flex flex-col gap-4">
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900 dark:text-stone-50">
            {SITE_NAME} vs {alt.name}
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            {alt.name} is {alt.tagline.charAt(0).toLowerCase() + alt.tagline.slice(1)}{" "}
            Here&apos;s an honest comparison, including where they&apos;re genuinely better.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
            What {alt.name} does well
          </h2>
          <ul className="flex flex-col gap-2">
            {alt.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-400">
                <CheckIcon className="mt-0.5 shrink-0 text-stone-400" />
                {s}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
            Feature by feature
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                  <th className="px-5 py-3 font-semibold">Feature</th>
                  <th className="px-3 py-3 text-center font-semibold">{alt.name}</th>
                  <th className="px-3 py-3 text-center font-semibold">{SITE_NAME}</th>
                </tr>
              </thead>
              <tbody>
                {alt.rows.map((row) => (
                  <tr key={row.feature} className="border-t border-stone-100 dark:border-stone-700">
                    <td className="px-5 py-3 text-stone-700 dark:text-stone-300">{row.feature}</td>
                    <td className="px-3 py-3 text-center">
                      <Cell value={row.them} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Cell value={row.us} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
            <h3 className="text-[15px] font-semibold text-stone-900 dark:text-stone-100">
              Choose {alt.name} if…
            </h3>
            <ul className="flex flex-col gap-2">
              {alt.chooseThemIf.map((s) => (
                <li key={s} className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 p-6">
            <h3 className="text-[15px] font-semibold text-stone-900 dark:text-stone-100">
              Choose {SITE_NAME} if…
            </h3>
            <ul className="flex flex-col gap-2">
              {alt.chooseUsIf.map((s) => (
                <li key={s} className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-col items-center gap-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-8 py-12 text-center">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-stone-900 dark:text-stone-50">
            Try it yourself, free
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md">
            Paste in a recipe or a link — no account needed for your first extraction.
          </p>
          <Link
            href="/"
            className="rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-stone-700 dark:hover:bg-stone-300"
          >
            Try {SITE_NAME}
          </Link>
          <div className="pt-2">
            <GoProButton />
          </div>
        </section>

        <p className="text-center text-[11px] text-stone-400">
          Feature comparisons are based on {alt.name}&apos;s public site as of mid-2026 and may have
          changed since.{" "}
          <a href={alt.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Visit {alt.name} →
          </a>
        </p>
      </div>
    </main>
  );
}

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckIcon className="mx-auto text-emerald-600 dark:text-emerald-400" />;
  if (value === false) return <DashIcon className="mx-auto text-stone-300 dark:text-stone-700" />;
  return <span className="text-[11px] leading-tight text-amber-700 dark:text-amber-400">{value}</span>;
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DashIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={className}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
