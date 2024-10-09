use crate::models::error::ParseError;
use async_compression::tokio::bufread::{BzDecoder, ZstdDecoder};
use async_compression::tokio::write::{BzEncoder, ZstdEncoder};
use std::fmt::Display;
use std::str::FromStr;
use std::{vec, write};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[derive(Debug, Default, Clone, Copy, Eq, PartialEq)]
pub enum Compression {
    #[default]
    Uncompressed,
    Bzip2,
    Zstd,
}

impl Compression {
    pub async fn decompress(&self, data: &Vec<u8>) -> Result<Vec<u8>, ParseError> {
        match self {
            Self::Uncompressed => Ok(data.clone()),
            Self::Bzip2 => {
                let mut decompressed = vec![];
                BzDecoder::new(data.as_ref())
                    .read_to_end(&mut decompressed)
                    .await
                    .map_err(ParseError::Decompress)?;
                Ok(decompressed)
            }
            Self::Zstd => {
                let mut decompressed = vec![];
                ZstdDecoder::new(data.as_ref())
                    .read_to_end(&mut decompressed)
                    .await
                    .map_err(ParseError::Decompress)?;
                Ok(decompressed)
            }
        }
    }
    pub async fn compress(&self, data: &[u8]) -> Result<Vec<u8>, ParseError> {
        match self {
            Self::Uncompressed => Ok(data.to_vec()),
            Self::Bzip2 => {
                let mut encoder = BzEncoder::new(Vec::new());
                encoder
                    .write_all(data)
                    .await
                    .map_err(ParseError::Decompress)?;
                encoder.shutdown().await.map_err(ParseError::Decompress)?;
                Ok(encoder.into_inner())
            }
            Self::Zstd => {
                let mut encoder = ZstdEncoder::new(Vec::new());
                encoder
                    .write_all(data)
                    .await
                    .map_err(ParseError::Decompress)?;
                encoder.shutdown().await.map_err(ParseError::Decompress)?;
                Ok(encoder.into_inner())
            }
        }
    }
}

impl Display for Compression {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Uncompressed => write!(f, ""),
            Self::Bzip2 => write!(f, "bz2"),
            Self::Zstd => write!(f, "zst"),
        }
    }
}

impl FromStr for Compression {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "bz2" => Ok(Self::Bzip2),
            "zst" => Ok(Self::Zstd),
            _ => Err(ParseError::UnknownVariant),
        }
    }
}
