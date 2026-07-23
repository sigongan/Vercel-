import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/siteConfig";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-900 px-5 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Link href="/" className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
          ← {SITE_NAME}
        </Link>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Privacy Policy</h1>
        <p className="text-xs text-stone-400">Effective July 19, 2026</p>

        <div className="flex flex-col gap-5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          <p>This describes what {SITE_NAME} collects and why.</p>

          <Section title="What we collect">
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <strong>Content you submit</strong> — files, links, or text you provide to extract a
                recipe from. This is sent to our AI provider (Anthropic) to generate the result, and a
                hash of it may be cached so identical requests don&apos;t re-run the AI.
              </li>
              <li>
                <strong>Account info</strong> — if you sign in with Apple, your email address (or
                Apple&rsquo;s private relay address if you choose to hide it) and name, via Supabase, to
                manage your free usage, credits, subscription, and saved recipes. Sign in with Apple
                shares only what you authorize at Apple&rsquo;s sign-in screen — never your password.
              </li>
              <li>
                <strong>Payment info</strong> — in the iOS app, subscriptions are purchased through
                Apple&rsquo;s In-App Purchase and billed by Apple; we never see your payment details, only
                that a purchase succeeded. On the website, Stripe processes payments directly — we never
                see or store your card details, only that a payment succeeded and your Stripe
                customer/subscription ID.
              </li>
              <li>
                <strong>Basic usage data</strong> — request counts for enforcing free limits, and
                standard server logs (e.g. error logs) for debugging.
              </li>
              <li>
                <strong>Anonymous analytics</strong> — we use Vercel Analytics to see aggregate page
                views and performance. It does not use cookies and does not identify you personally.
              </li>
            </ul>
          </Section>

          <Section title="The iOS app">
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <strong>Clipboard</strong> — {SITE_NAME} never reads your clipboard automatically. If you
                paste a link into the app yourself, it&rsquo;s only sent to our server when you tap the
                extract button.
              </li>
              <li>
                <strong>Recent recipes</strong> — your recent extraction history is stored only on your
                device. It never leaves your phone, and deleting the app deletes it.
              </li>
              <li>
                <strong>Share extension</strong> — when you share a link to {SITE_NAME} from another
                app, that link is handed to the app (and copied to your clipboard as a fallback) to
                start extraction. Only the link itself is shared with us, and only to extract the
                recipe.
              </li>
            </ul>
          </Section>

          <Section title="How we use it">
            To generate your recipe, enforce free-tier/subscription limits, let you save and manage
            recipes if you subscribe, process payments, and fix bugs. We don&apos;t sell your data or use
            it for advertising.
          </Section>

          <Section title="Who we share it with">
            Only the service providers needed to run {SITE_NAME}: Anthropic (AI processing), Supabase
            (authentication and database), Stripe (payments), and Vercel (hosting). Each only receives
            what they need to do their part.
          </Section>

          <Section title="Data retention">
            Saved recipes and account data are kept while your account is active. Cached extraction
            results may be kept to speed up repeat requests. You can delete your account and all
            associated data at any time from Profile → Delete Account in the app — no need to contact us.
          </Section>

          <Section title="Your choices">
            You can use {SITE_NAME} anonymously for a limited free trial without creating an account. You
            can delete saved recipes yourself from the My Recipes page, manage or cancel a subscription
            from the App Store (iOS) or billing portal (web), and delete your account and all its data
            at any time from Profile → Delete Account — this happens immediately, in the app, with no
            support request needed.
          </Section>

          <Section title="Contact">
            Questions about your data? Email{" "}
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
      <div>{children}</div>
    </section>
  );
}
