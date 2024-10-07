use crate::models::ProcessError;

use s3::creds::Credentials;
use s3::error::S3Error;
use s3::Region;
use std::path::PathBuf;
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

pub async fn upload_to_s3(local_path: &PathBuf, s3_path: &str) -> Result<u16, ProcessError> {
    let file = tokio::fs::File::open(local_path)
        .await
        .map_err(ProcessError::Io)?;
    let mut stream = io::BufReader::new(file);
    let response = S3_BUCKET
        .put_object_stream(&mut stream, s3_path)
        .await
        .map_err(ProcessError::S3)?;
    Ok(response.status_code())
}

pub async fn has_file(s3_path: &str) -> Result<bool, S3Error> {
    S3_BUCKET
        .head_object(s3_path)
        .await
        .map(|(_, code)| code == 200)
}
