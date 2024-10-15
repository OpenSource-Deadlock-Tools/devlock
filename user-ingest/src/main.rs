use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, head, post};
use axum::{Json, Router};
use futures::future::join_all;
use futures::stream::FuturesUnordered;
use futures::{FutureExt, StreamExt};
use log::{debug, error};
use models::Salts;
use serde::Serialize;
use std::future::IntoFuture;
use std::net::Ipv4Addr;
use std::sync::Arc;
use tokio::io;
use tokio::net::TcpListener;
use tokio::sync::mpsc;

mod download;
mod models;
mod rmq;
mod s3;
mod utils;

const MAX_PARALLEL_DOWNLOADS: usize = 20;

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
        let semaphore = tokio::sync::Semaphore::new(MAX_PARALLEL_DOWNLOADS);
        let semaphore = Arc::new(semaphore);
        while let Some(salts) = salts_channel_receiver.recv().await {
            let serialized_salts = serde_json::to_string(&salts);
            if let Ok(serialized_salts) = serialized_salts {
                match rmq::add_to_public_queue("matchdata_salts", &serialized_salts).await {
                    Ok(_) => debug!("Sent salts to queue"),
                    Err(e) => error!("Failed to send salts to queue: {:?}", e),
                }
            } else {
                error!("Failed to serialize salts: {:?}", serialized_salts);
            }
            let permit = semaphore.clone().acquire_owned().await.unwrap();

            debug!("Received metadata download task: {:?}", salts);
            tokio::spawn(async move {
                debug!("Received metadata download task: {:?}", salts);
                download::process_salts(salts).await;
                drop(permit); // Release the permit after processing
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
