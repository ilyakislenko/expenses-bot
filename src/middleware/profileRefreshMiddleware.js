const logger = require('../utils/logger');

// Username и имя в Telegram меняются без ведома бота, а по username ищут приглашаемых в семью.
// Обновляем их из ctx.from при каждом апдейте, но в БД пишем только при изменении:
// последнее записанное значение держим в памяти (несколько десятков пользователей).
module.exports = function profileRefreshMiddleware(userRepository) {
  const known = new Map(); // userId -> "username\nfirst_name"

  return async (ctx, next) => {
    const from = ctx.from;
    if (from && !from.is_bot) {
      const username = from.username || null;
      const firstName = from.first_name || null;
      const key = `${username}\n${firstName}`;
      if (known.get(from.id) !== key) {
        try {
          await userRepository.refreshProfile(from.id, username, firstName);
          known.set(from.id, key);
        } catch (error) {
          logger.warn('Profile refresh failed', { userId: from.id, error: error.message });
        }
      }
    }
    return next();
  };
};
