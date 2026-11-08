const logger = require('../../utils/logger');
const { BOT } = require('../../config/bot');

// Общее для модулей раздела «Ещё» (settings, family, premium, admin)

// Имя бота для ссылок t.me: известно после запуска бота, до этого — из настроек
function botUsername(get) {
  const bot = get('bot');
  return (bot && bot.botInfo && bot.botInfo.username) || BOT.username;
}

// Reply-клавиатура в чате с ботом: после смены языка или режима «все траты в семью» бот присылает новую (как
// CallbackHandlers.handleLanguageSelection / CommandHandlers.toggleFamilyMode). Не доставилось — не мешает настройке
async function refreshChatKeyboard(get, userId, lang, text) {
  try {
    const markup = await get('commandHandlers').mainKeyboardMarkup(userId, lang);
    await get('notificationService').sendMessage(userId, text, { reply_markup: markup });
  } catch (error) {
    logger.warn('Mini app: chat keyboard not refreshed', { userId, error: error.message });
  }
}

const iso = (value) => (value ? new Date(value).toISOString() : null);
// Цена тарифа в основной валюте пользователя по курсу USD (как экраны тарифов бота: курс — по цене base); без курса — USD
async function priceConverter(get, currency, base) {
  const formatter = get('formatter');
  try {
    const rate = (await formatter.currencyUtils.convert(base, 'USD', currency)) / base;
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('no rate');
    return { currency, price: (usd) => Math.round(usd * rate * 100) / 100 };
  } catch (error) {
    return { currency: 'USD', price: (usd) => usd };
  }
}

module.exports = { botUsername, refreshChatKeyboard, iso, priceConverter };
