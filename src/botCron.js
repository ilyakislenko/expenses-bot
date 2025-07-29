module.exports = function setupBotCron(cron, currencyUtils, supportedCurrencies = ['RUB', 'USD', 'EUR', 'KZT', 'CNY', 'THB']) {
  // Проверяем, нужно ли обновлять курсы при запуске
  (async () => {
    try {
      if (await currencyUtils.needUpdateRates()) {
        await currencyUtils.updateRates(supportedCurrencies);
        console.log('Курсы валют успешно обновлены!');
      }
    } catch (err) {
      console.error('Ошибка при обновлении курсов валют:', err);
    }
  })();

  // Запускаем автообновление курсов каждый день в 10:00 утра
  cron.schedule('0 10 * * *', () => {
    currencyUtils.updateRates(supportedCurrencies)
      .then(() => console.log('Курсы валют обновлены по расписанию (cron)!'))
      .catch(err => console.error('Ошибка при автообновлении курсов валют (cron):', err));
  });
}; 