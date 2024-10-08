use crate::models::error::ParseError;
use lapin::options::BasicPublishOptions;
use lapin::{BasicProperties, Channel, Connection, ConnectionProperties, Consumer};
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
static RABBITMQ_CHANNEL: OnceCell<Channel> = OnceCell::const_new();

const CONSUMER_TAG: &str = "parser";

pub async fn add_to_queue(queue: &str, body: &str) -> Result<(), ParseError> {
    let rmq_channel = get_rmq_channel().await?;
    info!("Sending message {} to queue: {}", body, queue);
    rmq_channel
        .basic_publish(
            "",
            queue,
            BasicPublishOptions::default(),
            body.as_bytes(),
            BasicProperties::default(),
        )
        .await
        .map(|_| ())
        .map_err(ParseError::RmqError)
}

pub async fn get_queue_consumer(queue: &str) -> Result<Consumer, ParseError> {
    get_rmq_channel()
        .await?
        .basic_consume(
            queue,
            CONSUMER_TAG,
            lapin::options::BasicConsumeOptions::default(),
            lapin::types::FieldTable::default(),
        )
        .await
        .map_err(ParseError::RmqError)
}

async fn get_rmq_channel() -> Result<&'static Channel, ParseError> {
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
        .map_err(ParseError::RmqError)?;

    RABBITMQ_CHANNEL
        .get_or_try_init(|| async { connection.create_channel().await })
        .await
        .map_err(ParseError::RmqError)
}
