"use client";

import { useState } from "react";
import { SUBSCRIPTION_PRICE_USD } from "@/lib/billingConstants";

export function GoProButton() {
  const [msg, setMsg] = useState<string | null>(null);

  async function handleClick() {
    setMsg(null);
    try {
      const res = await fetch("/api/stripe/subscribe", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      setMsg(data.error || "Subscriptions aren't available yet. Please try again later.");
    } catch {
      setMsg("Subscriptions aren't available yet. Please try again later.");
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors"
      >
        {`Go Pro — $${SUBSCRIPTION_PRICE_USD}/month`}
      </button>
      {msg && <p className="text-xs text-amber-700 dark:text-amber-400">{msg}</p>}
    </div>
  );
}
