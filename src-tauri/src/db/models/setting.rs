use serde::{Deserialize, Serialize};
use rusqlite::{Result, Row};

impl Setting {
    pub fn from_row(row: &Row) -> Result<Setting> {
        // IMP: Ordering here is very important from what is there in database
        // TODO - Make this better
        Ok(Setting {
            id: row.get(0)?,
            user_id: row.get(1)?,
            setting_type: row.get(2)?,
            value: row.get(3)?,
            title: row.get(4)?,
        })
    }
}


#[derive(Debug, Serialize, Deserialize)]
pub struct Setting {
    pub id: Option<i64>,
    pub user_id: i64,
    pub setting_type: String,
    pub value: String,
    pub title: String,
}