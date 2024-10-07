use crate::models::Salts;
use crate::models::{DataType, ProcessError};
use crate::{rmq, s3};

use log::{debug, info};
use reqwest::ClientBuilder;
use std::path::PathBuf;
use tempfile::NamedTempFile;

const APP_ID: &str = "1422450";

pub async fn process_salts(salts: Salts) {
    let handle = futures::try_join!(
        process_data(&salts, DataType::Demo),
        process_data(&salts, DataType::Meta)
    );
    if let Err(e) = handle {
        match e {
            ProcessError::Reqwest(e) => {
                eprintln!("Reqwest error: {}", e);
            }
            ProcessError::S3(e) => {
                eprintln!("S3 error: {}", e);
            }
            ProcessError::Io(e) => {
                eprintln!("Io error: {}", e);
            }
            ProcessError::RmqError(e) => {
                eprintln!("Rmq error: {}", e);
            }
        }
    }
}

pub async fn process_data(salts: &Salts, data_type: DataType) -> Result<(), ProcessError> {
    let local_file = NamedTempFile::new().map_err(ProcessError::Io)?;
    let local_path = local_file.path().to_path_buf();
    let s3_path = format!(
        "/ingest/user-ingest/{}/{}",
        data_type,
        get_file_name(&salts, data_type)
    );

    if s3::has_file(&s3_path).await.is_ok_and(|m| m) {
        info!("File already exists: {}", s3_path);
        return Ok(());
    }

    download_to_file(salts, data_type, &local_path).await?;
    s3::upload_to_s3(&local_path, &s3_path).await?;
    rmq::add_to_queue(&s3_path).await?;
    info!("Uploaded {}", s3_path);

    local_file.close().map_err(ProcessError::Io)
}

fn get_file_name(salts: &&Salts, data_type: DataType) -> String {
    format!(
        "T{data_type_id}_M{match_id}_C{cluster_id}_S{salt}.{data_type}.bz2",
        data_type_id = match data_type {
            DataType::Demo => "001",
            DataType::Meta => "002",
        },
        match_id = salts.match_id,
        cluster_id = salts.cluster_id,
        salt = match data_type {
            DataType::Meta => &salts.meta_salt,
            DataType::Demo => &salts.demo_salt,
        },
        data_type = data_type
    )
}

async fn download_to_file(
    salts: &Salts,
    data_type: DataType,
    local_path: &PathBuf,
) -> Result<(), ProcessError> {
    let url = format!(
        "https://replay{}.valve.net/{}/{}_{}.{}.bz2",
        salts.cluster_id,
        APP_ID,
        salts.match_id,
        match data_type {
            DataType::Meta => &salts.meta_salt,
            DataType::Demo => &salts.demo_salt,
        },
        data_type
    );
    info!("Downloading {} to {:?}", url, local_path);

    let client = ClientBuilder::new()
        .danger_accept_invalid_hostnames(true)
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(ProcessError::Reqwest)?;
    let bytes = client
        .get(url)
        .send()
        .await
        .map_err(ProcessError::Reqwest)?
        .error_for_status()
        .map_err(ProcessError::Reqwest)?
        .bytes()
        .await
        .map_err(ProcessError::Reqwest)?;
    debug!("Downloaded {} bytes", bytes.len());
    tokio::fs::write(local_path, bytes)
        .await
        .map_err(ProcessError::Io)
}

pub(crate) async fn check_salts(salts: Salts) -> reqwest::Result<()> {
    let client = ClientBuilder::new()
        .danger_accept_invalid_hostnames(true)
        .danger_accept_invalid_certs(true)
        .build()?;

    let demo_url = format!(
        "https://replay{}.valve.net/{}/{}_{}.dem.bz2",
        salts.cluster_id, APP_ID, salts.match_id, salts.demo_salt
    );
    client.head(&demo_url).send().await?.error_for_status()?;

    let meta_url = format!(
        "https://replay{}.valve.net/{}/{}_{}.meta.bz2",
        salts.cluster_id, APP_ID, salts.match_id, salts.meta_salt
    );
    client.head(&meta_url).send().await?.error_for_status()?;

    Ok(())
}
