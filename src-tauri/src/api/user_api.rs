use crate::db::AppState;
use crate::db::models::user::User;
use crate::services::user_service;
use tauri::State;

#[tauri::command]
pub async fn create_user(state: State<'_, AppState>, user: User) -> Result<i64, String> {
    user_service::create_user(&state, &user).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_user(state: State<'_, AppState>, id: i64) -> Result<User, String> {
    user_service::get_user(&state, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_user(state: State<'_, AppState>, user: User) -> Result<(), String> {
    user_service::update_user(&state, &user).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_user(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    user_service::delete_user(&state, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_user_by_name(state: State<'_, AppState>, name: &str) -> Result<User, String> {
    user_service::get_user_by_name(&state, name).map_err(|e| e.to_string())
}