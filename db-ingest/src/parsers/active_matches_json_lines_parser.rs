use crate::models::active_match::ActiveMatch;
use crate::models::compression::Compression;
use crate::models::error::ParseError;
use crate::models::file_data::FileData;
use crate::models::file_type::FileType;
use crate::models::parse_result::ParseResult;
use crate::parsers::parser::Parser;
use log::{debug, warn};

#[derive(Default, Debug)]
pub struct ActiveMatchesJsonLinesParser;

impl Parser<Vec<Vec<ActiveMatch>>> for ActiveMatchesJsonLinesParser {
    fn parse(
        &self,
        _: &FileData,
        data: &[u8],
    ) -> Result<ParseResult<Vec<Vec<ActiveMatch>>>, ParseError> {
        let data_str = String::from_utf8_lossy(data);
        debug!("Data: {}", data_str);
        for line in data_str.lines() {
            debug!("Line: {}", line);
            match serde_json::from_str::<Vec<ActiveMatch>>(line) {
                Ok(_) => {}
                Err(e) => {
                    warn!("Error parsing line: {}", e);
                }
            }
        }
        let parsed_data = data_str
            .lines()
            .filter_map(|l| serde_json::from_str::<Vec<ActiveMatch>>(l).ok())
            .collect::<Vec<_>>();
        Ok(ParseResult {
            file_type: FileType::ActiveMatchesJsonLines,
            compression: Compression::Zstd,
            data: data.to_vec(),
            parsed_data,
        })
    }
}
