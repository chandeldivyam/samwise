pub mod models;
pub mod schema;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::api::path::app_data_dir;
use anyhow::Result;
use tauri::AppHandle;
use std::fs;

pub struct AppState {
    pub db: Mutex<Connection>,
}

impl AppState {
    pub fn new(handle: &AppHandle) -> Result<Self> {
        let data_dir = app_data_dir(&handle.config())
            .ok_or(anyhow::anyhow!("Failed to get app config directory"))?;
        fs::create_dir_all(&data_dir)?;
        
        let db_path = data_dir.join("opensam.db");

        let conn = Connection::open(db_path)?;
        schema::initialize_database(&conn)?;
        Ok(Self {
            db: Mutex::new(conn),
        })
    }
}
