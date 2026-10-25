import { useEffect, useRef } from "react";
import { useT } from "../i18n";
import { useConfirmStore } from "../state/confirm";

export function ConfirmDialog() {
  const t = useT();
  const request = useConfirmStore((state) => state.request);
  const settle = useConfirmStore((state) => state.settle);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!request) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        settle(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [request, settle]);

  if (!request) return null;

  return (
    <div className="modal-backdrop" onMouseDown={() => settle(false)}>
      <div
        className="modal confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="confirm-title">{request.title ?? t("confirm.title")}</h2>
        </div>

        <div className="modal-body confirm-body">
          <p id="confirm-message">{request.message}</p>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={() => settle(false)}>
            {request.cancelLabel ?? t("actions.cancel")}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${request.danger ? "danger-solid" : "primary"}`}
            onClick={() => settle(true)}
          >
            {request.confirmLabel ?? t("actions.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
