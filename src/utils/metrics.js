const promClient = require('prom-client');

// Создаем реестр метрик
const register = new promClient.Registry();

// Добавляем стандартные метрики Node.js
promClient.collectDefaultMetrics({ register });

// Метрики для Telegram бота
const telegramRequestsTotal = new promClient.Counter({
  name: 'telegram_requests_total',
  help: 'Total number of Telegram requests',
  labelNames: ['type', 'status'],
  registers: [register]
});

const telegramRequestDuration = new promClient.Histogram({
  name: 'telegram_request_duration_seconds',
  help: 'Duration of Telegram requests in seconds',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const telegramErrorsTotal = new promClient.Counter({
  name: 'telegram_errors_total',
  help: 'Total number of Telegram errors',
  labelNames: ['type', 'error_code'],
  registers: [register]
});

const telegramDuplicateCallbacks = new promClient.Counter({
  name: 'telegram_duplicate_callbacks_total',
  help: 'Total number of duplicate callback queries',
  registers: [register]
});

// Метрики для базы данных
const databaseQueriesTotal = new promClient.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table'],
  registers: [register]
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register]
});

const databaseConnectionsActive = new promClient.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register]
});

// Метрики для пользователей
const activeUsersTotal = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Total number of active users',
  registers: [register]
});

const newUsersTotal = new promClient.Counter({
  name: 'new_users_total',
  help: 'Total number of new user registrations',
  labelNames: ['source'],
  registers: [register]
});

// Метрики для расходов
const expensesTotal = new promClient.Counter({
  name: 'expenses_total',
  help: 'Total number of expenses added',
  labelNames: ['currency'],
  registers: [register]
});

const expensesAmountTotal = new promClient.Counter({
  name: 'expenses_amount_total',
  help: 'Total amount of expenses',
  labelNames: ['currency'],
  registers: [register]
});

// Метрики для производительности
const memoryUsage = new promClient.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
  registers: [register]
});

const cpuUsage = new promClient.Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage',
  registers: [register]
});

// Метрики для безопасности
const securityRateLimitExceeded = new promClient.Counter({
  name: 'security_rate_limit_exceeded_total',
  help: 'Total number of rate limit violations',
  labelNames: ['user_id', 'limit_type'],
  registers: [register]
});

const securityValidationErrors = new promClient.Counter({
  name: 'security_validation_errors_total',
  help: 'Total number of validation errors',
  labelNames: ['error_type', 'user_id'],
  registers: [register]
});

const securityForbiddenPatterns = new promClient.Counter({
  name: 'security_forbidden_patterns_total',
  help: 'Total number of forbidden patterns detected',
  labelNames: ['pattern_type', 'user_id'],
  registers: [register]
});

const securityUnauthorizedAccess = new promClient.Counter({
  name: 'security_unauthorized_access_total',
  help: 'Total number of unauthorized access attempts',
  labelNames: ['access_type', 'user_id'],
  registers: [register]
});

// Метрики для внешних API
const externalApiRequestsTotal = new promClient.Counter({
  name: 'external_api_requests_total',
  help: 'Total number of external API requests',
  labelNames: ['api', 'endpoint', 'status'],
  registers: [register]
});

const externalApiRequestDuration = new promClient.Histogram({
  name: 'external_api_request_duration_seconds',
  help: 'Duration of external API requests in seconds',
  labelNames: ['api', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// Функция для обновления системных метрик
function updateSystemMetrics() {
  const memUsage = process.memoryUsage();
  memoryUsage.set({ type: 'rss' }, memUsage.rss);
  memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
  memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
  memoryUsage.set({ type: 'external' }, memUsage.external);
}

// Обновляем системные метрики каждые 30 секунд
const systemMetricsInterval = setInterval(updateSystemMetrics, 30000);
updateSystemMetrics(); // Первоначальное обновление

// Функция для очистки таймеров (для тестов)
function cleanup() {
  if (systemMetricsInterval) {
    clearInterval(systemMetricsInterval);
  }
}

// Middleware для автоматического сбора метрик запросов
function metricsMiddleware() {
  return (ctx, next) => {
    const start = Date.now();
    const requestType = ctx.updateType || 'unknown';
    
    return next().then(() => {
      const duration = (Date.now() - start) / 1000;
      telegramRequestsTotal.inc({ type: requestType, status: 'success' });
      telegramRequestDuration.observe({ type: requestType }, duration);
    }).catch((error) => {
      const duration = (Date.now() - start) / 1000;
      telegramRequestsTotal.inc({ type: requestType, status: 'error' });
      telegramErrorsTotal.inc({ type: requestType, error_code: error.code || 'unknown' });
      telegramRequestDuration.observe({ type: requestType }, duration);
      throw error;
    });
  };
}

// Функция для получения метрик в формате Prometheus
async function getMetrics() {
  return await register.metrics();
}

// Функция для получения метрик в JSON формате
async function getMetricsJson() {
  return await register.getMetricsAsJSON();
}

module.exports = {
  register,
  telegramRequestsTotal,
  telegramRequestDuration,
  telegramErrorsTotal,
  telegramDuplicateCallbacks,
  databaseQueriesTotal,
  databaseQueryDuration,
  databaseConnectionsActive,
  activeUsersTotal,
  newUsersTotal,
  expensesTotal,
  expensesAmountTotal,
  memoryUsage,
  cpuUsage,
  securityRateLimitExceeded,
  securityValidationErrors,
  securityForbiddenPatterns,
  securityUnauthorizedAccess,
  externalApiRequestsTotal,
  externalApiRequestDuration,
  metricsMiddleware,
  getMetrics,
  getMetricsJson,
  updateSystemMetrics,
  cleanup
}; 