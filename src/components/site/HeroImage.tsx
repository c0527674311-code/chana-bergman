/**
 * Hero visual — an abstract upward view of a glass skyline, matching the
 * photograph in the mockup.
 *
 * To use the real photo instead, drop it at `public/hero.jpg` and swap this
 * component for a <Image src="/hero.jpg" … /> — the surrounding layout and
 * rounding are unchanged.
 */
export function HeroImage({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 700"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="מבט מלמטה על מגדלי משרדים מזכוכית"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#dbeaf4" />
          <stop offset="55%" stopColor="#a9cfe2" />
          <stop offset="100%" stopColor="#7fb4cf" />
        </linearGradient>
        <linearGradient id="glassA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4d7fa6" />
          <stop offset="100%" stopColor="#9fc9dc" />
        </linearGradient>
        <linearGradient id="glassB" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f5f85" />
          <stop offset="100%" stopColor="#7aa9c6" />
        </linearGradient>
        <linearGradient id="glassC" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#20476a" />
          <stop offset="100%" stopColor="#6d9dbd" />
        </linearGradient>
        <pattern id="windows" width="13" height="19" patternUnits="userSpaceOnUse">
          <rect width="13" height="19" fill="none" />
          <rect x="1.5" y="2" width="9" height="12" fill="#ffffff" opacity="0.16" />
        </pattern>
      </defs>

      <rect width="520" height="700" fill="url(#sky)" />

      {/* receding towers, converging upward for the looking-up perspective */}
      <g>
        <polygon points="0,700 0,150 118,214 118,700" fill="url(#glassA)" />
        <polygon points="0,150 0,150 118,214 118,214" fill="none" />
        <polygon points="0,700 0,150 118,214 118,700" fill="url(#windows)" />

        <polygon points="128,700 152,238 250,190 262,700" fill="url(#glassB)" />
        <polygon points="128,700 152,238 250,190 262,700" fill="url(#windows)" />

        <polygon points="276,700 288,300 372,268 386,700" fill="url(#glassC)" />
        <polygon points="276,700 288,300 372,268 386,700" fill="url(#windows)" />

        <polygon points="398,700 404,120 520,44 520,700" fill="url(#glassA)" />
        <polygon points="398,700 404,120 520,44 520,700" fill="url(#windows)" />

        {/* highlight edges */}
        <polygon points="118,214 128,238 128,700 118,700" fill="#ffffff" opacity="0.28" />
        <polygon points="262,190 276,300 276,700 262,700" fill="#ffffff" opacity="0.22" />
        <polygon points="386,268 398,120 398,700 386,700" fill="#ffffff" opacity="0.25" />
      </g>

      {/* soft light wash from the top */}
      <rect width="520" height="330" fill="url(#sky)" opacity="0.34" />
    </svg>
  );
}
