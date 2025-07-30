#!/bin/bash

echo "🚀 Starting Expenses Bot Monitoring System..."

# Проверяем, что Docker запущен
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Запускаем систему мониторинга
echo "📊 Starting Prometheus and Grafana..."
docker-compose up -d prometheus grafana

# Ждем запуска сервисов
echo "⏳ Waiting for services to start..."
sleep 10

# Проверяем статус
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "✅ Monitoring system is ready!"
echo ""
echo "📊 Access points:"
echo "   • Grafana Dashboard: http://localhost:3000 (admin/admin)"
echo "   • Prometheus: http://localhost:9090"
echo "   • Bot Metrics: http://localhost:3001/metrics"
echo "   • Bot Health: http://localhost:3001/health"
echo ""
echo "📋 Next steps:"
echo "   1. Open Grafana at http://localhost:3000"
echo "   2. Login with admin/admin"
echo "   3. The dashboard should be automatically loaded"
echo "   4. If not, add Prometheus as data source: http://prometheus:9090"
echo ""
echo "🛑 To stop monitoring: docker-compose down" 