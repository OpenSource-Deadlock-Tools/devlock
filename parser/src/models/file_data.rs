use crate::models::compression::Compression;
use crate::models::error::ParseError;
use crate::models::file_keyword::FileKeyword;
use crate::models::file_type::FileType;
use std::collections::HashMap;
use std::path::PathBuf;
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct FileData {
    pub file_name: String,
    pub file_path: PathBuf,
    pub file_type: FileType,
    pub compression: Compression,
    pub kwargs: HashMap<FileKeyword, String>,
}

impl TryFrom<&PathBuf> for FileData {
    type Error = ParseError;

    fn try_from(file_path: &PathBuf) -> Result<Self, Self::Error> {
        let filename = file_path
            .file_name()
            .ok_or(ParseError::FilenameParse)?
            .to_str()
            .ok_or(ParseError::FilenameParse)?;
        let parts: Vec<&str> = filename.split('.').collect();
        let (filename, ext, compression) = match parts.as_slice() {
            [filename, ext, compression] => (filename, ext, Compression::from_str(compression)?),
            [filename, ext] => (filename, ext, Compression::default()),
            _ => return Err(ParseError::FilenameParse),
        };
        let file_type = FileType::from_str(ext)?;
        let file_name_parts = filename.split('_').collect::<Vec<&str>>();
        let file_name_data: HashMap<FileKeyword, String> = file_name_parts
            .into_iter()
            .filter_map(|part| {
                let (key, value) = part.split_at(1);
                FileKeyword::from_str(key)
                    .ok()
                    .map(|k| (k, value.to_string()))
            })
            .collect();

        Ok(Self {
            file_path: file_path.clone(),
            file_name: filename.to_string(),
            file_type,
            compression,
            kwargs: file_name_data,
        })
    }
}
