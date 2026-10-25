import { useState, type FormEvent } from "react";
import {
  Bell,
  CalendarDays,
  Circle,
  Clock,
  MapPin,
  Repeat,
  StickyNote,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useT } from "../i18n";
import { parseLocal, toLocalStamp } from "../lib/dates";
import { emptyEvent } from "../lib/eventDraft";
import {
  SENSITIVITIES,
  SHOW_AS,
  type CalendarEvent,
  type RepeatFreq,
  type Sensitivity,
  type ShowAs,
} from "../lib/types";
import { useAppStore } from "../state/store";
import { confirmAction } from "../state/confirm";
import { TagInput } from "./TagInput";

const REPEATS: RepeatFreq[] = ["none", "daily", "weekly", "monthly", "yearly"];

interface FormState {
  title: string;
  notes: string;
  location: string;
  calendarId: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  tags: string[];
  reminderMinutes: number | null;
  freq: RepeatFreq;
  interval: number;
  until: string;
  showAs: ShowAs;
  sensitivity: Sensitivity;
  attendees: string[];
}

export function EventDialog() {
  const t = useT();
  const editor = useAppStore((state) => state.editor);
  const data = useAppStore((state) => state.data);
  const closeEditor = useAppStore((state) => state.closeEditor);
  const saveEvent = useAppStore((state) => state.saveEvent);
  const deleteEvent = useAppStore((state) => state.deleteEvent);
  const pushToast = useAppStore((state) => state.pushToast);

  const existing = editor.id ? data.events.find((event) => event.id === editor.id) : undefined;
  const base =
    existing ?? emptyEvent(editor.date, editor.time, data.calendars[0]?.id ?? "personal");

  const [form, setForm] = useState<FormState>({
    title: base.title,
    notes: base.notes,
    location: base.location,
    calendarId: base.calendarId,
    allDay: base.allDay,
    startDate: base.start.slice(0, 10),
    startTime: base.start.slice(11, 16) || "09:00",
    endDate: base.end.slice(0, 10),
    endTime: base.end.slice(11, 16) || "10:00",
    tags: base.tags,
    reminderMinutes: base.reminderMinutes,
    freq: base.repeat.freq,
    interval: base.repeat.interval,
    until: base.repeat.until ?? "",
    showAs: base.showAs ?? "busy",
    sensitivity: base.sensitivity ?? "normal",
    attendees: base.attendees ?? [],
  });
  const [error, setError] = useState<string | null>(null);

  const patch = (values: Partial<FormState>) => setForm((current) => ({ ...current, ...values }));

  const reminderOptions: { value: number | null; label: string }[] = [
    { value: null, label: t("reminder.none") },
    { value: 0, label: t("reminder.atStart") },
    { value: 10, label: t("reminder.minutes", { count: 10 }) },
    { value: 30, label: t("reminder.minutes", { count: 30 }) },
    { value: 60, label: t("reminder.hour") },
    { value: 120, label: t("reminder.minutes", { count: 120 }) },
    { value: 1440, label: t("reminder.day") },
  ];

  const repeatUnit = {
    daily: t("repeat.unit.days"),
    weekly: t("repeat.unit.weeks"),
    monthly: t("repeat.unit.months"),
    yearly: t("repeat.unit.years"),
    none: "",
  }[form.freq];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const start = parseLocal(`${form.startDate}T${form.allDay ? "00:00" : form.startTime}`);
    const end = parseLocal(`${form.endDate}T${form.allDay ? "23:59" : form.endTime}`);

    if (end.getTime() <= start.getTime()) {
      setError(t("event.invalidRange"));
      return;
    }
    if (form.freq !== "none" && form.until) {
      const until = parseLocal(`${form.until}T23:59`);
      if (until.getTime() < start.getTime()) {
        setError(t("event.invalidRange"));
        return;
      }
    }

    const draft: CalendarEvent = {
      ...(existing ?? base),
      calendarId: form.calendarId,
      title: form.title.trim(),
      notes: form.notes,
      location: form.location.trim(),
      allDay: form.allDay,
      start: toLocalStamp(start),
      end: toLocalStamp(end),
      tags: form.tags,
      reminderMinutes: form.reminderMinutes,
      repeat: {
        freq: form.freq,
        interval: Math.max(1, form.interval),
        until: form.freq === "none" || !form.until ? null : form.until,
        exdates: existing?.repeat.exdates ?? [],
      },
      showAs: form.showAs,
      sensitivity: form.sensitivity,
      attendees: form.attendees,
    };

    saveEvent(draft);
    closeEditor();
    pushToast(t("toast.saved"), "success");
  };

  const remove = async () => {
    if (!existing) return;
    const confirmed = await confirmAction(t("event.deleteConfirm"), {
      confirmLabel: t("actions.delete"),
      danger: true,
    });
    if (!confirmed) return;
    deleteEvent(existing.id);
    closeEditor();
  };

  const skipOccurrence = () => {
    if (!existing || existing.repeat.freq === "none") return;
    const exdates = new Set(existing.repeat.exdates ?? []);
    exdates.add(editor.date);
    saveEvent({
      ...existing,
      repeat: { ...existing.repeat, exdates: [...exdates].sort() },
    });
    closeEditor();
    pushToast(t("toast.saved"), "success");
  };

  return (
    <div className="modal-backdrop flyout" onMouseDown={closeEditor}>
      <form
        className="modal event-flyout"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{existing ? t("event.edit") : t("event.new")}</h2>
          <button type="button" className="icon-btn" onClick={closeEditor} aria-label={t("actions.close")}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <input
            className="event-title-input"
            autoFocus
            value={form.title}
            placeholder={t("event.titlePlaceholder")}
            onChange={(event) => patch({ title: event.target.value })}
          />

          <div className="flyout-block">
            <Clock size={16} />
            <div className="flyout-fields">
              <div className="row">
                <span className="flyout-label">{t("event.start")}</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => {
                    const value = event.target.value;
                    patch({
                      startDate: value,
                      endDate: form.endDate < value ? value : form.endDate,
                    });
                  }}
                />
                {!form.allDay && (
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) => patch({ startTime: event.target.value })}
                  />
                )}
              </div>
              <div className="row">
                <span className="flyout-label">{t("event.end")}</span>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(event) => patch({ endDate: event.target.value })}
                />
                {!form.allDay && (
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => patch({ endTime: event.target.value })}
                  />
                )}
              </div>
              <label className="flyout-check">
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(event) =>
                    patch({
                      allDay: event.target.checked,
                      startTime: "00:00",
                      endTime: "23:59",
                    })
                  }
                />
                {t("event.allDay")}
              </label>
            </div>
          </div>

          <div className="flyout-block">
            <MapPin size={16} />
            <input
              className="flyout-input"
              value={form.location}
              placeholder={t("event.locationPlaceholder")}
              onChange={(event) => patch({ location: event.target.value })}
            />
          </div>

          <div className="flyout-block">
            <UserRound size={16} />
            <div className="flyout-fields">
              <TagInput
                value={form.attendees}
                onChange={(attendees) => patch({ attendees })}
                placeholder={t("event.attendeesPlaceholder")}
              />
            </div>
          </div>

          <div className="flyout-block">
            <Bell size={16} />
            <select
              className="flyout-select"
              value={form.reminderMinutes === null ? "none" : String(form.reminderMinutes)}
              onChange={(event) =>
                patch({
                  reminderMinutes:
                    event.target.value === "none" ? null : Number(event.target.value),
                })
              }
            >
              {reminderOptions.map((option) => (
                <option
                  key={option.value === null ? "none" : option.value}
                  value={option.value === null ? "none" : String(option.value)}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flyout-block">
            <CalendarDays size={16} />
            <select
              className="flyout-select"
              value={form.calendarId}
              onChange={(event) => patch({ calendarId: event.target.value })}
            >
              {data.calendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flyout-block">
            <Circle size={16} />
            <div className="flyout-fields">
              <div className="row">
                <select
                  className="flyout-select"
                  value={form.showAs}
                  title={t("event.showAs")}
                  onChange={(event) => patch({ showAs: event.target.value as ShowAs })}
                >
                  {SHOW_AS.map((value) => (
                    <option key={value} value={value}>
                      {t(`showAs.${value}`)}
                    </option>
                  ))}
                </select>
                <select
                  className="flyout-select"
                  value={form.sensitivity}
                  title={t("event.sensitivity")}
                  onChange={(event) =>
                    patch({ sensitivity: event.target.value as Sensitivity })
                  }
                >
                  {SENSITIVITIES.map((value) => (
                    <option key={value} value={value}>
                      {t(`sensitivity.${value}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flyout-block">
            <Repeat size={16} />
            <div className="flyout-fields">
              <select
                className="flyout-select"
                value={form.freq}
                onChange={(event) => patch({ freq: event.target.value as RepeatFreq })}
              >
                {REPEATS.map((freq) => (
                  <option key={freq} value={freq}>
                    {t(`repeat.${freq}`)}
                  </option>
                ))}
              </select>

              {form.freq !== "none" && (
                <>
                  <div className="row">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={form.interval}
                      onChange={(event) =>
                        patch({ interval: Math.max(1, Number(event.target.value) || 1) })
                      }
                      style={{ width: 58 }}
                    />
                    <span>{repeatUnit}</span>
                    <span>·</span>
                    <input
                      type="date"
                      value={form.until}
                      min={form.startDate}
                      onChange={(event) => patch({ until: event.target.value })}
                      title={t("repeat.until")}
                    />
                  </div>
                  {existing && (
                    <button
                      type="button"
                      className="btn ghost skip-occurrence"
                      onClick={skipOccurrence}
                    >
                      {t("event.skipOccurrence")}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flyout-block">
            <Tag size={16} />
            <div className="flyout-fields">
              <TagInput
                value={form.tags}
                onChange={(tags) => patch({ tags })}
                placeholder={t("notes.tagPlaceholder")}
              />
            </div>
          </div>

          <div className="flyout-block">
            <StickyNote size={16} />
            <textarea
              className="flyout-note"
              rows={3}
              value={form.notes}
              placeholder={t("event.notesPlaceholder")}
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-foot">
          {existing && (
            <button type="button" className="btn danger left" onClick={remove}>
              <Trash2 size={14} />
              {t("actions.delete")}
            </button>
          )}
          <button type="button" className="btn" onClick={closeEditor}>
            {t("actions.cancel")}
          </button>
          <button type="submit" className="btn primary">
            {t("actions.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
