# 🚀 Настройка Expenses Bot с мониторингом

## 📋 Быстрый старт

### 1. Запуск базы данных
```bash
docker-compose up -d
```

### 2. Запуск стека мониторинга
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### 3. Запуск приложения
```bash
npm install
npm start
```

## 🌐 Доступные сервисы

| Сервис | URL | Логин/Пароль | Описание |
|--------|-----|--------------|----------|
| **Grafana** | http://localhost:3000 | admin/admin | Веб-интерфейс мониторинга |
| **Prometheus** | http://localhost:9090 | - | Метрики и алерты |
| **Loki** | http://localhost:3100 | - | Агрегация логов |
| **pgAdmin** | http://localhost:5050 | admin@admin.com/admin | Управление БД |
| **Alertmanager** | http://localhost:9093 | - | Управление алертами |

## 📊 Просмотр логов в Grafana

1. Откройте Grafana: http://localhost:3000
2. Войдите с учетными данными: `admin/admin`
3. Перейдите в **Explore** (значок компаса)
4. Выберите источник данных **Loki**
5. Введите запрос: `{job="expenses-bot"}`

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

## 🔧 Управление сервисами

### Остановка всех сервисов
```bash
# Остановка базы данных
docker-compose down

# Остановка мониторинга
docker-compose -f docker-compose.monitoring.yml down
```

### Перезапуск сервиса
```bash
# Перезапуск Grafana
docker-compose -f docker-compose.monitoring.yml restart grafana

# Перезапуск Prometheus
docker-compose -f docker-compose.monitoring.yml restart prometheus

# Перезапуск Loki
docker-compose -f docker-compose.monitoring.yml restart loki
```

### Просмотр логов
```bash
# Логи Grafana
docker-compose -f docker-compose.monitoring.yml logs grafana

# Логи Prometheus
docker-compose -f docker-compose.monitoring.yml logs prometheus

# Логи Loki
docker-compose -f docker-compose.monitoring.yml logs loki
```

## 📈 Метрики и алерты

### Автоматические алерты
- **Высокое использование CPU** (>80%)
- **Высокое использование памяти** (>85%)
- **Высокое использование диска** (>85%)
- **Недоступность приложения**
- **Высокое время отклика** (>1с)

### Просмотр метрик
1. Откройте Grafana: http://localhost:3000
2. Перейдите в **Dashboards**
3. Выберите **System Monitoring** или **Logs Dashboard**

## 🛠 Конфигурация

### Файлы конфигурации
- `docker-compose.yml` - база данных и pgAdmin
- `docker-compose.monitoring.yml` - стек мониторинга
- `monitoring/config/` - конфигурации мониторинга
- `env` - переменные окружения

### Переменные окружения
Основные переменные в файле `env`:
```bash
# Telegram Bot
BOT_TOKEN=your_bot_token

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# pgAdmin
PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=admin
```

## 🔍 Troubleshooting

### Проблемы с подключением к базе данных
```bash
# Проверка статуса БД
docker-compose ps

# Просмотр логов БД
docker-compose logs db

# Подключение к БД через pgAdmin
# Откройте http://localhost:5050
```

### Проблемы с мониторингом
```bash
# Проверка статуса всех сервисов
docker-compose -f docker-compose.monitoring.yml ps

# Проверка здоровья сервисов
curl http://localhost:3000/api/health  # Grafana
curl http://localhost:9090/-/healthy   # Prometheus
curl http://localhost:3100/ready       # Loki
```

### Очистка данных
```bash
# Остановка всех сервисов
docker-compose down
docker-compose -f docker-compose.monitoring.yml down

# Удаление данных (осторожно!)
docker volume rm expenses-bot_pgdata
docker volume rm expenses-bot_prometheus_data
docker volume rm expenses-bot_loki_data
docker volume rm expenses-bot_grafana_data

# Перезапуск
docker-compose up -d
docker-compose -f docker-compose.monitoring.yml up -d
```

## 📚 Дополнительные ресурсы

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте логи сервисов
2. Убедитесь, что все порты свободны
3. Проверьте системные ресурсы
4. Обратитесь к документации компонентов 