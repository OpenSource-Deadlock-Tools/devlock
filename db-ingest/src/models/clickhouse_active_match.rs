use crate::models::active_match::ActiveMatch;
use crate::models::enums::{GameMode, MatchMode, RegionMode, Team};
use clickhouse::Row;
use serde::Serialize;

#[derive(Row, Serialize, Debug)]
pub struct ClickHouseActiveMatch {
    pub match_id: u32,
    pub scraped_at: i64,
    pub start_time: u32,
    pub winning_team: u8,
    #[serde(rename = "players.account_id")]
    pub players_account_id: Vec<u64>,
    #[serde(rename = "players.team")]
    pub players_team: Vec<Team>,
    #[serde(rename = "players.abandoned")]
    pub players_abandoned: Vec<bool>,
    #[serde(rename = "players.hero_id")]
    pub players_hero_id: Vec<u32>,
    pub lobby_id: u64,
    pub net_worth_team_0: u32,
    pub net_worth_team_1: u32,
    pub duration_s: u32,
    pub spectators: u32,
    pub open_spectator_slots: u32,
    pub objectives_mask_team0: u16,
    pub objectives_mask_team1: u16,
    pub match_mode: MatchMode,
    pub game_mode: GameMode,
    pub match_score: u32,
    pub region_mode: RegionMode,
}

impl From<ActiveMatch> for ClickHouseActiveMatch {
    fn from(am: ActiveMatch) -> Self {
        Self {
            start_time: am.start_time,
            winning_team: am.winning_team,
            match_id: am.match_id,
            scraped_at: am.scraped_at,
            players_account_id: am.players.iter().map(|p| p.account_id).collect(),
            players_team: am.players.iter().map(|p| p.team).map(Team::from).collect(),
            players_abandoned: am.players.iter().map(|p| p.abandoned).collect(),
            players_hero_id: am.players.iter().map(|p| p.hero_id).collect(),
            lobby_id: am.lobby_id,
            net_worth_team_0: am.net_worth_team_0,
            net_worth_team_1: am.net_worth_team_1,
            duration_s: am.duration_s,
            spectators: am.spectators,
            open_spectator_slots: am.open_spectator_slots,
            objectives_mask_team0: am.objectives_mask_team0,
            objectives_mask_team1: am.objectives_mask_team1,
            match_mode: MatchMode::from(am.match_mode),
            game_mode: GameMode::from(am.game_mode),
            match_score: am.match_score,
            region_mode: RegionMode::from(am.region_mode),
        }
    }
}
