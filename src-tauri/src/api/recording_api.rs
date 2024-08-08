use crate::db::AppState;
use crate::db::models::recording::Recording;
use crate::services::recording_service;
use tauri::State;
use serde_json::Value;

// #[tauri::command]
// pub async fn create_recording_from_json(state: State<'_, AppState>, recording: serde_json::Value) -> Result<i64, String> {
//     recording_service::create_recording_from_json(&state, &recording).map_err(|e| e.to_string())
// }

#[tauri::command]
pub async fn get_recording(state: State<'_, AppState>, id: i64) -> Result<Recording, String> {
    recording_service::get_recording(&state, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_recording(state: State<'_, AppState>, id: i64, updates: Value) -> Result<(), String> {
    recording_service::update_recording(&state, id, &updates).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_recordings(state: State<'_, AppState>, user_id: i64) -> Result<Vec<Recording>, String> {
    recording_service::get_all_recordings(&state, user_id).map_err(|e| e.to_string())
}