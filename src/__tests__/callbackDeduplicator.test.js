const CallbackDeduplicator = require('../utils/callbackDeduplicator');

describe('CallbackDeduplicator', () => {
  let deduplicator;

  beforeEach(() => {
    deduplicator = new CallbackDeduplicator();
  });

  afterEach(() => {
    // Очищаем таймеры
    if (deduplicator) {
      deduplicator.destroy();
    }
  });

  describe('isProcessed', () => {
    it('should return false for new callback', () => {
      expect(deduplicator.isProcessed('test-callback-1')).toBe(false);
    });

    it('should return true for processed callback', () => {
      deduplicator.markProcessed('test-callback-1');
      expect(deduplicator.isProcessed('test-callback-1')).toBe(true);
    });

    it('should return false for expired callback', () => {
      deduplicator.markProcessed('test-callback-1');
      
      // Симулируем истечение времени
      const originalTimestamp = deduplicator.processedCallbacks.get('test-callback-1').timestamp;
      deduplicator.processedCallbacks.get('test-callback-1').timestamp = Date.now() - 40000; // 40 секунд назад
      
      expect(deduplicator.isProcessed('test-callback-1')).toBe(false);
    });
  });

  describe('markProcessed', () => {
    it('should mark callback as processed', () => {
      deduplicator.markProcessed('test-callback-1');
      expect(deduplicator.processedCallbacks.has('test-callback-1')).toBe(true);
    });

    it('should store timestamp', () => {
      const before = Date.now();
      deduplicator.markProcessed('test-callback-1');
      const after = Date.now();
      
      const timestamp = deduplicator.processedCallbacks.get('test-callback-1').timestamp;
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      // Добавляем несколько callback'ов
      deduplicator.markProcessed('test-callback-1');
      deduplicator.markProcessed('test-callback-2');
      
      // Делаем один устаревшим
      deduplicator.processedCallbacks.get('test-callback-1').timestamp = Date.now() - 40000;
      
      // Очищаем
      deduplicator.cleanup();
      
      expect(deduplicator.processedCallbacks.has('test-callback-1')).toBe(false);
      expect(deduplicator.processedCallbacks.has('test-callback-2')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      deduplicator.markProcessed('test-callback-1');
      deduplicator.markProcessed('test-callback-2');
      
      const stats = deduplicator.getStats();
      
      expect(stats.totalProcessed).toBe(2);
      expect(stats.maxAge).toBe(30000);
      expect(stats.cleanupInterval).toBe(60000);
    });
  });

  describe('multiple callbacks', () => {
    it('should handle multiple different callbacks', () => {
      deduplicator.markProcessed('callback-1');
      deduplicator.markProcessed('callback-2');
      deduplicator.markProcessed('callback-3');
      
      expect(deduplicator.isProcessed('callback-1')).toBe(true);
      expect(deduplicator.isProcessed('callback-2')).toBe(true);
      expect(deduplicator.isProcessed('callback-3')).toBe(true);
      expect(deduplicator.isProcessed('callback-4')).toBe(false);
    });
  });
}); 