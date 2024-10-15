use crate::models::Salts;
use crate::models::{DataType, ProcessError};
use crate::{rmq, s3};

use log::{debug, info};
use reqwest::ClientBuilder;
use std::path::PathBuf;
use tempfile::NamedTempFile;

const APP_ID: &str = "1422450";

pub async fn process_data(salts: &Salts, data_type: DataType) -> Result<(), ProcessError> {
    let local_file = NamedTempFile::new().map_err(ProcessError::Io)?;
    let local_path = local_file.path().to_path_buf();
    let file_name = get_file_name(&salts, data_type);
    if file_name.is_none() {
        info!("No salt provided for {:?}", data_type);
        return Ok(());
    }
    let file_name = file_name.unwrap();
    let s3_path = format!("/ingest/user-ingest/{}/{}", data_type, file_name);
    if s3::has_file(&s3_path).await.is_ok_and(|m| m) {
        info!("File already exists: {}", s3_path);
        return Ok(());
    }

    download_to_file(salts, data_type, &local_path).await?;
    s3::upload_to_s3(&local_path, &s3_path).await?;
    rmq::add_to_queue("db_ingest_queue", &s3_path).await?;
    info!("Uploaded {}", s3_path);

    local_file.close().map_err(ProcessError::Io)
}

fn get_file_name(salts: &&Salts, data_type: DataType) -> Option<String> {
    let salt = match data_type {
        DataType::Meta => &salts.metadata_salt,
        DataType::Demo => &salts.replay_salt,
    };
    if salt.is_none() {
        return None;
    }
    let salt = salt.unwrap();
    format!(
        "T{data_type_id}_M{match_id}_C{cluster_id}_S{salt}.{data_type}.bz2",
        data_type_id = match data_type {
            DataType::Demo => "001",
            DataType::Meta => "002",
        },
        match_id = salts.match_id,
        cluster_id = salts.cluster_id,
        salt = salt,
        data_type = data_type
    )
        .into()
}

async fn download_to_file(
    salts: &Salts,
    data_type: DataType,
    local_path: &PathBuf,
) -> Result<(), ProcessError> {
    let salt = match data_type {
        DataType::Meta => &salts.metadata_salt,
        DataType::Demo => &salts.replay_salt,
    };
    if salt.is_none() {
        return Err(ProcessError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "No salt provided",
        )));
    }
    let salt = salt.unwrap();
    let url = format!(
        "https://replay{}.valve.net/{}/{}_{}.{}.bz2",
        salts.cluster_id, APP_ID, salts.match_id, salt, data_type
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

pub(crate) async fn check_salts(salts: Salts) -> reqwest::Result<Salts> {
    let client = ClientBuilder::new()
        .danger_accept_invalid_hostnames(true)
        .danger_accept_invalid_certs(true)
        .build()?;

    let d_valid = match salts.replay_salt {
        None => false,
        Some(replay_salt) => {
            let demo_url = format!(
                "https://replay{}.valve.net/{}/{}_{}.dem.bz2",
                salts.cluster_id, APP_ID, salts.match_id, replay_salt
            );
            client
                .head(&demo_url)
                .send()
                .await
                .and_then(|r| r.error_for_status())
                .is_ok()
        }
    };

    let m_valid = match salts.metadata_salt {
        None => false,
        Some(metadata_salt) => {
            let meta_url = format!(
                "https://replay{}.valve.net/{}/{}_{}.meta.bz2",
                salts.cluster_id, APP_ID, salts.match_id, metadata_salt
            );
            client
                .head(&meta_url)
                .send()
                .await
                .and_then(|r| r.error_for_status())
                .is_ok()
        }
    };

    Ok(Salts {
        cluster_id: salts.cluster_id,
        match_id: salts.match_id,
        metadata_salt: if m_valid { salts.metadata_salt } else { None },
        replay_salt: if d_valid { salts.replay_salt } else { None },
    })
}
