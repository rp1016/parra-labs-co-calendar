import { ShieldCheck, X } from "lucide-react";
import { useT } from "../i18n";
import { useAppStore } from "../state/store";

export function AboutDialog() {
  const t = useT();
  const close = useAppStore((state) => state.setAboutOpen);

  return (
    <div className="modal-backdrop" onMouseDown={() => close(false)}>
      <div className="modal about" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{t("about.title")}</h2>
          <button className="icon-btn" onClick={() => close(false)} aria-label={t("actions.close")}>
            <X size={17} />
          </button>
        </div>

        <div className="modal-body about-body">
          <img src="/app-mark.svg" alt="" className="about-icon" />
          <div className="about-name">
            <b>Calendar</b>
            <span>PRO</span>
          </div>
          <div className="about-by">{t("app.by")}</div>

          <p className="about-line">{t("about.local")}</p>

          <div className="about-local">
            <ShieldCheck size={15} />
            {t("about.made")}
          </div>

          <div className="about-version">
            {t("about.version")} {__APP_VERSION__}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn primary" onClick={() => close(false)}>
            {t("actions.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
