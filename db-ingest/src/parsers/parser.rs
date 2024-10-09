use crate::models::error::ParseError;
use crate::models::file_data::FileData;
use crate::models::parse_result::ParseResult;

pub trait Parser<T>: Send {
    fn parse(&self, file_data: &FileData, data: &[u8]) -> Result<ParseResult<T>, ParseError>;
}
