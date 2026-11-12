const logger = require('./logger');
const { PREMIUM_TARIFFS, tariffDiscount } = require('./constants');

// Год и месяц — кнопками-ссылками на счёт Stars прямо в сообщении (экран подписки, конец пробного периода):
// выгоднее — первым. При действующей месячной подписке вторую не предлагаем. Ссылку не создали (Telegram
// недоступен) — кнопок нет, остаётся «Все тарифы»
async function quickTariffRows(paymentService, localizationService, userId, lang, { subscription = false, track = true } = {}) {
  if (!paymentService) return [];
  const year = PREMIUM_TARIFFS.MONTH_12;
  const month = PREMIUM_TARIFFS.MONTH_1;
  const tariffs = subscription ? [year] : [year, month];
  try {
    const links = await Promise.all(tariffs.map(tariff => paymentService.createInvoiceLink(userId, tariff, lang, { track })));
    return tariffs.map((tariff, i) => [{
      text: tariff === year
        ? localizationService.getText(lang, 'premium_pay_year', { stars: year.stars, percent: tariffDiscount(year).percent })
        : localizationService.getText(lang, 'premium_pay_month', { stars: month.stars }),
      url: links[i]
    }]);
  } catch (error) {
    logger.warn('Quick tariff links not created', { userId, error: error.message });
    return [];
  }
}

// «≈ 83 ⭐ в месяц при оплате за год» — звёзды годового тарифа в пересчёте на месяц
function yearPerMonthStars() {
  const year = PREMIUM_TARIFFS.MONTH_12;
  return Math.round(year.stars / year.months);
}

module.exports = { quickTariffRows, yearPerMonthStars };
