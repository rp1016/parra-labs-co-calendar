import { formatLongDate, parseLocal, toDateKey } from "./dates";
import { normalizeData } from "./normalize";
import { DATA_VERSION, type AppData, type CalendarEvent, type Note } from "./types";

interface BackupEnvelope {
  app: "parrita-calendar";
  version: number;
  exportedAt: string;
  data: AppData;
}

export function buildBackup(data: AppData, now = new Date()): string {
  const payload: BackupEnvelope = {
    app: "parrita-calendar",
    version: DATA_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
  return JSON.stringify(payload, null, 2);
}

/** Accepts both the envelope above and a bare AppData document. */
export function parseBackup(text: string): AppData {
  const parsed = JSON.parse(text) as Partial<BackupEnvelope> & Partial<AppData>;
  const data = parsed.data ?? parsed;
  if (
    !data ||
    !Array.isArray(data.events) ||
    !Array.isArray(data.notes) ||
    !Array.isArray(data.calendars)
  ) {
    throw new Error("invalid-backup");
  }
  return normalizeData(data);
}

function header(title: string, locale: string, now: Date): string[] {
  return [
    `# ${title}`,
    "",
    `> CalendarPRO · Parrita Labs — ${new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
      timeStyle: "short",
    }).format(now)}`,
    "",
  ];
}

export function notesToMarkdown(notes: Note[], locale: string, now = new Date()): string {
  const sorted = [...notes].sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const lines = header("Notas", locale, now);
  if (sorted.length === 0) lines.push("_Sin notas._", "");

  let currentGroup = "";
  for (const note of sorted) {
    const group = note.date ? formatLongDate(parseLocal(`${note.date}T12:00`), locale) : "Sin fecha";
    if (group !== currentGroup) {
      lines.push(`## ${group}`, "");
      currentGroup = group;
    }
    lines.push(`### ${note.title || "Sin título"}`);
    if (note.tags.length > 0) lines.push("", note.tags.map((tag) => `\`#${tag}\``).join(" "));
    lines.push("", note.body.trim() || "_Vacía_", "");
    lines.push("---", "");
  }
  return lines.join("\n");
}

export function eventsToMarkdown(
  events: CalendarEvent[],
  locale: string,
  now = new Date(),
): string {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
  const lines = header("Agenda", locale, now);
  if (sorted.length === 0) lines.push("_Sin eventos._", "");

  let currentDay = "";
  for (const event of sorted) {
    const start = parseLocal(event.start);
    const end = parseLocal(event.end);
    const day = toDateKey(start);
    if (day !== currentDay) {
      lines.push(`## ${formatLongDate(start, locale)}`, "");
      currentDay = day;
    }
    const time = event.allDay
      ? "Todo el día"
      : `${start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString(
          locale,
          { hour: "2-digit", minute: "2-digit" },
        )}`;
    lines.push(`- **${time}** — ${event.title}${event.location ? ` · ${event.location}` : ""}`);
    if (event.notes) lines.push(`  ${event.notes.replace(/\n/g, "\n  ")}`);
  }
  return `${lines.join("\n")}\n`;
}

export function exportFileName(
  kind: "backup" | "ics" | "notes" | "events",
  now = new Date(),
): string {
  const stamp = `${toDateKey(now)}`;
  switch (kind) {
    case "backup":
      return `parrita-calendar-backup-${stamp}.json`;
    case "ics":
      return `parrita-calendar-${stamp}.ics`;
    case "notes":
      return `parrita-notes-${stamp}.md`;
    case "events":
      return `parrita-agenda-${stamp}.md`;
  }
}
