const BaseRepository = require('./BaseRepository');

// category_name = null — общий бюджет на период.
// owner — id пользователя (его личные бюджеты) или { familyId } (семейные: общие для участников, family_id)
function ownerFilter(owner) {
  return owner && typeof owner === 'object'
    ? { sql: 'b.family_id = $1', value: owner.familyId }
    : { sql: 'b.user_id = $1 AND b.family_id IS NULL', value: owner };
}

class BudgetRepository extends BaseRepository {
  async getByOwner(owner) {
    const filter = ownerFilter(owner);
    const query = `
      SELECT b.id, b.category_name, b.amount::float AS amount, b.currency, b.created_at, b.family_id,
             (SELECT MIN(c.icon) FROM categories c WHERE c.name = b.category_name AND c.user_id IN (0, b.user_id)) AS icon
      FROM category_budgets b
      WHERE ${filter.sql}
      ORDER BY b.category_name IS NOT NULL, b.category_name
    `;
    const result = await this.query(query, [filter.value]);
    return result.rows;
  }

  // userId — кто заводит (у семейного — автор)
  async upsert(owner, userId, categoryName, amount, currency) {
    const family = owner && typeof owner === 'object';
    const query = family
      ? `INSERT INTO category_budgets (user_id, family_id, category_name, amount, currency)
         VALUES ($1, $5, $2, $3, $4)
         ON CONFLICT (family_id, (COALESCE(category_name, ''))) WHERE family_id IS NOT NULL
         DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency
         RETURNING id`
      : `INSERT INTO category_budgets (user_id, category_name, amount, currency)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, (COALESCE(category_name, ''))) WHERE family_id IS NULL
         DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency
         RETURNING id`;
    const params = family ? [userId, categoryName, amount, currency, owner.familyId] : [userId, categoryName, amount, currency];
    const result = await this.query(query, params);
    return result.rows[0];
  }

  async deleteById(owner, budgetId) {
    const filter = ownerFilter(owner);
    const result = await this.query(`DELETE FROM category_budgets b WHERE ${filter.sql} AND b.id = $2 RETURNING b.id`, [filter.value, budgetId]);
    return result.rowCount > 0;
  }

  // Включили «все траты в семью»: личные бюджеты переходят в семью, если у семьи бюджета на эту категорию ещё нет
  async moveToFamily(userId, familyId) {
    const result = await this.query(`
      UPDATE category_budgets b SET family_id = $2
      WHERE b.user_id = $1 AND b.family_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM category_budgets f
                        WHERE f.family_id = $2 AND COALESCE(f.category_name, '') = COALESCE(b.category_name, ''))
      RETURNING b.id
    `, [userId, familyId]);
    return result.rowCount;
  }

  // Категорию переименовали: бюджет переходит на новое имя, если старого имени больше нет среди
  // категорий пользователя и на новое имя бюджета ещё нет
  async renameCategory(userId, oldName, newName) {
    await this.query(`
      UPDATE category_budgets b SET category_name = $3
      WHERE b.user_id = $1 AND b.family_id IS NULL AND b.category_name = $2
        AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = $2 AND c.user_id IN (0, $1))
        AND NOT EXISTS (SELECT 1 FROM category_budgets x WHERE x.user_id = $1 AND x.family_id IS NULL AND x.category_name = $3)
    `, [userId, oldName, newName]);
    await this.deleteOrphan(userId, oldName);
  }

  // Бюджет категории, которой у пользователя больше нет (удалили или переименовали)
  async deleteOrphan(userId, categoryName) {
    await this.query(`
      DELETE FROM category_budgets b
      WHERE b.user_id = $1 AND b.family_id IS NULL AND b.category_name = $2
        AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = $2 AND c.user_id IN (0, $1))
    `, [userId, categoryName]);
  }
}

module.exports = BudgetRepository;
