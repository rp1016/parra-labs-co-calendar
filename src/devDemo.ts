import { addDays, toDateKey } from "./lib/dates";
import { seedData } from "./lib/normalize";
import type { CalendarEvent, Note, ViewMode } from "./lib/types";
import { newId } from "./lib/types";

const KEY = "parrita-calendar:data";

/** Development-only sample library. Never imported in production builds. */
export function installDemo(): void {
  const exists = localStorage.getItem(KEY);
  if (!exists) {
    const data = seedData();
    data.calendars.push({ id: "trabajo", name: "Trabajo", color: "#0b7f86", visible: true });

    const today = new Date();
    const stamp = new Date().toISOString();

    const make = (
      calendarId: string,
      title: string,
      startOffset: number,
      startHour: number,
      endHour: number,
      extra: Partial<CalendarEvent> = {},
    ): CalendarEvent => {
      const start = addDays(today, startOffset);
      start.setHours(startHour, 0, 0, 0);
      const end = addDays(today, startOffset);
      end.setHours(endHour, 0, 0, 0);
      const pad = (value: number) => String(value).padStart(2, "0");
      return {
        id: newId("evt"),
        calendarId,
        title,
        notes: "",
        location: "",
        allDay: false,
        start: `${toDateKey(start)}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
        end: `${toDateKey(end)}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
        tags: [],
        reminderMinutes: null,
        repeat: { freq: "none", interval: 1, until: null },
        showAs: "busy",
        sensitivity: "normal",
        attendees: [],
        createdAt: stamp,
        updatedAt: stamp,
        ...extra,
      };
    };

    data.events = [
      make("personal", "Dentista", 0, 9, 10, {
        location: "Clínica Central",
        tags: ["salud"],
        reminderMinutes: 30,
        notes: "Llevar el carné del seguro.",
      }),
      make("trabajo", "Revisión de sprint", 0, 14, 15, {
        tags: ["trabajo"],
        notes: "Revisar el tablero y desbloquear el despliegue.",
        location: "Sala 3",
      }),
      make("personal", "Yoga", 0, 18, 19, { tags: ["salud"], location: "Estudio Norte" }),
      make("trabajo", "Llamada con cliente", 1, 11, 12, { location: "Videollamada" }),
      make("trabajo", "Entrega de diseño", 2, 0, 23, {
        allDay: true,
        tags: ["trabajo"],
      }),
      make("personal", "Cumpleaños de Ana", 4, 0, 23, { allDay: true }),
      make("personal", "Café con Leo", -1, 16, 17, { location: "Café Sur" }),
      make("personal", "Gimnasio", -5, 7, 8, {
        tags: ["salud"],
        repeat: {
          freq: "weekly",
          interval: 1,
          until: toDateKey(addDays(today, 90)),
        },
      }),
    ];

    const linked: Note = {
      id: newId("note"),
      title: "Ideas para la semana",
      body: [
        "## Prioridades",
        "- Cerrar la entrega del **viernes**",
        "- Reservar la cancha del sábado",
        "- Llamar a Leo por el café",
        "",
        "> Todo lo importante cabe en una nota corta.",
        "",
        "| Día | Bloque |",
        "| --- | --- |",
        "| Lunes | Diseño |",
        "| Miércoles | Cliente |",
      ].join("\n"),
      tags: ["ideas"],
      date: toDateKey(today),
      pinned: true,
      createdAt: stamp,
      updatedAt: stamp,
    };

    const minutes: Note = {
      id: newId("note"),
      title: "Acta de reunión",
      body: "Acordamos mover la entrega al viernes y avisar al cliente por correo.",
      tags: ["trabajo"],
      date: toDateKey(addDays(today, 1)),
      pinned: false,
      createdAt: stamp,
      updatedAt: stamp,
    };

    data.notes = [linked, minutes, ...data.notes];

    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "week" || view === "day" || view === "agenda" || view === "month") {
      data.settings.defaultView = view as ViewMode;
    }

    localStorage.setItem(KEY, JSON.stringify(data));
  }
}
