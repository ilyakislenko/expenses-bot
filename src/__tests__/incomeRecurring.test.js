const RecurringExpenseService = require('../services/RecurringExpenseService');
const EnhancedValidator = require('../utils/enhancedValidator');

describe('RecurringExpenseService.nextChargeDate', () => {
  const { nextChargeDate } = RecurringExpenseService;

  test('charge day later this month and not charged yet → this month', () => {
    expect(nextChargeDate(28, null, '2026-10-26')).toBe('2026-10-28');
  });

  test('charge day is today and not charged yet → today', () => {
    expect(nextChargeDate(26, null, '2026-10-26')).toBe('2026-10-26');
  });

  test('already charged this month → next month', () => {
    expect(nextChargeDate(26, '2026-10-01', '2026-10-26')).toBe('2026-11-26');
  });

  test('overdue and not charged (bot was down) → today', () => {
    expect(nextChargeDate(5, '2026-09-01', '2026-10-26')).toBe('2026-10-26');
  });

  test('day 31 is clamped to the last day of a short month', () => {
    expect(nextChargeDate(31, null, '2026-11-10')).toBe('2026-11-30');
    expect(nextChargeDate(31, '2027-01-01', '2027-01-31')).toBe('2027-02-28');
    expect(nextChargeDate(30, '2028-01-01', '2028-01-31')).toBe('2028-02-29');
  });

  test('December rolls over to January of the next year', () => {
    expect(nextChargeDate(1, '2026-12-01', '2026-12-15')).toBe('2027-01-01');
  });
});

describe('«✅ Уже оплатил» — a recurring payment paid ahead of its day', () => {
  const { nextChargeDate } = RecurringExpenseService;
  // Интернет 5-го: сегодня 29.10, за октябрь уже записано — ближайшее списание 05.11
  const row = { id: 3, amount: '800.00', currency: 'RUB', description: 'интернет', day_of_month: 5, category_id: 7, category_name: 'Дом', last_charged_month: '2026-10-01' };
  function service({ charged = true } = {}) {
    const repository = {
      getById: jest.fn(async () => row),
      chargeForMonth: jest.fn(async (recurring, month) => (charged ? { id: 77, amount: recurring.amount, currency: recurring.currency, month } : null)),
      undoCharge: jest.fn(async () => true)
    };
    const s = new RecurringExpenseService(repository, { getUserTimezone: async () => 'UTC' }, {}, {}, {}, { checkAfterExpense: jest.fn(async () => []) });
    return { s, repository };
  }

  test('a month marked paid ahead moves the next record past it', () => {
    expect(nextChargeDate(5, '2026-11-01', '2026-10-29')).toBe('2026-12-05');
    expect(nextChargeDate(5, '2026-11-01', '2026-11-03')).toBe('2026-12-05');
  });

  test('records now for the month of the nearest charge; a card from before that payment does not pay the next month', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-29T10:00:00Z'));
    try {
      const { s, repository } = service();
      const result = await s.payAhead(9, 3, '2026-11-01');
      expect(repository.chargeForMonth).toHaveBeenCalledWith(expect.objectContaining({ id: 3, user_id: 9, amount: '800.00' }), '2026-11-01');
      expect(result).toMatchObject({ status: 'ok', month: '2026-11-01', paidDate: '2026-11-05', nextChargeDate: '2026-12-05' });
      expect(await s.payAhead(9, 3, '2026-10-01')).toEqual({ status: 'duplicate' });
      expect(await service({ charged: false }).s.payAhead(9, 3, '2026-11-01')).toEqual({ status: 'duplicate' });
      await s.undoPayAhead(9, 3, '2026-11-01', 77);
      expect(repository.undoCharge).toHaveBeenCalledWith(9, 3, '2026-11-01', '2026-10-01', 77);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('EnhancedValidator.parseMoneyInput', () => {
  const validator = new EnhancedValidator();
  const income = { maxAmount: 9999999999, maxDescriptionLength: 80, requireDescription: false };
  const recurring = { maxAmount: 99999999, maxDescriptionLength: 80, requireDescription: true };

  test('amount without currency keeps currency null (user default applies)', () => {
    expect(validator.parseMoneyInput('50000 зарплата', income))
      .toEqual({ isValid: true, amount: 50000, currency: null, description: 'зарплата' });
  });

  test('currency code is case-insensitive, symbol may be attached to the amount', () => {
    expect(validator.parseMoneyInput('1000 usd фриланс', income)).toMatchObject({ amount: 1000, currency: 'USD', description: 'фриланс' });
    expect(validator.parseMoneyInput('300$', income)).toMatchObject({ amount: 300, currency: 'USD', description: null });
    expect(validator.parseMoneyInput('12,5 € кофе', income)).toMatchObject({ amount: 12.5, currency: 'EUR', description: 'кофе' });
  });

  test('unsupported 3-letter word stays part of the description', () => {
    expect(validator.parseMoneyInput('500 бар с друзьями', income)).toMatchObject({ currency: null, description: 'бар с друзьями' });
    expect(validator.parseMoneyInput('500 car wash', income)).toMatchObject({ currency: null, description: 'car wash' });
  });

  test('amount above the limit or zero is rejected', () => {
    expect(validator.parseMoneyInput('0 ноль', income)).toMatchObject({ isValid: false, error: 'amount' });
    expect(validator.parseMoneyInput('100000000 аренда', recurring)).toMatchObject({ isValid: false, error: 'amount' });
    expect(validator.parseMoneyInput('5000000 UZS аренда', recurring)).toMatchObject({ isValid: true, amount: 5000000, currency: 'UZS' });
  });

  test('recurring requires a description, currency alone is not one', () => {
    expect(validator.parseMoneyInput('500 USD', recurring)).toMatchObject({ isValid: false, error: 'no_description' });
  });

  test('text without a leading amount is a format error', () => {
    expect(validator.parseMoneyInput('аренда 50000', recurring)).toMatchObject({ isValid: false, error: 'format' });
    expect(validator.parseMoneyInput('50000аренда', recurring)).toMatchObject({ isValid: false, error: 'format' });
  });
});
