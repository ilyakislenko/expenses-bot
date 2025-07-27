const fetch = require('node-fetch');
const db = require('../database');

const BASE_CURRENCY = 'RUB';

async function getRate(currency) {
  if (currency === BASE_CURRENCY) return 1;
  const result = await db.query('SELECT rate FROM currency_rates WHERE currency = $1', [currency]);
  const row = result.rows[0];
  if (!row) throw new Error(`Нет курса для валюты: ${currency}`);
  return row.rate;
}

async function convert(amount, from, to) {
  if (from === to) return amount;
  const fromRate = await getRate(from);
  const toRate = await getRate(to);
  // amount в from -> RUB -> to
  const amountInBase = amount * fromRate;
  return amountInBase / toRate;
}

// Получить дату последнего обновления курсов
async function getLastRatesUpdate() {
  const result = await db.query('SELECT MAX(updated_at) as last_update FROM currency_rates');
  return result.rows[0]?.last_update ? new Date(result.rows[0].last_update) : null;
}

// Нужно ли обновлять курсы (если прошло больше 24 часов)
async function needUpdateRates() {
  const lastUpdate = await getLastRatesUpdate();
  if (!lastUpdate) return true;
  const now = new Date();
  return (now - lastUpdate) > 1000 * 60 * 60 * 24;
}

// Обновить курсы с ЦБ РФ только для нужных валют
async function updateRates(currencies) {
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
}

// Запускать обновление курсов раз в 24 часа
function startRatesAutoUpdate(currencies) {
  setInterval(() => {
    updateRates(currencies).then(() => {
      console.log('Курсы валют обновлены по расписанию!');
    }).catch(err => {
      console.error('Ошибка при автообновлении курсов валют:', err);
    });
  }, 1000 * 60 * 60 * 24); // 24 часа
}

module.exports = {
  getRate,
  convert,
  updateRates,
  needUpdateRates,
  startRatesAutoUpdate,
  BASE_CURRENCY
}; 