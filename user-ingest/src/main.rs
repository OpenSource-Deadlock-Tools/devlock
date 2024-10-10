use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, head, post};
use axum::{Json, Router};
use futures::future::join_all;
use futures::stream::FuturesUnordered;
use futures::{FutureExt, StreamExt};
use log::{debug, error};
use models::Salts;
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

const MAX_PARALLEL_DOWNLOADS: usize = 10;

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
        let mut tasks = FuturesUnordered::new();
        while let Some(salts) = salts_channel_receiver.recv().await {
            let serialized_salts = serde_json::to_string(&salts);
            if let Ok(serialized_salts) = serialized_salts {
                match rmq::add_to_queue("matchdata_salts", &serialized_salts).await {
                    Ok(_) => debug!("Sent salts to queue"),
                    Err(e) => error!("Failed to send salts to queue: {:?}", e),
                }
            }
            let permit = semaphore.clone().acquire_owned().await.unwrap();

            debug!("Received metadata download task: {:?}", salts);
            let task = tokio::spawn(async move {
                debug!("Received metadata download task: {:?}", salts);
                download::process_salts(salts).await;
                drop(permit); // Release the permit after processing
            });
            tasks.push(task);

            // Optionally, remove finished tasks
            while let Some(result) = tasks.next().await {
                if let Err(e) = result {
                    error!("Task failed: {:?}", e);
                }
            }
        }
        join_all(tasks).await;
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

pub async fn post_salts(
    State(state): State<AppState>,
    Json(salts): Json<Salts>,
) -> (StatusCode, &'static str) {
    debug!("Received Salts: {:?}", salts);
    if download::check_salts(salts.clone()).await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Checking salts failed");
    }
    if state.salts_channel.send(salts).await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to send salts");
    }
    (StatusCode::CREATED, "ok")
}
