const BaseRepository = require('./BaseRepository');

// Накопления: копилки (общая — одна на пользователя, счета, цели — kind 'goal'), долги (kind 'debt'),
// операции и параметры прогноза.
// Цель в режиме 'total' своих денег не хранит (balance = 0) — прогресс считается от всех накоплений.
// Долг: balance — сколько осталось вернуть, yield_rate — ставка по долгу, monthly_payment — платёж в месяц.
class SavingsRepository extends BaseRepository {
  async getPots(userId) {
    const result = await this.query(
      `SELECT * FROM savings_pots WHERE user_id = $1
       ORDER BY CASE kind WHEN 'general' THEN 0 WHEN 'account' THEN 1 WHEN 'goal' THEN 2 ELSE 3 END, created_at, id`,
      [userId]
    );
    return result.rows;
  }

  async getPot(userId, potId) {
    const result = await this.query('SELECT * FROM savings_pots WHERE id = $1 AND user_id = $2', [potId, userId]);
    return result.rows[0];
  }

  // Общая копилка создаётся при первом заходе в раздел, в основной валюте пользователя
  async ensureGeneralPot(userId, currency) {
    await this.query(
      `INSERT INTO savings_pots (user_id, kind, currency) VALUES ($1, 'general', $2)
       ON CONFLICT (user_id) WHERE kind = 'general' DO NOTHING`,
      [userId, currency]
    );
    const result = await this.query(`SELECT * FROM savings_pots WHERE user_id = $1 AND kind = 'general'`, [userId]);
    return result.rows[0];
  }

  async countGoals(userId) {
    const result = await this.query(`SELECT COUNT(*)::int AS n FROM savings_pots WHERE user_id = $1 AND kind = 'goal'`, [userId]);
    return result.rows[0].n;
  }

  async countAccounts(userId) {
    const result = await this.query(`SELECT COUNT(*)::int AS n FROM savings_pots WHERE user_id = $1 AND kind = 'account'`, [userId]);
    return result.rows[0].n;
  }

  async countDebts(userId) {
    const result = await this.query(`SELECT COUNT(*)::int AS n FROM savings_pots WHERE user_id = $1 AND kind = 'debt'`, [userId]);
    return result.rows[0].n;
  }

  // Новый долг с суммой и ставкой (null — без процентов); первая сумма — операция 'set', как у точной суммы
  async createDebt(userId, { name, amount, currency, rate }) {
    return this.transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO savings_pots (user_id, kind, name, balance, currency, yield_rate) VALUES ($1, 'debt', $2, $3, $4, $5) RETURNING *`,
        [userId, name, amount, currency, rate]
      );
      const debt = result.rows[0];
      await client.query(`INSERT INTO savings_operations (user_id, pot_id, amount, kind) VALUES ($1, $2, $3, 'set')`, [userId, debt.id, amount]);
      return debt;
    });
  }

  // fields: name, yield_rate, monthly_payment (null — без процентов / платёж не задан) — только для долгов
  async updateDebt(userId, potId, fields) {
    const allowed = ['name', 'yield_rate', 'monthly_payment'];
    const keys = Object.keys(fields).filter(key => allowed.includes(key));
    if (!keys.length) return null;
    const set = keys.map((key, index) => `${key} = $${index + 3}`).join(', ');
    const result = await this.query(
      `UPDATE savings_pots SET ${set} WHERE id = $1 AND user_id = $2 AND kind = 'debt' RETURNING *`,
      [potId, userId, ...keys.map(key => fields[key])]
    );
    return result.rows[0];
  }

  // Удаление долга: деньги никуда не переходят
  async deleteDebt(userId, potId) {
    const result = await this.query(`DELETE FROM savings_pots WHERE id = $1 AND user_id = $2 AND kind = 'debt' RETURNING *`, [potId, userId]);
    return result.rows[0];
  }

  async createAccount(userId, { name, currency, yieldRate }) {
    const result = await this.query(
      `INSERT INTO savings_pots (user_id, kind, name, currency, yield_rate) VALUES ($1, 'account', $2, $3, $4) RETURNING *`,
      [userId, name, currency, yieldRate]
    );
    return result.rows[0];
  }

  // fields: name, yield_rate — для счетов и общей копилки (у общей name NULL — название по умолчанию)
  async updateAccount(userId, potId, fields) {
    const allowed = ['name', 'yield_rate'];
    const keys = Object.keys(fields).filter(key => allowed.includes(key));
    if (!keys.length) return this.getPot(userId, potId);
    const set = keys.map((key, index) => `${key} = $${index + 3}`).join(', ');
    const result = await this.query(
      `UPDATE savings_pots SET ${set} WHERE id = $1 AND user_id = $2 AND kind IN ('general', 'account') RETURNING *`,
      [potId, userId, ...keys.map(key => fields[key])]
    );
    return result.rows[0];
  }

  // Валюта нового счёта (выбирается кнопкой после названия): только пока на счёте ничего нет
  async setAccountCurrency(userId, potId, currency) {
    const result = await this.query(
      `UPDATE savings_pots SET currency = $3 WHERE id = $1 AND user_id = $2 AND kind = 'account' AND balance = 0 RETURNING *`,
      [potId, userId, currency]
    );
    return result.rows[0];
  }

  // Новая цель — «от всех накоплений» (своя копилка — по выбору в настройках цели)
  async createGoal(userId, { name, targetAmount, currency }) {
    const result = await this.query(
      `INSERT INTO savings_pots (user_id, kind, name, target_amount, currency, goal_mode) VALUES ($1, 'goal', $2, $3, $4, 'total') RETURNING *`,
      [userId, name, targetAmount, currency]
    );
    return result.rows[0];
  }

  // fields: name, target_amount, target_date, achieved_at — только для целей
  async updateGoal(userId, potId, fields) {
    const allowed = ['name', 'target_amount', 'target_date', 'achieved_at'];
    const keys = Object.keys(fields).filter(key => allowed.includes(key));
    if (!keys.length) return this.getPot(userId, potId);
    const set = keys.map((key, index) => `${key} = $${index + 3}`).join(', ');
    const result = await this.query(
      `UPDATE savings_pots SET ${set} WHERE id = $1 AND user_id = $2 AND kind = 'goal' RETURNING *`,
      [potId, userId, ...keys.map(key => fields[key])]
    );
    return result.rows[0];
  }

  // Пополнение (change > 0), снятие (change < 0) или точная сумма: change — функция от текущего баланса,
  // считается под блокировкой строки. debt = true — только для долгов (увеличить, погасить, точная сумма),
  // иначе — только для накоплений. { pot, delta } или { error: 'not_found' | 'insufficient' | 'not_own' }
  async changeBalance(userId, potId, change, kind, debt = false) {
    return this.transaction(async (client) => {
      const locked = await client.query('SELECT * FROM savings_pots WHERE id = $1 AND user_id = $2 FOR UPDATE', [potId, userId]);
      const pot = locked.rows[0];
      if (!pot || (pot.kind === 'debt') !== debt) return { error: 'not_found' };
      if (pot.kind === 'goal' && pot.goal_mode !== 'own') return { error: 'not_own' };
      const delta = typeof change === 'function' ? change(Number(pot.balance)) : change;
      const balance = Number(pot.balance) + delta;
      if (balance < 0) return { error: 'insufficient' };
      const updated = await client.query('UPDATE savings_pots SET balance = $3 WHERE id = $1 AND user_id = $2 RETURNING *', [potId, userId, balance]);
      if (delta !== 0) {
        await client.query('INSERT INTO savings_operations (user_id, pot_id, amount, kind) VALUES ($1, $2, $3, $4)', [userId, potId, delta, kind]);
      }
      return { pot: updated.rows[0], delta };
    });
  }

  // Перевод между своими копилками (не долгами): amountFrom списывается в валюте источника, amountTo зачисляется в валюте получателя
  async transfer(userId, fromId, toId, amountFrom, amountTo) {
    return this.transaction(async (client) => {
      const locked = await client.query(
        'SELECT * FROM savings_pots WHERE id = ANY($1) AND user_id = $2 ORDER BY id FOR UPDATE',
        [[fromId, toId], userId]
      );
      const from = locked.rows.find(p => p.id === fromId);
      const to = locked.rows.find(p => p.id === toId);
      if (!from || !to || fromId === toId || [from, to].some(p => p.kind === 'debt')) return { error: 'not_found' };
      if ([from, to].some(p => p.kind === 'goal' && p.goal_mode !== 'own')) return { error: 'not_own' };
      if (Number(from.balance) < amountFrom) return { error: 'insufficient' };
      const updatedFrom = await client.query('UPDATE savings_pots SET balance = balance - $2 WHERE id = $1 RETURNING *', [fromId, amountFrom]);
      const updatedTo = await client.query('UPDATE savings_pots SET balance = balance + $2 WHERE id = $1 RETURNING *', [toId, amountTo]);
      await client.query(
        `INSERT INTO savings_operations (user_id, pot_id, amount, kind) VALUES ($1, $2, $3, 'transfer'), ($1, $4, $5, 'transfer')`,
        [userId, fromId, -amountFrom, toId, amountTo]
      );
      return { from: updatedFrom.rows[0], to: updatedTo.rows[0] };
    });
  }

  // Деньги цели или счёта уходят в общую копилку (toGeneral — сумма в валюте общей); вызывается внутри транзакции
  async moveBalanceToGeneral(client, userId, pot, toGeneral) {
    if (Number(pot.balance) <= 0) return;
    const general = await client.query(
      `UPDATE savings_pots SET balance = balance + $2 WHERE user_id = $1 AND kind = 'general' RETURNING id`,
      [userId, toGeneral]
    );
    await client.query('UPDATE savings_pots SET balance = 0 WHERE id = $1', [pot.id]);
    await client.query(
      `INSERT INTO savings_operations (user_id, pot_id, amount, kind) VALUES ($1, $2, $3, 'transfer'), ($1, $4, $5, 'transfer')`,
      [userId, pot.id, -Number(pot.balance), general.rows[0].id, toGeneral]
    );
  }

  // Удаление цели или счёта (kind 'goal' | 'account'): деньги не пропадают — переходят в общую копилку.
  // convertToGeneral(amount, currency) — сумма в валюте общей копилки.
  async deletePot(userId, potId, kind, convertToGeneral) {
    const pot = await this.getPot(userId, potId);
    if (!pot || pot.kind !== kind) return null;
    const toGeneral = await convertToGeneral(Number(pot.balance), pot.currency);
    return this.transaction(async (client) => {
      const locked = await client.query('SELECT * FROM savings_pots WHERE id = $1 AND user_id = $2 AND kind = $3 FOR UPDATE', [potId, userId, kind]);
      if (!locked.rows[0]) return null;
      await this.moveBalanceToGeneral(client, userId, locked.rows[0], toGeneral);
      await client.query('DELETE FROM savings_pots WHERE id = $1', [potId]);
      return { pot: locked.rows[0], moved: Number(locked.rows[0].balance) };
    });
  }

  // Режим цели: 'own' — своя копилка, 'total' — от всех накоплений (свои деньги цели уходят в общую)
  async setGoalMode(userId, potId, mode, convertToGeneral) {
    const goal = await this.getPot(userId, potId);
    if (!goal || goal.kind !== 'goal') return null;
    const toGeneral = await convertToGeneral(Number(goal.balance), goal.currency);
    return this.transaction(async (client) => {
      const locked = await client.query(`SELECT * FROM savings_pots WHERE id = $1 AND user_id = $2 AND kind = 'goal' FOR UPDATE`, [potId, userId]);
      if (!locked.rows[0]) return null;
      const moved = mode === 'total' ? Number(locked.rows[0].balance) : 0;
      if (moved > 0) await this.moveBalanceToGeneral(client, userId, locked.rows[0], toGeneral);
      const updated = await client.query('UPDATE savings_pots SET goal_mode = $2 WHERE id = $1 RETURNING *', [potId, mode]);
      return { goal: updated.rows[0], moved };
    });
  }

  async getRecentOperations(userId, potId, limit = 5) {
    const result = await this.query(
      'SELECT * FROM savings_operations WHERE user_id = $1 AND pot_id = $2 ORDER BY created_at DESC, id DESC LIMIT $3',
      [userId, potId, limit]
    );
    return result.rows;
  }

  async getSettings(userId) {
    const result = await this.query('SELECT * FROM savings_settings WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  // fields: monthly_contribution, inflation_rate, yield_rate, contribution_growth (null — сброс)
  async updateSettings(userId, fields) {
    const allowed = ['monthly_contribution', 'inflation_rate', 'yield_rate', 'contribution_growth'];
    const keys = Object.keys(fields).filter(key => allowed.includes(key));
    if (!keys.length) return this.getSettings(userId);
    const columns = keys.join(', ');
    const values = keys.map((_, index) => `$${index + 2}`).join(', ');
    const set = keys.map(key => `${key} = EXCLUDED.${key}`).join(', ');
    const result = await this.query(
      `INSERT INTO savings_settings (user_id, ${columns}) VALUES ($1, ${values})
       ON CONFLICT (user_id) DO UPDATE SET ${set}, updated_at = NOW()
       RETURNING *`,
      [userId, ...keys.map(key => fields[key])]
    );
    return result.rows[0];
  }
}

module.exports = SavingsRepository;
