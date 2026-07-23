"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { startProSubscription } from "@/lib/subscribePro";
import { isNativeApp } from "@/lib/nativeApp";
import { SubscribeDisclosure } from "@/components/SubscribeDisclosure";

export function GoProButton() {
  const { language } = useLanguage();
  const t = translations[language];
  const [msg, setMsg] = useState<string | null>(null);
  const native = isNativeApp();

  async function handleClick() {
    setMsg(null);
    const outcome = await startProSubscription();
    if (outcome === "success") {
      window.location.reload();
    } else if (outcome === "pending") {
      setMsg(t.subscribePending);
    } else if (outcome === "error" || outcome === "unavailable") {
      setMsg(t.subscribeUnavailable);
    }
  }

  if (!native) {
    return <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{t.getProInApp}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors"
      >
        {t.subscribeButton}
      </button>
      <SubscribeDisclosure t={t} language={language} />
      {msg && <p className="text-xs text-amber-700 dark:text-amber-400">{msg}</p>}
    </div>
  );
}
