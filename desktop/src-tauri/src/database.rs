use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_recording_table",
            sql: "CREATE TABLE recording (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name VARCHAR(255) NOT NULL UNIQUE,
				pretty_name TEXT,
				name TEXT NOT NULL,
                file_path TEXT NOT NULL,
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
                file_name VARCHAR(255) NOT NULL,
                transcription TEXT,
                summary TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (file_name) REFERENCES recording(file_name)
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description:
                "ALTER TABLE recording_insights to add summary prompt as a recording property so that it doesn't get lost",
            sql: "ALTER TABLE recording_insights ADD COLUMN summary_prompt TEXT;",
            kind: MigrationKind::Up,
        },
    ]
}
