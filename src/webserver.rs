use crate::types::IndexResponse;
use axum::{Json, Router, extract::State, routing::get, serve};
use serde::Deserialize;
use std::sync::{Arc, RwLock};
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;

struct AppState {
    dummy: usize,
}

pub async fn run_ws(config: crate::config::Config) {
    let state = Arc::new(RwLock::new(AppState { dummy: 0 }));

    let app = Router::new()
        .route("/", get(index_feed_handler))
        .layer(tower::ServiceBuilder::new().layer(CorsLayer::very_permissive()))
        .with_state(state);

    let listener = if config.webserver_address.is_some() {
        TcpListener::bind(config.webserver_address.unwrap())
            .await
            .unwrap()
    } else {
        TcpListener::bind(format!("0.0.0.0:{}", config.webserver_port.unwrap()))
            .await
            .unwrap()
    };

    // Call .into_make_service() here when passing to serve
    serve(listener, app.into_make_service()).await.unwrap();
}

async fn index_feed_handler(State(_state): State<Arc<RwLock<AppState>>>) -> Json<IndexResponse> {
    Json(IndexResponse {
        response: "trashtrack up and running".to_string(),
    })
}

async fn add_trash(Json(payload): Json<Trash>) {}

#[derive(Deserialize)]
struct Trash {
    description: String,
    category: String,
    latitude: f64,
    longitude: f64,
    image: Vec<u8>, // Base64
}
