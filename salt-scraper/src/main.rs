use arl::RateLimiter;
use base64::prelude::*;
use base64::Engine;
use log::{debug, info, warn};
use prost::Message as _;
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::cell::LazyCell;
use std::sync::LazyLock;
use std::time::Duration;
use tokio::time::sleep;
use valveprotos::deadlock::c_msg_client_to_gc_get_match_meta_data_response::EResult::KEResultRateLimited;
use valveprotos::deadlock::{
    CMsgClientToGcGetMatchMetaData, CMsgClientToGcGetMatchMetaDataResponse,
    EgcCitadelClientMessages,
};

static PROXY_API_TOKEN: LazyLock<String> = LazyLock::new(|| {
    std::env::var("PROXY_API_TOKEN").expect("PROXY_API_TOKEN must be set")
});
static INTERNAL_DEADLOCK_API_KEY: LazyLock<String> = LazyLock::new(|| {
    std::env::var("INTERNAL_DEADLOCK_API_KEY").expect("INTERNAL_DEADLOCK_API_KEY must be set")
});
static NUM_ACCOUNTS: LazyLock<usize> = LazyLock::new(|| {
    std::env::var("NUM_ACCOUNTS")
        .expect("NUM_ACCOUNTS must be set")
        .parse()
        .expect("NUM_ACCOUNTS must be a number")
});
static CALLS_PER_ACCOUNT_PER_HOUR: LazyLock<usize> = LazyLock::new(|| {
    std::env::var("CALLS_PER_ACCOUNT_PER_HOUR")
        .expect("CALLS_PER_ACCOUNT_PER_HOUR must be set")
        .parse()
        .expect("CALLS_PER_ACCOUNT_PER_HOUR must be a number")
});

#[derive(Serialize, Deserialize, Debug, Clone)]
struct InvokeResponse200 {
    data: String,
}

#[tokio::main]
async fn main() {
    env_logger::init();

    let message_type = EgcCitadelClientMessages::KEMsgClientToGcGetMatchMetaData as u32;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap();
    let limiter = RateLimiter::new(NUM_ACCOUNTS * CALLS_PER_ACCOUNT_PER_HOUR / 60, Duration::from_secs(60));
    loop {
        let recent_matches = match get_recent_matches(&client).await {
            Ok(matches) => matches,
            Err(e) => {
                warn!("Failed to get recent matches: {:?}", e);
                sleep(Duration::from_secs(5)).await;
                continue;
            }
        };
        if recent_matches.is_empty() {
            warn!("No recent matches found, sleeping for 30 seconds");
            sleep(Duration::from_secs(30)).await;
            continue;
        }
        futures::future::join_all(
            recent_matches
                .into_iter()
                .map(|match_id| fetch_match(&client, message_type, match_id, &limiter)),
        )
            .await;
    }
}

async fn fetch_match(client: &Client, message_type: u32, match_id: u64, limiter: &RateLimiter) {
    limiter.wait().await;
    let message = CMsgClientToGcGetMatchMetaData {
        match_id: Some(match_id),
        ..Default::default()
    };
    let mut data = Vec::new();
    message.encode(&mut data).unwrap();
    let data_b64 = BASE64_STANDARD.encode(data);
    let body = json!({
        "messageType": message_type,
        "timeoutMillis": 10_000,
        "rateLimit": {
            "messagePeriodMillis": 38_000,
        },
        "limitBufferingBehavior": "too_many_requests",
        "data": data_b64,
    });
    let req = client
        .post("https://nsu-proxy.devlock.net/pool/invoke-job")
        .header("Authorization", format!("Bearer {}", *PROXY_API_TOKEN))
        .json(&body);

    debug!("Sending Request (Body: {:?})", body);
    let res = match req.send().await {
        Ok(res) => res,
        Err(e) => {
            warn!("Failed to send request: {:?}", e);
            sleep(Duration::from_secs(5)).await;
            return;
        }
    };
    match res.status() {
        StatusCode::OK => {
            info!("Got a 200 response");
            let body: InvokeResponse200 = res.json().await.unwrap();
            let buf = BASE64_STANDARD.decode(body.data).unwrap();
            let response = CMsgClientToGcGetMatchMetaDataResponse::decode(buf.as_slice()).unwrap();
            if response
                .result
                .is_some_and(|r| r == KEResultRateLimited as i32)
            {
                warn!(
                    "Got a rate limited response: {:?}, sleeping for 5 minutes",
                    response
                );
                sleep(Duration::from_secs(5 * 60)).await;
                return;
            }
            let cluster_id = response.cluster_id;
            let metadata_salt = response.metadata_salt;
            let replay_salt = response.replay_salt;
            if cluster_id.is_none() || metadata_salt.is_none() || replay_salt.is_none() {
                warn!(
                    "Missing cluster_id, metadata_salt, or replay_salt, Got: {:?}",
                    response
                );
                return;
            }
            // Unwrap is safe, as we checked for None above
            match ingest_salts(
                client,
                match_id,
                cluster_id.unwrap(),
                metadata_salt.unwrap(),
                replay_salt.unwrap(),
            )
                .await
            {
                Ok(_) => info!("Ingested salts for match {}", match_id),
                Err(e) => warn!("Failed to ingest salts for match {}: {:?}", match_id, e),
            }
        }
        StatusCode::TOO_MANY_REQUESTS => {
            warn!("Rate limited: {:?}", res);
        }
        _ => {
            warn!("Failed to send request for match {}: {:?}", match_id, res);
        }
    }
}

async fn ingest_salts(
    client: &Client,
    match_id: u64,
    cluster_id: u32,
    metadata_salt: u32,
    replay_salt: u32,
) -> reqwest::Result<()> {
    let body = json!({
        "cluster_id": cluster_id,
        "match_id": match_id,
        "metadata_salt": metadata_salt,
        "replay_salt": replay_salt,
    });
    client
        .post("https://ingest.devlock.net/salts")
        .json(&body)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .and(
            client
                .post(format!(
                    "https://analytics.deadlock-api.com/v1/match-salts?api_key={}",
                    *INTERNAL_DEADLOCK_API_KEY
                ))
                .json(&body)
                .send()
                .await
                .and_then(|r| r.error_for_status()),
        )
        .map(|_| ())
}

#[derive(Serialize, Deserialize, Debug)]
struct RecentMatch {
    match_id: u64,
}

async fn get_recent_matches(client: &reqwest::Client) -> reqwest::Result<Vec<u64>> {
    client
        .get(format!(
            "https://analytics.deadlock-api.com/v1/recent-matches?api_key={}",
            *INTERNAL_DEADLOCK_API_KEY
        ))
        .send()
        .await?
        .json::<Vec<RecentMatch>>()
        .await
        .map(|matches| matches.into_iter().map(|m| m.match_id).rev().collect())
}
