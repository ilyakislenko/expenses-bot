const fetch = require('node-fetch');

const BASE_CURRENCY = 'RUB';

function createCurrencyUtils(currencyRepository) {
  async function getRate(currency) {
    if (currency === BASE_CURRENCY) return 1;
    try {
      return await currencyRepository.getRate(currency);
    } catch (err) {
      console.error('Ошибка при получении курса валюты:', err);
      throw err;
    }
  }

  async function convert(amount, from, to) {
    if (from === to) return amount;
    try {
      const fromRate = await getRate(from);
      const toRate = await getRate(to);
      if (!fromRate || !toRate) throw new Error('Не удалось получить курс валюты');
      const amountInBase = amount * fromRate;
      return amountInBase / toRate;
    } catch (err) {
      console.error('Ошибка при конвертации валюты:', err);
      throw err;
    }
  }

  async function getLastRatesUpdate() {
    try {
      return await currencyRepository.getLastRatesUpdate();
    } catch (err) {
      console.error('Ошибка при получении даты последнего обновления курсов:', err);
      return null;
    }
  }

  async function needUpdateRates() {
    const lastUpdate = await getLastRatesUpdate();
    if (!lastUpdate) return true;
    const now = new Date();
    return (now - lastUpdate) > 1000 * 60 * 60 * 24;
  }

  async function updateRates(currencies) {
    try {
      const url = 'https://www.cbr-xml-daily.ru/daily_json.js';
      const res = await fetch(url);
      const data = await res.json();
      const valutes = data.Valute;
      const rates = [];
      
      for (const currency of currencies) {
        if (currency === BASE_CURRENCY) {
          rates.push({ currency: BASE_CURRENCY, rate: 1, baseCurrency: BASE_CURRENCY });
          continue;
        }
        const v = valutes[currency];
        if (!v) continue;
        const rate = v.Value / v.Nominal;
        rates.push({ currency, rate, baseCurrency: BASE_CURRENCY });
      }
      
      await currencyRepository.updateRates(rates);
    } catch (err) {
      console.error('Ошибка при обновлении курсов валют:', err);
      throw err;
    }
  }

  function startRatesAutoUpdate(currencies) {
    setInterval(() => {
      updateRates(currencies).then(() => {
        console.log('Курсы валют обновлены по расписанию!');
      }).catch(err => {
        console.error('Ошибка при автообновлении курсов валют:', err);
      });
    }, 1000 * 60 * 60 * 24); // 24 часа
  }

  return {
    getRate,
    convert,
    updateRates,
    needUpdateRates,
    startRatesAutoUpdate,
    BASE_CURRENCY
  };
}

module.exports = createCurrencyUtils; 