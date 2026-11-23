type ArtProps = { className?: string };

const CORNERS = ["tl", "tr", "bl", "br"] as const;

/** Red corner flourishes that frame the printed-calendar pages. The chief
 *  illustration itself lives in assets/piel-roja.svg and is used as an image. */
export function PielRojaFrame({ className = "" }: ArtProps) {
  return (
    <div className={`piel-frame ${className}`.trim()} aria-hidden="true">
      {CORNERS.map((corner) => (
        <svg
          key={corner}
          className={`piel-corner ${corner}`}
          viewBox="0 0 80 80"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 75 C5 36 24 9 62 5 C41 15 26 30 22 47 C19 59 27 68 38 65 C48 62 52 52 46 45 C42 40 35 43 35 51" />
          <path d="M14 75 C14 47 31 24 56 14" opacity=".5" />
          <path d="M26 22 C33 18 42 21 46 27" opacity=".6" />
          <circle cx="63" cy="6" r="2.6" fill="currentColor" stroke="none" />
          <circle cx="6" cy="63" r="2.6" fill="currentColor" stroke="none" />
        </svg>
      ))}
    </div>
  );
}
