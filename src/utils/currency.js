const fetch = require('node-fetch');

const BASE_CURRENCY = 'RUB';

function createCurrencyUtils(db) {
  async function getRate(currency) {
    if (currency === BASE_CURRENCY) return 1;
    try {
      const result = await db.query('SELECT rate FROM currency_rates WHERE currency = $1', [currency]);
      const row = result.rows[0];
      if (!row) throw new Error(`Нет курса для валюты: ${currency}`);
      return row.rate;
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
      const result = await db.query('SELECT MAX(updated_at) as last_update FROM currency_rates');
      return result.rows[0]?.last_update ? new Date(result.rows[0].last_update) : null;
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
      const now = new Date().toISOString();
      const queries = [];
      for (const currency of currencies) {
        if (currency === BASE_CURRENCY) {
          queries.push(
            db.query(
              `INSERT INTO currency_rates (currency, rate, base_currency, updated_at)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT(currency) DO UPDATE SET rate=excluded.rate, updated_at=excluded.updated_at`,
              [BASE_CURRENCY, 1, BASE_CURRENCY, now]
            )
          );
          continue;
        }
        const v = valutes[currency];
        if (!v) continue;
        const rate = v.Value / v.Nominal;
        queries.push(
          db.query(
            `INSERT INTO currency_rates (currency, rate, base_currency, updated_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT(currency) DO UPDATE SET rate=excluded.rate, updated_at=excluded.updated_at`,
            [currency, rate, BASE_CURRENCY, now]
          )
        );
      }
      await Promise.all(queries);
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