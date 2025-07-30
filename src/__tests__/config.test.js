const currencies = require('../config/currencies');
const periods = require('../config/periods');
const database = require('../config/database');
const bot = require('../config/bot');

describe('Configuration Files', () => {

  describe('currencies', () => {
    it('should have BASE_CURRENCY property', () => {
      expect(currencies).toHaveProperty('BASE_CURRENCY');
      expect(typeof currencies.BASE_CURRENCY).toBe('string');
    });

    it('should have SUPPORTED_CURRENCIES array', () => {
      expect(currencies).toHaveProperty('SUPPORTED_CURRENCIES');
      expect(Array.isArray(currencies.SUPPORTED_CURRENCIES)).toBe(true);
    });

    it('should include BASE_CURRENCY in SUPPORTED_CURRENCIES', () => {
      expect(currencies.SUPPORTED_CURRENCIES).toContain(currencies.BASE_CURRENCY);
    });

    it('should have UPDATE_INTERVAL property', () => {
      expect(currencies).toHaveProperty('UPDATE_INTERVAL');
      expect(typeof currencies.UPDATE_INTERVAL).toBe('number');
      expect(currencies.UPDATE_INTERVAL).toBeGreaterThan(0);
    });

    it('should have API_URL property', () => {
      expect(currencies).toHaveProperty('API_URL');
      expect(typeof currencies.API_URL).toBe('string');
      expect(currencies.API_URL).toMatch(/^https?:\/\//);
    });
  });

  describe('periods', () => {
    it('should have period constants', () => {
      expect(periods).toHaveProperty('DAY');
      expect(periods).toHaveProperty('WEEK');
      expect(periods).toHaveProperty('MONTH');
      expect(periods).toHaveProperty('YEAR');
    });

    it('should have LABELS object', () => {
      expect(periods).toHaveProperty('LABELS');
      expect(typeof periods.LABELS).toBe('object');
    });

    it('should have labels for all periods', () => {
      expect(periods.LABELS).toHaveProperty(periods.DAY);
      expect(periods.LABELS).toHaveProperty(periods.WEEK);
      expect(periods.LABELS).toHaveProperty(periods.MONTH);
      expect(periods.LABELS).toHaveProperty(periods.YEAR);
    });
  });

  describe('database', () => {
    it('should have CONNECTION property', () => {
      expect(database).toHaveProperty('CONNECTION');
      expect(typeof database.CONNECTION).toBe('object');
    });

    it('should have POOL property', () => {
      expect(database).toHaveProperty('POOL');
      expect(typeof database.POOL).toBe('object');
    });

    it('should have QUERY property', () => {
      expect(database).toHaveProperty('QUERY');
      expect(typeof database.QUERY).toBe('object');
    });
  });

  describe('bot', () => {
    it('should have BOT property', () => {
      expect(bot).toHaveProperty('BOT');
      expect(typeof bot.BOT).toBe('object');
    });

    it('should have MESSAGES property', () => {
      expect(bot).toHaveProperty('MESSAGES');
      expect(typeof bot.MESSAGES).toBe('object');
    });

    it('should have KEYBOARDS property', () => {
      expect(bot).toHaveProperty('KEYBOARDS');
      expect(typeof bot.KEYBOARDS).toBe('object');
    });
  });
}); 