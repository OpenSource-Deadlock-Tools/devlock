use crate::models::error::ParseError;
use std::fmt::Display;
use std::str::FromStr;
use std::write;

#[derive(Debug, Clone, Copy)]
pub enum FileType {
    Metadata,
    MetadataContent,
    ActiveMatchesJsonLines,
}

impl FromStr for FileType {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "meta" => Ok(Self::Metadata),
            "metac" => Ok(Self::MetadataContent),
            "amjsonl" => Ok(Self::ActiveMatchesJsonLines),
            _ => Err(ParseError::UnknownVariant),
        }
    }
}

impl Display for FileType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Metadata => write!(f, "meta"),
            Self::MetadataContent => write!(f, "metac"),
            Self::ActiveMatchesJsonLines => write!(f, "active-matches"),
        }
    }
}

impl FileType {
    pub fn extension(&self) -> &'static str {
        match self {
            Self::Metadata => "meta",
            Self::MetadataContent => "metac",
            Self::ActiveMatchesJsonLines => "amjsonl",
        }
    }
}
