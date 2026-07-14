/** Data for /blog (hub) and /blog/[slug] (posts). Plain structured content — no MDX/markdown
 *  dependency, rendered with the same components/typography as the rest of the site. */

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "callout"; text: string };

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  readMinutes: number;
  blocks: Block[];
  cta: { label: string; href: string };
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "recipe-apps-without-subscription",
    title: "The Best Recipe Apps Without a Subscription (2026)",
    description:
      "A round-up of recipe tools that don't lock basic features behind a paywall — including a few honest notes on where each one's free tier stops.",
    date: "2026-06-02",
    readMinutes: 4,
    cta: { label: "See the full feature comparison", href: "/alternatives" },
    blocks: [
      {
        type: "p",
        text: "A lot of recipe apps quietly moved core features behind a subscription over the last couple of years — saving more than a handful of recipes, importing from video, even scaling a recipe to more servings. If you just want to grab a recipe and cook it, here's what's actually free right now, and where the free tier tends to stop.",
      },
      { type: "h2", text: "Pure recipe extractors (free, no account)" },
      {
        type: "p",
        text: "RecipeExtractor.com and JustTheRecipe both strip a recipe down to ingredients and steps from a link, no account required for a quick one-off. RecipeExtractor.com keeps video links (YouTube, TikTok, Instagram) free too. JustTheRecipe is excellent at cleaning up cluttered blog posts and has a shopping list built in — video import there is more of an app feature than a free web one.",
      },
      { type: "h2", text: "If you also want it to look good or get costed" },
      {
        type: "p",
        text: "That's the gap Avocato sits in: pasting text or a link is free and unlimited for everyone, no account, no limit — same as the tools above. Photos, screenshots, PDFs, and one free video extraction don't need an account either. Where it differs is what happens after extraction: three print-ready card styles, an editable saved library once you're in, and a cost & margin calculator if you're actually selling what you cook.",
      },
      {
        type: "callout",
        text: "Rule of thumb: if you only ever start from a link, a pure extractor is enough. If you start from screenshots, photos, or PDFs too — or want the result to look like something worth printing — you'll hit that wall fast on most free tools.",
      },
      { type: "h2", text: "What to actually check before you commit to one" },
      {
        type: "ul",
        items: [
          "Does the free tier cover the source you actually use most (links vs. photos vs. video)?",
          "Is there a hard monthly cap, or just a slower/ad-supported free tier?",
          "Can you export or print what you save, or is it locked into their app?",
        ],
      },
      {
        type: "p",
        text: "See the full feature-by-feature breakdown on our comparisons page, or just paste a recipe in below and see for yourself — no account needed for the first one.",
      },
    ],
  },
  {
    slug: "how-to-cost-a-recipe",
    title: "How to Cost a Recipe: Food Cost %, GP%, and Menu Pricing Explained",
    description:
      "A plain-language walkthrough of how to price a dish properly — food cost percentage, gross profit margin, and where GST fits in — for anyone selling food from a home kitchen, cafe, or bakery.",
    date: "2026-06-18",
    readMinutes: 6,
    cta: { label: "Try the margin calculator free", href: "/margin-calculator" },
    blocks: [
      {
        type: "p",
        text: "If you've ever priced a menu item by guessing — \"ingredients cost about $3, so I'll charge $12\" — you're not alone, and you're probably leaving money on the table (or worse, losing it). Here's the actual math, without the spreadsheet headache.",
      },
      { type: "h2", text: "Step 1: Find your true batch cost" },
      {
        type: "p",
        text: "Cost every ingredient at the quantity you actually use, not the pack size you bought. If a bag of flour costs $4 for 2kg and your recipe uses 250g, that ingredient costs $0.50 in this batch — not $4. Add every ingredient up to get your total batch cost.",
      },
      { type: "h2", text: "Step 2: Divide by portions" },
      {
        type: "p",
        text: "Batch cost ÷ number of portions = food cost per portion. A $24 batch that makes 12 cupcakes costs $2.00 per cupcake in ingredients alone — before your time, packaging, rent, or anything else.",
      },
      { type: "h2", text: "Step 3: Decide your target gross profit %" },
      {
        type: "p",
        text: "Most cafes and bakeries target 65–75% gross profit (GP%) on food. That means your cost per portion should sit at roughly 25–35% of the price you charge, before tax. The formula: price = cost ÷ (1 − target GP%). At a $2.00 cost and a 70% GP target, that's $2.00 ÷ 0.30 = $6.67 before tax.",
      },
      {
        type: "callout",
        text: "Lower-cost items (coffee, baked goods) usually run a higher GP% than protein-heavy dishes — a flat 70% target across your whole menu isn't always realistic, and that's fine.",
      },
      { type: "h2", text: "Step 4: Add tax on top" },
      {
        type: "p",
        text: "If you're in a GST/VAT region, that goes on top of the price you just calculated, not baked into your margin. A $6.67 pre-tax price plus 10% GST is $7.34 — round to whatever makes sense on a menu ($7.50 or $8).",
      },
      { type: "h2", text: "Doing this without a spreadsheet" },
      {
        type: "p",
        text: "This is exactly what our cost & margin calculator does automatically — enter what you paid for each ingredient, set your portions and target GP%, and it works out the GST-ready price for you. It's built into every saved recipe on Avocato, or you can try it free right now with a sample recipe on the margin calculator page.",
      },
    ],
  },
  {
    slug: "get-recipe-from-tiktok-instagram-video",
    title: "How to Get Just the Recipe From a TikTok or Instagram Video",
    description:
      "No more pausing and rewinding fifteen times. Here's how to pull a clean, written recipe out of a cooking video in one step.",
    date: "2026-07-01",
    readMinutes: 3,
    cta: { label: "Extract a video recipe now", href: "/" },
    blocks: [
      {
        type: "p",
        text: "The recipe is always in there somewhere — quick flashes of ingredients on screen, quantities read out over a jump-cut, a full ingredient list in the caption if you're lucky. Getting it out by hand usually means pausing every three seconds with a notes app open.",
      },
      { type: "h2", text: "The manual way (works, but slow)" },
      {
        type: "ul",
        items: [
          "Check the caption first — sometimes the full recipe is already typed out there",
          "If not, watch once through for the ingredient list, pausing on any on-screen text",
          "Watch again for the method, writing down each step as it happens",
          "Go back and fill in any amounts you missed the first two times",
        ],
      },
      { type: "h2", text: "The one-step way" },
      {
        type: "p",
        text: "Paste the video link into a recipe extractor and it does all of the above at once — reading on-screen text, transcribing the audio, and piecing both together into an ingredients list and numbered steps. Avocato does this for YouTube, TikTok, and Instagram links; when the source doesn't give an exact amount, it makes a reasonable estimate and marks it with a ~ so you know what to double-check.",
      },
      {
        type: "callout",
        text: "First video extraction is free with no account. If you're doing this often, signing in gets you 5 more a month — and pasting recipe text you already have (from a caption, a screenshot transcript, anywhere) is free and unlimited either way.",
      },
      {
        type: "p",
        text: "Once it's extracted, you can edit anything that needs a tweak, save it, and print it — no more re-watching the same video the next time you want to make it.",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
