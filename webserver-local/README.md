# Webserver without Let's Encrypt

This allows running the webserver without connecting to Let's Encrypt
for completely local deployment.

### TODO
- Include (example) authentik/grafana terraform in order to properly provision a local copy.

### Setup mkcert

See readme at https://github.com/aegypius/mkcert-for-nginx-proxy

### Edit your hosts file.

Edit /etc/hosts to include the following lines:

```
127.0.0.1 devlock.net
127.0.0.1 api.devlock.net
127.0.0.1 ingest.devlock.net
127.0.0.1 auth.devlock.net
127.0.0.1 grafana.devlock.net
```
