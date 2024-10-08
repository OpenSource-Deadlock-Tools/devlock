use prost::DecodeError;
use tokio::io;

#[derive(Debug)]
pub enum ParseError {
    S3(s3::error::S3Error),
    Io(io::Error),
    RmqError(lapin::Error),
    FilenameParse,
    UnknownVariant,
    Decompress(io::Error),
    ProtobufDecode(DecodeError),
}
