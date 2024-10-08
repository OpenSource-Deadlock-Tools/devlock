use crate::models::{FileData, ParseError, ParseResults};

pub trait Parser: Send {
    fn parse(&self, file_data: &FileData, data: &[u8]) -> Result<ParseResults, ParseError>;
}
