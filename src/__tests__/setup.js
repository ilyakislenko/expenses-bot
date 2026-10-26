// Тесты никогда не ходят в настоящую БД: .env на сервере указывает на прод.
// dotenv не перезаписывает уже заданные переменные, поэтому значение ниже сильнее .env.
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';

// Глобальная очистка после всех тестов
afterAll(() => {
  // Очищаем метрики если они были инициализированы
  try {
    const { cleanup: cleanupMetrics } = require('../utils/metrics');
    cleanupMetrics();
  } catch (error) {
    // Игнорируем ошибки если метрики не инициализированы
  }
  
  // Очищаем все экземпляры CallbackDeduplicator
  const CallbackDeduplicator = require('../utils/callbackDeduplicator');
  // Примечание: в реальном приложении нужно будет отслеживать экземпляры
  // Для тестов достаточно очистить метрики
});

// Очистка после каждого теста (опционально)
afterEach(() => {
  // Можно добавить дополнительную очистку если нужно
});

// Настройка таймаутов для тестов
jest.setTimeout(10000); // 10 секунд для тестов

// Подавление console.log в тестах (опционально)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// }; 