const Formatter = require('../utils/formatter');

// Мок для currencyUtils
const mockCurrencyUtils = {
  convert: jest.fn().mockResolvedValue(100)
};

// Мок для localizationService
const mockLocalizationService = {
  getText: jest.fn((language, key, params = {}) => {
    const translations = {
      ru: {
        'date_label': 'Дата',
        'amount_label': 'Сумма',
        'currency_label': 'Валюта',
        'category_label': 'Категория',
        'description_label': 'Описание',
        'total_by_currencies': 'Итого по валютам:',
        'total_in_currency': `Итого в ${params.currency || 'RUB'}`,
        'category_food': 'Еда',
        'category_transport': 'Транспорт',
        'category_entertainment': 'Развлечения',
        'category_shopping': 'Покупки',
        'category_health': 'Здоровье',
        'category_other': 'Другое'
      },
      en: {
        'date_label': 'Date',
        'amount_label': 'Amount',
        'currency_label': 'Currency',
        'category_label': 'Category',
        'description_label': 'Description',
        'total_by_currencies': 'Total by currencies:',
        'total_in_currency': `Total in ${params.currency || 'RUB'}`,
        'category_food': 'Food',
        'category_transport': 'Transport',
        'category_entertainment': 'Entertainment',
        'category_shopping': 'Shopping',
        'category_health': 'Health',
        'category_other': 'Other'
      }
    };
    return translations[language]?.[key] || key;
  })
};

describe('Formatter CSV Localization', () => {
  let formatter;

  beforeEach(() => {
    formatter = new Formatter(mockCurrencyUtils);
    jest.clearAllMocks();
  });

  describe('formatCSV with localization', () => {
    const mockExpenses = [
      {
        id: 1,
        amount: 100,
        currency: 'RUB',
        category: 'Еда',
        description: 'Обед',
        created_at: new Date('2024-01-15T12:00:00Z'),
        local_date: '2024-01-15'
      },
      {
        id: 2,
        amount: 50,
        currency: 'USD',
        category: 'Transport',
        description: 'Taxi',
        created_at: new Date('2024-01-15T14:00:00Z'),
        local_date: '2024-01-15'
      }
    ];

    test('should generate CSV with Russian headers when language is ru', async () => {
      const csv = await formatter.formatCSV(
        mockExpenses, 
        'RUB', 
        'UTC', 
        mockLocalizationService, 
        'ru'
      );

      expect(csv).toContain('Дата,Сумма,Валюта,Категория,Описание');
      expect(csv).toContain('"Еда"'); // Переведенная категория
      expect(csv).toContain('"Транспорт"'); // Переведенная категория
      expect(csv).toContain('"Итого по валютам:"');
      expect(csv).toContain('"Итого в RUB:');
    });

    test('should generate CSV with English headers when language is en', async () => {
      const csv = await formatter.formatCSV(
        mockExpenses, 
        'RUB', 
        'UTC', 
        mockLocalizationService, 
        'en'
      );

      expect(csv).toContain('Date,Amount,Currency,Category,Description');
      expect(csv).toContain('"Food"'); // Переведенная категория
      expect(csv).toContain('"Transport"'); // Английская категория остается как есть
      expect(csv).toContain('"Total by currencies:"');
      expect(csv).toContain('"Total in RUB:');
    });

    test('should fallback to English when no localization service provided', async () => {
      const csv = await formatter.formatCSV(
        mockExpenses, 
        'RUB', 
        'UTC'
      );

      expect(csv).toContain('Date,Amount,Currency,Category,Description');
      expect(csv).toContain('"Еда"'); // Оригинальная категория
      expect(csv).toContain('"Transport"'); // Оригинальная категория
      expect(csv).toContain('"Total by currencies:"');
      expect(csv).toContain('"Total in RUB:');
    });

    test('should translate standard categories correctly', async () => {
      const expensesWithStandardCategories = [
        {
          id: 1,
          amount: 100,
          currency: 'RUB',
          category: 'Еда',
          description: 'Обед',
          created_at: new Date('2024-01-15T12:00:00Z')
        },
        {
          id: 2,
          amount: 200,
          currency: 'RUB',
          category: 'Транспорт',
          description: 'Такси',
          created_at: new Date('2024-01-15T14:00:00Z')
        },
        {
          id: 3,
          amount: 300,
          currency: 'RUB',
          category: 'Custom Category',
          description: 'Кастомная категория',
          created_at: new Date('2024-01-15T16:00:00Z')
        }
      ];

      const csv = await formatter.formatCSV(
        expensesWithStandardCategories, 
        'RUB', 
        'UTC', 
        mockLocalizationService, 
        'en'
      );

      expect(csv).toContain('"Food"'); // Еда -> Food
      expect(csv).toContain('"Transport"'); // Транспорт -> Transport
      expect(csv).toContain('"Custom Category"'); // Кастомная категория остается как есть
    });
  });

  describe('translateCategoryName', () => {
    test('should translate Russian categories to English', () => {
      const result = formatter.translateCategoryName('Еда', mockLocalizationService, 'en');
      expect(result).toBe('Food');
    });

    test('should translate English categories to Russian', () => {
      const result = formatter.translateCategoryName('Food', mockLocalizationService, 'ru');
      expect(result).toBe('Еда');
    });

    test('should return original name for custom categories', () => {
      const result = formatter.translateCategoryName('Custom Category', mockLocalizationService, 'en');
      expect(result).toBe('Custom Category');
    });

    test('should return original name when no localization service', () => {
      const result = formatter.translateCategoryName('Еда', null, 'en');
      expect(result).toBe('Еда');
    });
  });
}); 