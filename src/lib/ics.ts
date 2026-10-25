import { addDays, pad2, parseDateKey, parseLocal, startOfDay, toDateKey } from "./dates";
import type { CalendarEvent, RepeatFreq, Sensitivity, ShowAs } from "./types";

const CRLF = "\r\n";

const TRANSP: Record<ShowAs, string> = {
  busy: "OPAQUE",
  free: "TRANSPARENT",
  tentative: "OPAQUE",
  away: "OPAQUE",
};

const CLASS: Record<Sensitivity, string> = {
  normal: "PUBLIC",
  personal: "PRIVATE",
  private: "PRIVATE",
  confidential: "CONFIDENTIAL",
};

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 folding: no physical line longer than 75 octets (UTF-8), and a
 *  fold never splits a character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const chunks: string[] = [];
  let current = "";
  let budget = 75;

  for (const char of line) {
    if (encoder.encode(current).length + encoder.encode(char).length > budget) {
      chunks.push(chunks.length === 0 ? current : ` ${current}`);
      current = "";
      // Continuation lines spend one octet on the leading space.
      budget = 74;
    }
    current += char;
  }
  if (current) chunks.push(chunks.length === 0 ? current : ` ${current}`);
  return chunks.join(CRLF);
}

function stampUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
  );
}

function stampLocal(date: Date): string {
  return `${toDateKey(date).replace(/-/g, "")}T${pad2(date.getHours())}${pad2(date.getMinutes())}00`;
}

function dateOnly(date: Date): string {
  return toDateKey(date).replace(/-/g, "");
}

function rruleFor(event: CalendarEvent): string | null {
  const freq: RepeatFreq = event.repeat?.freq ?? "none";
  if (freq === "none") return null;
  const map: Record<Exclude<RepeatFreq, "none">, string> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    monthly: "MONTHLY",
    yearly: "YEARLY",
  };
  const parts = [`FREQ=${map[freq]}`, `INTERVAL=${Math.max(1, event.repeat.interval)}`];
  if (event.repeat.until) {
    const until = parseDateKey(event.repeat.until);
    parts.push(`UNTIL=${dateOnly(until)}T235900`);
  }
  return parts.join(";");
}

function attendeeLine(value: string): string {
  const name = escapeText(value);
  const address = value.includes("@") ? value.trim() : `${value.trim().replace(/\s+/g, ".").toLowerCase()}@local`;
  return `ATTENDEE;CN=${name};ROLE=REQ-PARTICIPANT:mailto:${address}`;
}

/** Floating local times keep the user's wall clock without shipping VTIMEZONE. */
export function buildICS(events: CalendarEvent[], calendarName: string, now = new Date()): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Parrita Labs//CalendarPRO//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    const start = parseLocal(event.start);
    const end = parseLocal(event.end);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid ?? `${event.id}@parritalabs.com`}`);
    lines.push(`DTSTAMP:${stampUtc(now)}`);
    if (event.allDay) {
      // DTEND is exclusive for DATE values.
      const endDate = addDays(startOfDay(end), 1);
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(start)}`);
      lines.push(`DTEND;VALUE=DATE:${dateOnly(endDate)}`);
    } else {
      lines.push(`DTSTART:${stampLocal(start)}`);
      lines.push(`DTEND:${stampLocal(end)}`);
    }
    const rule = rruleFor(event);
    if (rule) lines.push(`RRULE:${rule}`);
    if (event.repeat?.exdates?.length) {
      const dates = event.repeat.exdates.map((key) => key.replace(/-/g, ""));
      lines.push(
        event.allDay
          ? `EXDATE;VALUE=DATE:${dates.join(",")}`
          : `EXDATE:${dates.map((date) => `${date}T${pad2(start.getHours())}${pad2(start.getMinutes())}00`).join(",")}`,
      );
    }
    lines.push(`SUMMARY:${escapeText(event.title || "Sin título")}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.notes) lines.push(`DESCRIPTION:${escapeText(event.notes)}`);
    if (event.tags.length > 0) lines.push(`CATEGORIES:${event.tags.map(escapeText).join(",")}`);
    for (const attendee of event.attendees ?? []) lines.push(attendeeLine(attendee));
    lines.push(`TRANSP:${TRANSP[event.showAs ?? "busy"]}`);
    lines.push(`CLASS:${CLASS[event.sensitivity ?? "normal"]}`);
    lines.push(`STATUS:${event.showAs === "tentative" ? "TENTATIVE" : "CONFIRMED"}`);
    if (event.reminderMinutes !== null && event.reminderMinutes !== undefined) {
      lines.push("BEGIN:VALARM");
      lines.push(`TRIGGER:-PT${Math.max(0, event.reminderMinutes)}M`);
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeText(event.title || "CalendarPRO")}`);
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join(CRLF)}${CRLF}`;
}
