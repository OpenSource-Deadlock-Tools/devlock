# Deadlock Spectator - Server

### Usage

1. Create an `.env` file with the following:
    ```bash
    STEAM_USERNAME=user
    STEAM_PASSWORD=pass

    RABBITMQ_DEFAULT_USER=devlock_admin
    RABBITMQ_DEFAULT_PASS=super_secret_password
    ```

2. Launch:
    ```bash
    docker-compose up -d
    ```
