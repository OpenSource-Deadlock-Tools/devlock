use crate::models::error::ParseError;
use crate::parsers::demo_parser::DemoParser;
use crate::parsers::metadata_content_parser::MetaDataContentParser;
use crate::parsers::metadata_parser::MetaDataParser;
use crate::parsers::parser::Parser;
use std::fmt::Display;
use std::str::FromStr;
use std::write;

#[derive(Debug, Clone, Copy)]
pub enum FileType {
    Metadata,
    MetadataContent,
    Demo,
}

impl FileType {
    pub fn get_parser(&self) -> Box<dyn Parser> {
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
