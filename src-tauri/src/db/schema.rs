use rusqlite::Connection;

pub fn initialize_database(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            name TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS recordings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            transcription TEXT,
            summary TEXT,
            action_items TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            value TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )",
        [],
    )?;

    let mut version: i32 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    while version < LATEST_VERSION {
        version += 1;
        match version {
            1 => migration_v1(conn)?,
            _ => panic!("Unknown migration version"),
        }
        conn.execute(format!("PRAGMA user_version = {}", version).as_str(), [])?;
    }

    Ok(())
}

const LATEST_VERSION: i32 = 1;

fn migration_v1(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "ALTER TABLE recordings ADD COLUMN file_path TEXT",
        [],
    )?;
    Ok(())
}
