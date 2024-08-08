// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod services;
mod api;
mod utils;
mod commands;

use db::AppState;
use api::user_api::{create_user, get_user, update_user, delete_user, get_user_by_name};
use api::recording_api::{get_recording, get_all_recordings, update_recording};
use api::setting_api::{create_setting, get_setting, update_setting, delete_setting, get_all_settings};
use commands::recording_command::{create_recording, process_recording, transcribe_recording, stop_recording};

use tauri::Manager;

fn main() {

    tauri::Builder::default()
    .setup(|app| {
            let app_state = AppState::new(&app.handle()).expect("Failed to initialize app state");            
            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_user,
            get_user,
            update_user,
            delete_user,
            create_recording,
            get_recording,
            update_recording,
            create_setting,
            get_setting,
            update_setting,
            delete_setting,
            get_all_settings,
            get_user_by_name,
            get_all_recordings,
            transcribe_recording,
            process_recording,
            stop_recording,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
