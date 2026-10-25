import {
  DATA_VERSION,
  DEFAULT_SETTINGS,
  defaultData,
  type AppData,
  type CalendarEvent,
  type Note,
} from "./types";
import { isArtTheme } from "./art";
import { parseDateKey, toDateKey } from "./dates";

function validDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateKey(value);
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value;
}

function normalizeEvent(raw: CalendarEvent): CalendarEvent {
  const repeat = raw.repeat ?? { freq: "none", interval: 1, until: null };
  return {
    ...raw,
    notes: raw.notes ?? "",
    location: raw.location ?? "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    reminderMinutes: raw.reminderMinutes ?? null,
    repeat: {
      freq: repeat.freq ?? "none",
      interval: Math.max(1, repeat.interval ?? 1),
      until: repeat.until ?? null,
      exdates: Array.isArray(repeat.exdates) ? repeat.exdates : [],
    },
    showAs: raw.showAs ?? "busy",
    sensitivity: raw.sensitivity ?? "normal",
    attendees: Array.isArray(raw.attendees) ? raw.attendees.filter(Boolean) : [],
    doneDates: Array.isArray(raw.doneDates)
      ? [...new Set(raw.doneDates.filter((date) => validDateKey(date)))].sort()
      : [],
    allDay: Boolean(raw.allDay),
  };
}

function normalizeNote(raw: Note): Note {
  return {
    ...raw,
    title: raw.title ?? "",
    body: raw.body ?? "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    date: raw.date ?? null,
    pinned: Boolean(raw.pinned),
  };
}

/** Fills every field an older file, hand edit, or partial backup may omit. */
export function normalizeData(raw: Partial<AppData> | null | undefined): AppData {
  const base = defaultData();
  if (!raw) return base;
  const calendars =
    Array.isArray(raw.calendars) && raw.calendars.length > 0 ? raw.calendars : base.calendars;
  const settings = { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) };
  if (!isArtTheme(settings.artTheme)) settings.artTheme = DEFAULT_SETTINGS.artTheme;
  return {
    version: DATA_VERSION,
    calendars: calendars.map((calendar) => ({
      ...calendar,
      visible: calendar.visible ?? true,
      color: calendar.color ?? "#4f46e5",
      kind: calendar.kind === "holiday" ? "holiday" : "local",
      country: calendar.country ?? undefined,
    })),
    events: (Array.isArray(raw.events) ? raw.events : []).map(normalizeEvent),
    notes: (Array.isArray(raw.notes) ? raw.notes : []).map(normalizeNote),
    settings,
  };
}

/** A calm first-run state: one note explaining where the data lives. */
export function seedData(): AppData {
  const data = defaultData();
  const now = new Date().toISOString();
  data.notes = [
    {
      id: "welcome",
      title: "Bienvenido a CalendarPRO",
      body: [
        "Todo lo que escribas aquí se guarda **solo en este equipo**. La app no se conecta a internet.",
        "",
        "## Atajos",
        "- `N` — nuevo evento",
        "- `T` — hoy",
        "- `Ctrl/Cmd + K` — buscar",
        "- `1…4` — cambiar de vista",
        "",
        "## Copias de seguridad",
        "En Ajustes → Datos puedes exportar un respaldo JSON completo, el calendario en `.ics` y tus notas en Markdown.",
      ].join("\n"),
      tags: ["guía"],
      date: null,
      pinned: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  return data;
}
