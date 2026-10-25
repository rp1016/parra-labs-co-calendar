export type ViewMode = "day" | "week" | "month" | "agenda";

export type ThemeName = "auto" | "light" | "dark" | "midnight" | "sepia" | "contrast";

export type AccentName = "indigo" | "violet" | "teal" | "blue" | "amber" | "rose" | "green";

export type Language = "es" | "en";

/** Decorative, offline artwork shown as a faint watermark behind the month grid. */
export type ArtThemeId = "none" | "botanical" | "birds" | "rabbits" | "children" | "animals";

export type RepeatFreq = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type ShowAs = "busy" | "free" | "tentative" | "away";

export type Sensitivity = "normal" | "personal" | "private" | "confidential";

export interface CalendarList {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  /** Holiday calendars are generated offline by CalendarPRO. */
  kind?: "local" | "holiday";
  /** ISO 3166-1 alpha-2 country code for holiday calendars. */
  country?: string;
}

export interface RepeatRule {
  freq: RepeatFreq;
  interval: number;
  /** Inclusive last day (YYYY-MM-DD) or null for no end. */
  until: string | null;
  /** Local dates (YYYY-MM-DD) this series skips, from EXDATE. */
  exdates?: string[];
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  notes: string;
  location: string;
  allDay: boolean;
  /** Local wall clock, "YYYY-MM-DDTHH:mm". */
  start: string;
  /** Local wall clock, "YYYY-MM-DDTHH:mm". */
  end: string;
  tags: string[];
  /** Minutes before the start, or null when the event has no reminder. */
  reminderMinutes: number | null;
  repeat: RepeatRule;
  showAs: ShowAs;
  sensitivity: Sensitivity;
  /** Local-only list of attendee names or e-mail addresses. */
  attendees: string[];
  /** Dates (YYYY-MM-DD) of occurrences the user checked off in the week panel. */
  doneDates?: string[];
  /** Original iCalendar UID, kept so re-importing the same file is a no-op. */
  uid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  /** Markdown. */
  body: string;
  tags: string[];
  /** Optional link to a calendar day (YYYY-MM-DD). */
  date: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: ThemeName;
  accent: AccentName;
  language: Language;
  weekStartsOn: 0 | 1;
  use24h: boolean;
  defaultView: ViewMode;
  notifications: boolean;
  /** Hide the right-hand day rail. */
  compact: boolean;
  showWeekNumbers: boolean;
  /** IANA zone shown beside the primary hour labels, or null. */
  secondTimeZone: string | null;
  autoBackup: boolean;
  /** Vintage illustration used as a watermark behind the month grid. */
  artTheme: ArtThemeId;
}

export interface AppData {
  version: number;
  calendars: CalendarList[];
  events: CalendarEvent[];
  notes: Note[];
  settings: Settings;
}

export interface Occurrence {
  event: CalendarEvent;
  start: Date;
  end: Date;
  /** Stable per-occurrence id: event id + start timestamp. */
  key: string;
}

export const DATA_VERSION = 1;

export const ACCENTS: { id: AccentName; label: string; hex: string }[] = [
  { id: "indigo", label: "Índigo", hex: "#4f46e5" },
  { id: "violet", label: "Violeta", hex: "#7c3aed" },
  { id: "teal", label: "Aguamarina", hex: "#15bed1" },
  { id: "blue", label: "Azul", hex: "#1e6fd9" },
  { id: "green", label: "Verde", hex: "#00a82d" },
  { id: "amber", label: "Ámbar", hex: "#c2740b" },
  { id: "rose", label: "Rosa", hex: "#d6336c" },
];

export const THEMES: { id: ThemeName; label: string }[] = [
  { id: "auto", label: "Sistema" },
  { id: "light", label: "Claro" },
  { id: "dark", label: "Oscuro" },
  { id: "midnight", label: "Medianoche" },
  { id: "sepia", label: "Sepia" },
  { id: "contrast", label: "Alto contraste" },
];

export const CALENDAR_COLORS = [
  "#15bed1",
  "#0b7f86",
  "#00a82d",
  "#c2740b",
  "#d6336c",
  "#1e6fd9",
  "#7c3aed",
  "#64748b",
];

export const SHOW_AS: ShowAs[] = ["busy", "free", "tentative", "away"];

export const SENSITIVITIES: Sensitivity[] = ["normal", "personal", "private", "confidential"];

export const TIME_ZONES: { id: string; city: string }[] = [
  { id: "UTC", city: "UTC" },
  { id: "America/Mexico_City", city: "Ciudad de México" },
  { id: "America/Bogota", city: "Bogotá" },
  { id: "America/Lima", city: "Lima" },
  { id: "America/Santiago", city: "Santiago" },
  { id: "America/Argentina/Buenos_Aires", city: "Buenos Aires" },
  { id: "America/Sao_Paulo", city: "São Paulo" },
  { id: "America/New_York", city: "Nueva York" },
  { id: "America/Los_Angeles", city: "Los Ángeles" },
  { id: "Europe/London", city: "Londres" },
  { id: "Europe/Madrid", city: "Madrid" },
  { id: "Europe/Paris", city: "París" },
  { id: "Asia/Tokyo", city: "Tokio" },
  { id: "Australia/Sydney", city: "Sídney" },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: "auto",
  accent: "teal",
  language: "es",
  weekStartsOn: 1,
  use24h: true,
  defaultView: "month",
  notifications: false,
  compact: false,
  showWeekNumbers: false,
  secondTimeZone: null,
  autoBackup: true,
  artTheme: "none",
};

export function defaultData(): AppData {
  return {
    version: DATA_VERSION,
    calendars: [
      { id: "personal", name: "Personal", color: "#15bed1", visible: true, kind: "local" },
    ],
    events: [],
    notes: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function newId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}
