use crate::models::compression::Compression;
use crate::models::file_type::FileType;

pub type ParseResults = Vec<ParseResult>;

#[derive(Debug)]
pub struct ParseResult {
    pub file_type: FileType,
    pub compression: Compression,
    pub data: Vec<u8>,
}
