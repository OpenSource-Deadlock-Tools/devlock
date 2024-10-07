# Deadlock Spectator - Client

### Dependencies
- `python-dotenv`
- `jinja2`

### Usage:

1. Create an `.env` file by copying the `.env.example` file and filling in the required fields.

    - In theory the list of accounts can have as few/many Steam accounts as you want. (I have tested with up to 2 accounts).
    - Each of the instances can communicate with others such that a spectate request is not sent to the same Match ID twice.

2. Generate a `docker-compose.yml`:
    ```bash
    python gen-compose.py >> docker-compose.yml
    ```

3. Build and launch all instances:
    ```bash
    docker-compose up --build
    ```
