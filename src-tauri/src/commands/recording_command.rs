use crate::db::AppState;
use crate::services::recording_service;
use tauri::{Manager, State};
use std::{thread, time::Duration};
use crate::audio_processor::audio_recorder::AudioRecorder;

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
pub async fn process_recording(app_handle: tauri::AppHandle, window: tauri::Window, id: i64) -> Result<(), String> {
    let state: State<AppState> = app_handle.state();
    
    recording_service::update_recording(&state, id, &serde_json::json!({"status": "Processing"}))
        .map_err(|e| e.to_string())?;

    let recording_info = recording_service::get_recording(&state, id).map_err(|e| e.to_string())?;
    let file_path = recording_info.file_path.clone();

    let mut recorder = state.recorder.lock().map_err(|e| e.to_string())?;
    recorder.stop_recording(&window, id, file_path).map_err(|e| e.to_string())?;
    // Emit event to frontend
    app_handle.emit_all("recording_stopped", id).map_err(|e| e.to_string())?;

    *recorder = AudioRecorder::new().map_err(|e| e.to_string())?;
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

    // Check if transcription is already available, if yes, we will not transcribe again
    let recording_info = recording_service::get_recording(&state, id).map_err(|e| e.to_string())?;
    let mut transcription = recording_info.transcription.clone();
    if transcription.as_deref().unwrap_or("").is_empty() {
        // Transcribe the recording
        transcription = Some("This is a simulated transcription...".to_string());
    }

    // Getting the transcript according to user defined settings


    // Storing the transcript to the database (better fallback mechanism if LLM fails)


    // Fetching summary and action items from LLM (later building intelligence with mixture of agents)


    // Update recording with insihts result
    let updates = serde_json::json!({
        "status": "Completed",
        "transcription": transcription,
        "summary": "This is a simulated summary...",
        "action_items": "These are simulated action items..."
    });
    recording_service::update_recording(&state, id, &updates)
        .map_err(|e| e.to_string())?;

    // Emit event to frontend for completion
    app_handle.emit_all("transcription_completed", id).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub async fn start_recording(app_handle: tauri::AppHandle, id: i64) -> Result<(), String> {
    let state: State<AppState> = app_handle.state();

    let result = state.recorder.lock().map_err(|e| e.to_string())?.start_recording().map_err(|e| e.to_string());

    // Update recording status to 'Recording'
    recording_service::update_recording(&state, id, &serde_json::json!({"status": "Recording"}))
        .map_err(|e| e.to_string())?;

    // Emit event to frontend
    app_handle.emit_all("recording_started", id).map_err(|e| e.to_string())?;

    return result;
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
