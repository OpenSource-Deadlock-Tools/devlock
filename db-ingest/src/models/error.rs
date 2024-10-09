use prost::DecodeError;
use tokio::io;

#[derive(Debug)]
pub enum ParseError {
    S3(s3::error::S3Error),
    Io(io::Error),
    RmqError(lapin::Error),
    MissingField,
    FilenameParse,
    UnknownVariant,
    ClickhouseError(clickhouse::error::Error),
    Decompress(io::Error),
    ProtobufDecode(DecodeError),
}
