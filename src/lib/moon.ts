export type MoonPhase = "new" | "first" | "full" | "last";

const SYNODIC_DAYS = 29.530588853;
// A known new moon: 2000-01-06 18:14 UTC.
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

/** Fraction of the lunar cycle at a moment: 0 = new moon, 0.5 = full moon. */
export function lunarAge(date: Date): number {
  const days = (date.getTime() - REFERENCE_NEW_MOON) / 86_400_000;
  const cycles = days / SYNODIC_DAYS;
  return cycles - Math.floor(cycles);
}

/** The main phase that falls on a local calendar day, as printed on wall calendars. */
export function moonPhaseOfDay(day: Date): MoonPhase | null {
  const noon = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12);
  const age = lunarAge(noon);
  const phases: MoonPhase[] = ["new", "first", "full", "last"];
  const half = 0.5 / SYNODIC_DAYS; // half a day, in cycle fractions
  for (let index = 0; index < 4; index += 1) {
    const target = index / 4;
    const distance = Math.min(Math.abs(age - target), 1 - Math.abs(age - target));
    if (distance <= half) return phases[index];
  }
  return null;
}
