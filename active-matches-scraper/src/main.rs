use async_compression::tokio::write::ZstdEncoder;
use log::{debug, error, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::BufRead;
use std::sync::LazyLock;
use std::time::{Duration, SystemTime};
use tokio::fs::OpenOptions;
use tokio::io;
use tokio::io::AsyncWriteExt;
use tokio::time::sleep;
mod rmq;
mod s3;

static MATCHES_PER_FILE: LazyLock<usize> =
    LazyLock::new(|| std::env::var("MATCHES_PER_FILE").unwrap().parse().unwrap());

static CACHE_FOLDER: LazyLock<String> =
    LazyLock::new(|| std::env::var("CACHE_FOLDER").unwrap_or("./tmp".to_string()));

#[tokio::main]
async fn main() {
    env_logger::init();

    let interval = Duration::from_secs(20);
    let mut active_matches: HashMap<u32, Vec<ActiveMatch>> = HashMap::new();

    let parent_dir = std::path::Path::new(&*CACHE_FOLDER);
    if !parent_dir.exists() {
        std::fs::create_dir_all(parent_dir).expect("Error creating cache folder");
    }
    let mut match_count = std::fs::File::open(format!("{}/active-matches.jsonl", *CACHE_FOLDER))
        .map(std::io::BufReader::new)
        .map(|i| i.lines().count())
        .unwrap_or(0);

    let mut file_writer;
    loop {
        while match_count < *MATCHES_PER_FILE {
            let start = std::time::Instant::now();
            file_writer = match OpenOptions::new()
                .write(true)
                .append(true)
                .create(true)
                .open(format!("{}/active-matches.jsonl", *CACHE_FOLDER))
                .await
            {
                Ok(f) => f,
                Err(e) => {
                    error!("Error opening file: {:?}", e);
                    return;
                }
            };

            let new_active_matches = match fetch_active_matches().await {
                Ok(matches) => matches,
                Err(e) => {
                    error!(
                        "Error fetching active matches: {:?}, Retrying in 20 seconds",
                        e
                    );
                    sleep(interval).await;
                    continue;
                }
            };
            let new_active_matches_ids: Vec<u32> =
                new_active_matches.iter().map(|am| am.match_id).collect();

            for am in new_active_matches {
                active_matches.entry(am.match_id).or_default().push(am);
            }

            for (match_id, matches) in active_matches.iter() {
                if new_active_matches_ids.contains(match_id) || matches.is_empty() {
                    continue;
                }
                let match_string = match serde_json::to_string(matches) {
                    Ok(s) => s,
                    Err(e) => {
                        error!("Error serializing match {}: {:?}", match_id, e);
                        continue;
                    }
                };
                file_writer
                    .write_all(match_string.as_bytes())
                    .await
                    .expect("Error writing to file");
                file_writer
                    .write_all(b"\n")
                    .await
                    .expect("Error writing to file");
                file_writer.flush().await.expect("Error flushing file");
                match_count += 1;
            }

            active_matches.retain(|k, _| new_active_matches_ids.contains(k));

            info!("Currently having {} finished matches", match_count);

            if start.elapsed() < interval - Duration::from_secs(2) {
                sleep(interval - start.elapsed()).await;
            }
        }

        info!("Uploading active matches to S3");
        match compress_temp_file().await {
            Ok(compressed_bytes) => {
                let s3_path = &format!(
                    "/ingest/active-matches/{}.amjsonl.zst",
                    SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs()
                );
                s3::upload_to_s3(&compressed_bytes, s3_path)
                    .await
                    .expect("Error uploading to S3");
                rmq::add_to_queue(s3_path)
                    .await
                    .expect("Error adding to RMQ");
            }
            Err(e) => {
                error!("Error compressing file: {:?}", e);
            }
        }

        match_count = 0;
        std::fs::remove_file(format!("{}/active-matches.jsonl", *CACHE_FOLDER))
            .expect("Error removing file");
    }
}

async fn compress_temp_file() -> Result<Vec<u8>, io::Error> {
    let file_bytes = tokio::fs::read(format!("{}/active-matches.jsonl", *CACHE_FOLDER)).await?;
    let mut encoder = ZstdEncoder::new(Vec::new());
    encoder.write_all(&file_bytes).await?;
    encoder.shutdown().await?;
    Ok(encoder.into_inner())
}

#[derive(Debug, Deserialize, Serialize)]
struct ActiveMatch {
    match_id: u32,
    #[serde(default = "scraped_at")]
    scraped_at: i32,
    winning_team: u8,
    start_time: u32,
    players: Vec<ActiveMatchPlayer>,
    lobby_id: u64,
    duration_s: u32,
    spectators: u32,
    open_spectator_slots: u32,
    objectives_mask_team0: u16,
    objectives_mask_team1: u16,
    net_worth_team_0: u32,
    net_worth_team_1: u32,
    match_mode: u8,
    game_mode: u8,
    match_score: u32,
    region_mode: u8,
}

#[derive(Debug, Deserialize, Serialize)]
struct ActiveMatchPlayer {
    account_id: u64,
    team: u8,
    abandoned: bool,
    hero_id: u32,
}

fn scraped_at() -> i32 {
    SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i32
}

async fn fetch_active_matches() -> reqwest::Result<Vec<ActiveMatch>> {
    debug!("Fetching active matches");
    reqwest::get("https://data.deadlock-api.com/v1/active-matches")
        .await?
        .json()
        .await
}
