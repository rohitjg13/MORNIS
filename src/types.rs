use serde::{Deserialize, Serialize};

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
