use crate::{
    config::Config,
    types::{IndexResponse, Record, ReportRequest, ReportResponse},
    vlm,
};
use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    routing::{get, post},
    serve,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, postgres::PgPoolOptions};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

struct AppState {
    config: Config,
    db_pool: PgPool,
}

// Add a struct for the database record
#[derive(Debug, Serialize, FromRow)]
struct DbRecord {
    id: i64,
    created_at: DateTime<Utc>,
    latitude: f64,
    longitude: f64,
    description: String,
    score: i32,
    status: String,
}

// Response struct for the top records endpoint
#[derive(Debug, Serialize)]
struct TopRecordsResponse {
    records: Vec<DbRecord>,
}

pub async fn run_ws(config: crate::config::Config) {
    let config_c = config.clone();

    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.supabase_url)
        .await
        .expect("Failed to create database pool");

    // Create table if it doesn't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS records (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            description TEXT NOT NULL,
            score INTEGER NOT NULL,
            status TEXT NOT NULL
        )
        "#,
    )
    .execute(&db_pool)
    .await
    .expect("Failed to create records table");

    let state = Arc::new(RwLock::new(AppState { config, db_pool }));

    let app = Router::new()
        .route("/", get(index_feed_handler))
        .route("/report", post(report_handler))
        .route("/top-records", get(top_records_handler))
        .layer(tower::ServiceBuilder::new().layer(CorsLayer::very_permissive()))
        .with_state(state);

    let listener = match config_c.webserver_address {
        Some(addr) => TcpListener::bind(addr).await.unwrap(),
        None => TcpListener::bind("0.0.0.0:7504").await.unwrap(),
    };

    let server_addr = listener.local_addr().unwrap();

    println!("\n🚀 TrashTrack Server Starting...");
    println!("================================");
    println!("Server listening on: http://{}", server_addr);
    println!("\nAvailable Endpoints:");
    println!("-------------------");
    println!("📍 GET  /              - Health check endpoint");
    println!("                         Returns server status");
    println!();
    println!("📸 POST /report        - Submit a trash report");
    println!("                         Body: JSON with image (base64), latitude, longitude");
    println!("                         Returns: trash score (0-100) and category");
    println!();
    println!("📊 GET  /top-records   - Get top 5 trash locations");
    println!("                         Returns: 5 records with highest trash scores");
    println!("================================\n");

    serve(listener, app.into_make_service()).await.unwrap();
}

async fn index_feed_handler() -> Json<IndexResponse> {
    Json(IndexResponse {
        response: "trashtrack up and running".to_string(),
    })
}

async fn top_records_handler(
    State(state): State<Arc<RwLock<AppState>>>,
) -> (StatusCode, Json<TopRecordsResponse>) {
    println!("Fetching top 5 records");

    let state_read = state.read().await;
    let db_pool = state_read.db_pool.clone();
    drop(state_read); // Release the read lock early

    // Query to fetch top 5 records sorted by score (highest to lowest)
    let records_result = sqlx::query_as::<_, DbRecord>(
        r#"
        SELECT 
            id, 
            created_at::text as created_at,
            latitude, 
            longitude, 
            description, 
            score, 
            status
        FROM records
        ORDER BY score DESC
        LIMIT 5
        "#,
    )
    .fetch_all(&db_pool)
    .await;

    match records_result {
        Ok(records) => {
            println!("Successfully fetched {} records", records.len());
            (StatusCode::OK, Json(TopRecordsResponse { records }))
        }
        Err(e) => {
            eprintln!("Database query error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(TopRecordsResponse { records: vec![] }),
            )
        }
    }
}

async fn report_handler(
    State(state): State<Arc<RwLock<AppState>>>,
    Json(payload): Json<ReportRequest>,
) -> (StatusCode, Json<ReportResponse>) {
    println!("Received report request");

    let config_rwlock_read = state.read().await;
    let apikey = config_rwlock_read.config.openai_key.clone();
    let db_pool = config_rwlock_read.db_pool.clone();
    drop(config_rwlock_read); // Release the read lock early

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

    let category_trimmed = category.trim();

    // No need for unwrap_or since these are already f64
    let latitude = payload.latitude;
    let longitude = payload.longitude;

    // Create description combining score and category
    let description = format!("Trash detected - Category: {}", category_trimmed);

    // Insert record into database (using DEFAULT NOW() for created_at)
    let insert_result = sqlx::query(
        r#"
        INSERT INTO records (latitude, longitude, description, score, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        "#,
    )
    .bind(latitude)
    .bind(longitude)
    .bind(&description)
    .bind(score_u16 as i32)
    .bind("pending")
    .fetch_one(&db_pool)
    .await;

    match insert_result {
        Ok(row) => {
            let record_id: i64 = sqlx::Row::get(&row, "id");
            println!(
                "Successfully processed and stored - ID: {}, Score: {}, Category: {}",
                record_id, score_u16, category_trimmed
            );

            (
                StatusCode::OK,
                Json(ReportResponse {
                    response: format!(
                        "Successfully uploaded trash report (ID: {}). Score: {}, Category: {}",
                        record_id, score_u16, category_trimmed
                    ),
                }),
            )
        }
        Err(e) => {
            eprintln!("Database insert error: {}", e);
            // Still return success for the VLM processing, but note the DB failure
            (
                StatusCode::PARTIAL_CONTENT,
                Json(ReportResponse {
                    response: format!(
                        "Report processed (Score: {}, Category: {}) but failed to save to database: {}",
                        score_u16, category_trimmed, e
                    ),
                }),
            )
        }
    }
}
