const { customPeriod, dayPeriod, lastDaysPeriod, parseDateRange } = require('../utils/period');

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

describe('lastDaysPeriod', () => {
  test('last 7 days include today and cross the month boundary', () => {
    expect(lastDaysPeriod('2026-03-03', 7)).toEqual({ start: '2026-02-25', end: '2026-03-04', last: '2026-03-03' });
  });
});

describe('parseDateRange', () => {
  test('range with any dash and spacing; the last day is included', () => {
    const expected = { start: '2026-03-01', end: '2026-03-16', last: '2026-03-15' };
    expect(parseDateRange('01.03.2026 - 15.03.2026')).toEqual(expected);
    expect(parseDateRange(' 1.3.2026–15.03.2026 ')).toEqual(expected);
    expect(parseDateRange('01.03.2026 — 15.03.2026')).toEqual(expected);
  });

  test('single date is one day, also at the end of a year', () => {
    expect(parseDateRange('31.12.2025')).toEqual({ start: '2025-12-31', end: '2026-01-01', last: '2025-12-31' });
  });

  test('same start and end date is one day', () => {
    expect(parseDateRange('29.02.2028 - 29.02.2028')).toEqual({ start: '2028-02-29', end: '2028-03-01', last: '2028-02-29' });
  });

  test('non-existent dates and wrong formats are rejected', () => {
    for (const text of ['29.02.2026', '31.04.2026', '00.01.2026', '01.13.2026', '01.03.26', '01.03', '2026-03-01',
      '01.03.2026 -', '01.03.2026 - 02.03.2026 - 03.03.2026', 'вчера', '']) {
      expect(parseDateRange(text)).toEqual({ error: 'format' });
    }
  });

  test('start after end is an order error', () => {
    expect(parseDateRange('16.03.2026 - 15.03.2026')).toEqual({ error: 'order' });
    expect(parseDateRange('01.01.2027 - 31.12.2026')).toEqual({ error: 'order' });
  });
});
