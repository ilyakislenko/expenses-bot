const crypto = require('crypto');

// Проверка Telegram.WebApp.initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
// secret = HMAC_SHA256(key = "WebAppData", data = токен бота), hash = HMAC_SHA256(key = secret, data = data_check_string),
// где data_check_string — пары key=value без hash, по алфавиту, через «\n». Подпись сравнивается за постоянное время;
// данные старше maxAgeSec не принимаются (украденную строку не используют вечно).
// → { id, language_code, … } пользователя или null
function verifyInitData(initData, botToken, { maxAgeSec = 24 * 3600, now = Date.now() } = {}) {
  if (!initData || typeof initData !== 'string' || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest();
  if (!crypto.timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null;

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || now / 1000 - authDate > maxAgeSec) return null;
  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user && Number.isSafeInteger(user.id) ? user : null;
  } catch (error) {
    return null;
  }
}

// Подписать initData (тесты и проверка на сервере): пары → строка с hash, как её присылает Telegram
function signInitData(fields, botToken) {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}

module.exports = { verifyInitData, signInitData };
