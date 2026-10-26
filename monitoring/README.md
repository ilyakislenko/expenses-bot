# Monitoring Stack

Полноценный стек мониторинга для приложения Expenses Bot с использованием современных инструментов и лучших практик.

## 🚀 Компоненты

- **Grafana** (порт 3000) - веб-интерфейс для визуализации метрик и логов
- **Prometheus** (порт 9090) - система сбора и хранения метрик
- **Loki** (порт 3100) - система агрегации логов
- **Promtail** (порт 9080) - агент для сбора логов
- **Node Exporter** (порт 9100) - экспортер метрик хоста
- **cAdvisor** (порт 8080) - мониторинг контейнеров
- **Alertmanager** (порт 9093) - управление алертами

## 📋 Требования

- Docker
- Docker Compose
- Минимум 4GB RAM
- 10GB свободного места на диске

## 🛠 Установка и запуск

### 1. Запуск стека мониторинга

```bash
# Запуск всех сервисов
docker-compose -f docker-compose.monitoring.yml up -d

# Проверка статуса
docker-compose -f docker-compose.monitoring.yml ps
```

### 2. Проверка работоспособности

```bash
# Проверка всех сервисов
curl http://localhost:3000/api/health  # Grafana
curl http://localhost:9090/-/healthy   # Prometheus
curl http://localhost:3100/ready       # Loki
curl http://localhost:9080/ready       # Promtail
curl http://localhost:9100/metrics     # Node Exporter
curl http://localhost:8080/healthz     # cAdvisor
curl http://localhost:9093/-/healthy   # Alertmanager
```

### 3. Доступ к веб-интерфейсам

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

## 📊 Дашборды

Автоматически создаются следующие дашборды:

1. **System Monitoring** - мониторинг системы (CPU, память, диск, сеть)
2. **Logs Dashboard** - просмотр логов приложения

### Создание собственных дашбордов

1. Откройте Grafana (http://localhost:3000)
2. Войдите с учетными данными admin/admin
3. Перейдите в **Create** → **Dashboard**
4. Добавьте панели с метриками из Prometheus или логами из Loki

## 📈 Метрики

### Системные метрики (Node Exporter)
- CPU использование
- Память (RAM)
- Дисковое пространство
- Сетевая активность
- Температура (если доступно)

### Метрики контейнеров (cAdvisor)
- Использование CPU контейнерами
- Использование памяти контейнерами
- Сетевая активность контейнеров
- Статус контейнеров

### Метрики приложения
- HTTP запросы и ответы
- Время отклика
- Ошибки
- Количество пользователей

## 📝 Логирование

### Источники логов (Promtail)

1. **Системные логи**: `/var/log/*log`
2. **Логи Docker контейнеров**: `/var/lib/docker/containers/*/*log`
3. **Логи приложения**: `/var/log/app/*.log`
4. **Логи ошибок**: `/var/log/app/error-*.log`

### Просмотр логов в Grafana

1. Откройте Grafana
2. Перейдите в **Explore**
3. Выберите источник данных **Loki**
4. Введите запрос: `{job="expenses-bot"}`

### Полезные запросы для логов

```logql
# Все логи приложения
{job="expenses-bot"}

# Только ошибки
{job="expenses-bot", level="error"}

# Логи за последний час
{job="expenses-bot"} |= "error"

# Логи с определенным пользователем
{job="expenses-bot"} |= "user_id=123"

# Логи с определенным методом
{job="expenses-bot"} |= "method=POST"
```

## 🚨 Алерты

### Настроенные алерты

1. **Системные алерты**:
   - Высокое использование CPU (>80%)
   - Высокое использование памяти (>85%)
   - Высокое использование диска (>85%)

2. **Алерты контейнеров**:
   - Контейнер недоступен
   - Высокое использование ресурсов контейнером

3. **Алерты приложения**:
   - Приложение недоступно
   - Высокое время отклика (>1с)

4. **Алерты мониторинга**:
   - Prometheus недоступен
   - Grafana недоступен
   - Loki недоступен

### Настройка уведомлений

1. Отредактируйте `monitoring/config/alertmanager/alertmanager.yml`
2. Добавьте webhook URL или Slack webhook
3. Перезапустите Alertmanager:
   ```bash
   docker-compose -f docker-compose.monitoring.yml restart alertmanager
   ```

## 🔧 Конфигурация

### Основные файлы конфигурации

- `monitoring/config/prometheus/prometheus.yml` - конфигурация Prometheus
- `monitoring/config/loki/loki-config.yml` - конфигурация Loki
- `monitoring/config/promtail/promtail-config.yml` - конфигурация Promtail
- `monitoring/config/alertmanager/alertmanager.yml` - конфигурация Alertmanager
- `monitoring/config/grafana/provisioning/` - конфигурация Grafana

### Переменные окружения

Основные переменные можно настроить в `docker-compose.monitoring.yml`:

```yaml
environment:
  - GF_SECURITY_ADMIN_USER=admin
  - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🛡 Безопасность

### Рекомендации для production

1. **Измените пароли по умолчанию**:
   ```yaml
   environment:
     - GF_SECURITY_ADMIN_PASSWORD=your_secure_password
   ```

2. **Настройте SSL/TLS**:
   - Используйте reverse proxy (nginx/traefik)
   - Настройте SSL сертификаты

3. **Ограничьте доступ**:
   - Настройте firewall
   - Используйте VPN для доступа
   - Сервер метрик бота (порт 3001, без авторизации) по умолчанию слушает только `127.0.0.1`. Если Prometheus собирает метрики с другой машины или из контейнера, задайте `MONITORING_HOST=0.0.0.0` и закройте порт firewall'ом

4. **Резервное копирование**:
   - Настройте регулярное резервное копирование данных
   - Используйте внешние хранилища (S3, GCS)

## 📊 Производительность

### Рекомендуемые ресурсы

- **Минимум**: 2 CPU, 4GB RAM, 20GB диска
- **Рекомендуется**: 4 CPU, 8GB RAM, 50GB диска
- **Production**: 8+ CPU, 16GB+ RAM, 100GB+ диска

### Оптимизация

1. **Увеличьте retention period** для Prometheus:
   ```yaml
   command:
     - '--storage.tsdb.retention.time=30d'
   ```

2. **Настройте сжатие** для Loki:
   ```yaml
   limits_config:
     retention_period: 744h
   ```

3. **Используйте внешние хранилища**:
   - S3 для Loki
   - Remote storage для Prometheus

## 🔍 Troubleshooting

### Проверка статуса сервисов

```bash
# Статус всех контейнеров
docker-compose -f docker-compose.monitoring.yml ps

# Логи конкретного сервиса
docker-compose -f docker-compose.monitoring.yml logs prometheus
docker-compose -f docker-compose.monitoring.yml logs loki
docker-compose -f docker-compose.monitoring.yml logs grafana
```

### Частые проблемы

1. **Prometheus не может подключиться к targets**:
   - Проверьте сетевые настройки
   - Убедитесь, что targets доступны

2. **Loki не принимает логи**:
   - Проверьте конфигурацию Promtail
   - Убедитесь, что пути к логам правильные

3. **Grafana не отображает данные**:
   - Проверьте источники данных
   - Убедитесь, что Prometheus и Loki работают

### Очистка данных

```bash
# Остановка сервисов
docker-compose -f docker-compose.monitoring.yml down

# Удаление данных (осторожно!)
docker volume rm expenses-bot_prometheus_data
docker volume rm expenses-bot_loki_data
docker volume rm expenses-bot_grafana_data

# Перезапуск
docker-compose -f docker-compose.monitoring.yml up -d
```

## 📚 Дополнительные ресурсы

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)

## 🤝 Поддержка

При возникновении проблем:

1. Проверьте логи сервисов
2. Убедитесь, что все порты свободны
3. Проверьте системные ресурсы
4. Обратитесь к документации компонентов 