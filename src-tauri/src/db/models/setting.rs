use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Setting {
    pub id: Option<i64>,
    pub user_id: i64,
    pub setting_type: String,
    pub value: String,
}