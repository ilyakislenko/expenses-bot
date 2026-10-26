const BaseRepository = require('./BaseRepository');

class CategoryRepository extends BaseRepository {
  async getCategoryById(categoryId) {
    const query = `
      SELECT * FROM categories WHERE id = $1
    `;
    const result = await this.query(query, [categoryId]);
    return result.rows[0];
  }

  // Системная (user_id = 0) или собственная категория пользователя
  async getAvailableCategoryById(userId, categoryId) {
    const result = await this.query(
      'SELECT * FROM categories WHERE id = $1 AND user_id IN (0, $2)',
      [categoryId, userId]
    );
    return result.rows[0];
  }
  async getCategories(userId) {
    // Получаем только системные категории (user_id = 0)
    const query = `
      SELECT * FROM categories 
      WHERE user_id = 0 
      ORDER BY name
    `;
    const result = await this.query(query);
    return result.rows;
  }

  async getCategoryByName(userId, categoryName) {
    const query = `
      SELECT * FROM categories WHERE user_id = $1 AND name = $2
    `;
    const result = await this.query(query, [userId, categoryName]);
    return result.rows[0];
  }

  // Методы для премиум-функций
  async createUserCategory(userId, name, icon = '📦') {
    const query = `
      INSERT INTO categories (user_id, name, icon) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;
    const result = await this.query(query, [userId, name, icon]);
    return result.rows[0];
  }

  async getUserCategories(userId) {
    const query = `
      SELECT * FROM categories 
      WHERE user_id = $1 
      ORDER BY name
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }

  async deleteUserCategory(userId, categoryId) {
    const query = `
      DELETE FROM categories 
      WHERE id = $1 AND user_id = $2 
      RETURNING *
    `;
    const result = await this.query(query, [categoryId, userId]);
    return result.rows[0];
  }

  // Удаление своей категории: её траты переносятся в fallback, только если категория принадлежит пользователю.
  // Перенос до удаления (FK expenses.category_id ON DELETE SET NULL), всё в одной транзакции.
  async deleteUserCategoryMovingExpenses(userId, categoryId, fallbackCategoryId) {
    return this.transaction(async (client) => {
      const owned = await client.query(
        'SELECT id FROM categories WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [categoryId, userId]
      );
      if (!owned.rows.length) return null;
      await client.query(
        'UPDATE expenses SET category_id = $3 WHERE user_id = $1 AND category_id = $2',
        [userId, categoryId, fallbackCategoryId]
      );
      const deleted = await client.query(
        'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *',
        [categoryId, userId]
      );
      return deleted.rows[0];
    });
  }

  async updateUserCategory(userId, categoryId, { name, icon }) {
    const query = `
      UPDATE categories 
      SET name = $1, icon = $2 
      WHERE id = $3 AND user_id = $4 
      RETURNING *
    `;
    const result = await this.query(query, [name, icon, categoryId, userId]);
    return result.rows[0];
  }

  // Метод для получения всех категорий (системных + пользовательских)
  async getAllCategories(userId) {
    const query = `
      SELECT * FROM categories 
      WHERE user_id IN (0, $1) 
      ORDER BY user_id, name
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }

  // Метод для получения категорий с учетом премиум-статуса
  async getCategoriesWithPremium(userId, isPremium = false) {
    if (isPremium) {
      // Премиум-пользователи видят системные + пользовательские категории
      return this.getAllCategories(userId);
    } else {
      // Обычные пользователи видят только системные категории
      return this.getCategories(userId);
    }
  }


}

module.exports = CategoryRepository; 