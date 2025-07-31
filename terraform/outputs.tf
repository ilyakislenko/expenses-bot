output "grafana_url" {
  description = "URL for Grafana web interface"
  value       = "http://localhost:${var.grafana_port}"
}

output "prometheus_url" {
  description = "URL for Prometheus web interface"
  value       = "http://localhost:${var.prometheus_port}"
}

output "loki_url" {
  description = "URL for Loki API"
  value       = "http://localhost:${var.loki_port}"
}

output "promtail_url" {
  description = "URL for Promtail API"
  value       = "http://localhost:${var.promtail_port}"
}

output "node_exporter_url" {
  description = "URL for Node Exporter metrics"
  value       = "http://localhost:${var.node_exporter_port}"
}

output "cadvisor_url" {
  description = "URL for cAdvisor metrics"
  value       = "http://localhost:${var.cadvisor_port}"
}

output "grafana_credentials" {
  description = "Grafana admin credentials"
  value = {
    username = var.grafana_admin_user
    password = var.grafana_admin_password
  }
  sensitive = true
}

output "monitoring_network_name" {
  description = "Name of the Docker network for monitoring stack"
  value       = docker_network.monitoring_network.name
} 