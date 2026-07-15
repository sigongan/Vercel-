const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function YouTubeIcon() {
  return (
    <svg {...ICON_PROPS} stroke="#FF3B30">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <polygon points="10,9 16,12 10,15" fill="#FF3B30" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M16 3a5 5 0 0 0 5 5" stroke="#25F4EE" />
      <path
        d="M21 8v3a8 8 0 0 1-5-1.7V16a5.5 5.5 0 1 1-5-5.48"
        stroke="#FE2C55"
      />
      <path d="M16 3v13" stroke="#161823" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg {...ICON_PROPS}>
      <defs>
        <linearGradient id="instagram-gradient" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FEDA75" />
          <stop offset="35%" stopColor="#D62976" />
          <stop offset="70%" stopColor="#962FBF" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="url(#instagram-gradient)"
      />
      <circle cx="12" cy="12" r="4" stroke="url(#instagram-gradient)" />
      <circle
        cx="17.2"
        cy="6.8"
        r="0.6"
        fill="url(#instagram-gradient)"
        stroke="none"
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg {...ICON_PROPS} stroke="#4285F4">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg {...ICON_PROPS} stroke="#E5484D">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <text
        x="7"
        y="18"
        fontSize="6.5"
        fontWeight="700"
        fill="#E5484D"
        stroke="none"
        fontFamily="sans-serif"
      >
        PDF
      </text>
    </svg>
  );
}

function ScreenshotIcon() {
  return (
    <svg {...ICON_PROPS} stroke="#8B7FD6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" fill="#8B7FD6" stroke="none" />
      <path d="M21 15l-5-5-6 6" />
    </svg>
  );
}

function TextLinesIcon() {
  return (
    <svg {...ICON_PROPS}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="14" y2="18" />
    </svg>
  );
}

export const SOURCE_ICONS: Record<string, React.ReactNode> = {
  YouTube: <YouTubeIcon />,
  TikTok: <TikTokIcon />,
  Instagram: <InstagramIcon />,
  "Google Docs": <DocIcon />,
  PDF: <PdfIcon />,
  Screenshot: <ScreenshotIcon />,
  "Plain text": <TextLinesIcon />,
};
