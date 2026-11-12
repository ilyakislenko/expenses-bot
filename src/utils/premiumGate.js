const respond = require('./respond');
const { FAMILY_TARIFFS, FAMILY_PREMIUM, USER_LIMITS } = require('./constants');

// Что даёт закрытая функция — одна строка текста (Markdown) и её параметры
const FEATURES = {
  family: { key: 'premium_gate_family', params: () => ({ stars: FAMILY_TARIFFS.MONTH_1.stars, max: FAMILY_PREMIUM.MAX_MEMBERS }) },
  categories: { key: 'premium_gate_categories', params: () => ({ max: USER_LIMITS.premium.MAX_CUSTOM_CATEGORIES }) }
};

// Закрытая функция без премиума — вместо голого «только для премиум»: что даёт функция, кнопка «⭐️ Премиум»
// (экран подписки с тарифами) и «Назад» (back — callback, null — без кнопки). Из callback — тем же сообщением
// (всплывающее уведомление закрывается), из текста или команды — новым
async function premiumGate(ctx, { localizationService, lang, feature, back = null }) {
  const { key, params } = FEATURES[feature];
  const t = (textKey, values) => localizationService.getText(lang, textKey, values);
  if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
  const keyboard = [[{ text: t('button_premium'), callback_data: 'premium_subscription' }]];
  if (back) keyboard.push([{ text: t('button_back'), callback_data: back }]);
  await respond(ctx, t(key, params()), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
}

premiumGate.FEATURES = FEATURES;
module.exports = premiumGate;
