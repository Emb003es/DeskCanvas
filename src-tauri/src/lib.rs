use base64::{Engine, engine::general_purpose::STANDARD};
use desktop_core::{Desktop, Monitor, capture, com_init, get_wallpaper, monitors, set_wallpaper};
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
        Ok(DesktopState {
            icons,
            icon_size,
            cell_width,
            cell_height,
            auto_arrange,
            snap_to_grid,
        })
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
                .map(|i| Move {
                    id: i.id,
                    x: i.x,
                    y: i.y,
                })
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
    let json = std::fs::read_to_string(&snap)
        .map_err(|_| "No hay disposición original guardada".to_string())?;
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

fn decode(base64: &str) -> Result<Vec<u8>, String> {
    // Accept both raw base64 and data URLs.
    let raw = base64.split_once(",").map_or(base64, |(_, b)| b);
    STANDARD.decode(raw).map_err(|e| format!("Imagen no válida: {e}"))
}

/// Writes an exported image chosen by the user in the save dialog.
#[tauri::command]
async fn save_image(path: String, data: String) -> Result<(), String> {
    std::fs::write(&path, decode(&data)?).map_err(|e| format!("No se pudo guardar {path}: {e}"))
}

/// Saves the PNG under Pictures\DeskCanvas and sets it as the wallpaper of the monitor at (x, y).
/// Returns the path Windows reports afterwards, to confirm it took effect.
#[tauri::command]
async fn apply_wallpaper(app: tauri::AppHandle, x: i32, y: i32, data: String) -> Result<String, String> {
    // Pictures\DeskCanvas: user-visible, and never virtualized (packaged parents redirect AppData).
    let dir = app.path().picture_dir().map_err(|e| e.to_string())?.join("DeskCanvas");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let prefix = format!("wallpaper_{x}_{y}_");
    // A new file name each time makes Windows refresh instead of keeping a cached copy.
    for old in std::fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        if old.file_name().to_string_lossy().starts_with(&prefix) {
            let _ = std::fs::remove_file(old.path());
        }
    }
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_millis());
    let path = dir.join(format!("{prefix}{stamp}.png"));
    std::fs::write(&path, decode(&data)?).map_err(|e| e.to_string())?;
    let path = path.to_string_lossy().to_string();
    std::thread::spawn(move || {
        com_init();
        set_wallpaper(x, y, &path).map_err(|e| format!("Windows no aceptó el fondo: {e}"))?;
        get_wallpaper(x, y).map_err(|e| e.to_string())
    })
    .join()
    .map_err(|_| "Fallo inesperado al aplicar el fondo".to_string())?
}

#[derive(Deserialize)]
struct Asset {
    name: String,
    data: String,
}

#[derive(Serialize)]
struct LoadedProject {
    json: String,
    /// Asset file name -> data URL.
    assets: std::collections::HashMap<String, String>,
}

/// Asset names come from the page; only accept `<8 hex>.<ext>` so they cannot escape the folder.
fn valid_asset_name(name: &str) -> bool {
    let Some((stem, ext)) = name.split_once('.') else { return false };
    stem.len() == 8
        && stem.chars().all(|c| c.is_ascii_hexdigit())
        && ["png", "jpg", "webp", "gif", "svg", "bin"].contains(&ext)
}

const MIME: [(&str, &str); 6] = [
    ("png", "image/png"),
    ("jpg", "image/jpeg"),
    ("webp", "image/webp"),
    ("gif", "image/gif"),
    ("svg", "image/svg+xml"),
    ("bin", "application/octet-stream"),
];

/// Writes `<dir>/project.json` and `<dir>/assets/*`, removing assets no longer used.
#[tauri::command]
async fn save_project(dir: String, json: String, assets: Vec<Asset>) -> Result<(), String> {
    let dir = PathBuf::from(dir);
    let assets_dir = dir.join("assets");
    std::fs::create_dir_all(&assets_dir).map_err(|e| format!("No se pudo crear {}: {e}", dir.display()))?;
    let mut keep = std::collections::HashSet::new();
    for a in &assets {
        if !valid_asset_name(&a.name) {
            return Err(format!("Nombre de recurso no válido: {}", a.name));
        }
        keep.insert(a.name.clone());
        let path = assets_dir.join(&a.name);
        // Names are content hashes: an existing file already has these bytes.
        if !path.exists() {
            std::fs::write(&path, decode(&a.data)?).map_err(|e| e.to_string())?;
        }
    }
    // Write to a temp file first so a crash never leaves a half-written project.
    let tmp = dir.join("project.json.tmp");
    std::fs::write(&tmp, json).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, dir.join("project.json")).map_err(|e| e.to_string())?;
    for f in std::fs::read_dir(&assets_dir).map_err(|e| e.to_string())?.flatten() {
        let name = f.file_name().to_string_lossy().to_string();
        if valid_asset_name(&name) && !keep.contains(&name) {
            let _ = std::fs::remove_file(f.path());
        }
    }
    Ok(())
}

#[tauri::command]
async fn load_project(dir: String) -> Result<LoadedProject, String> {
    let dir = PathBuf::from(dir);
    let json = std::fs::read_to_string(dir.join("project.json"))
        .map_err(|_| "Esa carpeta no contiene un proyecto de DeskCanvas (falta project.json)".to_string())?;
    let mut assets = std::collections::HashMap::new();
    if let Ok(entries) = std::fs::read_dir(dir.join("assets")) {
        for f in entries.flatten() {
            let name = f.file_name().to_string_lossy().to_string();
            if !valid_asset_name(&name) {
                continue;
            }
            let ext = name.rsplit('.').next().unwrap_or("bin");
            let mime = MIME.iter().find(|(e, _)| *e == ext).map_or("application/octet-stream", |(_, m)| *m);
            let bytes = std::fs::read(f.path()).map_err(|e| e.to_string())?;
            assets.insert(name, format!("data:{mime};base64,{}", STANDARD.encode(bytes)));
        }
    }
    Ok(LoadedProject { json, assets })
}

/// Screenshot of a monitor area as a PNG data URL (for the capture guide).
#[tauri::command]
async fn capture_screen(x: i32, y: i32, width: i32, height: i32) -> Result<String, String> {
    let png = capture(x, y, width, height).map_err(|e| format!("No se pudo capturar la pantalla: {e}"))?;
    Ok(format!("data:image/png;base64,{}", STANDARD.encode(png)))
}

#[cfg(test)]
mod tests {
    #[test]
    fn asset_names_cannot_escape() {
        assert!(super::valid_asset_name("0a1b2c3d.png"));
        assert!(!super::valid_asset_name("../evil.png"));
        assert!(!super::valid_asset_name("0a1b2c3d.exe"));
        assert!(!super::valid_asset_name("0a1b2c3d/../x.png"));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_monitors,
            get_desktop,
            apply_layout,
            restore_layout,
            has_snapshot,
            set_flags,
            save_image,
            apply_wallpaper,
            save_project,
            load_project,
            capture_screen
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
