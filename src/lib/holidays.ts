/** Offline public-holiday bundles.
 *
 *  Everything is computed from fixed dates and the Gregorian Easter computus;
 *  no network request or downloaded calendar is involved. These are the main
 *  national holidays only, so regional/local observances are intentionally out
 *  of scope. Some countries move holidays to Mondays; that rule is applied
 *  where it is part of national law.
 */
import { addDays, pad2 } from "./dates";
import { newId, type CalendarEvent, type Language } from "./types";

interface Localized {
  es: string;
  en: string;
}

export interface HolidayCountry {
  id: string;
  name: Localized;
}

export const HOLIDAY_COUNTRIES: HolidayCountry[] = [
  { id: "ES", name: { es: "España", en: "Spain" } },
  { id: "MX", name: { es: "México", en: "Mexico" } },
  { id: "CO", name: { es: "Colombia", en: "Colombia" } },
  { id: "CL", name: { es: "Chile", en: "Chile" } },
  { id: "PE", name: { es: "Perú", en: "Peru" } },
  { id: "AR", name: { es: "Argentina", en: "Argentina" } },
  { id: "US", name: { es: "Estados Unidos", en: "United States" } },
];

interface Def {
  date: (year: number) => Date | null;
  name: Localized;
}

function keyOf(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function fixed(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/** Gregorian Easter Sunday (Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function fromEaster(year: number, days: number): Date {
  return addDays(easterSunday(year), days);
}

function nextMonday(date: Date): Date {
  const offset = (8 - date.getDay()) % 7;
  return addDays(date, offset);
}

/** Monday of the same ISO week (Chile moves some holidays this way). */
function mondayOfWeek(date: Date): Date {
  const diff = (date.getDay() + 6) % 7;
  return addDays(date, -diff);
}

function nthWeekday(year: number, month: number, weekday: number, nth: number): Date {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return addDays(first, offset + (nth - 1) * 7);
}

function lastWeekday(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return addDays(last, -offset);
}

function d(
  name: Localized,
  date: (year: number) => Date | null,
): Def {
  return { name, date };
}

const DEFS: Record<string, Def[]> = {
  ES: [
    d({ es: "Año Nuevo", en: "New Year's Day" }, (year) => fixed(year, 1, 1)),
    d({ es: "Día de Reyes", en: "Epiphany" }, (year) => fixed(year, 1, 6)),
    d({ es: "Viernes Santo", en: "Good Friday" }, (year) => fromEaster(year, -2)),
    d({ es: "Día del Trabajo", en: "Labour Day" }, (year) => fixed(year, 5, 1)),
    d({ es: "Asunción de la Virgen", en: "Assumption Day" }, (year) => fixed(year, 8, 15)),
    d({ es: "Fiesta Nacional de España", en: "National Day of Spain" }, (year) => fixed(year, 10, 12)),
    d({ es: "Todos los Santos", en: "All Saints' Day" }, (year) => fixed(year, 11, 1)),
    d({ es: "Día de la Constitución", en: "Constitution Day" }, (year) => fixed(year, 12, 6)),
    d({ es: "Inmaculada Concepción", en: "Immaculate Conception" }, (year) => fixed(year, 12, 8)),
    d({ es: "Navidad", en: "Christmas Day" }, (year) => fixed(year, 12, 25)),
  ],
  MX: [
    d({ es: "Año Nuevo", en: "New Year's Day" }, (year) => fixed(year, 1, 1)),
    d({ es: "Día de la Constitución", en: "Constitution Day" }, (year) => nthWeekday(year, 2, 1, 1)),
    d({ es: "Natalicio de Benito Juárez", en: "Benito Juárez's Birthday" }, (year) => nthWeekday(year, 3, 1, 3)),
    d({ es: "Día del Trabajo", en: "Labour Day" }, (year) => fixed(year, 5, 1)),
    d({ es: "Día de la Independencia", en: "Independence Day" }, (year) => fixed(year, 9, 16)),
    d({ es: "Día de la Revolución", en: "Revolution Day" }, (year) => nthWeekday(year, 11, 1, 3)),
    d({ es: "Navidad", en: "Christmas Day" }, (year) => fixed(year, 12, 25)),
  ],
  CO: [
    d({ es: "Año Nuevo", en: "New Year's Day" }, (year) => fixed(year, 1, 1)),
    d({ es: "Día de Reyes", en: "Epiphany" }, (year) => nextMonday(fixed(year, 1, 6))),
    d({ es: "Día de San José", en: "Saint Joseph's Day" }, (year) => nextMonday(fixed(year, 3, 19))),
    d({ es: "Jueves Santo", en: "Maundy Thursday" }, (year) => fromEaster(year, -3)),
    d({ es: "Viernes Santo", en: "Good Friday" }, (year) => fromEaster(year, -2)),
    d({ es: "Día del Trabajo", en: "Labour Day" }, (year) => fixed(year, 5, 1)),
    d({ es: "Ascensión del Señor", en: "Ascension Day" }, (year) => fromEaster(year, 43)),
    d({ es: "Corpus Christi", en: "Corpus Christi" }, (year) => fromEaster(year, 64)),
    d({ es: "Sagrado Corazón", en: "Sacred Heart" }, (year) => fromEaster(year, 71)),
    d({ es: "San Pedro y San Pablo", en: "Saints Peter and Paul" }, (year) => nextMonday(fixed(year, 6, 29))),
    d({ es: "Día de la Independencia", en: "Independence Day" }, (year) => fixed(year, 7, 20)),
    d({ es: "Batalla de Boyacá", en: "Battle of Boyacá" }, (year) => fixed(year, 8, 7)),
    d({ es: "Asunción de la Virgen", en: "Assumption Day" }, (year) => nextMonday(fixed(year, 8, 15))),
    d({ es: "Día de la Raza", en: "Columbus Day" }, (year) => nextMonday(fixed(year, 10, 12))),
    d({ es: "Todos los Santos", en: "All Saints' Day" }, (year) => nextMonday(fixed(year, 11, 1))),
    d({ es: "Independencia de Cartagena", en: "Cartagena's Independence" }, (year) => nextMonday(fixed(year, 11, 11))),
    d({ es: "Inmaculada Concepción", en: "Immaculate Conception" }, (year) => fixed(year, 12, 8)),
    d({ es: "Navidad", en: "Christmas Day" }, (year) => fixed(year, 12, 25)),
  ],
  CL: [
    d({ es: "Año Nuevo", en: "New Year's Day" }, (year) => fixed(year, 1, 1)),
    d({ es: "Viernes Santo", en: "Good Friday" }, (year) => fromEaster(year, -2)),
    d({ es: "Sábado Santo", en: "Holy Saturday" }, (year) => fromEaster(year, -1)),
    d({ es: "Día del Trabajo", en: "Labour Day" }, (year) => fixed(year, 5, 1)),
    d({ es: "Glorias Navales", en: "Navy Day" }, (year) => fixed(year, 5, 21)),
    d({ es: "Día de los Pueblos Indígenas", en: "Indigenous Peoples' Day" }, (year) => fixed(year, 6, 20)),
    d({ es: "San Pedro y San Pablo", en: "Saints Peter and Paul" }, (year) => mondayOfWeek(fixed(year, 6, 29))),
    d({ es: "Virgen del Carmen", en: "Our Lady of Mount Carmel" }, (year) => fixed(year, 7, 16)),
    d({ es: "Asunción de la Virgen", en: "Assumption Day" }, (year) => fixed(year, 8, 15)),
    d({ es: "Independencia Nacional", en: "Independence Day" }, (year) => fixed(year, 9, 18)),
    d({ es: "Glorias del Ejército", en: "Army Day" }, (year) => fixed(year, 9, 19)),
    d({ es: "Encuentro de Dos Mundos", en: "Columbus Day" }, (year) => mondayOfWeek(fixed(year, 10, 12))),
    d({ es: "Día de las Iglesias Evangélicas", en: "Reformation Day" }, (year) => fixed(year, 10, 31)),
    d({ es: "Todos los Santos", en: "All Saints' Day" }, (year) => fixed(year, 11, 1)),
    d({ es: "Inmaculada Concepción", en: "Immaculate Conception" }, (year) => fixed(year, 12, 8)),
    d({ es: "Navidad", en: "Christmas Day" }, (year) => fixed(year, 12, 25)),
  ],
  PE: [
    d({ es: "Año Nuevo", en: "New Year's Day" }, (year) => fixed(year, 1, 1)),
    d({ es: "Jueves Santo", en: "Maundy Thursday" }, (year) => fromEaster(year, -3)),
    d({ es: "Viernes Santo", en: "Good Friday" }, (year) => fromEaster(year, -2)),
    d({ es: "Día del Trabajo", en: "Labour Day" }, (year) => fixed(year, 5, 1)),
    d({ es: "San Pedro y San Pablo", en: "Saints Peter and Paul" }, (year) => fixed(year, 6, 29)),
    d({ es: "Fiestas Patrias", en: "Independence Day" }, (year) => fixed(year, 7, 28)),
    d({ es: "Fiestas Patrias", en: "Independence Day" }, (year) => fixed(year, 7, 29)),
    d({ es: "Batalla de Junín", en: "Battle of Junín" }, (year) => fixed(year, 8, 6)),
    d({ es: "Santa Rosa de Lima", en: "Saint Rose of Lima" }, (year) => fixed(year, 8, 30)),
    d({ es: "Combate de Angamos", en: "Battle of Angamos" }, (year) => fixed(year, 10, 8)),
    d({ es: "Todos los Santos", en: "All Saints' Day" }, (year) => fixed(year, 11, 1)),
    d({ es: "Inmaculada Concepción", en: "Immaculate Conception" }, (year) => fixed(year, 12, 8)),
    d({ es: "Navidad", en: "Christmas Day" }, (year) => fixed(year, 12, 25)),
  ],
  AR: [
    d({ es: "Año Nuevo", en: "New Year's Day" }, (year) => fixed(year, 1, 1)),
    d({ es: "Carnaval", en: "Carnival Monday" }, (year) => fromEaster(year, -48)),
    d({ es: "Carnaval", en: "Carnival Tuesday" }, (year) => fromEaster(year, -47)),
    d({ es: "Día de la Memoria", en: "Day of Remembrance" }, (year) => fixed(year, 3, 24)),
    d({ es: "Día del Veterano de Malvinas", en: "Malvinas Veterans Day" }, (year) => fixed(year, 4, 2)),
    d({ es: "Viernes Santo", en: "Good Friday" }, (year) => fromEaster(year, -2)),
    d({ es: "Día del Trabajo", en: "Labour Day" }, (year) => fixed(year, 5, 1)),
    d({ es: "Revolución de Mayo", en: "May Revolution" }, (year) => fixed(year, 5, 25)),
    d({ es: "Paso a la Inmortalidad de Güemes", en: "Güemes Day" }, (year) => mondayOfWeek(fixed(year, 6, 17))),
    d({ es: "Día de la Bandera", en: "Flag Day" }, (year) => fixed(year, 6, 20)),
    d({ es: "Día de la Independencia", en: "Independence Day" }, (year) => fixed(year, 7, 9)),
    d({ es: "Paso a la Inmortalidad de San Martín", en: "San Martín Day" }, (year) => mondayOfWeek(fixed(year, 8, 17))),
    d({ es: "Día del Respeto a la Diversidad Cultural", en: "Respect for Cultural Diversity Day" }, (year) => mondayOfWeek(fixed(year, 10, 12))),
    d({ es: "Día de la Soberanía Nacional", en: "National Sovereignty Day" }, (year) => mondayOfWeek(fixed(year, 11, 20))),
    d({ es: "Inmaculada Concepción", en: "Immaculate Conception" }, (year) => fixed(year, 12, 8)),
    d({ es: "Navidad", en: "Christmas Day" }, (year) => fixed(year, 12, 25)),
  ],
  US: [
    d({ es: "Año Nuevo", en: "New Year's Day" }, (year) => fixed(year, 1, 1)),
    d({ es: "Día de Martin Luther King Jr.", en: "Martin Luther King Jr. Day" }, (year) => nthWeekday(year, 1, 1, 3)),
    d({ es: "Día de los Presidentes", en: "Presidents' Day" }, (year) => nthWeekday(year, 2, 1, 3)),
    d({ es: "Día de la Recordación", en: "Memorial Day" }, (year) => lastWeekday(year, 5, 1)),
    d({ es: "Juneteenth", en: "Juneteenth" }, (year) => fixed(year, 6, 19)),
    d({ es: "Día de la Independencia", en: "Independence Day" }, (year) => fixed(year, 7, 4)),
    d({ es: "Día del Trabajo", en: "Labor Day" }, (year) => nthWeekday(year, 9, 1, 1)),
    d({ es: "Día de Colón", en: "Columbus Day" }, (year) => nthWeekday(year, 10, 1, 2)),
    d({ es: "Día de los Veteranos", en: "Veterans Day" }, (year) => fixed(year, 11, 11)),
    d({ es: "Día de Acción de Gracias", en: "Thanksgiving" }, (year) => nthWeekday(year, 11, 4, 4)),
    d({ es: "Navidad", en: "Christmas Day" }, (year) => fixed(year, 12, 25)),
  ],
};

export function countryName(code: string, language: Language): string {
  const country = HOLIDAY_COUNTRIES.find((item) => item.id === code);
  return country ? country.name[language] : code;
}

export interface HolidayEntry {
  date: string;
  title: string;
}

export function holidaysFor(country: string, year: number, language: Language): HolidayEntry[] {
  const defs = DEFS[country] ?? [];
  return defs
    .map((def) => {
      const date = def.date(year);
      if (!date || Number.isNaN(date.getTime())) return null;
      return { date: keyOf(date), title: def.name[language] };
    })
    .filter((entry): entry is HolidayEntry => entry !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Builds deterministic all-day events so adding the same bundle twice is safe. */
export function holidayEvents(
  country: string,
  years: number[],
  calendarId: string,
  language: Language,
  now = new Date(),
): CalendarEvent[] {
  const stamp = now.toISOString();
  const events: CalendarEvent[] = [];
  const seen = new Set<string>();

  for (const year of [...new Set(years)].sort()) {
    for (const entry of holidaysFor(country, year, language)) {
      const uid = `parrita-holiday-${country}-${entry.date}-${slug(entry.title)}`;
      if (seen.has(uid)) continue;
      seen.add(uid);
      events.push({
        id: newId("holiday"),
        calendarId,
        title: entry.title,
        notes: "",
        location: "",
        allDay: true,
        start: `${entry.date}T00:00`,
        end: `${entry.date}T23:59`,
        tags: ["festivo"],
        reminderMinutes: null,
        repeat: { freq: "none", interval: 1, until: null, exdates: [] },
        showAs: "free",
        sensitivity: "normal",
        attendees: [],
        uid,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  }
  return events;
}
