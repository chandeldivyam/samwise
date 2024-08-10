pub mod models;
pub mod schema;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::api::path::app_data_dir;
use anyhow::Result;
use tauri::AppHandle;
use std::fs;

use crate::audio_processor::audio_recorder::AudioRecorder;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub recorder: Mutex<AudioRecorder>,
}

unsafe impl Send for AppState {}
unsafe impl Sync for AppState {}

impl AppState {
    pub fn new(handle: &AppHandle) -> Result<Self> {
        let data_dir = app_data_dir(&handle.config())
            .ok_or(anyhow::anyhow!("Failed to get app config directory"))?;
        fs::create_dir_all(&data_dir)?;
        
        let db_path = data_dir.join("opensam.db");

        let conn = Connection::open(db_path)?;
        schema::initialize_database(&conn)?;

        let recorder = AudioRecorder::new()?;
        Ok(Self {
            db: Mutex::new(conn),
            recorder: Mutex::new(recorder),
        })
    }
}
