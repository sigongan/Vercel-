import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/siteConfig";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-900 px-5 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Link href="/" className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
          ← {SITE_NAME}
        </Link>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Terms of Service</h1>
        <p className="text-xs text-stone-400">Effective July 10, 2026</p>

        <div className="flex flex-col gap-5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          <p>
            {SITE_NAME}{" "}
            (&quot;we&quot;, &quot;us&quot;) provides a tool that uses AI to extract structured recipes from
            content you submit — files you upload, links you paste, or text you enter. By using{" "}
            {SITE_NAME}, you agree to these terms.
          </p>

          <Section title="1. The service">
            {SITE_NAME}{" "}
            processes the source you provide with an AI model to generate a recipe (title,
            ingredients, steps, and related details). Extracted recipes may contain errors — including
            AI-estimated ingredient amounts when the source didn&apos;t specify them — and should be used
            as a starting point, not a guarantee of accuracy.
          </Section>

          <Section title="2. Accounts and usage limits">
            You may use the service without an account up to a limited free trial. Creating an account
            unlocks additional free monthly extractions and the option to purchase credits or subscribe
            to paid features (such as saving recipes). We may change free limits or pricing at any time;
            changes won&apos;t retroactively affect credits or subscriptions you&apos;ve already paid for.
          </Section>

          <Section title="3. Payments">
            Paid credits and subscriptions are processed by Stripe. Credit packs are one-time, non-refundable
            purchases once used. Subscriptions renew automatically each month until cancelled; you can
            cancel anytime from the billing portal, and access continues until the end of the paid period.
          </Section>

          <Section title="4. Your content">
            You retain ownership of what you submit. You&apos;re responsible for having the right to submit
            it (for example, not scraping or bulk-uploading copyrighted video/text you don&apos;t have rights
            to process). We use submitted content only to generate and cache your recipe result.
          </Section>

          <Section title="5. Acceptable use">
            Don&apos;t use {SITE_NAME} to abuse the service (automated scraping at scale, attempting to
            bypass usage limits, or submitting unlawful content). We may suspend accounts that abuse the
            service.
          </Section>

          <Section title="6. No warranty">
            The service is provided &quot;as is.&quot; We don&apos;t guarantee extracted recipes are accurate,
            complete, or safe to cook without your own judgment — always use common sense with quantities,
            allergens, and food safety.
          </Section>

          <Section title="7. Changes">
            We may update these terms as the service evolves. Continued use after a change means you
            accept the updated terms.
          </Section>

          <Section title="8. Contact">
            Questions about these terms? Email{" "}
            <a href="mailto:suwonbaek87@gmail.com" className="underline underline-offset-2">
              suwonbaek87@gmail.com
            </a>
            .
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
