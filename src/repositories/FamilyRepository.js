const BaseRepository = require('./BaseRepository');
const logger = require('../utils/logger');

class FamilyRepository extends BaseRepository {
  async createFamily(ownerId, name) {
    const query = `
      INSERT INTO families (name, owner_id) 
      VALUES ($1, $2) 
      RETURNING *
    `;
    const result = await this.query(query, [name, ownerId]);
    
    // Приводим owner_id к числу для консистентности типов
    result.rows[0].owner_id = Number(result.rows[0].owner_id);
    
    // Добавляем владельца как члена семьи
    await this.addMemberToFamily(result.rows[0].id, ownerId);
    
    logger.info('Family created', {
      familyId: result.rows[0].id,
      name: result.rows[0].name,
      ownerId: result.rows[0].owner_id
    });
    
    return result.rows[0];
  }

  async getFamilyById(familyId) {
    const query = `
      SELECT f.*, u.username as owner_username, u.first_name as owner_first_name
      FROM families f
      JOIN users u ON f.owner_id = u.id
      WHERE f.id = $1
    `;
    const result = await this.query(query, [familyId]);
    
    if (result.rows[0]) {
      result.rows[0].owner_id = Number(result.rows[0].owner_id);
    }
    
    return result.rows[0];
  }

  async getFamilyByOwnerId(ownerId) {
    const query = `
      SELECT f.*, u.username as owner_username, u.first_name as owner_first_name
      FROM families f
      JOIN users u ON f.owner_id = u.id
      WHERE f.owner_id = $1
    `;
    const result = await this.query(query, [ownerId]);
    
    if (result.rows[0]) {
      result.rows[0].owner_id = Number(result.rows[0].owner_id);
    }
    
    return result.rows[0];
  }

  async getUserFamily(userId) {
    const query = `
      SELECT f.*, fu.joined_at_utc, u.username as owner_username, u.first_name as owner_first_name
      FROM families f
      JOIN family_user fu ON f.id = fu.family_id
      JOIN users u ON f.owner_id = u.id
      WHERE fu.user_id = $1
    `;
    const result = await this.query(query, [userId]);
    
    if (result.rows[0]) {
      result.rows[0].owner_id = Number(result.rows[0].owner_id);
    }
    
    return result.rows[0];
  }

  async addMemberToFamily(familyId, userId) {
    const query = `
      INSERT INTO family_user (family_id, user_id) 
      VALUES ($1, $2) 
      ON CONFLICT (family_id, user_id) DO NOTHING
      RETURNING *
    `;
    const result = await this.query(query, [familyId, userId]);
    
    if (result.rows[0]) {
      logger.info('Member added to family', {
        familyId,
        userId,
        joinedAt: result.rows[0].joined_at_utc
      });
    }
    
    return result.rows[0];
  }

  async removeMemberFromFamily(familyId, userId) {
    const query = `
      DELETE FROM family_user 
      WHERE family_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.query(query, [familyId, userId]);
    
    if (result.rows[0]) {
      logger.info('Member removed from family', {
        familyId,
        userId
      });
    }
    
    return result.rows[0];
  }

  async getFamilyMembers(familyId) {
    const query = `
      SELECT u.id, u.username, u.first_name, fu.joined_at_utc,
             CASE WHEN f.owner_id = u.id THEN 'owner' ELSE 'member' END as role
      FROM family_user fu
      JOIN users u ON fu.user_id = u.id
      JOIN families f ON fu.family_id = f.id
      WHERE fu.family_id = $1
      ORDER BY fu.joined_at_utc ASC
    `;
    const result = await this.query(query, [familyId]);
    
    return result.rows.map(row => ({
      ...row,
      id: Number(row.id)
    }));
  }

  async isUserFamilyOwner(userId, familyId) {
    const query = `
      SELECT COUNT(*) as count
      FROM families
      WHERE id = $1 AND owner_id = $2
    `;
    const result = await this.query(query, [familyId, userId]);
    return result.rows[0].count > 0;
  }

  async isUserInFamily(userId, familyId) {
    const query = `
      SELECT COUNT(*) as count
      FROM family_user
      WHERE family_id = $1 AND user_id = $2
    `;
    const result = await this.query(query, [familyId, userId]);
    return result.rows[0].count > 0;
  }

  async deleteFamily(familyId) {
    // Сначала получаем информацию о семье для логирования
    const family = await this.getFamilyById(familyId);
    
    // Удаляем семью (каскадно удалятся все связи и приглашения)
    const query = `DELETE FROM families WHERE id = $1 RETURNING *`;
    const result = await this.query(query, [familyId]);
    
    if (result.rows[0]) {
      logger.info('Family deleted', {
        familyId,
        familyName: family?.name,
        ownerId: family?.owner_id
      });
    }
    
    return result.rows[0];
  }

  async convertFamilyExpensesToPersonal(familyId) {
    const query = `
      UPDATE expenses 
      SET family_id = NULL 
      WHERE family_id = $1
      RETURNING id
    `;
    const result = await this.query(query, [familyId]);
    
    logger.info('Family expenses converted to personal', {
      familyId,
      convertedCount: result.rows.length
    });
    
    return result.rows;
  }

  async getFamilyExpenses(familyId, limit = 50) {
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon,
             u.username as user_username, u.first_name as user_first_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.family_id = $1
      ORDER BY e.created_at_utc DESC
      LIMIT $2
    `;
    const result = await this.query(query, [familyId, limit]);
    return result.rows;
  }

  async getFamilyDailyExpenses(familyId, userTimezone = 'UTC') {
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon,
             u.username as user_username, u.first_name as user_first_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.family_id = $1
      AND e.created_at_utc >= (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2)
      AND e.created_at_utc < (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) + interval '1 day') AT TIME ZONE $2
      ORDER BY e.created_at_utc ASC
    `;
    const result = await this.query(query, [familyId, userTimezone]);
    return result.rows;
  }

  async getFamilyTotalExpenses(familyId, period = 'month', userTimezone = 'UTC') {
    let dateFilter;
    switch (period) {
      case 'day':
        dateFilter = "created_at_utc >= (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND created_at_utc < (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) + interval '1 day') AT TIME ZONE $2";
        break;
      case 'week':
        dateFilter = "created_at_utc >= (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND created_at_utc < (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) + interval '1 week') AT TIME ZONE $2";
        break;
      case 'month':
      default:
        dateFilter = "created_at_utc >= (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND created_at_utc < (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) + interval '1 month') AT TIME ZONE $2";
        break;
    }

    const query = `
      SELECT SUM(amount) as total
      FROM expenses
      WHERE family_id = $1 AND ${dateFilter}
    `;
    const result = await this.query(query, [familyId, userTimezone]);
    return result.rows[0].total || 0;
  }

  async getFamilyExpensesByCategory(familyId, period = 'month', userTimezone = 'UTC') {
    let dateFilter;
    switch (period) {
      case 'day':
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND e.created_at_utc < (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) + interval '1 day') AT TIME ZONE $2";
        break;
      case 'week':
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND e.created_at_utc < (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) + interval '1 week') AT TIME ZONE $2";
        break;
      case 'month':
      default:
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND e.created_at_utc < (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) + interval '1 month') AT TIME ZONE $2";
        break;
    }

    const query = `
      SELECT c.name, c.icon, SUM(e.amount) as total, COUNT(*) as count
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.family_id = $1 AND ${dateFilter}
      GROUP BY c.id, c.name, c.icon
      ORDER BY total DESC
    `;
    const result = await this.query(query, [familyId, userTimezone]);
    return result.rows;
  }
}

module.exports = FamilyRepository; 