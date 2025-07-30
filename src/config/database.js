module.exports = {
  // Настройки подключения к БД
  CONNECTION: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  },
  
  // Настройки пула соединений
  POOL: {
    max: 20, // максимальное количество соединений
    idleTimeoutMillis: 30000, // время простоя соединения
    connectionTimeoutMillis: 2000 // время ожидания соединения
  },
  
  // Настройки запросов
  QUERY: {
    timeout: 10000 // таймаут запроса в миллисекундах
  }
}; 