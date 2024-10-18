import os

import clickhouse_connect

ch_host = os.environ["CLICKHOUSE_HOST"]
ch_port = int(os.environ["CLICKHOUSE_HTTP_PORT"])
ch_user = os.environ["CLICKHOUSE_USER"]
ch_pass = os.environ["CLICKHOUSE_PASSWORD"]

repo = clickhouse_connect.get_client(
    host=ch_host, port=ch_port, username=ch_user, password=ch_pass
)
