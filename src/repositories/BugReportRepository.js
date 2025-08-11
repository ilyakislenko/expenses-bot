const BaseRepository = require('./BaseRepository');

class BugReportRepository extends BaseRepository {
  async createBugReport(userId, reportText) {
    const query = `
      INSERT INTO bug_reports (user_id, report_text, status)
      VALUES ($1, $2, 'new')
      RETURNING *
    `;
    const result = await this.query(query, [userId, reportText]);
    return result.rows[0];
  }

  async getBugReportsByUserId(userId, limit = 10, offset = 0) {
    const query = `
      SELECT * FROM bug_reports 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.query(query, [userId, limit, offset]);
    return result.rows;
  }

  async getAllBugReports(limit = 50, offset = 0, status = null) {
    let query = `
      SELECT br.*, u.username, u.first_name 
      FROM bug_reports br
      LEFT JOIN users u ON br.user_id = u.id
    `;
    const params = [];
    
    if (status) {
      query += ` WHERE br.status = $1`;
      params.push(status);
    }
    
    query += ` ORDER BY br.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await this.query(query, params);
    return result.rows;
  }

  async updateBugReportStatus(reportId, status) {
    const query = `
      UPDATE bug_reports 
      SET status = $2, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await this.query(query, [reportId, status]);
    return result.rows[0];
  }

  async getBugReportStats() {
    const query = `
      SELECT 
        status, 
        COUNT(*) as count 
      FROM bug_reports 
      GROUP BY status
    `;
    const result = await this.query(query, []);
    return result.rows;
  }
}

module.exports = BugReportRepository;
