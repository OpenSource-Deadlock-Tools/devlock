use crate::models::{FileData, FileType, ParseError, ParseResult, ParseResults};
use crate::parsers::parser::Parser;
use prost::Message;
use valveprotos::deadlock::CMsgMatchMetaDataContents;

#[derive(Default, Debug)]
pub struct MetaDataContentParser {}

impl Parser for MetaDataContentParser {
    fn parse(&self, file_data: &FileData, data: &[u8]) -> Result<ParseResults, ParseError> {
        // Check if match_details is parseable
        CMsgMatchMetaDataContents::decode(data).map_err(ParseError::ProtobufDecode)?;
        Ok(vec![ParseResult {
            file_type: FileType::MetadataContent,
            data: data.to_vec(),
            compression: file_data.compression,
        }])
    }
}
