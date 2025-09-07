use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Serialize, Deserialize)]
pub(crate) struct IndexResponse {
    pub response: String,
}

#[derive(Serialize, Deserialize)]
pub(crate) enum TrashCategory {
    Hazardous,
    NonRecyclable,
    Recyclable,
    Organic,
}

#[derive(Deserialize, Serialize)]
pub(crate) struct ReportRequest {
    pub image: String, // base64 encoded string
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Deserialize, Serialize)]
pub(crate) struct ReportResponse {
    pub response: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Record {
    pub id: i64,
    pub created_at: DateTime<Utc>,
    pub latitude: f64,
    pub longitude: f64,
    pub description: String,
    pub score: i32,
    pub status: String,
}
