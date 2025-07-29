const BaseRepository = require('./BaseRepository');

class CategoryRepository extends BaseRepository {
  async createDefaultCategories(userId) {
    const defaultCategories = [
      ['Еда', '🍕'],
      ['Транспорт', '🚗'],
      ['Развлечения', '🎬'],
      ['Покупки', '🛒'],
      ['Здоровье', '💊'],
      ['Другое', '📦']
    ];

    for (const [name, icon] of defaultCategories) {
      await this.query(
        'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [userId, name, icon]
      );
    }
  }

  async getCategories(userId) {
    const query = `
      SELECT * FROM categories WHERE user_id = $1
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }

  async getCategoryByName(userId, categoryName) {
    const query = `
      SELECT id FROM categories WHERE user_id = $1 AND name = $2
    `;
    const result = await this.query(query, [userId, categoryName]);
    return result.rows[0];
  }

  async createCategory(userId, name, icon = '📦') {
    const query = `
      INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3) RETURNING id
    `;
    const result = await this.query(query, [userId, name, icon]);
    return result.rows[0];
  }

  async getOrCreateCategory(userId, categoryName) {
    let category = await this.getCategoryByName(userId, categoryName);
    
    if (!category) {
      category = await this.createCategory(userId, categoryName);
    }
    
    return category;
  }
}

module.exports = CategoryRepository; 