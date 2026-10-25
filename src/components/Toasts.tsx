import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useAppStore } from "../state/store";

export function Toasts() {
  const toasts = useAppStore((state) => state.toasts);
  const dismiss = useAppStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.kind}`} onClick={() => dismiss(toast.id)}>
          {toast.kind === "success" ? (
            <CheckCircle2 size={15} />
          ) : toast.kind === "error" ? (
            <AlertCircle size={15} />
          ) : (
            <Info size={15} />
          )}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
