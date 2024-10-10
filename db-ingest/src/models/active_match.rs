use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ActiveMatch {
    pub match_id: u32,
    pub scraped_at: u32,
    pub winning_team: u8,
    pub start_time: u32,
    pub players: Vec<ActiveMatchPlayer>,
    pub lobby_id: u64,
    pub duration_s: u32,
    pub spectators: u32,
    pub open_spectator_slots: u32,
    pub objectives_mask_team0: u16,
    pub objectives_mask_team1: u16,
    pub net_worth_team_0: u32,
    pub net_worth_team_1: u32,
    pub match_mode: u8,
    pub game_mode: u8,
    pub match_score: u32,
    pub region_mode: u8,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ActiveMatchPlayer {
    pub account_id: u64,
    pub team: u8,
    pub abandoned: bool,
    pub hero_id: u32,
}
