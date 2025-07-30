const { Pool } = require('pg');
const dbConfig = require('../config/database');
const logger = require('../utils/logger');
const { databaseQueriesTotal, databaseQueryDuration, databaseConnectionsActive } = require('../utils/metrics');

class BaseRepository {
  constructor() {
    this.pool = new Pool({
      ...dbConfig.CONNECTION,
      ...dbConfig.POOL
    });

    // Логируем события пула соединений
    this.pool.on('connect', (client) => {
      logger.debug('Database client connected', { 
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
      databaseConnectionsActive.inc();
    });

    this.pool.on('remove', (client) => {
      logger.debug('Database client removed', { 
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
      databaseConnectionsActive.dec();
    });

    this.pool.on('error', (err, client) => {
      logger.error('Database pool error:', { 
        error: err.message,
        stack: err.stack,
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });
  }

  async query(text, params) {
    const start = Date.now();
    const client = await this.pool.connect();
    
    try {
      // Определяем тип операции и таблицу из SQL запроса
      const operation = this.getOperationType(text);
      const table = this.getTableName(text);
      
      logger.database('Executing database query', {
        operation,
        table,
        params: params ? params.length : 0,
        sql: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });

      const result = await client.query(text, params);
      
      const duration = (Date.now() - start) / 1000;
      
      // Обновляем метрики
      databaseQueriesTotal.inc({ operation, table });
      databaseQueryDuration.observe({ operation, table }, duration);
      
      logger.database('Database query completed', {
        operation,
        table,
        duration: `${duration.toFixed(3)}s`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      const operation = this.getOperationType(text);
      const table = this.getTableName(text);
      
      logger.error('Database query error:', {
        error: error.message,
        operation,
        table,
        duration: `${duration.toFixed(3)}s`,
        sql: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params ? params.length : 0
      });
      
      throw error;
    } finally {
      client.release();
    }
  }

  getOperationType(sql) {
    const upperSql = sql.trim().toUpperCase();
    if (upperSql.startsWith('SELECT')) return 'SELECT';
    if (upperSql.startsWith('INSERT')) return 'INSERT';
    if (upperSql.startsWith('UPDATE')) return 'UPDATE';
    if (upperSql.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  getTableName(sql) {
    const upperSql = sql.trim().toUpperCase();
    const fromMatch = upperSql.match(/FROM\s+(\w+)/);
    const intoMatch = upperSql.match(/INTO\s+(\w+)/);
    const updateMatch = upperSql.match(/UPDATE\s+(\w+)/);
    
    if (fromMatch) return fromMatch[1].toLowerCase();
    if (intoMatch) return intoMatch[1].toLowerCase();
    if (updateMatch) return updateMatch[1].toLowerCase();
    return 'unknown';
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = BaseRepository; 