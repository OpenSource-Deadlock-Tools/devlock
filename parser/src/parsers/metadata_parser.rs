use crate::parsers::parser::Parser;
use prost::Message;

use crate::models::error::ParseError;
use crate::models::file_data::FileData;
use crate::models::file_type::FileType;
use crate::models::result::{ParseResult, ParseResults};
use valveprotos::deadlock::{CMsgMatchMetaData, CMsgMatchMetaDataContents};

#[derive(Default, Debug)]
pub struct MetaDataParser {}

impl Parser for MetaDataParser {
    fn parse(&self, file_data: &FileData, data: &[u8]) -> Result<ParseResults, ParseError> {
        // Check if match metadata is parseable
        let match_metadata = CMsgMatchMetaData::decode(data).map_err(ParseError::ProtobufDecode)?;
        let match_details = match_metadata.match_details();
        // Check if match metadata is parseable
        CMsgMatchMetaDataContents::decode(match_details).map_err(ParseError::ProtobufDecode)?;
        Ok(vec![ParseResult {
            file_type: FileType::MetadataContent,
            data: match_details.to_vec(),
            compression: file_data.compression,
        }])
    }
}
