use crate::db::models::setting::Setting;
use crate::db::AppState;
use rusqlite::{params, Result};

pub fn create_setting(state: &AppState, setting: &Setting) -> Result<i64> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO settings (user_id, type, value) VALUES (?1, ?2, ?3)",
        params![setting.user_id, setting.setting_type, setting.value],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_setting(state: &AppState, id: i64) -> Result<Setting> {
    let conn = state.db.lock().unwrap();
    conn.query_row(
        "SELECT id, user_id, type, value FROM settings WHERE id = ?1",
        params![id],
        |row| {
            Ok(Setting {
                id: Some(row.get(0)?),
                user_id: row.get(1)?,
                setting_type: row.get(2)?,
                value: row.get(3)?,
            })
        },
    )
}

pub fn update_setting(state: &AppState, setting: &Setting) -> Result<()> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "UPDATE settings SET type = ?1, value = ?2 WHERE id = ?3",
        params![setting.setting_type, setting.value, setting.user_id],
    )?;
    Ok(())
}

pub fn delete_setting(state: &AppState, id: i64) -> Result<()> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM settings WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_all_settings(state: &AppState, user_id: i64) -> Result<Vec<Setting>> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, user_id, type, value FROM settings WHERE user_id = ?1")?;
    let settings_iter = stmt.query_map(params![user_id], |row| {
        Ok(Setting {
            id: Some(row.get(0)?),
            user_id: row.get(1)?,
            setting_type: row.get(2)?,
            value: row.get(3)?,
        })
    })?;

    settings_iter.collect()
}