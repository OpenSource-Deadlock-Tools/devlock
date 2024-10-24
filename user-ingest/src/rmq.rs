use crate::models::ProcessError;

use lapin::options::BasicPublishOptions;
use lapin::{BasicProperties, Channel, Connection, ConnectionProperties};
use log::info;
use std::sync::LazyLock;
use tokio::sync::OnceCell;

static RABBITMQ_USER: LazyLock<String> =
    LazyLock::new(|| std::env::var("RABBITMQ_ADMIN_USER").unwrap());
static RABBITMQ_PASS: LazyLock<String> =
    LazyLock::new(|| std::env::var("RABBITMQ_ADMIN_PASS").unwrap());
static RABBITMQ_HOST: LazyLock<String> = LazyLock::new(|| std::env::var("RABBITMQ_HOST").unwrap());
static RABBITMQ_PORT: LazyLock<String> = LazyLock::new(|| std::env::var("RABBITMQ_PORT").unwrap());

static RABBITMQ_CONNECTION: OnceCell<Connection> = OnceCell::const_new();
static RABBITMQ_PUBLIC_CONNECTION: OnceCell<Connection> = OnceCell::const_new();
static RABBITMQ_CHANNEL: OnceCell<Channel> = OnceCell::const_new();
static RABBITMQ_PUBLIC_CHANNEL: OnceCell<Channel> = OnceCell::const_new();

pub async fn add_to_queue(routing_key: &str, body: &str) -> Result<(), ProcessError> {
    let rmq_channel = get_rmq_channel().await?;
    info!("Sending message {} to queue: {}", body, routing_key);
    rmq_channel
        .basic_publish(
            "",
            routing_key,
            BasicPublishOptions::default(),
            body.as_bytes(),
            BasicProperties::default(),
        )
        .await
        .map(|s| {
            info!("Sent message to queue: {:?}", s);
        })
        .map_err(ProcessError::RmqError)
}

pub async fn add_to_public_queue(routing_key: &str, body: &str) -> Result<(), ProcessError> {
    let rmq_channel = get_rmq_public_channel().await?;
    info!("Sending message {} to queue: {}", body, routing_key);
    rmq_channel
        .basic_publish(
            "",
            routing_key,
            BasicPublishOptions::default(),
            body.as_bytes(),
            BasicProperties::default(),
        )
        .await
        .map(|_| ())
        .map_err(ProcessError::RmqError)
}

async fn get_rmq_channel() -> Result<&'static Channel, ProcessError> {
    let connection = RABBITMQ_CONNECTION
        .get_or_try_init(|| async {
            Connection::connect(
                &format!(
                    "amqp://{}:{}@{}:{}/%2f",
                    *RABBITMQ_USER, *RABBITMQ_PASS, *RABBITMQ_HOST, *RABBITMQ_PORT
                ),
                ConnectionProperties::default(),
            )
            .await
        })
        .await
        .map_err(ProcessError::RmqError)?;

    RABBITMQ_CHANNEL
        .get_or_try_init(|| async { connection.create_channel().await })
        .await
        .map_err(ProcessError::RmqError)
}

async fn get_rmq_public_channel() -> Result<&'static Channel, ProcessError> {
    let connection = RABBITMQ_PUBLIC_CONNECTION
        .get_or_try_init(|| async {
            Connection::connect(
                &format!(
                    "amqp://{}:{}@{}:{}/public",
                    *RABBITMQ_USER, *RABBITMQ_PASS, *RABBITMQ_HOST, *RABBITMQ_PORT
                ),
                ConnectionProperties::default(),
            )
            .await
        })
        .await
        .map_err(ProcessError::RmqError)?;

    RABBITMQ_PUBLIC_CHANNEL
        .get_or_try_init(|| async { connection.create_channel().await })
        .await
        .map_err(ProcessError::RmqError)
}
