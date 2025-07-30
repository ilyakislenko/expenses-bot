const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Создаем директорию для логов если её нет
const fs = require('fs');
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Формат для логов
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Добавляем метаданные если они есть
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    // Добавляем stack trace для ошибок
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Транспорты для логирования
const transports = [
  // Консольный транспорт
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: process.env.LOG_LEVEL || 'info'
  }),
  
  // Файловый транспорт с ротацией
  new DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info'
  }),
  
  // Отдельный файл для ошибок
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error'
  })
];

// Создаем логгер
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Добавляем обработчик для необработанных ошибок
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

// Методы для удобного логирования
logger.startup = (message, meta = {}) => {
  logger.info(`🚀 ${message}`, { ...meta, type: 'startup' });
};

logger.request = (message, meta = {}) => {
  logger.info(`📨 ${message}`, { ...meta, type: 'request' });
};

logger.response = (message, meta = {}) => {
  logger.info(`📤 ${message}`, { ...meta, type: 'response' });
};

logger.database = (message, meta = {}) => {
  logger.info(`🗄️ ${message}`, { ...meta, type: 'database' });
};

logger.telegram = (message, meta = {}) => {
  logger.info(`📱 ${message}`, { ...meta, type: 'telegram' });
};

logger.security = (message, meta = {}) => {
  logger.warn(`🔒 ${message}`, { ...meta, type: 'security' });
};

logger.performance = (message, meta = {}) => {
  logger.info(`⚡ ${message}`, { ...meta, type: 'performance' });
};

module.exports = logger; 