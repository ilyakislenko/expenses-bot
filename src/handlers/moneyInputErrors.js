// Текст ошибки разбора ввода "сумма [валюта] описание" (validator.parseMoneyInput).
// kind — префикс ключей локализации: 'income' | 'recurring'.
async function moneyInputErrorText({ localizationService, premiumService }, userId, lang, error, kind, maxAmount) {
  if (error === 'amount') {
    return localizationService.getText(lang, `${kind}_error_amount`, { max: new Intl.NumberFormat('ru-RU').format(maxAmount) });
  }
  if (error === 'too_long') {
    const isPremium = await premiumService.isPremiumUser(userId);
    return localizationService.getText(lang, isPremium ? 'error_too_long_premium' : 'error_too_long_regular');
  }
  return localizationService.getText(lang, `${kind}_error_format`);
}

module.exports = moneyInputErrorText;
