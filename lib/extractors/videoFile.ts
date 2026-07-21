import type { Language } from "@/lib/i18n";
import { ExtractedContent, ExtractionError } from "./types";

const SUPPORTED_MEDIA_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

const WARNING: Record<Language, string> = {
  en: "Video frame analysis isn't supported yet — only the file name is used for now. For better results, upload a screenshot of the recipe instead.",
  de: "Die Analyse von Videobildern wird noch nicht unterstützt — vorerst wird nur der Dateiname verwendet. Lade stattdessen für bessere Ergebnisse einen Screenshot des Rezepts hoch.",
  it: "L'analisi dei fotogrammi video non è ancora supportata — per ora viene usato solo il nome del file. Per risultati migliori, carica invece uno screenshot della ricetta.",
  es: "El análisis de fotogramas de vídeo aún no es compatible — por ahora solo se usa el nombre del archivo. Para mejores resultados, sube en su lugar una captura de pantalla de la receta.",
  fr: "L'analyse des images vidéo n'est pas encore prise en charge — seul le nom du fichier est utilisé pour l'instant. Pour de meilleurs résultats, importez plutôt une capture d'écran de la recette.",
  pt: "A análise de quadros de vídeo ainda não é compatível — por enquanto, apenas o nome do arquivo é usado. Para melhores resultados, envie uma captura de tela da receita.",
};

/**
 * Frame sampling (ffmpeg) isn't wired up yet, so an uploaded video only
 * carries its filename through to the AI parser today. The route surfaces
 * `warning` to the UI so users know why results may be limited.
 */
export async function extractFromVideoFile(file: File, lang: Language): Promise<ExtractedContent> {
  if (!SUPPORTED_MEDIA_TYPES.includes(file.type)) {
    throw new ExtractionError(`Unsupported video format: ${file.type}`, "INVALID_INPUT");
  }

  return {
    sourceType: "video-file",
    title: file.name,
    warning: WARNING[lang],
  };
}
