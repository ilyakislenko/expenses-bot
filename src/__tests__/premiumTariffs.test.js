const { PREMIUM_TARIFFS, formatPremiumTariff, formatPremiumTariffEn } = require('../utils/constants');

describe('Premium Tariffs Constants', () => {
  describe('PREMIUM_TARIFFS', () => {
    it('should have correct structure for all tariffs', () => {
      expect(PREMIUM_TARIFFS).toHaveProperty('MONTH_1');
      expect(PREMIUM_TARIFFS).toHaveProperty('MONTH_3');
      expect(PREMIUM_TARIFFS).toHaveProperty('MONTH_6');
      expect(PREMIUM_TARIFFS).toHaveProperty('MONTH_12');
    });

    it('should have correct values for MONTH_1', () => {
      const tariff = PREMIUM_TARIFFS.MONTH_1;
      expect(tariff.duration).toBe(30);
      expect(tariff.stars).toBe(87);
      expect(tariff.usd).toBe(1.99);
      expect(tariff.rub).toBe(156);
      expect(tariff.originalStars).toBeNull();
      expect(tariff.discount).toBeNull();
    });

    it('should have correct values for MONTH_3', () => {
      const tariff = PREMIUM_TARIFFS.MONTH_3;
      expect(tariff.duration).toBe(90);
      expect(tariff.stars).toBe(222);
      expect(tariff.usd).toBe(4.99);
      expect(tariff.rub).toBe(468);
      expect(tariff.originalStars).toBe(261);
      expect(tariff.discount).toBe(15);
      expect(tariff.monthlyUsd).toBe(1.66);
      expect(tariff.monthlyRub).toBe(156);
    });

    it('should have correct values for MONTH_6', () => {
      const tariff = PREMIUM_TARIFFS.MONTH_6;
      expect(tariff.duration).toBe(180);
      expect(tariff.stars).toBe(392);
      expect(tariff.usd).toBe(8.99);
      expect(tariff.rub).toBe(936);
      expect(tariff.originalStars).toBe(522);
      expect(tariff.discount).toBe(25);
      expect(tariff.monthlyUsd).toBe(1.50);
      expect(tariff.monthlyRub).toBe(156);
    });

    it('should have correct values for MONTH_12', () => {
      const tariff = PREMIUM_TARIFFS.MONTH_12;
      expect(tariff.duration).toBe(365);
      expect(tariff.stars).toBe(679);
      expect(tariff.usd).toBe(14.99);
      expect(tariff.rub).toBe(1872);
      expect(tariff.originalStars).toBe(1044);
      expect(tariff.discount).toBe(35);
      expect(tariff.monthlyUsd).toBe(1.25);
      expect(tariff.monthlyRub).toBe(156);
    });
  });

  describe('formatPremiumTariff', () => {
    it('should format MONTH_1 correctly', () => {
      const result = formatPremiumTariff(PREMIUM_TARIFFS.MONTH_1, null, 'ru');
      expect(result).toContain('1 месяц (30 дней)');
      expect(result).toContain('87 ⭐️');
      expect(result).toContain('$1.99 / 156₽');
      expect(result).not.toContain('~~');
      expect(result).not.toContain('экономия');
    });

    it('should format MONTH_3 correctly with discount', () => {
      const result = formatPremiumTariff(PREMIUM_TARIFFS.MONTH_3, null, 'ru');
      expect(result).toContain('3 месяца (90 дней)');
      expect(result).toContain('~~261~~ 222 ⭐️');
      expect(result).toContain('$4.99 / 468₽, экономия 15%');
      expect(result).toContain('$1.66 / 156₽ в месяц');
    });

    it('should format MONTH_6 correctly with discount', () => {
      const result = formatPremiumTariff(PREMIUM_TARIFFS.MONTH_6, null, 'ru');
      expect(result).toContain('6 месяцев (180 дней)');
      expect(result).toContain('~~522~~ 392 ⭐️');
      expect(result).toContain('$8.99 / 936₽, экономия 25%');
      expect(result).toContain('$1.5 / 156₽ в месяц');
    });

    it('should format MONTH_12 correctly with discount', () => {
      const result = formatPremiumTariff(PREMIUM_TARIFFS.MONTH_12, null, 'ru');
      expect(result).toContain('12 месяцев (365 дней)');
      expect(result).toContain('~~1044~~ 679 ⭐️');
      expect(result).toContain('$14.99 / 1872₽, экономия 35%');
      expect(result).toContain('$1.25 / 156₽ в месяц');
    });
  });

  describe('formatPremiumTariffEn', () => {
    it('should format MONTH_1 correctly in English', () => {
      const result = formatPremiumTariffEn(PREMIUM_TARIFFS.MONTH_1, null, 'en');
      expect(result).toContain('1 month (30 days)');
      expect(result).toContain('87 ⭐️');
      expect(result).toContain('$1.99 / 156₽');
      expect(result).not.toContain('~~');
      expect(result).not.toContain('save');
    });

    it('should format MONTH_3 correctly with discount in English', () => {
      const result = formatPremiumTariffEn(PREMIUM_TARIFFS.MONTH_3, null, 'en');
      expect(result).toContain('3 months (90 days)');
      expect(result).toContain('~~261~~ 222 ⭐️');
      expect(result).toContain('$4.99 / 468₽, save 15%');
      expect(result).toContain('$1.66 / 156₽ per month');
    });

    it('should format MONTH_6 correctly with discount in English', () => {
      const result = formatPremiumTariffEn(PREMIUM_TARIFFS.MONTH_6, null, 'en');
      expect(result).toContain('6 months (180 days)');
      expect(result).toContain('~~522~~ 392 ⭐️');
      expect(result).toContain('$8.99 / 936₽, save 25%');
      expect(result).toContain('$1.5 / 156₽ per month');
    });

    it('should format MONTH_12 correctly with discount in English', () => {
      const result = formatPremiumTariffEn(PREMIUM_TARIFFS.MONTH_12, null, 'en');
      expect(result).toContain('12 months (365 days)');
      expect(result).toContain('~~1044~~ 679 ⭐️');
      expect(result).toContain('$14.99 / 1872₽, save 35%');
      expect(result).toContain('$1.25 / 156₽ per month');
    });
  });
}); 