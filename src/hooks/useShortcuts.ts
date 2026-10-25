import { useEffect } from "react";
import { useAppStore } from "../state/store";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

/** Global keys. Everything is disabled while a modal is open, except Escape. */
export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useAppStore.getState();

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        store.setSearchOpen(true);
        return;
      }

      if (event.key === "Escape") {
        if (store.searchOpen) store.setSearchOpen(false);
        else if (store.editor.open) store.closeEditor();
        else if (store.settingsOpen) store.setSettingsOpen(false);
        else if (store.aboutOpen) store.setAboutOpen(false);
        else if (store.tagFilter) store.setTagFilter(null);
        return;
      }

      if (isTyping(event.target)) return;
      if (store.searchOpen || store.settingsOpen || store.aboutOpen || store.editor.open) return;

      switch (event.key.toLowerCase()) {
        case "n":
          event.preventDefault();
          store.openEditor();
          break;
        case "t":
          store.goToday();
          break;
        case "1":
          store.setView("month");
          break;
        case "2":
          store.setView("week");
          break;
        case "3":
          store.setView("day");
          break;
        case "4":
          store.setView("agenda");
          break;
        case "/":
          event.preventDefault();
          store.setSearchOpen(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
