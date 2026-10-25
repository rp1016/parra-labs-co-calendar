import { formatLongDate, parseLocal } from "./dates";
import { plainPreview } from "./markdown";
import type { AppData } from "./types";

export interface SearchHit {
  kind: "event" | "note";
  id: string;
  title: string;
  sub: string;
  when: string | null;
}

function score(query: string, fields: string[]): number {
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;
  let best = 0;
  for (const [index, field] of fields.entries()) {
    const haystack = field.toLowerCase();
    const position = haystack.indexOf(needle);
    if (position === -1) continue;
    best = Math.max(best, 100 - position - index * 10);
  }
  return best;
}

/** Small in-memory search: title wins over tags, tags over body. */
export function searchAll(
  data: AppData,
  query: string,
  locale: string,
): { events: SearchHit[]; notes: SearchHit[] } {
  const needle = query.trim();
  if (!needle) return { events: [], notes: [] };

  const events = data.events
    .map((event) => ({
      event,
      rank: score(needle, [event.title, event.tags.join(" "), event.location, event.notes]),
    }))
    .filter((item) => item.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8)
    .map(({ event }) => {
      const start = parseLocal(event.start);
      return {
        kind: "event" as const,
        id: event.id,
        title: event.title || "—",
        sub: `${formatLongDate(start, locale)}${event.location ? ` · ${event.location}` : ""}`,
        when: event.start,
      };
    });

  const notes = data.notes
    .map((note) => ({
      note,
      rank: score(needle, [note.title, note.tags.join(" "), note.body]),
    }))
    .filter((item) => item.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8)
    .map(({ note }) => ({
      kind: "note" as const,
      id: note.id,
      title: note.title || "Sin título",
      sub: plainPreview(note.body, 90),
      when: note.date,
    }));

  return { events, notes };
}
