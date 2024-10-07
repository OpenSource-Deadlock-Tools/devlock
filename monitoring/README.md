# Monitoring

This package includes multiple Services and Tools to monitor the status of the system and the services running on it.

## Docker Container

### [Grafana](https://grafana.com/)

- **Image**: `grafana/grafana-enterprise`
- **Description**: Grafana is an open source analytics & monitoring solution.

### [Prometheus](https://prometheus.io/)

- **Image**: `prom/prometheus`
- **Description**: Prometheus is an open-source time series database for metric collection. It integrates well with Grafana for visualization.

### [Node Exporter](https://hub.docker.com/r/prom/node-exporter)

- **Image**: `prom/node-exporter`
- **Description**: Node exporter is a Prometheus exporter for hardware and OS metrics exposed by *NIX kernels.

### [Watchtower](https://hub.docker.com/r/containrrr/watchtower)

- **Image**: `containrrr/watchtower`
- **Description**: Watchtower is a process for automating Docker container base image updates.

### [Autoheal](https://github.com/willfarrell/docker-autoheal)

- **Image**: `willfarrell/autoheal`
- **Description**: Autoheal is a Docker container that will monitor your other containers and restart them if they have stopped.
