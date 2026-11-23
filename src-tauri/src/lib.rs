use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;

fn resolve_save_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app_data_dir: {e}"))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create app_data_dir {}: {e}", dir.display()))?;
    Ok(dir)
}

fn read_validated_json(path: &PathBuf) -> Option<String> {
    let raw = fs::read_to_string(path).ok()?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    let parsed: serde_json::Value = serde_json::from_str(trimmed).ok()?;
    if !parsed.is_object() {
        return None;
    }
    Some(trimmed.to_string())
}

#[tauri::command]
fn load_profile_backup(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let dir = resolve_save_dir(&app)?;
    let primary = dir.join("save.json");
    if let Some(valid) = read_validated_json(&primary) {
        return Ok(Some(valid));
    }
    let backup = dir.join("save.bak.json");
    if let Some(valid) = read_validated_json(&backup) {
        // Restore primary from intact backup
        let _ = fs::copy(&backup, &primary);
        return Ok(Some(valid));
    }
    Ok(None)
}

#[tauri::command]
fn save_profile_backup(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let trimmed = json.trim();
    if trimmed.is_empty() {
        return Err("Refusing to write empty profile JSON".to_string());
    }
    let parsed: serde_json::Value =
        serde_json::from_str(trimmed).map_err(|e| format!("Invalid profile JSON: {e}"))?;
    if !parsed.is_object() {
        return Err("Profile JSON root must be an object".to_string());
    }

    let dir = resolve_save_dir(&app)?;
    let tmp_path = dir.join("save.tmp");
    let bak_path = dir.join("save.bak.json");
    let save_path = dir.join("save.json");

    {
        let mut file = fs::File::create(&tmp_path)
            .map_err(|e| format!("Failed to create {}: {e}", tmp_path.display()))?;
        file.write_all(trimmed.as_bytes())
            .map_err(|e| format!("Failed to write {}: {e}", tmp_path.display()))?;
        file.sync_all()
            .map_err(|e| format!("Failed to fsync {}: {e}", tmp_path.display()))?;
    }

    // Preserve previous valid save.json into save.bak.json before atomic replacement
    if save_path.exists() && read_validated_json(&save_path).is_some() {
        let _ = fs::copy(&save_path, &bak_path);
    }

    if let Err(_rename_err) = fs::rename(&tmp_path, &save_path) {
        let _ = fs::remove_file(&save_path);
        fs::rename(&tmp_path, &save_path)
            .map_err(|e| format!("Failed to replace {}: {e}", save_path.display()))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_process::init());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            load_profile_backup,
            save_profile_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running ChUno desktop application");
}
