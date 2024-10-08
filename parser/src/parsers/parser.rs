use crate::models::error::ParseError;
use crate::models::file_data::FileData;
use crate::models::result::ParseResults;

pub trait Parser: Send {
    fn parse(&self, file_data: &FileData, data: &[u8]) -> Result<ParseResults, ParseError>;
}
