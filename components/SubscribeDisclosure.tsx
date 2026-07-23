"use client";

import { useEffect, useState } from "react";
import { isNativeApp, getProProductInfo } from "@/lib/nativeApp";
import { translations, type Language, type Translation } from "@/lib/i18n";
import { SUBSCRIPTION_PRICE_USD } from "@/lib/billingConstants";

const APPLE_PRO_PRODUCT_ID = process.env.NEXT_PUBLIC_APPLE_PRO_PRODUCT_ID;

/**
 * App Store Review Guideline 3.1.2: title, length, and price of an
 * auto-renewable subscription, plus functional links to the Privacy Policy
 * and Terms of Use, must appear right next to the purchase button — not
 * just inside the system StoreKit sheet. Shared by every Pro purchase entry
 * point (PaywallGate, RecipeCard's SaveButton, Library's paywall card).
 */
export function SubscribeDisclosure({ t, language }: { t: Translation; language: Language }) {
  const [price, setPrice] = useState<string | null>(null);
  const settings = translations[language].settings;

  useEffect(() => {
    if (!isNativeApp() || !APPLE_PRO_PRODUCT_ID) return;
    getProProductInfo(APPLE_PRO_PRODUCT_ID).then((product) => {
      if (product?.displayPrice) setPrice(product.displayPrice);
    });
  }, []);

  return (
    <p className="max-w-xs text-center text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
      {t.subscribeDisclosure(price ?? `$${SUBSCRIPTION_PRICE_USD}`)}{" "}
      <a href="/terms" className="underline underline-offset-2">
        {settings.terms}
      </a>
      {" · "}
      <a href="/privacy" className="underline underline-offset-2">
        {settings.privacy}
      </a>
    </p>
  );
}
