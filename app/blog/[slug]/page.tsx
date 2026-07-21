import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_NAME } from "@/lib/siteConfig";
import { BLOG_POSTS, getBlogPost, type Block } from "@/lib/blog";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return { title: post.title, description: post.description };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-900 px-5 py-16">
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            ← {SITE_NAME}
          </Link>
          <Link href="/blog" className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            All posts
          </Link>
        </div>

        <header className="flex flex-col gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
            {formatDate(post.date)} · {post.readMinutes} min read
          </span>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900 dark:text-stone-50">
            {post.title}
          </h1>
          <p className="text-base text-stone-600 dark:text-stone-400 leading-relaxed">{post.description}</p>
        </header>

        <div className="flex flex-col gap-5">
          {post.blocks.map((block, i) => (
            <BlockRenderer key={i} block={block} />
          ))}
        </div>

        <section className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 px-8 py-10 text-center">
          <Link
            href={post.cta.href}
            className="rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-stone-700 dark:hover:bg-stone-300"
          >
            {post.cta.label} →
          </Link>
        </section>
      </article>
    </main>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="font-display text-xl sm:text-2xl tracking-tight text-stone-900 dark:text-stone-50 mt-2">
          {block.text}
        </h2>
      );
    case "p":
      return <p className="text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">{block.text}</p>;
    case "ul":
      return (
        <ul className="flex flex-col gap-2 pl-1">
          {block.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300"
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <p className="rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-5 py-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {block.text}
        </p>
      );
  }
}
