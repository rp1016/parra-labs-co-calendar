//! CalendarPRO desktop shell.
//!
//! The UI owns the whole data model; Rust only stores one JSON document in the
//! per-user app data directory and reads/writes the files the user picks in a
//! dialog. Nothing here talks to the network.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager};

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

pub fn run() {
    tauri::Builder::default()
        // Must be first: a second launch focuses the running window instead of
        // opening a second writer on the same data file.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            data_location,
            write_text_file,
            read_text_file,
            auto_backup,
            backup_location
        ])
        .run(tauri::generate_context!())
        .expect("error while running CalendarPRO");
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
