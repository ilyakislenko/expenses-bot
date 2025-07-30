const fetch = require('node-fetch');
const currencyConfig = require('../config/currencies');

function createCurrencyUtils(currencyRepository) {
  async function getRate(currency) {
    if (currency === currencyConfig.BASE_CURRENCY) return 1;
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
    return (now - lastUpdate) > currencyConfig.UPDATE_INTERVAL;
  }

  async function updateRates(currencies) {
    try {
      const res = await fetch(currencyConfig.API_URL);
      const data = await res.json();
      const valutes = data.Valute;
      const rates = [];
      
      for (const currency of currencies) {
        if (currency === currencyConfig.BASE_CURRENCY) {
          rates.push({ 
            currency: currencyConfig.BASE_CURRENCY, 
            rate: 1, 
            baseCurrency: currencyConfig.BASE_CURRENCY 
          });
          continue;
        }
        const v = valutes[currency];
        if (!v) continue;
        const rate = v.Value / v.Nominal;
        rates.push({ 
          currency, 
          rate, 
          baseCurrency: currencyConfig.BASE_CURRENCY 
        });
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
    }, currencyConfig.UPDATE_INTERVAL);
  }

  return {
    getRate,
    convert,
    updateRates,
    needUpdateRates,
    startRatesAutoUpdate,
    BASE_CURRENCY: currencyConfig.BASE_CURRENCY
  };
}

module.exports = createCurrencyUtils; 