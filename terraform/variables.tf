variable "grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "grafana_admin_user" {
  description = "Admin username for Grafana"
  type        = string
  default     = "admin"
}

variable "prometheus_retention_hours" {
  description = "Prometheus data retention in hours"
  type        = number
  default     = 200
}

variable "monitoring_network_name" {
  description = "Name of the Docker network for monitoring stack"
  type        = string
  default     = "monitoring-network"
}

variable "grafana_port" {
  description = "Port for Grafana web interface"
  type        = number
  default     = 3000
}

variable "prometheus_port" {
  description = "Port for Prometheus web interface"
  type        = number
  default     = 9090
}

variable "loki_port" {
  description = "Port for Loki API"
  type        = number
  default     = 3100
}

variable "promtail_port" {
  description = "Port for Promtail API"
  type        = number
  default     = 9080
}

variable "node_exporter_port" {
  description = "Port for Node Exporter"
  type        = number
  default     = 9100
}

variable "cadvisor_port" {
  description = "Port for cAdvisor"
  type        = number
  default     = 8080
} 