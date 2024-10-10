use serde::{Deserialize, Serialize};
use std::fmt::Display;
use std::io;

#[derive(Debug)]
pub enum ProcessError {
    Reqwest(reqwest::Error),
    S3(s3::error::S3Error),
    Io(io::Error),
    RmqError(lapin::Error),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Salts {
    pub cluster_id: u32,
    pub match_id: u64,
    pub metadata_salt: u32,
    pub replay_salt: u32,
}

#[derive(Debug, Copy, Clone)]
pub enum DataType {
    Meta,
    Demo,
}

impl Display for DataType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DataType::Meta => write!(f, "meta"),
            DataType::Demo => write!(f, "dem"),
        }
    }
}
