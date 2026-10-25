import { create } from "zustand";
import { loadData, saveData } from "../lib/api";
import { addDays, addMonths, parseDateKey, toDateKey } from "../lib/dates";
import { countryName, holidayEvents } from "../lib/holidays";
import { normalizeData, seedData } from "../lib/normalize";
import {
  CALENDAR_COLORS,
  newId,
  type AppData,
  type CalendarEvent,
  type CalendarList,
  type Note,
  type Settings,
  type ViewMode,
} from "../lib/types";

export type Section = "calendar" | "notes";
export type ToastKind = "info" | "success" | "error";

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface EventEditorState {
  open: boolean;
  id: string | null;
  date: string;
  time: string;
}

interface AppStore {
  ready: boolean;
  data: AppData;
  section: Section;
  view: ViewMode;
  /** Anchor day of the visible period. */
  cursor: string;
  /** Day shown in the right-hand rail. */
  selectedDay: string;
  tagFilter: string | null;
  activeNoteId: string | null;
  searchOpen: boolean;
  settingsOpen: boolean;
  aboutOpen: boolean;
  editor: EventEditorState;
  toasts: Toast[];

  hydrate: () => Promise<void>;
  setSection: (section: Section) => void;
  setView: (view: ViewMode) => void;
  setCursor: (dateKey: string) => void;
  shiftPeriod: (direction: -1 | 1) => void;
  goToday: () => void;
  selectDay: (dateKey: string) => void;
  setTagFilter: (tag: string | null) => void;

  openEditor: (options?: { id?: string; date?: string; time?: string }) => void;
  closeEditor: () => void;
  saveEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  /** Checks or unchecks one occurrence of an event in the week panel. */
  toggleEventDone: (id: string, dateKey: string) => void;

  saveNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  openNote: (id: string | null) => void;
  createNote: (date?: string | null) => void;

  addCalendar: (name: string, color?: string) => void;
  updateCalendar: (id: string, patch: Partial<CalendarList>) => void;
  removeCalendar: (id: string) => boolean;
  /** Adds parsed .ics events to a calendar with that name or to a new one. */
  importEvents: (
    calendarName: string,
    events: CalendarEvent[],
  ) => { calendarId: string; added: number; existing: number };
  addHolidayCalendar: (
    country: string,
    years: number[],
  ) => { calendarId: string; added: number; existing: boolean };

  updateSettings: (patch: Partial<Settings>) => void;
  replaceData: (data: AppData) => void;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  pushToast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: string) => void;
}

function upsert<T extends { id: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id);
  if (index === -1) return [...items, next];
  const copy = [...items];
  copy[index] = next;
  return copy;
}

const now = new Date();
const todayKey = toDateKey(now);

export const useAppStore = create<AppStore>()((set, get) => ({
  ready: false,
  data: seedData(),
  section: "calendar",
  view: "month",
  cursor: todayKey,
  selectedDay: todayKey,
  tagFilter: null,
  activeNoteId: null,
  searchOpen: false,
  settingsOpen: false,
  aboutOpen: false,
  editor: { open: false, id: null, date: todayKey, time: "09:00" },
  toasts: [],

  hydrate: async () => {
    try {
      const stored = await loadData();
      const data = stored ? normalizeData(stored) : seedData();
      set({
        data,
        ready: true,
        view: data.settings.defaultView,
        cursor: todayKey,
        selectedDay: todayKey,
        activeNoteId: data.notes[0]?.id ?? null,
      });
    } catch {
      set({ data: seedData(), ready: true });
      get().pushToast("No se pudo leer el archivo de datos; se abrió un espacio nuevo.", "error");
    }
  },

  setSection: (section) => set({ section, searchOpen: false }),
  setView: (view) => set({ view }),
  setCursor: (cursor) => set({ cursor }),
  shiftPeriod: (direction) => {
    const { view, cursor } = get();
    const day = parseDateKey(cursor);
    const next =
      view === "day"
        ? addDays(day, direction)
        : view === "week"
          ? addDays(day, 7 * direction)
          : view === "month"
            ? addMonths(day, direction)
            : addDays(day, 30 * direction);
    set({ cursor: toDateKey(next), selectedDay: toDateKey(next) });
  },
  goToday: () => {
    const key = toDateKey(new Date());
    set({ cursor: key, selectedDay: key });
  },
  selectDay: (dateKey) => set({ selectedDay: dateKey }),
  setTagFilter: (tag) => set({ tagFilter: tag }),

  openEditor: (options) =>
    set((state) => ({
      editor: {
        open: true,
        id: options?.id ?? null,
        date: options?.date ?? state.selectedDay,
        time: options?.time ?? "09:00",
      },
    })),
  closeEditor: () =>
    set((state) => ({ editor: { ...state.editor, open: false, id: null } })),

  saveEvent: (event) =>
    set((state) => ({
      data: {
        ...state.data,
        events: upsert(state.data.events, { ...event, updatedAt: new Date().toISOString() }),
      },
    })),

  deleteEvent: (id) =>
    set((state) => ({
      data: { ...state.data, events: state.data.events.filter((event) => event.id !== id) },
    })),

  toggleEventDone: (id, dateKey) =>
    set((state) => ({
      data: {
        ...state.data,
        events: state.data.events.map((event) => {
          if (event.id !== id) return event;
          const dates = new Set(event.doneDates ?? []);
          if (dates.has(dateKey)) dates.delete(dateKey);
          else dates.add(dateKey);
          return {
            ...event,
            doneDates: [...dates].sort(),
            updatedAt: new Date().toISOString(),
          };
        }),
      },
    })),

  saveNote: (note) =>
    set((state) => ({
      data: {
        ...state.data,
        notes: upsert(state.data.notes, { ...note, updatedAt: new Date().toISOString() }),
      },
      activeNoteId: note.id,
    })),

  deleteNote: (id) =>
    set((state) => {
      const notes = state.data.notes.filter((note) => note.id !== id);
      return {
        data: { ...state.data, notes },
        activeNoteId: state.activeNoteId === id ? (notes[0]?.id ?? null) : state.activeNoteId,
      };
    }),

  openNote: (id) => set({ activeNoteId: id, section: "notes" }),

  createNote: (date = null) => {
    const stamp = new Date().toISOString();
    const note: Note = {
      id: newId("note"),
      title: "",
      body: "",
      tags: [],
      date,
      pinned: false,
      createdAt: stamp,
      updatedAt: stamp,
    };
    set((state) => ({
      data: { ...state.data, notes: [note, ...state.data.notes] },
      activeNoteId: note.id,
      section: "notes",
    }));
  },

  addCalendar: (name, color) => {
    const { calendars } = get().data;
    const list: CalendarList = {
      id: newId("cal"),
      name: name.trim() || `Calendario ${calendars.length + 1}`,
      color: color ?? CALENDAR_COLORS[calendars.length % CALENDAR_COLORS.length],
      visible: true,
    };
    set((state) => ({ data: { ...state.data, calendars: [...state.data.calendars, list] } }));
  },

  updateCalendar: (id, patch) =>
    set((state) => ({
      data: {
        ...state.data,
        calendars: state.data.calendars.map((calendar) =>
          calendar.id === id ? { ...calendar, ...patch } : calendar,
        ),
      },
    })),

  removeCalendar: (id) => {
    const { calendars } = get().data;
    if (calendars.length <= 1) return false;
    const fallback = calendars.find((calendar) => calendar.id !== id);
    if (!fallback) return false;
    set((state) => ({
      data: {
        ...state.data,
        calendars: state.data.calendars.filter((calendar) => calendar.id !== id),
        events: state.data.events.map((event) =>
          event.calendarId === id ? { ...event, calendarId: fallback.id } : event,
        ),
      },
    }));
    return true;
  },

  importEvents: (calendarName, incoming) => {
    const state = get();
    const wanted = calendarName.trim();
    const found = wanted
      ? state.data.calendars.find(
          (calendar) =>
            calendar.kind !== "holiday" && calendar.name.toLowerCase() === wanted.toLowerCase(),
        )
      : undefined;
    const calendarId = found?.id ?? newId("cal");
    const calendars = found
      ? state.data.calendars
      : [
          ...state.data.calendars,
          {
            id: calendarId,
            name: wanted || `Importado ${state.data.calendars.length + 1}`,
            color: CALENDAR_COLORS[state.data.calendars.length % CALENDAR_COLORS.length],
            visible: true,
            kind: "local" as const,
          },
        ];

    const uids = new Set(
      state.data.events
        .map((event) => event.uid)
        .filter((uid): uid is string => Boolean(uid)),
    );
    const fresh = incoming
      .filter((event) => !event.uid || !uids.has(event.uid))
      .map((event) => ({ ...event, calendarId }));

    set({
      data: {
        ...state.data,
        calendars,
        events: [...state.data.events, ...fresh],
      },
    });
    return { calendarId, added: fresh.length, existing: incoming.length - fresh.length };
  },

  addHolidayCalendar: (country, years) => {
    const state = get();
    const language = state.data.settings.language;
    const found = state.data.calendars.find(
      (calendar) => calendar.kind === "holiday" && calendar.country === country,
    );
    const calendarId = found?.id ?? `holiday_${country.toLowerCase()}`;
    const calendars = found
      ? state.data.calendars
      : [
          ...state.data.calendars,
          {
            id: calendarId,
            name:
              language === "es"
                ? `Festivos · ${countryName(country, language)}`
                : `Holidays · ${countryName(country, language)}`,
            color: "#c2740b",
            visible: true,
            kind: "holiday" as const,
            country,
          },
        ];

    const uids = new Set(
      state.data.events
        .map((event) => event.uid)
        .filter((uid): uid is string => Boolean(uid)),
    );
    const fresh = holidayEvents(country, years, calendarId, language).filter(
      (event) => !event.uid || !uids.has(event.uid),
    );

    set({
      data: {
        ...state.data,
        calendars,
        events: [...state.data.events, ...fresh],
      },
    });
    return { calendarId, added: fresh.length, existing: Boolean(found) };
  },

  updateSettings: (patch) =>
    set((state) => ({
      data: { ...state.data, settings: { ...state.data.settings, ...patch } },
    })),

  replaceData: (data) =>
    set({
      data,
      ready: true,
      activeNoteId: data.notes[0]?.id ?? null,
      view: data.settings.defaultView,
      tagFilter: null,
      section: "calendar",
    }),

  setSearchOpen: (open) => set({ searchOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setAboutOpen: (open) => set({ aboutOpen: open }),

  pushToast: (message, kind = "info") => {
    const toast: Toast = { id: newId("toast"), message, kind };
    set((state) => ({ toasts: [...state.toasts.slice(-3), toast] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== toast.id) }));
    }, 4200);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized = "";

useAppStore.subscribe((state, previous) => {
  if (!state.ready || state.data === previous.data) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const serialized = JSON.stringify(state.data);
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    void saveData(state.data).catch(() => {
      useAppStore.getState().pushToast("No se pudo guardar en disco.", "error");
    });
  }, 350);
});

export function visibleEvents(data: AppData): CalendarEvent[] {
  const visible = new Set(data.calendars.filter((calendar) => calendar.visible).map((calendar) => calendar.id));
  return data.events.filter((event) => visible.has(event.calendarId));
}

export function allTags(data: AppData): string[] {
  const tags = new Set<string>();
  for (const event of data.events) for (const tag of event.tags) tags.add(tag);
  for (const note of data.notes) for (const tag of note.tags) tags.add(tag);
  return [...tags].sort((a, b) => a.localeCompare(b));
}
