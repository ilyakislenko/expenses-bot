class CallbackDeduplicator {
  constructor() {
    this.processedCallbacks = new Map();
    this.cleanupInterval = 60000; // 1 минута
    this.maxAge = 30000; // 30 секунд
    
    // Очистка старых записей каждую минуту
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Проверяет, был ли callback уже обработан
   * @param {string} callbackId - ID callback_query
   * @returns {boolean} - true если callback уже обработан
   */
  isProcessed(callbackId) {
    const now = Date.now();
    const record = this.processedCallbacks.get(callbackId);
    
    if (!record) {
      return false;
    }
    
    // Удаляем устаревшие записи
    if (now - record.timestamp > this.maxAge) {
      this.processedCallbacks.delete(callbackId);
      return false;
    }
    
    return true;
  }

  /**
   * Отмечает callback как обработанный
   * @param {string} callbackId - ID callback_query
   */
  markProcessed(callbackId) {
    this.processedCallbacks.set(callbackId, {
      timestamp: Date.now()
    });
  }

  /**
   * Очищает устаревшие записи
   */
  cleanup() {
    const now = Date.now();
    for (const [callbackId, record] of this.processedCallbacks.entries()) {
      if (now - record.timestamp > this.maxAge) {
        this.processedCallbacks.delete(callbackId);
      }
    }
  }

  /**
   * Получает статистику
   */
  getStats() {
    return {
      totalProcessed: this.processedCallbacks.size,
      maxAge: this.maxAge,
      cleanupInterval: this.cleanupInterval
    };
  }

  /**
   * Очищает таймер (для тестов)
   */
  cleanup() {
    const now = Date.now();
    for (const [callbackId, record] of this.processedCallbacks.entries()) {
      if (now - record.timestamp > this.maxAge) {
        this.processedCallbacks.delete(callbackId);
      }
    }
  }

  /**
   * Очищает таймер (для тестов)
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.processedCallbacks.clear();
  }
}

module.exports = CallbackDeduplicator; 