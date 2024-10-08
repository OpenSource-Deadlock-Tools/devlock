use crate::models::ParseError;

use s3::creds::Credentials;
use s3::error::S3Error;
use s3::request::ResponseData;
use s3::Region;
use std::sync::LazyLock;
use tokio::io;

static S3_BUCKET_NAME: LazyLock<String> =
    LazyLock::new(|| std::env::var("S3_BUCKET_NAME").unwrap_or("devlock".to_string()));

static S3_ENDPOINT: LazyLock<String> = LazyLock::new(|| std::env::var("S3_ENDPOINT").unwrap());

static S3_REGION: LazyLock<String> = LazyLock::new(|| std::env::var("S3_REGION").unwrap());

static S3_BUCKET: LazyLock<Box<s3::Bucket>> = LazyLock::new(|| {
    let credentials = Credentials::from_env().unwrap();
    let region = Region::Custom {
        region: S3_REGION.clone(),
        endpoint: S3_ENDPOINT.clone(),
    };
    s3::Bucket::new(&S3_BUCKET_NAME, region, credentials).unwrap()
});

pub async fn upload_to_s3(data: &[u8], s3_path: &str) -> Result<u16, ParseError> {
    let mut stream = io::BufReader::new(data);
    let response = S3_BUCKET
        .put_object_stream(&mut stream, s3_path)
        .await
        .map_err(ParseError::S3)?;
    Ok(response.status_code())
}

pub async fn download_from_s3(s3_path: &str) -> Result<ResponseData, ParseError> {
    S3_BUCKET
        .get_object(s3_path)
        .await
        .map_err(ParseError::S3)
        .and_then(|d| {
            (d.status_code() == 200)
                .then_some(d)
                .ok_or(ParseError::S3(S3Error::HttpFail))
        })
}

pub async fn delete_from_s3(s3_path: &str) -> Result<ResponseData, ParseError> {
    S3_BUCKET
        .delete_object(s3_path)
        .await
        .map_err(ParseError::S3)
        .and_then(|d| {
            (d.status_code() == 204)
                .then_some(d)
                .ok_or(ParseError::S3(S3Error::HttpFail))
        })
}
