use crate::db::AppState;
use crate::db::models::setting::Setting;
use crate::services::setting_service;
use tauri::State;

#[tauri::command]
pub async fn create_setting(state: State<'_, AppState>, setting: Setting) -> Result<i64, String> {
    setting_service::create_setting(&state, &setting).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_setting(state: State<'_, AppState>, id: i64) -> Result<Setting, String> {
    setting_service::get_setting(&state, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_setting(state: State<'_, AppState>, setting: Setting) -> Result<(), String> {
    setting_service::update_setting(&state, &setting).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_setting(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    setting_service::delete_setting(&state, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_settings(state: State<'_, AppState>, user_id: i64) -> Result<Vec<Setting>, String> {
    setting_service::get_all_settings(&state, user_id).map_err(|e| e.to_string())
}