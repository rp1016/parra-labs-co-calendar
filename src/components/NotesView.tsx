import { useMemo, useState } from "react";
import {
  Columns2,
  Eye,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { localeOf, useT } from "../i18n";
import { formatShortDate, parseDateKey } from "../lib/dates";
import { plainPreview, renderMarkdown } from "../lib/markdown";
import type { Note } from "../lib/types";
import { useAppStore } from "../state/store";
import { confirmAction } from "../state/confirm";
import { TagInput } from "./TagInput";

type Mode = "write" | "split" | "preview";

function whenLabel(note: Note, locale: string): string {
  if (note.date) return formatShortDate(parseDateKey(note.date), locale);
  return new Date(note.updatedAt).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function NotesView() {
  const t = useT();
  const data = useAppStore((state) => state.data);
  const language = useAppStore((state) => state.data.settings.language);
  const activeNoteId = useAppStore((state) => state.activeNoteId);
  const tagFilter = useAppStore((state) => state.tagFilter);
  const openNote = useAppStore((state) => state.openNote);
  const createNote = useAppStore((state) => state.createNote);
  const saveNote = useAppStore((state) => state.saveNote);
  const deleteNote = useAppStore((state) => state.deleteNote);

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("split");

  const locale = localeOf(language);
  const needle = query.trim().toLowerCase();

  const notes = useMemo(() => {
    return data.notes
      .filter((note) => (tagFilter ? note.tags.includes(tagFilter) : true))
      .filter((note) => {
        if (!needle) return true;
        return (
          note.title.toLowerCase().includes(needle) ||
          note.body.toLowerCase().includes(needle) ||
          note.tags.some((tag) => tag.includes(needle))
        );
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [data.notes, needle, tagFilter]);

  const active = data.notes.find((note) => note.id === activeNoteId) ?? null;

  const patch = (values: Partial<Note>) => {
    if (!active) return;
    saveNote({ ...active, ...values });
  };

  const remove = async () => {
    if (!active) return;
    const confirmed = await confirmAction(t("notes.deleteConfirm"), {
      confirmLabel: t("actions.delete"),
      danger: true,
    });
    if (!confirmed) return;
    deleteNote(active.id);
  };

  return (
    <div className="notes">
      <section className="notes-list">
        <div className="notes-list-head">
          <div className="notes-list-title">
            <h2>{t("notes.title")}</h2>
            <button
              className="icon-btn primary"
              onClick={() => createNote(null)}
              title={t("notes.new")}
              aria-label={t("notes.new")}
            >
              <Plus size={17} />
            </button>
          </div>
          <div className="search-inline">
            <Search size={14} />
            <input
              value={query}
              placeholder={t("notes.search")}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label={t("tags.clear")}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="notes-list-body">
          {notes.length === 0 && (
            <div className="empty">
              <StickyNote size={24} />
              <b>{t("notes.empty")}</b>
              <span>{t("notes.emptyHint")}</span>
            </div>
          )}

          {notes.map((note) => (
            <button
              key={note.id}
              className={`note-card ${note.id === activeNoteId ? "active" : ""}`}
              onClick={() => openNote(note.id)}
            >
              <span className="title">
                {note.pinned && <Pin size={11} />}
                {note.title || t("notes.untitled")}
              </span>
              <span className="preview">{plainPreview(note.body) || "—"}</span>
              <span className="meta">
                {whenLabel(note, locale)}
                {note.tags.slice(0, 2).map((tag) => (
                  <span className="mini-tag" key={tag}>
                    #{tag}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </section>

      {active ? (
        <section className="notes-editor">
          <div className="note-toolbar">
            <button
              className={`icon-btn ${active.pinned ? "active" : ""}`}
              onClick={() => patch({ pinned: !active.pinned })}
              title={active.pinned ? t("notes.unpin") : t("notes.pin")}
            >
              {active.pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>

            <div className="segmented">
              <button
                className={mode === "write" ? "active" : ""}
                onClick={() => setMode("write")}
                title={t("notes.write")}
              >
                <Pencil size={13} />
              </button>
              <button
                className={mode === "split" ? "active" : ""}
                onClick={() => setMode("split")}
                title={t("notes.preview")}
              >
                <Columns2 size={13} />
              </button>
              <button
                className={mode === "preview" ? "active" : ""}
                onClick={() => setMode("preview")}
                title={t("notes.preview")}
              >
                <Eye size={13} />
              </button>
            </div>

            <span className="note-saved">
              {new Date(active.updatedAt).toLocaleString(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>

            <button
              className="icon-btn"
              style={{ marginLeft: "auto" }}
              onClick={remove}
              title={t("actions.delete")}
            >
              <Trash2 size={15} />
            </button>
          </div>

          <input
            className="note-title-input"
            value={active.title}
            placeholder={t("notes.titlePlaceholder")}
            onChange={(event) => patch({ title: event.target.value })}
          />

          <div className="note-meta">
            <label className="note-date">
              {t("notes.date")}
              <input
                type="date"
                value={active.date ?? ""}
                onChange={(event) => patch({ date: event.target.value || null })}
              />
            </label>
            {active.date && (
              <button className="btn ghost tiny" onClick={() => patch({ date: null })}>
                {t("notes.noDate")}
              </button>
            )}
            <TagInput
              value={active.tags}
              onChange={(tags) => patch({ tags })}
              placeholder={t("notes.tagPlaceholder")}
            />
          </div>

          <div className={mode === "split" ? "note-split" : "note-body-wrap"}>
            {mode !== "preview" && (
              <textarea
                className="note-body-input"
                value={active.body}
                placeholder={t("notes.bodyPlaceholder")}
                onChange={(event) => patch({ body: event.target.value })}
              />
            )}
            {mode !== "write" && (
              <div
                className="note-preview markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(active.body) }}
              />
            )}
          </div>
        </section>
      ) : (
        <div className="empty" style={{ height: "100%" }}>
          <StickyNote size={30} />
          <b>{t("notes.empty")}</b>
          <span>{t("notes.emptyHint")}</span>
          <button className="btn primary" onClick={() => createNote(null)}>
            <Plus size={15} />
            {t("notes.new")}
          </button>
        </div>
      )}
    </div>
  );
}
