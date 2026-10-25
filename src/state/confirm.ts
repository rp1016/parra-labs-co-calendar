import { create } from "zustand";

export type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmRequest = ConfirmOptions & {
  message: string;
  resolve: (value: boolean) => void;
};

type ConfirmState = {
  request: ConfirmRequest | null;
  open: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  settle: (value: boolean) => void;
};

/**
 * Tiny promise-based replacement for `window.confirm`, which never settles in
 * Tauri's WebView2 on Windows and is inconsistent across Linux webviews.
 */
export const useConfirmStore = create<ConfirmState>((set, get) => ({
  request: null,
  open: (message, options = {}) =>
    new Promise<boolean>((resolve) => {
      get().request?.resolve(false);
      set({ request: { ...options, message, resolve } });
    }),
  settle: (value) => {
    const pending = get().request;
    set({ request: null });
    pending?.resolve(value);
  },
}));

export function confirmAction(message: string, options?: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().open(message, options);
}
