const { customPeriod, dayPeriod } = require('../utils/period');

describe('customPeriod', () => {
  test('calendar month when the period starts on day 1', () => {
    expect(customPeriod('2026-10-26', 1)).toEqual({ start: '2026-10-01', end: '2026-11-01', last: '2026-10-31' });
  });

  test('before the start day the period began last month', () => {
    expect(customPeriod('2026-10-03', 5)).toEqual({ start: '2026-09-05', end: '2026-10-05', last: '2026-10-04' });
  });

  test('start day 31 is clamped in short months and today stays inside the period', () => {
    // 30 ноября: период начался 30.11 (31 → последний день), а не 31.10
    expect(customPeriod('2026-11-30', 31)).toEqual({ start: '2026-11-30', end: '2026-12-31', last: '2026-12-30' });
    expect(customPeriod('2027-02-28', 31)).toEqual({ start: '2027-02-28', end: '2027-03-31', last: '2027-03-30' });
  });

  test('offset moves whole periods back across the year boundary', () => {
    expect(customPeriod('2026-01-10', 5, -1)).toEqual({ start: '2025-12-05', end: '2026-01-05', last: '2026-01-04' });
    expect(customPeriod('2026-01-10', 1, -13)).toEqual({ start: '2024-12-01', end: '2025-01-01', last: '2024-12-31' });
  });
});

describe('dayPeriod', () => {
  test('previous day across a month boundary', () => {
    expect(dayPeriod('2026-03-01', -1)).toEqual({ start: '2026-02-28', end: '2026-03-01', last: '2026-02-28' });
  });
});
