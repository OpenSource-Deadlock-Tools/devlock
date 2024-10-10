use crate::models::compression::Compression;
use crate::models::error::ParseError;
use crate::models::file_data::FileData;
use crate::models::file_type::FileType;
use crate::models::parse_result::ParseResult;
use crate::parsers::parser::Parser;
use prost::Message;
use valveprotos::deadlock::c_msg_match_meta_data_contents::MatchInfo;
use valveprotos::deadlock::CMsgMatchMetaDataContents;

#[derive(Default, Debug)]
pub struct MetaDataContentParser;

impl Parser<MatchInfo> for MetaDataContentParser {
    fn parse(&self, _: &FileData, data: &[u8]) -> Result<ParseResult<MatchInfo>, ParseError> {
        let parsed_data = CMsgMatchMetaDataContents::decode(data)
            .map_err(ParseError::ProtobufDecode)?
            .match_info
            .ok_or(ParseError::MissingField)?;
        Ok(ParseResult {
            file_type: FileType::MetadataContent,
            data: data.to_vec(),
            compression: Compression::Zstd,
            parsed_data,
        })
    }
}
