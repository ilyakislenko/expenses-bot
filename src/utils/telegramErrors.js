// Ошибки Telegram, после которых писать пользователю бесполезно, пока он сам не напишет боту:
// 403 «bot was blocked by the user», «user is deactivated» (аккаунт удалён), «bot can't initiate conversation»
// (не нажимал Start). 429, 5xx, сеть и прочие 4xx — временные или про конкретное сообщение: не они.
const UNREACHABLE = /bot was blocked by the user|user is deactivated|bot can't initiate conversation with a user/i;

function isUnreachableError(error) {
  if (!error) return false;
  // TelegramError (Telegraf): code и description из ответа API, message — «403: Forbidden: …»
  const response = error.response || {};
  const code = response.error_code ?? error.code;
  const message = String(error.message || '');
  const description = String(response.description || error.description || message);
  return (code === 403 || /^403\b/.test(message)) && UNREACHABLE.test(description);
}

module.exports = { isUnreachableError };
