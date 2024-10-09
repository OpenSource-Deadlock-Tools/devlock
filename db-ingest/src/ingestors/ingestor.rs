use crate::models::error::ParseError;

pub trait Ingestor<T>: Send {
    async fn ingest(&self, data: &T) -> Result<(), ParseError>;
}
