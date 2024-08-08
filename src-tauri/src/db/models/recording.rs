use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Recording {
    pub id: Option<i64>,
    pub user_id: i64,
    pub name: String,
    pub transcription: Option<String>,
    pub summary: Option<String>,
    pub action_items: Option<String>,
    pub status: String,
    pub created_at: String,
    pub file_path: Option<String>,
}
