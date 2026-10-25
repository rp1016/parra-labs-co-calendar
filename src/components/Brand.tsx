import { useT } from "../i18n";

/** Product lockup: symbol, CalendarPRO wordmark, by Parrita Labs.
 *  The sidebar uses the aqua symbol (app-mark.svg) so it keeps contrast on the
 *  light sidebar; the OS-level app icon is the ivory frameless version. */
export function Brand() {
  const t = useT();
  return (
    <div className="brand">
      <img src="/app-mark.svg" alt="" />
      <div className="brand-text">
        <div className="brand-name">
          <b>Calendar</b>
          <span>PRO</span>
        </div>
        <div className="brand-by">{t("app.by")}</div>
      </div>
    </div>
  );
}
