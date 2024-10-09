use crate::parsers::parser::Parser;
use prost::Message;

use crate::models::compression::Compression;
use crate::models::error::ParseError;
use crate::models::file_data::FileData;
use crate::models::file_type::FileType;
use crate::models::parse_result::ParseResult;
use valveprotos::deadlock::c_msg_match_meta_data_contents::MatchInfo;
use valveprotos::deadlock::{CMsgMatchMetaData, CMsgMatchMetaDataContents};

#[derive(Default, Debug)]
pub struct MetaDataParser {}

impl Parser<MatchInfo> for MetaDataParser {
    fn parse(
        &self,
        file_data: &FileData,
        data: &[u8],
    ) -> Result<ParseResult<MatchInfo>, ParseError> {
        // Check if match metadata is parseable
        let match_metadata = CMsgMatchMetaData::decode(data).map_err(ParseError::ProtobufDecode)?;
        let match_details = match_metadata.match_details();
        // Check if match metadata is parseable
        let parsed_data = CMsgMatchMetaDataContents::decode(match_details)
            .map_err(ParseError::ProtobufDecode)?
            .match_info
            .ok_or(ParseError::MissingField)?;
        Ok(ParseResult {
            file_type: FileType::MetadataContent,
            data: match_details.to_vec(),
            compression: Compression::Zstd,
            parsed_data,
        })
    }
}
