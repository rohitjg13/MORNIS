use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub(crate) struct IndexResponse {
    pub response: String,
}
