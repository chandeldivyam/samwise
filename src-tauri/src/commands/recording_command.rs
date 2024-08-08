use crate::db::AppState;
use crate::services::recording_service;
use tauri::{Manager, State};
use std::{thread, time::Duration};

#[tauri::command]
pub async fn create_recording(app_handle: tauri::AppHandle, recording: serde_json::Value) -> Result<i64, String> {
    let state: State<AppState> = app_handle.state();

    // Create the recording in the database
    let recording_id = recording_service::create_recording_from_json(&state, &recording).map_err(|e| e.to_string())?;

    // Automatically start recording
    start_recording(app_handle.clone(), recording_id).await?;

    Ok(recording_id)
}

// Add these new functions
#[tauri::command]
pub async fn process_recording(app_handle: tauri::AppHandle, id: i64) -> Result<(), String> {
    let state: State<AppState> = app_handle.state();
    
    // Simulate processing
    thread::sleep(Duration::from_secs(2));
    
    stop_recording(app_handle.clone(), id).await?;
    
    // Update recording status
    recording_service::update_recording(&state, id, &serde_json::json!({"status": "Processing_completed"}))
        .map_err(|e| e.to_string())?;

    // Emit event to frontend
    app_handle.emit_all("recording_processed", id).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn transcribe_recording(app_handle: tauri::AppHandle, id: i64) -> Result<(), String> {
    let state: State<AppState> = app_handle.state();
    
    // Update recording status
    recording_service::update_recording(&state, id, &serde_json::json!({"status": "Transcribing"}))
        .map_err(|e| e.to_string())?;

    // Simulate transcription
    thread::sleep(Duration::from_secs(5));

    // Update recording with transcription results
    let updates = serde_json::json!({
        "status": "Completed",
        "transcription": "This is a simulated transcription...",
        "summary": "This is a simulated summary...",
        "action_items": "These are simulated action items..."
    });
    recording_service::update_recording(&state, id, &updates)
        .map_err(|e| e.to_string())?;

    // Emit event to frontend
    app_handle.emit_all("transcription_completed", id).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub async fn start_recording(app_handle: tauri::AppHandle, id: i64) -> Result<(), String> {
    let state: State<AppState> = app_handle.state();

    // Update recording status to 'Recording'
    recording_service::update_recording(&state, id, &serde_json::json!({"status": "Recording"}))
        .map_err(|e| e.to_string())?;

    // Emit event to frontend
    app_handle.emit_all("recording_started", id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn stop_recording(app_handle: tauri::AppHandle, id: i64) -> Result<(), String> {
    let state: State<AppState> = app_handle.state();

    // Update recording status to 'Processing'
    recording_service::update_recording(&state, id, &serde_json::json!({"status": "Processing"}))
        .map_err(|e| e.to_string())?;

    // Emit event to frontend
    app_handle.emit_all("recording_stopped", id).map_err(|e| e.to_string())?;

    Ok(())
}
