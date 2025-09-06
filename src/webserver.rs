use crate::{
    config::Config,
    types::{IndexResponse, ReportRequest, ReportResponse},
    vlm,
};
use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    routing::{get, post},
    serve,
};
use serde::Deserialize;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

struct AppState {
    config: Config,
}

pub async fn run_ws(config: crate::config::Config) {
    let config_c = config.clone();
    let state = Arc::new(RwLock::new(AppState { config }));

    let app = Router::new()
        .route("/", get(index_feed_handler))
        .route("/report", post(report_handler))
        .layer(tower::ServiceBuilder::new().layer(CorsLayer::very_permissive()))
        .with_state(state);

    let listener = match config_c.webserver_address {
        Some(addr) => TcpListener::bind(addr).await.unwrap(),
        None => TcpListener::bind("0.0.0.0:7504").await.unwrap(),
    };

    println!("Server listening on {}", listener.local_addr().unwrap());

    serve(listener, app.into_make_service()).await.unwrap();
}

async fn index_feed_handler() -> Json<IndexResponse> {
    Json(IndexResponse {
        response: "trashtrack up and running".to_string(),
    })
}

async fn report_handler(
    State(state): State<Arc<RwLock<AppState>>>,
    Json(payload): Json<ReportRequest>,
) -> (StatusCode, Json<ReportResponse>) {
    println!("Received report request");

    let config_rwlock_read = &state.read().await;
    let apikey = config_rwlock_read.config.openai_key.clone();
    let model = "gpt-4o-mini".to_string();

    if apikey.is_empty() {
        eprintln!("OpenAI API key is missing");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ReportResponse {
                response: "Server configuration error".to_string(),
            }),
        );
    }

    let prompt_score = "Is there trash in this image? This is meant for a trash detection model, can you give the scene a cleanliness score between 0-100, with 100 being really trash and 0 being extremely clean. ONLY OUTPUT THE SCORE.".to_string();

    let score_handle = tokio::spawn(vlm::call_openai_vlm_base64(
        apikey.clone(),
        payload.image.clone(),
        prompt_score,
        model.clone(),
    ));

    let prompt_cat = "Classify the given image of trash into one of 4 categories: hazardous, non-recyclable, recyclable and organic. ONLY OUTPUT THE CATEGORY.".to_string();

    let cat_handle = tokio::spawn(vlm::call_openai_vlm_base64(
        apikey.clone(),
        payload.image.clone(),
        prompt_cat,
        model.clone(),
    ));

    let (score_result, cat_result) = match tokio::try_join!(score_handle, cat_handle) {
        Ok((score, cat)) => (score, cat),
        Err(e) => {
            eprintln!("Task join error: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ReportResponse {
                    response: "Failed to process image".to_string(),
                }),
            );
        }
    };

    let score = match score_result {
        Ok(s) => s,
        Err(e) => {
            eprintln!("VLM score error: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ReportResponse {
                    response: format!("Failed to get cleanliness score: {}", e),
                }),
            );
        }
    };

    let category = match cat_result {
        Ok(c) => c,
        Err(e) => {
            eprintln!("VLM category error: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ReportResponse {
                    response: format!("Failed to get category: {}", e),
                }),
            );
        }
    };

    let score_u16 = match score.trim().parse::<u16>() {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to parse score '{}': {}", score, e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ReportResponse {
                    response: format!("Invalid score format received: {}", score),
                }),
            );
        }
    };

    println!(
        "Successfully processed - Score: {}, Category: {}",
        score_u16, category
    );

    (
        StatusCode::OK,
        Json(ReportResponse {
            response: format!(
                "Successfully uploaded trash report. Score: {}, Category: {}",
                score_u16,
                category.trim()
            ),
        }),
    )
}
