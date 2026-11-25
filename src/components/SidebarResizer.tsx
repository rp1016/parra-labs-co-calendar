import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { clampSidebarWidth, DEFAULT_SIDEBAR_WIDTH, maxSidebarWidth } from "../lib/sidebarWidth";

const STORAGE_KEY = "parrita-calendar:sidebar-width";
const KEY_STEP = 10;

function readStored(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

/** Drag handle on the right edge of the left panel. The width is a per-device
 *  preference, so it lives in localStorage and not in the calendar data. It only
 *  sets `--side-w`; the top bar keeps its own width and never gets squeezed. */
export function SidebarResizer() {
  const t = useT();
  const [preferred, setPreferred] = useState(readStored);
  const [viewport, setViewport] = useState(() => window.innerWidth);
  const dragging = useRef(false);
  // A narrow window limits what is shown without forgetting the preference.
  const width = clampSidebarWidth(preferred, viewport);

  useEffect(() => {
    const onResize = () => setViewport(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--side-w", `${width}px`);
  }, [width]);

  const update = useCallback((next: number) => {
    const value = clampSidebarWidth(next, window.innerWidth);
    setPreferred(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // The width still applies for this session.
    }
  }, []);

  return (
    <div
      className="sidebar-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={t("sidebar.resize")}
      aria-valuenow={width}
      aria-valuemin={DEFAULT_SIDEBAR_WIDTH}
      aria-valuemax={maxSidebarWidth(viewport)}
      tabIndex={0}
      title={t("sidebar.resize")}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (dragging.current) update(event.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onDoubleClick={() => update(DEFAULT_SIDEBAR_WIDTH)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        event.stopPropagation();
        update(width + (event.key === "ArrowRight" ? KEY_STEP : -KEY_STEP));
      }}
    />
  );
}
