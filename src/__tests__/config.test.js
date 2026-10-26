const currencies = require('../config/currencies');

describe('Configuration invariants', () => {
  // BASE_CURRENCY is the fallback for users without a chosen currency
  // (UserRepository.getUserCurrency), so it must be selectable.
  it('BASE_CURRENCY is one of SUPPORTED_CURRENCIES', () => {
    expect(currencies.SUPPORTED_CURRENCIES).toContain(currencies.BASE_CURRENCY);
  });
});
