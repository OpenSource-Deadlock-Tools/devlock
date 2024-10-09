use crate::models::error::ParseError;
use crate::parsers::metadata_content_parser::MetaDataContentParser;
use crate::parsers::metadata_parser::MetaDataParser;
use crate::parsers::parser::Parser;
use std::fmt::Display;
use std::str::FromStr;
use std::write;
use valveprotos::deadlock::c_msg_match_meta_data_contents::MatchInfo;

#[derive(Debug, Clone, Copy)]
pub enum FileType {
    Metadata,
    MetadataContent,
}

impl FileType {
    pub fn get_parser(&self) -> Box<dyn Parser<MatchInfo>> {
        match self {
            FileType::Metadata => Box::new(MetaDataParser::default()),
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
            _ => Err(ParseError::UnknownVariant),
        }
    }
}

impl Display for FileType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Metadata => write!(f, "meta"),
            Self::MetadataContent => write!(f, "metac"),
        }
    }
}
