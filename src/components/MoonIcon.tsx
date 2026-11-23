import type { MoonPhase } from "../lib/moon";

const LABELS: Record<MoonPhase, string> = {
  new: "Luna nueva",
  first: "Cuarto creciente",
  full: "Luna llena",
  last: "Cuarto menguante",
};

/** Tiny moon drawn like the phases printed on traditional wall calendars. */
export function MoonIcon({ phase, size = 11 }: { phase: MoonPhase; size?: number }) {
  return (
    <svg className="moon-icon" width={size} height={size} viewBox="0 0 12 12" role="img" aria-label={LABELS[phase]}>
      <title>{LABELS[phase]}</title>
      <circle cx="6" cy="6" r="5" fill={phase === "new" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2" />
      {phase === "full" && <circle cx="6" cy="6" r="5" fill="currentColor" opacity="0.2" />}
      {phase === "first" && <path d="M6 1a5 5 0 0 1 0 10z" fill="currentColor" />}
      {phase === "last" && <path d="M6 1a5 5 0 0 0 0 10z" fill="currentColor" />}
    </svg>
  );
}
