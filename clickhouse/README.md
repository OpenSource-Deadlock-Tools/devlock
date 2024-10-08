# Clickhouse

### Migration

#### Python-Dependencies

- clickhouse-migrations (See: https://github.com/zifter/clickhouse-migrations)

#### Run Migration

1. Add a migration file in the `migrations` directory. (must be ascending order)
2. Run the following command to apply the migrations.
    ```bash
    clickhouse-migrations \
        --db-host $CLICKHOUSE_URL \
        --db-user $CLICKHOUSE_USER \
        --db-password $CLICKHOUSE_PASSWORD \
        --db-name $CLICKHOUSE_DB \
        --migrations-dir ./migrations
    ```
