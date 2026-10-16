use base64::{engine::general_purpose::STANDARD, Engine};
use desktop_core::{com_init, monitors, Desktop, Monitor};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

/// Shell COM objects must live on an STA thread; give each call a fresh one.
fn shell<T, E, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    E: std::fmt::Display,
    F: FnOnce(&Desktop) -> Result<T, E> + Send + 'static,
{
    std::thread::spawn(move || {
        com_init();
        let d = Desktop::open().map_err(|e| format!("No se pudo acceder al escritorio: {e}"))?;
        f(&d).map_err(|e| e.to_string())
    })
    .join()
    .map_err(|_| "Fallo inesperado en el hilo del escritorio".to_string())?
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IconOut {
    id: String,
    name: String,
    x: i32,
    y: i32,
    image: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopState {
    icons: Vec<IconOut>,
    icon_size: i32,
    cell_width: i32,
    cell_height: i32,
    auto_arrange: bool,
    snap_to_grid: bool,
}

#[derive(Serialize, Deserialize, Clone)]
struct Move {
    id: String,
    x: i32,
    y: i32,
}

fn snapshot_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("original-layout.json"))
}

#[tauri::command]
fn get_monitors() -> Vec<Monitor> {
    monitors()
}

#[tauri::command]
async fn get_desktop() -> Result<DesktopState, String> {
    shell(|d| -> Result<DesktopState, desktop_core::Error> {
        let icon_size = d.icon_size()?;
        let icons = d.icons()?;
        let pngs = d.icon_pngs(icon_size)?;
        let (cell_width, cell_height) = d.spacing()?;
        let (auto_arrange, snap_to_grid) = d.flags()?;
        let icons = icons
            .into_iter()
            .zip(pngs)
            .map(|(i, png)| IconOut {
                id: i.id,
                name: i.name,
                x: i.x,
                y: i.y,
                image: format!("data:image/png;base64,{}", STANDARD.encode(png)),
            })
            .collect();
        Ok(DesktopState { icons, icon_size, cell_width, cell_height, auto_arrange, snap_to_grid })
    })
}

/// Moves icons on the real desktop. The first call saves the original layout
/// so `restore_layout` can undo everything, even after the app restarts.
#[tauri::command]
async fn apply_layout(app: tauri::AppHandle, moves: Vec<Move>) -> Result<(), String> {
    let snap = snapshot_path(&app)?;
    let moves: Vec<_> = moves.into_iter().map(|m| (m.id, m.x, m.y)).collect();
    shell(move |d| -> Result<(), String> {
        if !snap.exists() {
            let original: Vec<Move> = d
                .icons()
                .map_err(|e| e.to_string())?
                .into_iter()
                .map(|i| Move { id: i.id, x: i.x, y: i.y })
                .collect();
            let json = serde_json::to_string_pretty(&original).map_err(|e| e.to_string())?;
            std::fs::write(&snap, json).map_err(|e| e.to_string())?;
        }
        d.move_icons(&moves).map_err(|e| e.to_string())
    })
}

#[tauri::command]
async fn restore_layout(app: tauri::AppHandle) -> Result<(), String> {
    let snap = snapshot_path(&app)?;
    let json = std::fs::read_to_string(&snap).map_err(|_| "No hay disposición original guardada".to_string())?;
    let original: Vec<Move> = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    let moves: Vec<_> = original.into_iter().map(|m| (m.id, m.x, m.y)).collect();
    shell(move |d| d.move_icons(&moves))?;
    std::fs::remove_file(&snap).map_err(|e| e.to_string())
}

#[tauri::command]
fn has_snapshot(app: tauri::AppHandle) -> bool {
    snapshot_path(&app).is_ok_and(|p| p.exists())
}

#[tauri::command]
async fn set_flags(auto_arrange: bool, snap_to_grid: bool) -> Result<(), String> {
    shell(move |d| d.set_flags(auto_arrange, snap_to_grid))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_monitors,
            get_desktop,
            apply_layout,
            restore_layout,
            has_snapshot,
            set_flags
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
