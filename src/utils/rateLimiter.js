const logger = require('./logger');

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.limits = {
      // Общие лимиты для всех пользователей
      global: {
        requests: 100,
        windowMs: 60000 // 1 минута
      },
      // Лимиты для команд
      command: {
        requests: 10,
        windowMs: 60000 // 1 минута
      },
      // Лимиты для сообщений (добавление расходов)
      message: {
        requests: 30,
        windowMs: 60000 // 1 минута
      },
      // Лимиты для callback запросов
      callback: {
        requests: 50,
        windowMs: 60000 // 1 минута
      },
      // Лимиты для экспорта данных
      export: {
        requests: 5,
        windowMs: 300000 // 5 минут
      }
    };
  }

  // Очистка устаревших записей
  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now - data.timestamp > data.windowMs) {
        this.requests.delete(key);
      }
    }
  }

  // Проверка лимита для пользователя
  checkLimit(userId, type = 'global') {
    this.cleanup();
    
    const limit = this.limits[type] || this.limits.global;
    const key = `${userId}:${type}`;
    const now = Date.now();
    
    const userRequests = this.requests.get(key);
    
    if (!userRequests) {
      // Первый запрос пользователя
      this.requests.set(key, {
        count: 1,
        timestamp: now,
        windowMs: limit.windowMs
      });
      return { allowed: true, remaining: limit.requests - 1 };
    }
    
    // Проверяем, не истекло ли окно времени
    if (now - userRequests.timestamp > limit.windowMs) {
      // Сбрасываем счетчик
      this.requests.set(key, {
        count: 1,
        timestamp: now,
        windowMs: limit.windowMs
      });
      return { allowed: true, remaining: limit.requests - 1 };
    }
    
    // Проверяем лимит
    if (userRequests.count >= limit.requests) {
      const resetTime = userRequests.timestamp + limit.windowMs - now;
      logger.warn('Rate limit exceeded', {
        userId,
        type,
        limit: limit.requests,
        resetTime: Math.ceil(resetTime / 1000)
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil(resetTime / 1000),
        limit: limit.requests
      };
    }
    
    // Увеличиваем счетчик
    userRequests.count++;
    this.requests.set(key, userRequests);
    
    return {
      allowed: true,
      remaining: limit.requests - userRequests.count
    };
  }

  // Получение информации о лимитах для пользователя
  getLimitInfo(userId, type = 'global') {
    const limit = this.limits[type] || this.limits.global;
    const key = `${userId}:${type}`;
    const userRequests = this.requests.get(key);
    
    if (!userRequests) {
      return {
        used: 0,
        limit: limit.requests,
        remaining: limit.requests,
        resetTime: 0
      };
    }
    
    const now = Date.now();
    if (now - userRequests.timestamp > limit.windowMs) {
      return {
        used: 0,
        limit: limit.requests,
        remaining: limit.requests,
        resetTime: 0
      };
    }
    
    const resetTime = Math.ceil((userRequests.timestamp + limit.windowMs - now) / 1000);
    
    return {
      used: userRequests.count,
      limit: limit.requests,
      remaining: Math.max(0, limit.requests - userRequests.count),
      resetTime: Math.max(0, resetTime)
    };
  }

  // Сброс лимитов для пользователя (для административных целей)
  resetUserLimits(userId) {
    for (const type of Object.keys(this.limits)) {
      this.requests.delete(`${userId}:${type}`);
    }
    logger.info('User rate limits reset', { userId });
  }

  // Получение статистики по лимитам
  getStats() {
    const stats = {
      totalUsers: new Set(),
      totalRequests: 0,
      byType: {}
    };
    
    for (const [key, data] of this.requests.entries()) {
      const [userId, type] = key.split(':');
      stats.totalUsers.add(userId);
      stats.totalRequests += data.count;
      
      if (!stats.byType[type]) {
        stats.byType[type] = { users: 0, requests: 0 };
      }
      stats.byType[type].users++;
      stats.byType[type].requests += data.count;
    }
    
    stats.totalUsers = stats.totalUsers.size;
    
    return stats;
  }
}

module.exports = RateLimiter; 