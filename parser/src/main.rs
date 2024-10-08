use crate::models::{Compression, FileData, FileType, ParseError};
use ::s3::request::ResponseData;
use futures_lite::StreamExt;
use lapin::message::Delivery;
use lapin::options::{BasicAckOptions, BasicRejectOptions};
use log::{debug, error, info};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::Semaphore;

mod models;
mod parsers;
mod rmq;
mod s3;

#[tokio::main]
async fn main() {
    env_logger::init();

    let mut validate_queue_consumer = match rmq::get_queue_consumer("validate_queue").await {
        Ok(c) => c,
        Err(e) => panic!("Error getting queue consumer: {:?}", e),
    };

    let semaphore = Arc::new(Semaphore::new(10));
    while let Some(delivery) = validate_queue_consumer.next().await {
        let semaphore = semaphore.clone();
        match delivery {
            Ok(delivery) => {
                let permit = semaphore.clone().acquire_owned().await.unwrap();
                tokio::spawn(async move {
                    process_message(delivery).await;
                    drop(permit);
                });
            }
            Err(e) => {
                println!("Error receiving message: {:?}", e);
                continue;
            }
        }
    }
}

async fn process_message(message: Delivery) {
    match try_process_message(&message).await {
        Ok(_) => {
            debug!(
                "Message processed successfully: {:?}",
                String::from_utf8_lossy(&message.data)
            );
            message.ack(BasicAckOptions::default()).await.unwrap();
        }
        Err(e) => {
            error!(
                "Error processing message {:?} -> {:?}",
                String::from_utf8_lossy(&message.data),
                e
            );
            message.reject(BasicRejectOptions::default()).await.unwrap();
        }
    }
}

async fn try_process_message(message: &Delivery) -> Result<(), ParseError> {
    let s3_path = String::from_utf8_lossy(&message.data);
    let s3_path = s3_path.trim();
    let s3_path = Path::new(s3_path);
    info!("Processing file: {:?}", s3_path);
    let file_data = FileData::try_from(&s3_path.to_path_buf())?;
    debug!("File Data: {:#?}", file_data);
    let s3_path = file_data
        .file_path
        .to_str()
        .ok_or(ParseError::FilenameParse)?;
    let file_content = s3::download_from_s3(s3_path).await?;
    match process_file(&file_data, &file_content).await {
        Ok(_) => Ok(()),
        Err(e) => {
            let failed_path = get_failed_path(
                &file_data.file_name,
                file_data.file_type,
                file_data.compression,
            );
            s3::delete_from_s3(s3_path).await?;
            if !s3::has_file(&failed_path).await.unwrap_or_default() {
                s3::upload_to_s3(file_content.bytes(), &failed_path).await?;
                rmq::add_to_queue("parse_error_queue", &failed_path).await?;
            }
            Err(e)
        }
    }
}

async fn process_file(file_data: &FileData, file_content: &ResponseData) -> Result<(), ParseError> {
    let file_content = file_data
        .compression
        .decompress(&file_content.bytes().to_vec())
        .await?;
    let parser = file_data.file_type.get_parser();
    let parse_results = parser.parse(file_data, &file_content)?;
    for result in parse_results {
        let compressed =
            if file_data.compression == result.compression && file_content == result.data {
                debug!("No changes detected, moving file to parsed");
                &file_content
            } else {
                &result.compression.compress(&result.data).await?
            };

        let parsed_path =
            get_parsed_path(&file_data.file_name, result.file_type, result.compression);
        s3::upload_to_s3(compressed, &parsed_path).await?;
        rmq::add_to_queue("ingest_queue", &parsed_path).await?;
        let s3_path = file_data
            .file_path
            .to_str()
            .ok_or(ParseError::FilenameParse)?;
        s3::delete_from_s3(s3_path).await?;
    }
    Ok(())
}

fn get_parsed_path(file_name: &str, file_type: FileType, compression: Compression) -> String {
    match compression {
        Compression::Uncompressed => format!("/parsed/{}/{}.{}", file_type, file_name, file_type),
        _ => format!(
            "/parsed/{}/{}.{}.{}",
            file_type, file_name, file_type, compression
        ),
    }
}

fn get_failed_path(file_name: &str, file_type: FileType, compression: Compression) -> String {
    match compression {
        Compression::Uncompressed => format!("/failed/{}/{}.{}", file_type, file_name, file_type),
        _ => format!(
            "/failed/{}/{}.{}.{}",
            file_type, file_name, file_type, compression
        ),
    }
}
