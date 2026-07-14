// BioEcho OS API — Rust backend service

use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use chrono::Utc;
use uuid::Uuid;

// ============================================================
// DATA MODELS
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sample {
    pub timestamp: f64,
    pub value: f64,
    pub channel: u32,
    pub organism_id: String,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpikeEvent {
    pub id: String,
    pub organism_id: String,
    pub timestamp: f64,
    pub classification: String,
    pub confidence: f64,
    pub amplitude: f64,
    pub duration: f64,
    pub dominant_freq: f64,
    pub temperature: f64,
    pub humidity: f64,
    pub soil_moisture: f64,
    pub light_level: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganismTwin {
    pub id: String,
    pub name: String,
    pub species: String,
    pub org_type: String,
    pub created_at: String,
    pub health_score: f64,
    pub stress_index: f64,
    pub spike_rate: f64,
    pub noise_floor: f64,
    pub total_events: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EventQuery {
    pub organism_id: Option<String>,
    pub limit: Option<i64>,
    pub since: Option<f64>,
}

// ============================================================
// IN-MEMORY STATE (replace with PostgreSQL + InfluxDB in production)
// ============================================================

pub struct AppState {
    pub events: Mutex<Vec<SpikeEvent>>,
    pub organisms: Mutex<Vec<OrganismTwin>>,
}

impl AppState {
    fn new() -> Self {
        AppState {
            events: Mutex::new(Vec::new()),
            organisms: Mutex::new(vec![
                OrganismTwin {
                    id: Uuid::new_v4().to_string(),
                    name: "Plant #42".into(),
                    species: "Epipremnum aureum".into(),
                    org_type: "plant".into(),
                    created_at: Utc::now().to_rfc3339(),
                    health_score: 0.95,
                    stress_index: 0.05,
                    spike_rate: 0.0,
                    noise_floor: 2.0,
                    total_events: 0,
                }
            ]),
        }
    }
}

// ============================================================
// HTTP HANDLERS
// ============================================================

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": "bioecho-api",
        "version": "0.1.0",
        "timestamp": Utc::now().to_rfc3339()
    }))
}

async fn post_sample(state: web::Data<AppState>, sample: web::Json<Sample>) -> HttpResponse {
    // In production: write to InfluxDB
    log::info!("Sample: organism={}, channel={}, value={}µV",
               sample.organism_id, sample.channel, sample.value);
    HttpResponse::Ok().json(serde_json::json!({"received": true}))
}

async fn post_event(state: web::Data<AppState>, event: web::Json<SpikeEvent>) -> HttpResponse {
    let mut events = state.events.lock().unwrap();
    events.push(event.into_inner());
    log::info!("Event recorded, total: {}", events.len());
    HttpResponse::Ok().json(serde_json::json!({"received": true, "count": events.len()}))
}

async fn get_events(state: web::Data<AppState>, query: web::Query<EventQuery>) -> HttpResponse {
    let events = state.events.lock().unwrap();
    let limit = query.limit.unwrap_or(100) as usize;
    let filtered: Vec<&SpikeEvent> = events
        .iter()
        .filter(|e| {
            let org_match = query.organism_id.as_ref().map_or(true, |id| e.organism_id == *id);
            let time_match = query.since.map_or(true, |since| e.timestamp >= since);
            org_match && time_match
        })
        .rev()
        .take(limit)
        .collect();
    HttpResponse::Ok().json(filtered)
}

async fn get_organisms(state: web::Data<AppState>) -> HttpResponse {
    let orgs = state.organisms.lock().unwrap();
    HttpResponse::Ok().json(&*orgs)
}

async fn get_organism(state: web::Data<AppState>, path: web::Path<String>) -> HttpResponse {
    let id = path.into_inner();
    let orgs = state.organisms.lock().unwrap();
    match orgs.iter().find(|o| o.id == id) {
        Some(org) => HttpResponse::Ok().json(org),
        None => HttpResponse::NotFound().json(serde_json::json!({"error": "Organism not found"})),
    }
}

async fn get_stats(state: web::Data<AppState>) -> HttpResponse {
    let events = state.events.lock().unwrap();
    let orgs = state.organisms.lock().unwrap();
    HttpResponse::Ok().json(serde_json::json!({
        "organisms": orgs.len(),
        "total_events": events.len(),
    }))
}

// ============================================================
// MAIN
// ============================================================

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    env_logger::init();

    let state = web::Data::new(AppState::new());

    log::info!("Starting BioEcho API on http://0.0.0.0:8081");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();

        App::new()
            .wrap(cors)
            .app_data(state.clone())
            .route("/health", web::get().to(health_check))
            .route("/api/sample", web::post().to(post_sample))
            .route("/api/event", web::post().to(post_event))
            .route("/api/events", web::get().to(get_events))
            .route("/api/organisms", web::get().to(get_organisms))
            .route("/api/organisms/{id}", web::get().to(get_organism))
            .route("/api/stats", web::get().to(get_stats))
    })
    .bind("0.0.0.0:8081")?
    .run()
    .await
}
