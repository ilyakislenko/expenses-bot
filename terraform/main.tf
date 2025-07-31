terraform {
  required_version = ">= 1.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# Создаем Docker network для стека мониторинга
resource "docker_network" "monitoring_network" {
  name = "monitoring-network"
  driver = "bridge"
}

# Prometheus
resource "docker_container" "prometheus" {
  name  = "prometheus"
  image = "prom/prometheus:latest"
  
  networks_advanced {
    name = docker_network.monitoring_network.name
  }
  
  ports {
    internal = 9090
    external = 9090
  }
  
  volumes {
    container_path = "/etc/prometheus"
    host_path      = "${path.module}/config/prometheus"
    read_only      = true
  }
  
  volumes {
    container_path = "/prometheus"
    host_path      = "${path.module}/data/prometheus"
  }
  
  command = [
    "--config.file=/etc/prometheus/prometheus.yml",
    "--storage.tsdb.path=/prometheus",
    "--web.console.libraries=/etc/prometheus/console_libraries",
    "--web.console.templates=/etc/prometheus/consoles",
    "--storage.tsdb.retention.time=200h",
    "--web.enable-lifecycle"
  ]
  
  restart = "unless-stopped"
  
  depends_on = [docker_network.monitoring_network]
}

# Loki
resource "docker_container" "loki" {
  name  = "loki"
  image = "grafana/loki:latest"
  
  networks_advanced {
    name = docker_network.monitoring_network.name
  }
  
  ports {
    internal = 3100
    external = 3100
  }
  
  volumes {
    container_path = "/etc/loki"
    host_path      = "${path.module}/config/loki"
    read_only      = true
  }
  
  volumes {
    container_path = "/loki"
    host_path      = "${path.module}/data/loki"
  }
  
  command = [
    "-config.file=/etc/loki/loki-config.yml"
  ]
  
  restart = "unless-stopped"
  
  depends_on = [docker_network.monitoring_network]
}

# Promtail
resource "docker_container" "promtail" {
  name  = "promtail"
  image = "grafana/promtail:latest"
  
  networks_advanced {
    name = docker_network.monitoring_network.name
  }
  
  ports {
    internal = 9080
    external = 9080
  }
  
  volumes {
    container_path = "/etc/promtail"
    host_path      = "${path.module}/config/promtail"
    read_only      = true
  }
  
  volumes {
    container_path = "/var/log"
    host_path      = "/var/log"
    read_only      = true
  }
  
  volumes {
    container_path = "/var/lib/docker/containers"
    host_path      = "/var/lib/docker/containers"
    read_only      = true
  }
  
  command = [
    "-config.file=/etc/promtail/promtail-config.yml"
  ]
  
  restart = "unless-stopped"
  
  depends_on = [docker_network.monitoring_network, docker_container.loki]
}

# Grafana
resource "docker_container" "grafana" {
  name  = "grafana"
  image = "grafana/grafana:latest"
  
  networks_advanced {
    name = docker_network.monitoring_network.name
  }
  
  ports {
    internal = 3000
    external = 3000
  }
  
  volumes {
    container_path = "/etc/grafana/provisioning"
    host_path      = "${path.module}/config/grafana/provisioning"
    read_only      = true
  }
  
  volumes {
    container_path = "/var/lib/grafana"
    host_path      = "${path.module}/data/grafana"
  }
  
  environment {
    name  = "GF_SECURITY_ADMIN_PASSWORD"
    value = "admin"
  }
  
  environment {
    name  = "GF_SECURITY_ADMIN_USER"
    value = "admin"
  }
  
  environment {
    name  = "GF_INSTALL_PLUGINS"
    value = "grafana-clock-panel,grafana-simple-json-datasource"
  }
  
  restart = "unless-stopped"
  
  depends_on = [docker_network.monitoring_network, docker_container.prometheus, docker_container.loki]
}

# Node Exporter для сбора метрик хоста
resource "docker_container" "node_exporter" {
  name  = "node-exporter"
  image = "prom/node-exporter:latest"
  
  networks_advanced {
    name = docker_network.monitoring_network.name
  }
  
  ports {
    internal = 9100
    external = 9100
  }
  
  volumes {
    container_path = "/host/proc"
    host_path      = "/proc"
    read_only      = true
  }
  
  volumes {
    container_path = "/host/sys"
    host_path      = "/sys"
    read_only      = true
  }
  
  volumes {
    container_path = "/host/root"
    host_path      = "/"
    read_only      = true
  }
  
  command = [
    "--path.procfs=/host/proc",
    "--path.sysfs=/host/sys",
    "--path.rootfs=/host/root",
    "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)"
  ]
  
  restart = "unless-stopped"
  
  depends_on = [docker_network.monitoring_network]
}

# Cadvisor для мониторинга контейнеров
resource "docker_container" "cadvisor" {
  name  = "cadvisor"
  image = "gcr.io/cadvisor/cadvisor:latest"
  
  networks_advanced {
    name = docker_network.monitoring_network.name
  }
  
  ports {
    internal = 8080
    external = 8080
  }
  
  volumes {
    container_path = "/"
    host_path      = "/"
    read_only      = true
  }
  
  volumes {
    container_path = "/var/run"
    host_path      = "/var/run"
    read_only      = true
  }
  
  volumes {
    container_path = "/sys"
    host_path      = "/sys"
    read_only      = true
  }
  
  volumes {
    container_path = "/var/lib/docker"
    host_path      = "/var/lib/docker"
    read_only      = true
  }
  
  volumes {
    container_path = "/dev/disk"
    host_path      = "/dev/disk"
    read_only      = true
  }
  
  restart = "unless-stopped"
  
  depends_on = [docker_network.monitoring_network]
} 