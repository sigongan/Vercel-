import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/siteConfig";
import { BLOG_POSTS } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on recipe extraction, food costing, and cooking from a screen instead of a page.",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogHubPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-900 px-5 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <Link href="/" className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
          ← {SITE_NAME}
        </Link>

        <header className="flex flex-col gap-3">
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900 dark:text-stone-50">
            Blog
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Notes on recipe extraction, food costing, and cooking from a screen instead of a page.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="flex flex-col gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6 transition-colors hover:border-stone-400 dark:hover:border-stone-600"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
                {formatDate(post.date)} · {post.readMinutes} min read
              </span>
              <span className="text-[17px] font-semibold text-stone-900 dark:text-stone-100">
                {post.title}
              </span>
              <span className="text-sm text-stone-500 dark:text-stone-400">{post.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
