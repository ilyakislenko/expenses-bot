/**
 * Оптимизатор для быстрого ответа на callback_query
 */
class CallbackOptimizer {
  constructor() {
    this.pendingCallbacks = new Map();
  }

  /**
   * Быстрый ответ на callback_query
   * @param {Object} ctx - Telegraf context
   * @param {string} text - Текст ответа
   */
  async quickAnswer(ctx, text = 'Обрабатываю...') {
    if (ctx.callbackQuery?.id) {
      try {
        await ctx.answerCbQuery(text);
      } catch (error) {
        // Игнорируем ошибки ответа на callback
        console.debug('Failed to answer callback query:', error.message);
      }
    }
  }

  /**
   * Отметить callback как обрабатываемый
   * @param {string} callbackId 
   */
  markPending(callbackId) {
    this.pendingCallbacks.set(callbackId, Date.now());
  }

  /**
   * Убрать callback из обрабатываемых
   * @param {string} callbackId 
   */
  markCompleted(callbackId) {
    this.pendingCallbacks.delete(callbackId);
  }

  /**
   * Проверить, обрабатывается ли callback
   * @param {string} callbackId 
   * @returns {boolean}
   */
  isPending(callbackId) {
    return this.pendingCallbacks.has(callbackId);
  }

  /**
   * Очистить старые pending callbacks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 30000; // 30 секунд

    for (const [callbackId, timestamp] of this.pendingCallbacks.entries()) {
      if (now - timestamp > maxAge) {
        this.pendingCallbacks.delete(callbackId);
      }
    }
  }

  /**
   * Получить статистику
   */
  getStats() {
    return {
      pendingCallbacks: this.pendingCallbacks.size
    };
  }
}

module.exports = CallbackOptimizer; 