/** The CalendarPRO symbol, inline so its aqua tones can follow the accent of the
 *  active style (see the --mark-* variables in app.css). */
export function AppMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 128 144" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="app-mark-aqua" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--mark-1, #5FE0E8)" }} />
          <stop offset=".55" style={{ stopColor: "var(--mark-2, #1FAFBD)" }} />
          <stop offset="1" style={{ stopColor: "var(--mark-3, #0A5A67)" }} />
        </linearGradient>
      </defs>
      <rect x="40" y="14" width="8" height="20" rx="4" fill="url(#app-mark-aqua)" />
      <rect x="80" y="14" width="8" height="20" rx="4" fill="url(#app-mark-aqua)" />
      <rect x="4" y="24" width="120" height="112" rx="18" fill="url(#app-mark-aqua)" />
      <path d="M16 56h96" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 34l-8-2 4 8z" fill="#F7F4EF" />
      <circle cx="64" cy="40" r="14" fill="#F7F4EF" />
      <ellipse cx="58" cy="44" rx="4" ry="7" transform="rotate(-24 58 44)" style={{ fill: "var(--mark-wing, #B6ECF2)" }} fillOpacity=".9" />
      <circle cx="70" cy="36" r="1.5" style={{ fill: "var(--mark-eye, #084F5B)" }} />
      <path d="M76 36l8 3-7 4z" fill="#F59E0B" />
      <g fill="#FFFFFF" fillOpacity=".45">
        <rect x="18" y="66" width="26" height="18" rx="5" />
        <rect x="51" y="66" width="26" height="18" rx="5" />
        <rect x="84" y="66" width="26" height="18" rx="5" />
        <rect x="18" y="91" width="26" height="18" rx="5" />
        <rect x="84" y="91" width="26" height="18" rx="5" />
        <rect x="18" y="116" width="26" height="18" rx="5" />
        <rect x="51" y="116" width="26" height="18" rx="5" />
      </g>
      <rect x="51" y="91" width="26" height="18" rx="5" fill="#F7F4EF" />
      <path d="m59 100 3.5 3.5L71 95" fill="none" style={{ stroke: "var(--mark-check, #177F8C)" }} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="96" cy="124" r="4" fill="#F59E0B" />
    </svg>
  );
}
