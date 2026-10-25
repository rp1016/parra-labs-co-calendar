import { CalendarDays, CalendarPlus, Check, ChevronDown, MoreHorizontal, StickyNote, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "../i18n";
import { CALENDAR_COLORS } from "../lib/types";
import { allTags, useAppStore } from "../state/store";
import { confirmAction } from "../state/confirm";
import { WeekTodo } from "./WeekTodo";

export function Sidebar() {
  const t = useT();
  const data = useAppStore((state) => state.data);
  const section = useAppStore((state) => state.section);
  const setSection = useAppStore((state) => state.setSection);
  const tagFilter = useAppStore((state) => state.tagFilter);
  const setTagFilter = useAppStore((state) => state.setTagFilter);
  const updateCalendar = useAppStore((state) => state.updateCalendar);
  const addCalendar = useAppStore((state) => state.addCalendar);
  const removeCalendar = useAppStore((state) => state.removeCalendar);
  const pushToast = useAppStore((state) => state.pushToast);

  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const tags = allTags(data);

  useEffect(() => {
    if (!menuId) return;
    const onDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".cal-menu-wrap")) {
        setMenuId(null);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menuId]);

  const submitCalendar = () => {
    const name = draft.trim();
    if (name) {
      addCalendar(name, CALENDAR_COLORS[data.calendars.length % CALENDAR_COLORS.length]);
    }
    setDraft("");
    setAdding(false);
  };

  const commitRename = (id: string) => {
    const name = renameDraft.trim();
    if (name) updateCalendar(id, { name });
  };

  const remove = async (id: string) => {
    setMenuId(null);
    const confirmed = await confirmAction(
      `${t("calendar.delete")}\n\n${t("calendar.deleteConfirm")}`,
      { confirmLabel: t("actions.delete"), danger: true },
    );
    if (!confirmed) return;
    if (!removeCalendar(id)) {
      pushToast(t("calendar.lastOne"), "error");
      return;
    }
    pushToast(t("toast.calendarDeleted"), "info");
  };

  return (
    <aside className="sidebar">
      <div className="side-group">
        <div className="side-group-head">
          <button
            className="side-group-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <ChevronDown size={14} className={open ? "" : "closed"} />
            {t("calendar.local")}
          </button>
          <button
            className="icon-btn xs"
            onClick={() => {
              setOpen(true);
              setAdding(true);
            }}
            title={t("calendar.add")}
            aria-label={t("calendar.add")}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        {open && (
          <div className="cal-list">
            {data.calendars.map((calendar) => (
              <div className="cal-row" key={calendar.id}>
                <button
                  className="cal-check"
                  style={{ ["--cal" as string]: calendar.color }}
                  aria-pressed={calendar.visible}
                  aria-label={calendar.name}
                  onClick={() => updateCalendar(calendar.id, { visible: !calendar.visible })}
                >
                  {calendar.visible && <Check />}
                </button>
                <button
                  className="cal-name"
                  style={{ border: 0, background: "transparent", textAlign: "left", padding: 0 }}
                  onClick={() => setSection("calendar")}
                >
                  {calendar.name}
                </button>
                <span className="cal-menu-wrap">
                  <button
                    className="cal-menu"
                    onClick={() => {
                      setMenuId(menuId === calendar.id ? null : calendar.id);
                      setRenameDraft(calendar.name);
                    }}
                    aria-label={t("calendar.rename")}
                    aria-haspopup="menu"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {menuId === calendar.id && (
                    <div className="cal-menu-pop" role="menu">
                      <input
                        className="input cal-rename"
                        autoFocus
                        value={renameDraft}
                        placeholder={t("calendar.name")}
                        aria-label={t("calendar.rename")}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            commitRename(calendar.id);
                            setMenuId(null);
                          }
                          if (event.key === "Escape") setMenuId(null);
                        }}
                        onBlur={() => commitRename(calendar.id)}
                      />
                      <div className="cal-swatches">
                        {CALENDAR_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`cal-swatch ${
                              calendar.color === color ? "active" : ""
                            }`}
                            style={{ background: color }}
                            aria-label={`${t("calendar.color")} ${color}`}
                            onClick={() => updateCalendar(calendar.id, { color })}
                          />
                        ))}
                      </div>
                      <button role="menuitem" onClick={() => void remove(calendar.id)}>
                        <Trash2 size={13} />
                        {t("calendar.delete")}
                      </button>
                    </div>
                  )}
                </span>
              </div>
            ))}

            {adding && (
              <div className="cal-add-row">
                <span
                  className="cal-check"
                  aria-hidden
                  style={{
                    ["--cal" as string]:
                      CALENDAR_COLORS[data.calendars.length % CALENDAR_COLORS.length],
                  }}
                />
                <input
                  className="input"
                  autoFocus
                  value={draft}
                  placeholder={t("calendar.name")}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitCalendar();
                    if (event.key === "Escape") {
                      setAdding(false);
                      setDraft("");
                    }
                  }}
                  onBlur={submitCalendar}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="side-divider" />

      <nav className="side-nav">
        <button
          className={section === "calendar" ? "active" : ""}
          onClick={() => setSection("calendar")}
        >
          <CalendarDays size={16} />
          {t("nav.calendar")}
          <span className="count">{data.events.length}</span>
        </button>
        <button
          className={section === "notes" ? "active" : ""}
          onClick={() => setSection("notes")}
        >
          <StickyNote size={16} />
          {t("nav.notes")}
          <span className="count">{data.notes.length}</span>
        </button>
      </nav>

      {tags.length > 0 && (
        <div className="side-section">
          <div className="side-title">
            {t("tags.title")}
            {tagFilter && (
              <button onClick={() => setTagFilter(null)} aria-label={t("tags.clear")}>
                <X size={13} />
              </button>
            )}
          </div>
          <div className="tag-cloud">
            {tags.map((tag) => (
              <button
                key={tag}
                className={`tag-chip ${tagFilter === tag ? "active" : ""}`}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <WeekTodo />

      <button
        className="add-calendar"
        onClick={() => {
          setOpen(true);
          setAdding(true);
        }}
      >
        <CalendarPlus size={15} />
        {t("calendar.add")}
      </button>
    </aside>
  );
}
