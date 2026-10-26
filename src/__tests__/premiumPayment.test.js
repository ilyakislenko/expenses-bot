const Container = require('../container');
const { PREMIUM_TARIFFS } = require('../utils/constants');

// Mock repositories
jest.mock('../repositories/UserRepository', () => {
  return jest.fn().mockImplementation(() => ({
    getUserById: jest.fn().mockResolvedValue({ id: 123456, premium: false }),
    getUserLanguage: jest.fn().mockResolvedValue('ru'),
    getUserTimezone: jest.fn().mockResolvedValue('UTC'),
    getUserCurrency: jest.fn().mockResolvedValue('RUB')
  }));
});

jest.mock('../repositories/ExpenseRepository', () => {
  return jest.fn().mockImplementation(() => ({
    getExpenseCount: jest.fn().mockResolvedValue(45)
  }));
});

describe('Premium Payment Buttons', () => {
  let callbackHandlers;
  let localizationService;

  beforeEach(() => {
    const container = new Container();
    callbackHandlers = container.get('callbackHandlers');
    localizationService = container.get('localizationService');
  });

  describe('Payment Button Generation', () => {
    it('should generate payment buttons with correct structure', () => {
      const { PREMIUM_TARIFFS, generatePremiumPaymentButtons } = require('../utils/constants');
      
      jest.spyOn(localizationService, 'getText').mockImplementation((lang, key) => {
        return key; // Просто возвращаем ключ для теста
      });

      const buttons = generatePremiumPaymentButtons(PREMIUM_TARIFFS, localizationService, 'ru');

      // Проверяем, что есть 4 тарифа (2 ряда по 2 кнопки)
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveLength(2);
      expect(buttons[1]).toHaveLength(2);

      // Проверяем структуру кнопок
      expect(buttons[0][0]).toHaveProperty('text');
      expect(buttons[0][0]).toHaveProperty('tariffKey');
      expect(buttons[0][1]).toHaveProperty('text');
      expect(buttons[0][1]).toHaveProperty('tariffKey');
      expect(buttons[1][0]).toHaveProperty('text');
      expect(buttons[1][0]).toHaveProperty('tariffKey');
      expect(buttons[1][1]).toHaveProperty('text');
      expect(buttons[1][1]).toHaveProperty('tariffKey');

      // Проверяем tariffKey
      expect(buttons[0][0].tariffKey).toBe('month_1');
      expect(buttons[0][1].tariffKey).toBe('month_3');
      expect(buttons[1][0].tariffKey).toBe('month_6');
      expect(buttons[1][1].tariffKey).toBe('month_12');
    });

    it('shows each tariff with its localized duration and current Stars price', () => {
      const { PREMIUM_TARIFFS, generatePremiumPaymentButtons } = require('../utils/constants');

      const buttons = generatePremiumPaymentButtons(PREMIUM_TARIFFS, localizationService, 'en').flat();

      const expected = [
        [PREMIUM_TARIFFS.MONTH_1, 'tariff_button_30'],
        [PREMIUM_TARIFFS.MONTH_3, 'tariff_button_90'],
        [PREMIUM_TARIFFS.MONTH_6, 'tariff_button_180'],
        [PREMIUM_TARIFFS.MONTH_12, 'tariff_button_365']
      ];
      expected.forEach(([tariff, labelKey], i) => {
        expect(buttons[i].text).toContain(localizationService.getText('en', labelKey));
        expect(buttons[i].text).toContain(`${tariff.stars} ⭐️`);
      });
    });
  });


}); 