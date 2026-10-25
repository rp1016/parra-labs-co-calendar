import { describe, expect, it } from "vitest";
import { defaultData } from "./types";
import { makeEvent } from "./factory";
import { searchAll } from "./search";

function library() {
  const data = defaultData();
  data.events = [
    makeEvent({ id: "evt_dentist", title: "Dentista", location: "Clínica Central", tags: ["salud"] }),
    makeEvent({
      id: "evt_meeting",
      title: "Reunión de equipo",
      notes: "Revisar el presupuesto trimestral",
    }),
  ];
  data.notes = [
    {
      id: "note_ideas",
      title: "Ideas",
      body: "Comprar café y escribir el diario",
      tags: ["personal"],
      date: "2026-10-24",
      pinned: false,
      createdAt: "2026-10-24T08:00:00.000Z",
      updatedAt: "2026-10-24T08:00:00.000Z",
    },
  ];
  return data;
}

describe("search", () => {
  it("finds events by title, tag, or body", () => {
    const data = library();
    expect(searchAll(data, "dentista", "es-ES").events).toHaveLength(1);
    expect(searchAll(data, "salud", "es-ES").events).toHaveLength(1);
    expect(searchAll(data, "presupuesto", "es-ES").events[0].id).toBe("evt_meeting");
  });

  it("finds notes and includes a preview", () => {
    const data = library();
    const found = searchAll(data, "café", "es-ES");
    expect(found.notes).toHaveLength(1);
    expect(found.notes[0].title).toBe("Ideas");
    expect(found.notes[0].sub).toContain("café");
  });

  it("returns nothing for a blank or unknown query", () => {
    const data = library();
    expect(searchAll(data, "   ", "es-ES")).toEqual({ events: [], notes: [] });
    expect(searchAll(data, "zzzz", "es-ES")).toEqual({ events: [], notes: [] });
  });
});
