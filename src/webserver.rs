use axum::{Json, Router, routing::get};
use image::ImageReader;
use serde::{Deserialize, Serialize};

use tower_http::cors::CorsLayer;

pub async fn run_ws(config: crate::config::Config) {
    let app = Router::new();
}

async fn add_trash(Json(payload): Json<Trash>) {}

#[derive(Deserialize)]
struct Trash {
    description: str,
    category: str,
    latitude: f64,
    longitude: f64,
    image: Vec<u8>, // Base64
}
