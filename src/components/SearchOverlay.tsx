import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { CalendarDays, Search, StickyNote } from "lucide-react";
import { localeOf, useT } from "../i18n";
import { searchAll, type SearchHit } from "../lib/search";
import { useAppStore } from "../state/store";

export function SearchOverlay() {
  const t = useT();
  const close = () => useAppStore.getState().setSearchOpen(false);
  const language = useAppStore((state) => state.data.settings.language);
  const data = useAppStore((state) => state.data);
  const openEditor = useAppStore((state) => state.openEditor);
  const openNote = useAppStore((state) => state.openNote);

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const locale = localeOf(language);
  const results = useMemo(() => searchAll(data, query, locale), [data, query, locale]);
  const flat: SearchHit[] = useMemo(
    () => [...results.events, ...results.notes],
    [results],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const open = (hit: SearchHit) => {
    if (hit.kind === "event") openEditor({ id: hit.id });
    else openNote(hit.id);
    close();
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((current) => Math.min(current + 1, Math.max(0, flat.length - 1)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((current) => Math.max(0, current - 1));
    }
    if (event.key === "Enter" && flat[index]) {
      event.preventDefault();
      open(flat[index]);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div
        className="search-panel"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          className="search-input"
          value={query}
          placeholder={t("search.placeholder")}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="search-results">
          {query && flat.length === 0 && (
            <div className="empty">
              <Search size={22} />
              <b>{t("search.empty")}</b>
            </div>
          )}

          {results.events.length > 0 && (
            <>
              <div className="search-group-title">{t("search.events")}</div>
              {results.events.map((hit) => {
                const position = flat.indexOf(hit);
                return (
                  <button
                    key={`event-${hit.id}`}
                    className={`search-item ${position === index ? "active" : ""}`}
                    onMouseEnter={() => setIndex(position)}
                    onClick={() => open(hit)}
                  >
                    <span className="ico">
                      <CalendarDays size={15} />
                    </span>
                    <span className="txt">
                      <b>{hit.title}</b>
                      <span>{hit.sub}</span>
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {results.notes.length > 0 && (
            <>
              <div className="search-group-title">{t("search.notes")}</div>
              {results.notes.map((hit) => {
                const position = flat.indexOf(hit);
                return (
                  <button
                    key={`note-${hit.id}`}
                    className={`search-item ${position === index ? "active" : ""}`}
                    onMouseEnter={() => setIndex(position)}
                    onClick={() => open(hit)}
                  >
                    <span className="ico">
                      <StickyNote size={15} />
                    </span>
                    <span className="txt">
                      <b>{hit.title}</b>
                      <span>{hit.sub}</span>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="search-foot">
          <span>{t("search.hint")}</span>
          <span style={{ marginLeft: "auto" }}>
            <kbd className="kbd">Ctrl</kbd> <kbd className="kbd">K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
