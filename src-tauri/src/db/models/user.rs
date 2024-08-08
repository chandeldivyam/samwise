use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: Option<i64>,
    pub created_at: Option<String>,
    pub name: String,
}