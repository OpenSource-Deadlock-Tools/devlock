# nsu-proxy

To install dependencies:

```bash
bun install
```

To run:

```bash
npx tsx ./src/bot-server/run-server.ts
```

## Deployment

1. Set environment variable `ADMIN_TOKEN` for the docker compose
2. Send a config.yml file to the update configuration endpoint. e.g with [xh](https://github.com/ducaale/xh):


```
xh POST "https://<domain>/admin/update-config" "configYaml=$(cat config.yml)" Authorization:'Bearer NSUP-ADMIN-XXXXXXXX'
```

The config yaml should look something like this:

```yaml
authorizedBearers:
  - key: NSUP-DEV-KEY
    label: that-user
  - key: NSUP-58d00e21-30c9-4bbb-95a1-1d393859add4
    label: this-user
accounts:
  # Accounts with steam guard explicitly disabled only
  - username: "theaccountusername"
    password: "asdfasdfasdf"
    socksProxy: "socks5://username:password@hostname:1080"
```
