use crate::ingestors::ingestor::Ingestor;
use crate::models::clickhouse_match_metadata::{ClickhouseMatchInfo, ClickhouseMatchPlayer};
use crate::models::error::ParseError;
use clickhouse::{Client, Compression};
use std::sync::LazyLock;
use valveprotos::deadlock::c_msg_match_meta_data_contents::MatchInfo;

static CLICKHOUSE_URL: LazyLock<String> = LazyLock::new(|| {
    std::env::var("CLICKHOUSE_URL").unwrap_or("http://127.0.0.1:8123".to_string())
});
static CLICKHOUSE_USER: LazyLock<String> =
    LazyLock::new(|| std::env::var("CLICKHOUSE_USER").unwrap());
static CLICKHOUSE_PASSWORD: LazyLock<String> =
    LazyLock::new(|| std::env::var("CLICKHOUSE_PASSWORD").unwrap());
static CLICKHOUSE_DB: LazyLock<String> = LazyLock::new(|| std::env::var("CLICKHOUSE_DB").unwrap());

pub struct ClickhouseIngestor {
    pub client: Client,
}

impl ClickhouseIngestor {
    pub fn new() -> Self {
        Self {
            client: Client::default()
                .with_url(CLICKHOUSE_URL.clone())
                .with_user(CLICKHOUSE_USER.clone())
                .with_password(CLICKHOUSE_PASSWORD.clone())
                .with_database(CLICKHOUSE_DB.clone())
                .with_compression(Compression::None),
        }
    }
}

impl Ingestor<MatchInfo> for ClickhouseIngestor {
    async fn ingest(&self, match_info: &MatchInfo) -> Result<(), ParseError> {
        let mut match_info_insert = self
            .client
            .insert("match_info")
            .map_err(ParseError::ClickhouseError)?;
        let mut match_player_insert = self
            .client
            .insert("match_player")
            .map_err(ParseError::ClickhouseError)?;
        let ch_match_metadata: ClickhouseMatchInfo = match_info.clone().into();
        match_info_insert
            .write(&ch_match_metadata)
            .await
            .map_err(ParseError::ClickhouseError)?;

        let ch_players = match_info
            .players
            .iter()
            .map::<ClickhouseMatchPlayer, _>(|p| (match_info.match_id(), p.clone()).into());
        for player in ch_players {
            match_player_insert
                .write(&player)
                .await
                .map_err(ParseError::ClickhouseError)?;
        }
        match_info_insert
            .end()
            .await
            .map_err(ParseError::ClickhouseError)?;
        match_player_insert
            .end()
            .await
            .map_err(ParseError::ClickhouseError)?;
        Ok(())
    }
}
