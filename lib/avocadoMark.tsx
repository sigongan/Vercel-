/**
 * Hand-drawn avocado mark for PWA/launcher icons. ImageResponse's emoji
 * support fetches twemoji from a CDN at render time — a drawn SVG renders
 * identically everywhere with no network dependency.
 */
export function AvocadoMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* skin */}
      <path
        d="M50 8 C59 8 64 20 65.5 31 C78 39 83 54 81 66 C78 85 63 94 50 94 C37 94 22 85 19 66 C17 54 22 39 34.5 31 C36 20 41 8 50 8 Z"
        fill="#3f6212"
      />
      {/* flesh */}
      <path
        d="M50 16 C57 16 61 26 62.5 35.5 C73 42.5 77.5 55 75.5 65 C73 81 60.5 88 50 88 C39.5 88 27 81 24.5 65 C22.5 55 27 42.5 37.5 35.5 C39 26 43 16 50 16 Z"
        fill="#d9f99d"
      />
      {/* pit */}
      <circle cx="50" cy="63" r="13.5" fill="#854d0e" />
      <circle cx="45.5" cy="58.5" r="4" fill="#a16207" />
    </svg>
  );
}
