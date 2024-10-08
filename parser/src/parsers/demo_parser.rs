use crate::models::{FileData, ParseError, ParseResults};
use crate::parsers::parser::Parser;

#[derive(Default, Debug)]
pub struct DemoParser {}

impl Parser for DemoParser {
    fn parse(&self, file_data: &FileData, data: &[u8]) -> Result<ParseResults, ParseError> {
        todo!()
    }
}
