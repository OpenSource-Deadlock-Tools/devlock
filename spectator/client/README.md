# Deadlock Spectator - Client

### Dependencies
- `python-dotenv`
- `jinja2`

### Usage:

1. Create an `.env` file with the following:
    ```bash
    SPECTATOR_STEAM_ACCOUNTS='[
        {"username": "user1", "password": "pass1"},
        {"username": "user2", "password": "pass2"}
    ]'

    RABBITMQ_HOST=154.53.45.225
    RABBITMQ_USER=devlock_admin
    RABBITMQ_PASS=super_secret_password
    ```

    - In theory this list can have as few/many Steam accounts as you want. (I have tested with up to 2 accounts).
    - Each of the instances can communicate with others such that a spectate request is not sent to the same Match ID twice.

2. Generate a `docker-compose.yml`:
    ```bash
    python gen-compose.py >> docker-compose.yml
    ```

3. Build and launch all instances:
    ```bash
    docker-compose up --build
    ```
