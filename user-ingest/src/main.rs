use crate::download::process_data;
use crate::models::DataType;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, head, post};
use axum::{Json, Router};
use clickhouse::Client;
use futures::future::join_all;
use futures::FutureExt;
use log::{debug, error};
use models::Salts;
use serde::Serialize;
use std::future::IntoFuture;
use std::net::Ipv4Addr;
use std::sync::LazyLock;
use tokio::io;
use tokio::net::TcpListener;
use tokio::sync::mpsc;

mod download;
mod models;
mod rmq;
mod s3;
mod utils;

const PROCESS_DEMO: bool = false;

static CLICKHOUSE_URL: LazyLock<String> = LazyLock::new(|| {
    std::env::var("CLICKHOUSE_URL").unwrap_or("http://127.0.0.1:8123".to_string())
});
static CLICKHOUSE_USER: LazyLock<String> =
    LazyLock::new(|| std::env::var("CLICKHOUSE_USER").unwrap());
static CLICKHOUSE_PASSWORD: LazyLock<String> =
    LazyLock::new(|| std::env::var("CLICKHOUSE_PASSWORD").unwrap());
static CLICKHOUSE_DB: LazyLock<String> = LazyLock::new(|| std::env::var("CLICKHOUSE_DB").unwrap());

#[derive(Debug, Clone)]
pub struct AppState {
    salts_channel: mpsc::Sender<Salts>,
}

#[tokio::main]
async fn main() -> Result<(), io::Error> {
    env_logger::init();

    let (salts_channel, mut salts_channel_receiver) = mpsc::channel(100);

    let state = AppState { salts_channel };

    let app = Router::new()
        .route("/health", get(health))
        .route("/health", head(health))
        .route("/salts", post(post_salts))
        .with_state(state);

    let listener = TcpListener::bind((Ipv4Addr::UNSPECIFIED, 8080)).await?;

    let downloader = tokio::spawn(async move {
        let ch_client = Client::default()
            .with_url(CLICKHOUSE_URL.clone())
            .with_user(CLICKHOUSE_USER.clone())
            .with_password(CLICKHOUSE_PASSWORD.clone())
            .with_database(CLICKHOUSE_DB.clone())
            .with_compression(clickhouse::Compression::None);
        while let Some(salts) = salts_channel_receiver.recv().await {
            match insert_to_clickhouse(&ch_client, &salts).await {
                Ok(_) => debug!("Inserted salts to clickhouse"),
                Err(e) => error!("Failed to insert salts to clickhouse: {:?}", e),
            };

            let serialized_salts = serde_json::to_string(&salts);
            if let Ok(serialized_salts) = serialized_salts {
                match rmq::add_to_public_queue("matchdata_salts", &serialized_salts).await {
                    Ok(_) => debug!("Sent salts to queue"),
                    Err(e) => error!("Failed to send salts to queue: {:?}", e),
                }
            } else {
                error!("Failed to serialize salts: {:?}", serialized_salts);
            }
            debug!("Received metadata download task: {:?}", salts);
            tokio::spawn(async move {
                debug!("Received metadata download task: {:?}", salts);
                let demo_result = if PROCESS_DEMO {
                    process_data(&salts, DataType::Demo).await
                } else {
                    Ok(())
                };
                let meta_result = process_data(&salts, DataType::Meta).await;
                let result = demo_result.and(meta_result);
                match result {
                    Ok(_) => debug!("Downloaded Match Data"),
                    Err(e) => error!("Failed to download Match Data: {:?}", e),
                };
            });
        }
    });

    let webserver = axum::serve(listener, app)
        .with_graceful_shutdown(utils::shutdown_signal().map(|_| ()))
        .into_future()
        .map(|_| ());
    let webserver = tokio::spawn(webserver);
    join_all(vec![downloader, webserver]).await;
    Ok(())
}

async fn insert_to_clickhouse(ch_client: &Client, salts: &Salts) -> clickhouse::error::Result<()> {
    let mut insert = ch_client.insert("match_salts")?;
    insert.write(salts).await?;
    insert.end().await
}

pub async fn health() -> StatusCode {
    StatusCode::OK
}

#[derive(Debug, Clone, Serialize)]
pub struct SaltsResponse {
    pub meta: bool,
    pub replay: bool,
}

pub async fn post_salts(
    State(state): State<AppState>,
    Json(salts): Json<Salts>,
) -> Result<Json<SaltsResponse>, StatusCode> {
    debug!("Received Salts: {:?}", salts);
    let salts = match download::check_salts(salts.clone()).await {
        Ok(salts) => salts,
        Err(e) => {
            error!("Failed to validate salts: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };
    if state.salts_channel.send(salts.clone()).await.is_err() {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    Ok(Json(SaltsResponse {
        meta: salts.metadata_salt.is_some(),
        replay: salts.replay_salt.is_some(),
    }))
}
