use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_recording_table",
            sql: "CREATE TABLE recording (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name VARCHAR(255) NOT NULL,
				name TEXT NOT NULL,
                directory TEXT NOT NULL,
				status VARCHAR(55) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_recording_insights_table",
            sql: "CREATE TABLE recording_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recording_id INTEGER NOT NULL,
                transcription TEXT,
                summary TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (recording_id) REFERENCES recording(id)
            );",
            kind: MigrationKind::Up,
        },
    ]
}
