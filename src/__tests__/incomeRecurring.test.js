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
