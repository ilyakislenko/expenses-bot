const BaseRepository = require('./BaseRepository');

class CategoryRepository extends BaseRepository {
  async getCategoryById(categoryId) {
    const query = `
      SELECT * FROM categories WHERE id = $1
    `;
    const result = await this.query(query, [categoryId]);
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

  async getOrCreateCategory(userId, categoryName) {
    // Сначала ищем в системных категориях
    let category = await this.getCategoryByName(0, categoryName);
    
    if (!category) {
      // Затем ищем в пользовательских категориях
      category = await this.getCategoryByName(userId, categoryName);
    }
    
    return category;
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