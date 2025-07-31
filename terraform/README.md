# Monitoring Stack with Terraform

Этот проект содержит Terraform конфигурацию для развертывания полноценного стека мониторинга с использованием Grafana, Prometheus, Loki и Promtail.

## Компоненты

- **Grafana** - веб-интерфейс для визуализации метрик и логов
- **Prometheus** - система сбора и хранения метрик
- **Loki** - система агрегации логов
- **Promtail** - агент для сбора логов
- **Node Exporter** - экспортер метрик хоста
- **cAdvisor** - мониторинг контейнеров

## Требования

- Docker
- Terraform >= 1.0
- Docker provider для Terraform

## Установка

1. Перейдите в директорию terraform:
```bash
cd terraform
```

2. Инициализируйте Terraform:
```bash
terraform init
```

3. Просмотрите план развертывания:
```bash
terraform plan
```

4. Примените конфигурацию:
```bash
terraform apply
```

## Доступные сервисы

После развертывания будут доступны следующие сервисы:

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100
- **Promtail**: http://localhost:9080
- **Node Exporter**: http://localhost:9100
- **cAdvisor**: http://localhost:8080

## Конфигурация

### Переменные

Основные переменные можно настроить в файле `variables.tf`:

- `grafana_admin_password` - пароль администратора Grafana
- `prometheus_retention_hours` - время хранения данных в Prometheus
- Портты для всех сервисов

### Конфигурационные файлы

- `config/prometheus/` - конфигурация Prometheus
- `config/loki/` - конфигурация Loki
- `config/promtail/` - конфигурация Promtail
- `config/grafana/` - конфигурация Grafana

## Дашборды

Автоматически создаются следующие дашборды:

1. **System Monitoring** - мониторинг системы (CPU, память, диск, сеть)
2. **Logs Dashboard** - просмотр логов приложения

## Логирование

Promtail настроен для сбора логов из:

- Системных логов (`/var/log/*log`)
- Логов Docker контейнеров
- Логов приложения (`/var/log/app/*.log`)
- Логов ошибок (`/var/log/app/error-*.log`)

## Мониторинг

Prometheus собирает метрики от:

- Node Exporter (метрики хоста)
- cAdvisor (метрики контейнеров)
- Приложения Expenses Bot
- Компонентов стека мониторинга

## Управление

### Остановка стека
```bash
terraform destroy
```

### Обновление конфигурации
```bash
terraform plan
terraform apply
```

### Просмотр состояния
```bash
terraform show
```

## Лучшие практики

1. **Безопасность**: Измените пароли по умолчанию в production
2. **Резервное копирование**: Настройте резервное копирование данных
3. **Масштабирование**: Для production используйте внешние хранилища
4. **Мониторинг**: Настройте алерты для критических метрик
5. **Логирование**: Настройте ротацию логов

## Troubleshooting

### Проверка статуса контейнеров
```bash
docker ps
```

### Просмотр логов контейнера
```bash
docker logs <container_name>
```

### Проверка сети
```bash
docker network ls
docker network inspect monitoring-network
```

## Дополнительные возможности

- Добавьте Alertmanager для управления алертами
- Настройте внешние хранилища (S3, GCS) для Loki
- Добавьте дополнительные экспортеры метрик
- Настройте SSL/TLS для production 