use crate::models::error::ParseError;
use std::str::FromStr;

#[derive(Debug, Clone, Eq, Hash, PartialEq)]
pub enum FileKeyword {
    Type,
    MatchID,
    ClusterID,
    Salt,
}

impl FromStr for FileKeyword {
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
