import type { Language } from "@/lib/i18n";
import { ExtractedContent, ExtractionError } from "./types";

const CAPTION_ONLY_WARNING: Record<Language, string> = {
  en: "TikTok extraction uses only the caption text, not the video itself. If the caption doesn't contain the recipe, accuracy may be low — upload a screenshot for better results.",
  de: "Die TikTok-Extraktion verwendet nur den Bildunterschrift-Text, nicht das Video selbst. Wenn die Bildunterschrift das Rezept nicht enthält, kann die Genauigkeit gering sein — lade für bessere Ergebnisse einen Screenshot hoch.",
  it: "L'estrazione da TikTok usa solo il testo della didascalia, non il video stesso. Se la didascalia non contiene la ricetta, l'accuratezza potrebbe essere bassa — carica uno screenshot per risultati migliori.",
  es: "La extracción de TikTok usa solo el texto de la descripción, no el vídeo en sí. Si la descripción no contiene la receta, la precisión puede ser baja — sube una captura de pantalla para mejores resultados.",
  fr: "L'extraction TikTok utilise uniquement le texte de la légende, pas la vidéo elle-même. Si la légende ne contient pas la recette, la précision peut être faible — importez une capture d'écran pour de meilleurs résultats.",
  pt: "A extração do TikTok usa apenas o texto da legenda, não o vídeo em si. Se a legenda não contiver a receita, a precisão pode ser baixa — envie uma captura de tela para melhores resultados.",
};

export async function extractFromTiktok(url: string, lang: Language): Promise<ExtractedContent> {
  const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);

  if (!res.ok) {
    throw new ExtractionError(
      "Could not fetch this TikTok video's details. Check the link or upload a screenshot instead.",
      "EXTRACTION_FAILED"
    );
  }

  const data = await res.json();
  // TikTok's oEmbed "title" field is usually the video caption, which often
  // contains the ingredient list creators type out by hand.
  const text: string | undefined = data.title;

  return {
    sourceType: "tiktok",
    sourceUrl: url,
    title: data.author_name ? `TikTok by ${data.author_name}` : undefined,
    text,
    warning: CAPTION_ONLY_WARNING[lang],
  };
}
