//! CalendarPRO desktop shell.
//!
//! The UI owns the whole data model; Rust only stores one JSON document in the
//! per-user app data directory and reads/writes the files the user picks in a
//! dialog. Nothing here talks to the network.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, Rect, RunEvent, WebviewUrl,
    WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

const MAIN_WINDOW: &str = "main";
const MINI_WINDOW: &str = "mini";
const MINI_WIDTH: f64 = 340.0;
const MINI_HEIGHT: f64 = 470.0;
const TRAY_NOTICE_FILE: &str = "tray-notice-shown";

/// When the mini calendar last lost focus. Clicking the tray icon blurs the
/// popup before the click event arrives, so without this the same click would
/// hide it and immediately show it again.
static MINI_HIDDEN_AT: Mutex<Option<Instant>> = Mutex::new(None);

/// Files bigger than this are refused instead of being loaded into memory.
const MAX_READ_BYTES: u64 = 64 * 1024 * 1024;

/// Daily snapshots kept next to the main data file.
const AUTO_BACKUPS: usize = 14;

fn data_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("no app data directory: {error}"))?;
    fs::create_dir_all(&dir).map_err(|error| format!("cannot create {}: {error}", dir.display()))?;
    Ok(dir.join("calendar-data.json"))
}

fn backup_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("no app data directory: {error}"))?
        .join("backups");
    fs::create_dir_all(&dir).map_err(|error| format!("cannot create {}: {error}", dir.display()))?;
    Ok(dir)
}

fn today_number() -> Result<u64, String> {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("system clock is before 1970: {error}"))?
        .as_secs();
    Ok(seconds / 86_400)
}

/// Keeps the newest `keep` `calendar-<day>.json` files and removes the rest.
fn prune_backups(dir: &Path, keep: usize) -> Result<(), String> {
    let mut snapshots: Vec<(u64, PathBuf)> = Vec::new();
    for entry in fs::read_dir(dir).map_err(|error| format!("cannot list {}: {error}", dir.display()))? {
        let path = entry
            .map_err(|error| format!("cannot read backup entry: {error}"))?
            .path();
        let name = match path.file_name().and_then(|name| name.to_str()) {
            Some(name) => name,
            None => continue,
        };
        let day = match name
            .strip_prefix("calendar-")
            .and_then(|rest| rest.strip_suffix(".json"))
            .and_then(|day| day.parse::<u64>().ok())
        {
            Some(day) => day,
            None => continue,
        };
        snapshots.push((day, path));
    }

    snapshots.sort_by(|a, b| b.0.cmp(&a.0));
    for (_, path) in snapshots.into_iter().skip(keep) {
        let _ = fs::remove_file(path);
    }
    Ok(())
}

#[tauri::command]
fn auto_backup(app: AppHandle, contents: String) -> Result<String, String> {
    serde_json::from_str::<serde_json::Value>(&contents)
        .map_err(|error| format!("refusing to back up invalid data: {error}"))?;
    let dir = backup_dir(&app)?;
    let path = dir.join(format!("calendar-{}.json", today_number()?));
    // The first launch of the day captures the previous session's state, so a
    // later launch on the same day must not overwrite it.
    if !path.exists() {
        fs::write(&path, contents)
            .map_err(|error| format!("cannot write {}: {error}", path.display()))?;
    }
    prune_backups(&dir, AUTO_BACKUPS)?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn backup_location(app: AppHandle) -> Result<String, String> {
    Ok(backup_dir(&app)?.display().to_string())
}

/// Reads the JSON document, falling back to the previous good copy when the
/// main file is missing or corrupt.
fn read_data_file(path: &Path) -> Result<Option<String>, String> {
    let backup = path.with_extension("json.bak");
    let mut first_error: Option<String> = None;

    for candidate in [path, backup.as_path()] {
        let text = match fs::read_to_string(candidate) {
            Ok(text) => text,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(error) => {
                first_error
                    .get_or_insert_with(|| format!("cannot read {}: {error}", candidate.display()));
                continue;
            }
        };
        if text.trim().is_empty() {
            continue;
        }
        match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(_) => return Ok(Some(text)),
            Err(error) => {
                first_error.get_or_insert_with(|| {
                    format!("invalid data in {}: {error}", candidate.display())
                });
            }
        }
    }

    match first_error {
        Some(error) => Err(error),
        None => Ok(None),
    }
}

/// Writes to a temp file first and keeps the previous document as `.bak`, so a
/// crash mid-save cannot leave the app without readable data.
fn write_atomic(path: &Path, contents: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "data path has no parent directory".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("cannot create {}: {error}", parent.display()))?;

    let temp = path.with_extension("json.tmp");
    {
        let mut file = fs::File::create(&temp)
            .map_err(|error| format!("cannot create {}: {error}", temp.display()))?;
        file.write_all(contents.as_bytes())
            .map_err(|error| format!("cannot write {}: {error}", temp.display()))?;
        file.sync_all()
            .map_err(|error| format!("cannot flush {}: {error}", temp.display()))?;
    }

    if path.exists() {
        let backup = path.with_extension("json.bak");
        let _ = fs::copy(path, backup);
        #[cfg(windows)]
        fs::remove_file(path).map_err(|error| format!("cannot replace {}: {error}", path.display()))?;
    }

    fs::rename(&temp, path).map_err(|error| format!("cannot save {}: {error}", path.display()))
}

#[tauri::command]
fn load_data(app: AppHandle) -> Result<Option<String>, String> {
    read_data_file(&data_file(&app)?)
}

#[tauri::command]
fn save_data(app: AppHandle, contents: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&contents)
        .map_err(|error| format!("refusing to save invalid data: {error}"))?;
    write_atomic(&data_file(&app)?, &contents)
}

#[tauri::command]
fn data_location(app: AppHandle) -> Result<String, String> {
    Ok(data_file(&app)?.display().to_string())
}

/// Writes a file the user chose in a native save dialog (export).
#[tauri::command]
fn write_text_file(path: PathBuf, contents: String) -> Result<(), String> {
    if path.is_dir() {
        return Err("the selected path is a directory".to_string());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("cannot create {}: {error}", parent.display()))?;
    }
    fs::write(&path, contents).map_err(|error| format!("cannot write {}: {error}", path.display()))
}

/// Reads a backup the user chose in a native open dialog.
#[tauri::command]
fn read_text_file(path: PathBuf) -> Result<String, String> {
    let metadata =
        fs::metadata(&path).map_err(|error| format!("cannot read {}: {error}", path.display()))?;
    if metadata.len() > MAX_READ_BYTES {
        return Err(format!(
            "{} is larger than the {} MB import limit",
            path.display(),
            MAX_READ_BYTES / (1024 * 1024)
        ));
    }
    fs::read_to_string(&path).map_err(|error| format!("cannot read {}: {error}", path.display()))
}

/// Texts of the tray menu and the first-close notice, in the saved UI language.
struct TrayTexts {
    open_app: &'static str,
    mini: &'static str,
    quit: &'static str,
    tooltip: &'static str,
    notice_title: &'static str,
    notice_body: &'static str,
}

fn tray_texts(app: &AppHandle) -> TrayTexts {
    let english = data_file(app)
        .ok()
        .and_then(|path| read_data_file(&path).ok().flatten())
        .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok())
        .map(|value| value["settings"]["language"] == "en")
        .unwrap_or(false);

    if english {
        TrayTexts {
            open_app: "Open CalendarPRO",
            mini: "Mini calendar",
            quit: "Quit CalendarPRO",
            tooltip: "CalendarPRO",
            notice_title: "CalendarPRO keeps running",
            notice_body: "Closing the window does not quit the app: it keeps running in the \
                system tray so your reminders still arrive.\n\nClick the tray icon for a mini \
                calendar, or right-click it and choose \"Quit CalendarPRO\" to close it for good.",
        }
    } else {
        TrayTexts {
            open_app: "Abrir CalendarPRO",
            mini: "Mini calendario",
            quit: "Salir de CalendarPRO",
            tooltip: "CalendarPRO",
            notice_title: "CalendarPRO sigue activo",
            notice_body: "Al cerrar la ventana la app no se cierra: sigue activa en la bandeja \
                del sistema para que tus recordatorios lleguen.\n\nHaz clic en el icono de la \
                bandeja para ver un mini calendario, o clic derecho y \"Salir de CalendarPRO\" \
                para cerrarla definitivamente.",
        }
    }
}

fn show_main(app: &AppHandle) {
    if let Some(mini) = app.get_webview_window(MINI_WINDOW) {
        let _ = mini.hide();
    }
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Tells the UI to save right now, then exits. The fallback thread exits anyway
/// if the UI never answers, so "Quit" can never hang.
fn request_quit(app: &AppHandle) {
    if app.get_webview_window(MAIN_WINDOW).is_some()
        && app.emit_to(MAIN_WINDOW, "quit-requested", ()).is_ok()
    {
        let handle = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(2000));
            handle.exit(0);
        });
    } else {
        app.exit(0);
    }
}

#[tauri::command]
fn open_main(app: AppHandle) {
    show_main(&app);
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// Shows the mini calendar next to the tray icon, or hides it if it is open.
fn toggle_mini(app: &AppHandle, tray: Rect) {
    let Some(window) = app.get_webview_window(MINI_WINDOW) else {
        return;
    };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
        return;
    }
    let recently_hidden = MINI_HIDDEN_AT
        .lock()
        .ok()
        .and_then(|guard| *guard)
        .map(|at| at.elapsed() < Duration::from_millis(300))
        .unwrap_or(false);
    if recently_hidden {
        return;
    }

    let scale = window.scale_factor().unwrap_or(1.0);
    let icon_pos = tray.position.to_physical::<f64>(scale);
    let icon_size = tray.size.to_physical::<f64>(scale);
    let width = MINI_WIDTH * scale;
    let height = MINI_HEIGHT * scale;
    let gap = 8.0 * scale;

    let (mx, my, mw, mh) = app
        .monitor_from_point(icon_pos.x, icon_pos.y)
        .ok()
        .flatten()
        .or_else(|| window.current_monitor().ok().flatten())
        .map(|monitor| {
            let pos = monitor.position();
            let size = monitor.size();
            (pos.x as f64, pos.y as f64, size.width as f64, size.height as f64)
        })
        .unwrap_or((0.0, 0.0, 1920.0, 1080.0));

    let mut x = icon_pos.x + icon_size.width / 2.0 - width / 2.0;
    x = x.clamp(mx + gap, (mx + mw - width - gap).max(mx + gap));
    // A taskbar or menu bar in the lower half opens the popup upwards.
    let mut y = if icon_pos.y > my + mh / 2.0 {
        icon_pos.y - height - gap
    } else {
        icon_pos.y + icon_size.height + gap
    };
    y = y.clamp(my + gap, (my + mh - height - gap).max(my + gap));

    let _ = window.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
    let _ = window.show();
    let _ = window.set_focus();
}

fn show_mini_centered(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MINI_WINDOW) {
        let _ = window.center();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let texts = tray_texts(app);

    WebviewWindowBuilder::new(app, MINI_WINDOW, WebviewUrl::App("index.html?mini=1".into()))
        .title("CalendarPRO")
        .inner_size(MINI_WIDTH, MINI_HEIGHT)
        .decorations(false)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .skip_taskbar(true)
        .always_on_top(true)
        .visible(false)
        .shadow(true)
        .build()?;

    let open = MenuItem::with_id(app, "open", texts.open_app, true, None::<&str>)?;
    let mini = MenuItem::with_id(app, "mini", texts.mini, true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", texts.quit, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &mini, &separator, &quit])?;

    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip(texts.tooltip)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "mini" => show_mini_centered(app),
            "quit" => request_quit(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
            {
                toggle_mini(tray.app_handle(), rect);
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

/// First time the main window is closed, explains that the app stays in the tray.
fn announce_tray_once(app: &AppHandle) {
    let Ok(marker) = data_file(app).map(|path| path.with_file_name(TRAY_NOTICE_FILE)) else {
        return;
    };
    if marker.exists() {
        return;
    }
    let _ = fs::write(&marker, "1");
    let texts = tray_texts(app);
    app.dialog()
        .message(texts.notice_body)
        .title(texts.notice_title)
        .kind(MessageDialogKind::Info)
        .show(|_| {});
}

fn on_window_event(window: &tauri::Window, event: &WindowEvent) {
    match event {
        // Closing the main window keeps the app (and its reminders) alive.
        WindowEvent::CloseRequested { api, .. } if window.label() == MAIN_WINDOW => {
            api.prevent_close();
            let _ = window.hide();
            announce_tray_once(window.app_handle());
        }
        WindowEvent::Focused(false) if window.label() == MINI_WINDOW => {
            let _ = window.hide();
            if let Ok(mut guard) = MINI_HIDDEN_AT.lock() {
                *guard = Some(Instant::now());
            }
        }
        _ => {}
    }
}

fn on_run_event(app: &AppHandle, event: &RunEvent) {
    // Clicking the Dock icon of a hidden app brings the main window back.
    #[cfg(target_os = "macos")]
    if let RunEvent::Reopen { .. } = event {
        show_main(app);
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (app, event);
}

pub fn run() {
    tauri::Builder::default()
        // Must be first: a second launch focuses the running window instead of
        // opening a second writer on the same data file.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            setup_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(on_window_event)
        .invoke_handler(tauri::generate_handler![
            open_main,
            quit_app,
            load_data,
            save_data,
            data_location,
            write_text_file,
            read_text_file,
            auto_backup,
            backup_location
        ])
        .build(tauri::generate_context!())
        .expect("error while building CalendarPRO")
        .run(|app, event| on_run_event(app, &event));
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir() -> PathBuf {
        std::env::temp_dir().join(format!("parrita-calendar-rust-{}", std::process::id()))
    }

    #[test]
    fn round_trips_and_keeps_the_previous_copy() {
        let dir = temp_dir().join("round-trip");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("calendar-data.json");

        write_atomic(&path, r#"{"version":1}"#).unwrap();
        assert_eq!(read_data_file(&path).unwrap().as_deref(), Some(r#"{"version":1}"#));

        write_atomic(&path, r#"{"version":2}"#).unwrap();
        assert_eq!(read_data_file(&path).unwrap().as_deref(), Some(r#"{"version":2}"#));
        assert!(path.with_extension("json.bak").exists());

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn falls_back_to_the_backup_when_the_main_file_is_corrupt() {
        let dir = temp_dir().join("fallback");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("calendar-data.json");

        write_atomic(&path, r#"{"version":1}"#).unwrap();
        write_atomic(&path, r#"{"version":2}"#).unwrap();
        fs::write(&path, "{ not json").unwrap();

        // The last good document before the corrupt one is the .bak copy.
        assert_eq!(read_data_file(&path).unwrap().as_deref(), Some(r#"{"version":1}"#));

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn returns_none_without_any_document() {
        let path = temp_dir().join("missing").join("calendar-data.json");
        assert_eq!(read_data_file(&path).unwrap(), None);
    }

    #[test]
    fn keeps_only_the_newest_automatic_snapshots() {
        let dir = temp_dir().join("backups");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        for day in 1..=20 {
            fs::write(dir.join(format!("calendar-{day}.json")), "{}").unwrap();
        }
        fs::write(dir.join("calendar-data.json.bak"), "{}").unwrap();

        prune_backups(&dir, AUTO_BACKUPS).unwrap();

        let remaining = fs::read_dir(&dir).unwrap().count();
        assert_eq!(remaining, AUTO_BACKUPS + 1);
        assert!(!dir.join("calendar-6.json").exists());
        assert!(dir.join("calendar-20.json").exists());
        assert!(dir.join("calendar-data.json.bak").exists());

        let _ = fs::remove_dir_all(&dir);
    }
}
