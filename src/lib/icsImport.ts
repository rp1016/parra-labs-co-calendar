/** Offline iCalendar reader.
 *
 *  It intentionally implements the subset CalendarPRO can represent:
 *  single events with summary/description/location, all-day or floating local
 *  times, categories, attendees, CLASS, TRANSP, one VALARM and a basic RRULE.
 *  Anything else is ignored and reported as a limitation instead of failing the
 *  whole import. No network access and no external parser are involved.
 */
import { addDays, addMonths, parseDateKey, parseLocal, toDateKey, toLocalStamp } from "./dates";
import {
  newId,
  type CalendarEvent,
  type RepeatFreq,
  type Sensitivity,
  type ShowAs,
} from "./types";

interface Property {
  name: string;
  params: Record<string, string>;
  value: string;
}

export interface ICSImportResult {
  calendarName: string | null;
  events: CalendarEvent[];
  /** VEVENT blocks found in the file. */
  total: number;
  /** Blocks that were cancelled or had no usable DTSTART. */
  skipped: number;
  /** Human-readable notes about what could not be represented. */
  limitations: string[];
}

const FREQ: Record<string, RepeatFreq> = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
};

function unfold(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter((line) => line.length > 0);
}

/** Splits at the first colon that is not inside a quoted parameter value. */
function splitLine(line: string): [string, string] {
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') quoted = !quoted;
    else if (char === ":" && !quoted) return [line.slice(0, index), line.slice(index + 1)];
  }
  return [line, ""];
}

/** Splits on semicolons that are not inside a quoted parameter value. */
function splitParams(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of value) {
    if (char === '"') quoted = !quoted;
    if (char === ";" && !quoted) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

function parseProperty(line: string): Property | null {
  const [head, value] = splitLine(line);
  if (!head) return null;
  const [rawName, ...rawParams] = splitParams(head);
  const params: Record<string, string> = {};
  for (const raw of rawParams) {
    const at = raw.indexOf("=");
    if (at === -1) continue;
    params[raw.slice(0, at).toUpperCase()] = raw.slice(at + 1).replace(/^"|"$/g, "");
  }
  return { name: rawName.toUpperCase(), params, value };
}

function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, char: string) =>
    char === "n" || char === "N" ? "\n" : char,
  );
}

/** Splits an escaped comma list without losing literal commas. */
function splitList(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let escaped = false;
  for (const char of value) {
    if (escaped) {
      current += char === "n" || char === "N" ? "\n" : char;
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === ",") {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

interface Stamp {
  date: Date;
  allDay: boolean;
  dateKey: string;
}

function parseStamp(property: Property | undefined): Stamp | null {
  if (!property) return null;
  const raw = property.value.trim();
  const isDate = property.params.VALUE === "DATE" || /^\d{8}$/.test(raw);
  if (isDate) {
    const date = parseDate(raw);
    if (!date) return null;
    return { date, allDay: true, dateKey: toDateKey(date) };
  }

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z|[+-]\d{4})?$/.exec(raw);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, zone] = match;
  let date: Date;
  if (zone === "Z") {
    date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    );
  } else if (zone && zone.length === 5) {
    const sign = zone.startsWith("-") ? -1 : 1;
    const offset = sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3, 5)));
    date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ) -
        offset * 60_000,
    );
  } else {
    // Floating time or a TZID we cannot resolve offline: keep the wall clock.
    date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
  }
  return { date, allDay: false, dateKey: toDateKey(date) };
}

function parseDuration(value: string): number | null {
  const match = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    value.trim(),
  );
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const minutes =
    Number(match[2] ?? 0) * 7 * 24 * 60 +
    Number(match[3] ?? 0) * 24 * 60 +
    Number(match[4] ?? 0) * 60 +
    Number(match[5] ?? 0) +
    Math.round(Number(match[6] ?? 0) / 60);
  return sign * minutes;
}

interface RuleResult {
  repeat: CalendarEvent["repeat"];
  supported: boolean;
}

function parseRule(property: Property | undefined, start: Date): RuleResult {
  const empty: RuleResult = {
    repeat: { freq: "none", interval: 1, until: null, exdates: [] },
    supported: true,
  };
  if (!property) return empty;

  const parts: Record<string, string> = {};
  for (const chunk of property.value.split(";")) {
    const at = chunk.indexOf("=");
    if (at > 0) parts[chunk.slice(0, at).toUpperCase()] = chunk.slice(at + 1);
  }
  const freq = FREQ[parts.FREQ?.toUpperCase() ?? ""] ?? "none";
  if (freq === "none") return { repeat: empty.repeat, supported: false };
  const interval = Math.max(1, Number(parts.INTERVAL) || 1);

  let until: string | null = null;
  if (parts.UNTIL) {
    const day = /^(\d{4})(\d{2})(\d{2})/.exec(parts.UNTIL);
    if (day) {
      until = `${day[1]}-${day[2]}-${day[3]}`;
    } else {
      const stamp = parseStamp({ name: "UNTIL", params: {}, value: parts.UNTIL });
      until = stamp?.dateKey ?? null;
    }
  } else if (parts.COUNT) {
    const extra = Math.max(0, Number(parts.COUNT) - 1) * interval;
    const last =
      freq === "daily"
        ? addDays(start, extra)
        : freq === "weekly"
          ? addDays(start, extra * 7)
          : freq === "monthly"
            ? addMonths(start, extra)
            : addMonths(start, extra * 12);
    until = toDateKey(last);
  }

  const supported = !("BYDAY" in parts || "BYMONTHDAY" in parts || "BYSETPOS" in parts);
  return {
    repeat: { freq, interval, until, exdates: [] },
    supported,
  };
}

function addExdates(repeat: CalendarEvent["repeat"], properties: Property[]): void {
  const dates = new Set(repeat.exdates ?? []);
  for (const property of properties) {
    for (const raw of property.value.split(",")) {
      const stamp = parseStamp({ name: "EXDATE", params: property.params, value: raw });
      if (stamp) dates.add(stamp.dateKey);
    }
  }
  repeat.exdates = [...dates].sort();
}

function attendeeOf(property: Property): string {
  const cn = property.params.CN ?? "";
  const address = property.value
    .replace(/^mailto:/i, "")
    .replace(/^urn:uuid:/i, "")
    .trim();
  if (cn) return cn;
  return address;
}

function reminderOf(
  trigger: Property | undefined,
  start: Date,
  durationMinutes: number,
): number | null {
  if (!trigger) return null;
  const raw = trigger.value.trim();
  if (trigger.params.VALUE === "DATE-TIME" || /^\d{8}T\d{6}/.test(raw)) {
    const stamp = parseStamp({ name: "TRIGGER", params: trigger.params, value: raw });
    if (!stamp) return null;
    return Math.max(0, Math.round((start.getTime() - stamp.date.getTime()) / 60_000));
  }
  const minutes = parseDuration(raw);
  if (minutes === null) return null;
  const before = -minutes;
  if (trigger.params.RELATED === "END") {
    return Math.max(0, durationMinutes - before);
  }
  return Math.max(0, before);
}

function showAsOf(properties: Property[]): ShowAs {
  const status = properties.find((property) => property.name === "STATUS")?.value.toUpperCase();
  if (status === "TENTATIVE") return "tentative";
  const transp = properties
    .find((property) => property.name === "TRANSP")
    ?.value.toUpperCase();
  if (transp === "TRANSPARENT") return "free";
  const busy = properties
    .find((property) => property.name === "X-MICROSOFT-CDO-BUSYSTATUS")
    ?.value.toUpperCase();
  if (busy === "OOF") return "away";
  return "busy";
}

function sensitivityOf(properties: Property[]): Sensitivity {
  const value = properties.find((property) => property.name === "CLASS")?.value.toUpperCase();
  if (value === "CONFIDENTIAL") return "confidential";
  if (value === "PRIVATE") return "private";
  return "normal";
}

function buildEvent(
  properties: Property[],
  calendarId: string,
  now: Date,
): { event: CalendarEvent | null; limitations: string[] } {
  const limitations: string[] = [];
  const get = (name: string) => properties.find((property) => property.name === name);
  const status = get("STATUS")?.value.toUpperCase();
  if (status === "CANCELLED") return { event: null, limitations };

  const startProperty = get("DTSTART");
  const start = parseStamp(startProperty);
  if (!start) return { event: null, limitations: ["Un evento sin DTSTART válido fue omitido."] };

  const endProperty = get("DTEND");
  const end = parseStamp(endProperty);
  const durationProperty = get("DURATION");
  const durationMinutes = durationProperty ? parseDuration(durationProperty.value) : null;

  let startStamp: string;
  let endStamp: string;

  if (start.allDay) {
    startStamp = `${start.dateKey}T00:00`;
    const exclusive = end?.dateKey ?? start.dateKey;
    const lastDay = addDays(parseDateKey(exclusive), -1);
    const endKey = toDateKey(lastDay) < start.dateKey ? start.dateKey : toDateKey(lastDay);
    endStamp = `${endKey}T23:59`;
  } else {
    startStamp = toLocalStamp(start.date);
    let total = durationMinutes;
    if (total === null && end) {
      total = Math.round((end.date.getTime() - start.date.getTime()) / 60_000);
    }
    if (total === null || total <= 0) total = 60;
    const endDate = new Date(start.date.getTime() + total * 60_000);
    endStamp = toLocalStamp(endDate);
    if (total > 24 * 60) limitations.push("Un evento de más de 24 horas se recortó visualmente.");
  }

  const rule = parseRule(get("RRULE"), start.date);
  if (!rule.supported) limitations.push("Una repetición avanzada (BYDAY/BYMONTHDAY) se importó como repetición simple.");
  addExdates(rule.repeat, properties.filter((property) => property.name === "EXDATE"));

  const duration = Math.max(
    0,
    Math.round((parseLocal(endStamp).getTime() - parseLocal(startStamp).getTime()) / 60_000),
  );

  const attendees = properties
    .filter((property) => property.name === "ATTENDEE")
    .map(attendeeOf)
    .filter(Boolean);

  const stamp = now.toISOString();
  const uid = get("UID")?.value.trim() || newId("uid");
  const event: CalendarEvent = {
    id: newId("evt"),
    calendarId,
    title: unescapeText(get("SUMMARY")?.value ?? "").trim() || "Sin título",
    notes: unescapeText(get("DESCRIPTION")?.value ?? "").trim(),
    location: unescapeText(get("LOCATION")?.value ?? "").trim(),
    allDay: start.allDay,
    start: startStamp,
    end: endStamp,
    tags: splitList(get("CATEGORIES")?.value ?? ""),
    reminderMinutes: reminderOf(
      properties.find((property) => property.name === "TRIGGER"),
      start.date,
      duration,
    ),
    repeat: rule.repeat,
    showAs: showAsOf(properties),
    sensitivity: sensitivityOf(properties),
    attendees: [...new Set(attendees)],
    uid,
    createdAt: stamp,
    updatedAt: stamp,
  };

  if (startProperty?.params.TZID) {
    limitations.push(
      "Las horas con zona horaria (TZID) se importaron como hora local, sin convertir.",
    );
  }
  if (properties.some((property) => property.name === "RECURRENCE-ID")) {
    limitations.push("Las excepciones RECURRENCE-ID no se pueden representar y se omitieron.");
  }
  return { event, limitations };
}

/** Parses every VEVENT in the document. The caller decides where to store them. */
export function parseICS(text: string, calendarId: string, now = new Date()): ICSImportResult {
  const lines = unfold(text);
  const events: CalendarEvent[] = [];
  const limitations = new Set<string>();
  const seenUids = new Set<string>();
  let calendarName: string | null = null;
  let total = 0;
  let skipped = 0;
  let current: Property[] | null = null;
  let inAlarm = false;

  for (const line of lines) {
    const property = parseProperty(line);
    if (!property) continue;

    if (property.name === "BEGIN" && property.value.toUpperCase() === "VEVENT") {
      current = [];
      inAlarm = false;
      total += 1;
      continue;
    }
    if (property.name === "END" && property.value.toUpperCase() === "VEVENT") {
      if (current) {
        const built = buildEvent(current, calendarId, now);
        built.limitations.forEach((item) => limitations.add(item));
        if (!built.event) {
          skipped += 1;
        } else if (seenUids.has(built.event.uid ?? "")) {
          skipped += 1;
        } else {
          seenUids.add(built.event.uid ?? "");
          events.push(built.event);
        }
      }
      current = null;
      inAlarm = false;
      continue;
    }

    if (!current) {
      if (property.name === "X-WR-CALNAME") calendarName = unescapeText(property.value).trim();
      continue;
    }

    if (property.name === "BEGIN" && property.value.toUpperCase() === "VALARM") {
      inAlarm = true;
      continue;
    }
    if (property.name === "END" && property.value.toUpperCase() === "VALARM") {
      inAlarm = false;
      continue;
    }
    // Keep alarm properties so TRIGGER can be read, but never let the alarm
    // description overwrite the event description.
    if (inAlarm) {
      if (property.name === "TRIGGER") current.push(property);
      continue;
    }
    current.push(property);
  }

  if (events.length === 0) limitations.add("El archivo no contiene eventos que se puedan importar.");
  return {
    calendarName,
    events,
    total,
    skipped,
    limitations: [...limitations],
  };
}
