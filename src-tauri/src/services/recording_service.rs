use crate::db::models::recording::Recording;
use crate::db::AppState;
use rusqlite::{params, Result};
use serde_json::Value;

pub fn create_recording_from_json(state: &AppState, recording: &Value) -> Result<i64> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO recordings (user_id, name, status, created_at, file_path) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            recording["user_id"].as_i64().unwrap(),
            recording["name"].as_str().unwrap(),
            recording["status"].as_str().unwrap(),
            recording["created_at"].as_str().unwrap(),
            recording["file_path"].as_str().unwrap()
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_recording(state: &AppState, id: i64) -> Result<Recording> {
    let conn = state.db.lock().unwrap();
    conn.query_row(
        "SELECT id, user_id, name, transcription, summary, action_items, status, created_at, file_path FROM recordings WHERE id = ?1",
        params![id],
        |row| {
            Ok(Recording {
                id: Some(row.get(0)?),
                user_id: row.get(1)?,
                name: row.get(2)?,
                transcription: row.get(3)?,
                summary: row.get(4)?,
                action_items: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
                file_path: row.get(8)?,
            })
        },
    )
}

pub fn update_recording(state: &AppState, id: i64, updates: &Value) -> Result<()> {
    let conn = state.db.lock().unwrap();
    let mut query = String::from("UPDATE recordings SET ");
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(name) = updates.get("name").and_then(Value::as_str) {
        query.push_str("name = ?, ");
        values.push(Box::new(name.to_string()));
    }

    if let Some(transcription) = updates.get("transcription").and_then(Value::as_str) {
        query.push_str("transcription = ?, ");
        values.push(Box::new(transcription.to_string()));
    }

    if let Some(summary) = updates.get("summary").and_then(Value::as_str) {
        query.push_str("summary = ?, ");
        values.push(Box::new(summary.to_string()));
    }

    if let Some(action_items) = updates.get("action_items").and_then(Value::as_str) {
        query.push_str("action_items = ?, ");
        values.push(Box::new(action_items.to_string()));
    }

    if let Some(status) = updates.get("status").and_then(Value::as_str) {
        query.push_str("status = ?, ");
        values.push(Box::new(status.to_string()));
    }

    if let Some(status) = updates.get("file_path").and_then(Value::as_str) {
        query.push_str("status = ?, ");
        values.push(Box::new(status.to_string()));
    }

    // Remove trailing comma and space
    if query.ends_with(", ") {
        query.truncate(query.len() - 2);
    }

    query.push_str(" WHERE id = ?");
    values.push(Box::new(id));

    let mut stmt = conn.prepare(&query)?;
    stmt.execute(rusqlite::params_from_iter(values.iter().map(|v| v.as_ref())))?;

    Ok(())
}

pub fn get_all_recordings(state: &AppState, user_id: i64) -> Result<Vec<Recording>> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, user_id, name, transcription, summary, action_items, status, created_at, file_path FROM recordings WHERE user_id = ?1")?;
    let recordings_iter = stmt.query_map(params![user_id], |row| {
        Ok(Recording {
            id: Some(row.get(0)?),
            user_id: row.get(1)?,
            name: row.get(2)?,
            transcription: row.get(3)?,
            summary: row.get(4)?,
            action_items: row.get(5)?,
            status: row.get(6)?,
            created_at: row.get(7)?,
            file_path: row.get(8)?,
        })
    })?;

    recordings_iter.collect()
}