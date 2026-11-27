import { useId } from "react";
import bristolPortraitUrl from "../assets/bristol-portrait.png";

type MedallionProps = {
  className?: string;
  year?: number;
};

/** Engraved founder medallion for the Almanaque Bristol theme. The portrait is
 *  cut from the artwork supplied with the project (assets/art/bristol.jpg). */
export function BristolMedallion({ className = "", year }: MedallionProps) {
  const uid = useId().replace(/:/g, "");
  const discId = `bristol-disc-${uid}`;
  const arcTopId = `bristol-arc-top-${uid}`;
  const arcBottomId = `bristol-arc-bottom-${uid}`;
  const ink = "#171310";

  return (
    <svg
      className={`bristol-medallion ${className}`.trim()}
      viewBox="0 0 400 400"
      role="img"
      aria-label="Retrato del fundador del Almanaque Bristol"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={discId}>
          <circle cx="200" cy="200" r="172" />
        </clipPath>
        <path id={arcTopId} d="M43 200 A157 157 0 0 1 357 200" />
        <path id={arcBottomId} d="M43 200 A157 157 0 0 0 357 200" />
      </defs>

      <circle cx="200" cy="200" r="190" fill="#f8f1e4" stroke={ink} strokeWidth="2.4" />
      <circle cx="200" cy="200" r="182" stroke={ink} strokeWidth="0.8" opacity="0.55" />
      <circle cx="200" cy="200" r="173" fill="#f1dfc8" stroke={ink} strokeWidth="1.2" />

      <g clipPath={`url(#${discId})`}>
        <rect x="27" y="27" width="346" height="346" fill="#f1dfc8" />
        <image
          href={bristolPortraitUrl}
          x="73"
          y="79"
          width="254"
          height="300"
          preserveAspectRatio="xMidYMid meet"
        />
      </g>

      <text fontFamily="Oswald, sans-serif" fontSize="8" letterSpacing="2.1" fill={ink} opacity="0.85">
        <textPath href={`#${arcTopId}`} startOffset="50%" textAnchor="middle">
          ALMANAQUE · ASTRONOMÍA · AGRICULTURA
        </textPath>
      </text>
      <text fontFamily="Oswald, sans-serif" fontSize="8" letterSpacing="2.4" fill={ink} opacity="0.85">
        <textPath href={`#${arcBottomId}`} startOffset="50%" textAnchor="middle">
          {year ? `BOGOTÁ · AÑO ${year}` : "BOGOTÁ"}
        </textPath>
      </text>

      <circle cx="200" cy="200" r="197" stroke={ink} strokeWidth="0.9" opacity="0.4" />
    </svg>
  );
}
