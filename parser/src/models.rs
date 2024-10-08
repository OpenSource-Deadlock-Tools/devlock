use crate::parsers::demo_parser::DemoParser;
use crate::parsers::metadata_content_parser::MetaDataContentParser;
use crate::parsers::metadata_parser::MetaDataParser;
use crate::parsers::parser::Parser;
use async_compression::tokio::bufread::BzDecoder;
use async_compression::tokio::write::BzEncoder;
use prost::DecodeError;
use std::collections::HashMap;
use std::fmt::Display;
use std::path::PathBuf;
use std::str::FromStr;
use tokio::io;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

pub type ParseResults = Vec<ParseResult>;

#[derive(Debug)]
pub struct ParseResult {
    pub file_type: FileType,
    pub compression: Compression,
    pub data: Vec<u8>,
}

#[derive(Debug)]
pub enum ParseError {
    S3(s3::error::S3Error),
    Io(io::Error),
    RmqError(lapin::Error),
    FilenameParse,
    UnknownVariant,
    Decompress(io::Error),
    ProtobufDecode(DecodeError),
}

#[derive(Debug, Default, Clone, Copy, Eq, PartialEq)]
pub enum Compression {
    #[default]
    Uncompressed,
    Bzip2,
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
        }
    }
}

impl FromStr for Compression {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "bz2" => Ok(Self::Bzip2),
            _ => Err(ParseError::UnknownVariant),
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum FileType {
    Metadata,
    MetadataContent,
    Demo,
}

impl FileType {
    pub(crate) fn get_parser(&self) -> Box<dyn Parser> {
        match self {
            FileType::Metadata => Box::new(MetaDataParser::default()),
            FileType::Demo => Box::new(DemoParser::default()),
            FileType::MetadataContent => Box::new(MetaDataContentParser::default()),
        }
    }
}

impl FromStr for FileType {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "meta" => Ok(Self::Metadata),
            "metac" => Ok(Self::MetadataContent),
            "demo" => Ok(Self::Demo),
            _ => Err(ParseError::UnknownVariant),
        }
    }
}

impl Display for FileType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Metadata => write!(f, "meta"),
            Self::MetadataContent => write!(f, "metac"),
            Self::Demo => write!(f, "demo"),
        }
    }
}

#[derive(Debug, Clone, Eq, Hash, PartialEq)]
pub enum Keyword {
    Type,
    MatchID,
    ClusterID,
    Salt,
}

impl FromStr for Keyword {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "t" => Ok(Self::Type),
            "m" => Ok(Self::MatchID),
            "c" => Ok(Self::ClusterID),
            "s" => Ok(Self::Salt),
            _ => Err(ParseError::UnknownVariant),
        }
    }
}

#[derive(Debug, Clone)]
pub struct FileData {
    pub file_name: String,
    pub file_path: PathBuf,
    pub file_type: FileType,
    pub compression: Compression,
    pub kwargs: HashMap<Keyword, String>,
}

impl TryFrom<&PathBuf> for FileData {
    type Error = ParseError;

    fn try_from(file_path: &PathBuf) -> Result<Self, Self::Error> {
        let filename = file_path
            .file_name()
            .ok_or(ParseError::FilenameParse)?
            .to_str()
            .ok_or(ParseError::FilenameParse)?;
        let parts: Vec<&str> = filename.split('.').collect();
        let (filename, ext, compression) = match parts.as_slice() {
            [filename, ext, compression] => (filename, ext, Compression::from_str(compression)?),
            [filename, ext] => (filename, ext, Compression::default()),
            _ => return Err(ParseError::FilenameParse),
        };
        let file_type = FileType::from_str(ext)?;
        let file_name_parts = filename.split('_').collect::<Vec<&str>>();
        let file_name_data: HashMap<Keyword, String> = file_name_parts
            .into_iter()
            .filter_map(|part| {
                let (key, value) = part.split_at(1);
                Keyword::from_str(key).ok().map(|k| (k, value.to_string()))
            })
            .collect();

        Ok(Self {
            file_path: file_path.clone(),
            file_name: filename.to_string(),
            file_type,
            compression,
            kwargs: file_name_data,
        })
    }
}
