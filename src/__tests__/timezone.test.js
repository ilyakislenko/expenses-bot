const UserRepository = require('../repositories/UserRepository');
const { calculateTimezoneFromUserTime, getTimezoneDisplayName } = require('../utils/timezoneCalculator');

// Смещение пояса в минутах в момент date
function offsetAt(timezone, date) {
  const local = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((local - utc) / 60000);
}

describe('Timezone from the time the user picked', () => {
  // С секундами: отображаемое смещение не должно «съезжать» на минуту
  const winter = new Date('2026-01-15T12:15:45Z');
  const summer = new Date('2026-07-15T12:15:45Z');

  test('picked offset holds all year: no jump with daylight saving time', () => {
    // Берлин зимой: 13:15 при 12:15 UTC
    const timezone = calculateTimezoneFromUserTime(13, 15, winter);
    expect(offsetAt(timezone, winter)).toBe(60);
    expect(offsetAt(timezone, summer)).toBe(60);
    expect(getTimezoneDisplayName(timezone, winter)).toBe('UTC+1');

    // Нью-Йорк летом: 08:15 при 12:15 UTC
    const newYork = calculateTimezoneFromUserTime(8, 15, summer);
    expect(offsetAt(newYork, summer)).toBe(-240);
    expect(getTimezoneDisplayName(newYork, summer)).toBe('UTC-4');
  });

  test('offset wraps around midnight', () => {
    const lateUtc = new Date('2026-01-15T23:10:00Z');
    expect(offsetAt(calculateTimezoneFromUserTime(2, 10, lateUtc), lateUtc)).toBe(180); // уже следующий день
    expect(offsetAt(calculateTimezoneFromUserTime(13, 10, lateUtc), lateUtc)).toBe(-600); // Гавайи
  });

  test('a delay between showing the keyboard and the tap is rounded away', () => {
    // Клавиатура показана в 12:15 UTC, нажали в 12:40
    const tapped = new Date('2026-01-15T12:40:00Z');
    expect(offsetAt(calculateTimezoneFromUserTime(17, 15, tapped), tapped)).toBe(300);
  });

  test('UTC+5 is India (UTC+5:30) only for Hindi users', () => {
    expect(calculateTimezoneFromUserTime(17, 15, winter, { language: 'hi' })).toBe('Asia/Kolkata');
    expect(getTimezoneDisplayName('Asia/Kolkata', winter)).toBe('Asia/Kolkata (UTC+5:30)');
    expect(offsetAt(calculateTimezoneFromUserTime(17, 15, winter, { language: 'uz' }), winter)).toBe(300);
  });
});

describe('Timezone functionality', () => {
  describe('UserRepository.getUserTimezone', () => {
    let userRepository;

    beforeEach(() => {
      // Без конструктора: BaseRepository создаёт pg Pool, а тестам БД не нужна
      userRepository = Object.create(UserRepository.prototype);
      userRepository.query = jest.fn();
    });

    test('returns the stored timezone', async () => {
      userRepository.query.mockResolvedValue({ rows: [{ timezone: 'Europe/Moscow' }] });

      await expect(userRepository.getUserTimezone(123)).resolves.toBe('Europe/Moscow');
    });

    test('falls back to UTC for unknown user', async () => {
      userRepository.query.mockResolvedValue({ rows: [] });

      await expect(userRepository.getUserTimezone(123)).resolves.toBe('UTC');
    });

    test('falls back to UTC when timezone is not set', async () => {
      userRepository.query.mockResolvedValue({ rows: [{ timezone: null }] });

      await expect(userRepository.getUserTimezone(123)).resolves.toBe('UTC');
    });
  });
});
