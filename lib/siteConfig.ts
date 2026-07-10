export const SITE_NAME = "Avocato";
export const SITE_TAGLINE_EN =
  "Turn videos, photos, and documents into clean, structured recipes — powered by AI.";
export const SITE_TAGLINE_KO = "영상, 사진, 문서를 AI로 깔끔하게 정리된 레시피로 바꿔 드립니다.";

/**
 * Set NEXT_PUBLIC_SITE_URL in Vercel once a custom domain is connected.
 * Falls back to a placeholder so OG/canonical tags still resolve pre-domain.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://avocato.app";
