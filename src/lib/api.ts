import type { AppData } from "./types";

const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
export const isDesktop = inTauri;

const WEB_KEY = "parrita-calendar:data";

export async function loadData(): Promise<AppData | null> {
  if (!inTauri) {
    const raw = localStorage.getItem(WEB_KEY);
    return raw ? (JSON.parse(raw) as AppData) : null;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  const raw = await invoke<string | null>("load_data");
  return raw ? (JSON.parse(raw) as AppData) : null;
}

export async function saveData(data: AppData): Promise<void> {
  if (!inTauri) {
    localStorage.setItem(WEB_KEY, JSON.stringify(data));
    return;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("save_data", { contents: JSON.stringify(data) });
}

export async function dataFilePath(): Promise<string> {
  if (!inTauri) return "localStorage (vista web)";
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("data_location");
}

export async function revealDataFile(): Promise<void> {
  if (!inTauri) return;
  const path = await dataFilePath();
  await revealPath(path);
}

export async function revealPath(path: string): Promise<void> {
  if (!inTauri) return;
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
  await revealItemInDir(path);
}

/** Opens a folder (or file) with the system default handler. */
export async function openPath(path: string): Promise<void> {
  if (!inTauri) return;
  const { openPath: open } = await import("@tauri-apps/plugin-opener");
  await open(path);
}

/** Writes a rotating local snapshot. Returns the file path, or null on the web. */
export async function autoBackup(contents: string): Promise<string | null> {
  if (!inTauri) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("auto_backup", { contents });
}

/** Folder that holds the rotating snapshots. */
export async function autoBackupPath(): Promise<string | null> {
  if (!inTauri) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("backup_location");
}

function download(name: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Writes a caller-chosen file. Returns false when the user cancels. */
export async function saveTextFile(
  suggestedName: string,
  contents: string,
  filterName: string,
  extensions: string[],
  mime = "text/plain",
): Promise<boolean> {
  if (!inTauri) {
    download(suggestedName, contents, mime);
    return true;
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({
    defaultPath: suggestedName,
    filters: [{ name: filterName, extensions }],
  });
  if (!path) return false;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("write_text_file", { path, contents });
  return true;
}

export async function openTextFile(filterName: string, extensions: string[]): Promise<string | null> {
  if (!inTauri) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = extensions.map((extension) => `.${extension}`).join(",");
      input.onchange = async () => {
        const file = input.files?.[0];
        resolve(file ? await file.text() : null);
      };
      input.click();
    });
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const path = await open({
    multiple: false,
    directory: false,
    filters: [{ name: filterName, extensions }],
  });
  if (!path || Array.isArray(path)) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("read_text_file", { path });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!inTauri) {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
  }
  const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
  if (await isPermissionGranted()) return true;
  return (await requestPermission()) === "granted";
}

export async function notify(title: string, body: string): Promise<void> {
  if (!inTauri) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
    return;
  }
  const { sendNotification } = await import("@tauri-apps/plugin-notification");
  sendNotification({ title, body });
}
