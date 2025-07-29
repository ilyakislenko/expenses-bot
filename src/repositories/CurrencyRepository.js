const BaseRepository = require('./BaseRepository');

class CurrencyRepository extends BaseRepository {
  async getRate(currency) {
    const result = await this.query('SELECT rate FROM currency_rates WHERE currency = $1', [currency]);
    const row = result.rows[0];
    if (!row) throw new Error(`Нет курса для валюты: ${currency}`);
    return row.rate;
  }

  async getLastRatesUpdate() {
    const result = await this.query('SELECT MAX(updated_at) as last_update FROM currency_rates');
    return result.rows[0]?.last_update ? new Date(result.rows[0].last_update) : null;
  }

  async updateRates(rates) {
    const now = new Date().toISOString();
    const queries = [];
    
    for (const { currency, rate, baseCurrency } of rates) {
      queries.push(
        this.query(
          `INSERT INTO currency_rates (currency, rate, base_currency, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT(currency) DO UPDATE SET rate=excluded.rate, updated_at=excluded.updated_at`,
          [currency, rate, baseCurrency, now]
        )
      );
    }
    
    await Promise.all(queries);
  }
}

module.exports = CurrencyRepository; 