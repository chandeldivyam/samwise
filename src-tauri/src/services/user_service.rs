use crate::db::models::user::User;
use crate::db::AppState;
use rusqlite::{params, Result};

pub fn create_user(state: &AppState, user: &User) -> Result<i64> {
    let conn = state.db.lock().unwrap();

    // Prepare the INSERT statement with RETURNING id
    let mut stmt = conn.prepare("INSERT INTO users (name) VALUES (?1) RETURNING id")?;
    
    // Execute the query and fetch the returned id
    let user_id: i64 = stmt.query_row(params![user.name], |row| row.get(0))?;

    Ok(user_id)
}

pub fn get_user(state: &AppState, id: i64) -> Result<User> {
    let conn = state.db.lock().unwrap();
    conn.query_row(
        "SELECT id, created_at, name FROM users WHERE id = ?1",
        params![id],
        |row| {
            Ok(User {
                id: Some(row.get(0)?),
                created_at: row.get(1)?,
                name: row.get(2)?,
            })
        },
    )
}

pub fn update_user(state: &AppState, user: &User) -> Result<()> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "UPDATE users SET name = ?1 WHERE id = ?2",
        params![user.name, user.id],
    )?;
    Ok(())
}

pub fn delete_user(state: &AppState, id: i64) -> Result<()> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM users WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_user_by_name(state: &AppState, name: &str) -> Result<User> {
    let conn = state.db.lock().unwrap();
    conn.query_row(
        "SELECT id, created_at, name FROM users WHERE name = ?1",
        params![name],
        |row| {
            Ok(User {
                id: Some(row.get(0)?),
                created_at: row.get(1)?,
                name: row.get(2)?,
            })
        }
    )
}