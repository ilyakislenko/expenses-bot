const express = require('express');
const { getMetrics, getMetricsJson } = require('./metrics');
const logger = require('./logger');

class MonitoringServer {
  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.setupRoutes();
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      };

      res.status(200).json(health);
    });

    // Prometheus metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        const metrics = await getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        logger.error('Error getting metrics:', { error: error.message });
        res.status(500).send('Error getting metrics');
      }
    });

    // JSON metrics endpoint
    this.app.get('/metrics/json', async (req, res) => {
      try {
        const metrics = await getMetricsJson();
        res.json(metrics);
      } catch (error) {
        logger.error('Error getting JSON metrics:', { error: error.message });
        res.status(500).json({ error: 'Error getting metrics' });
      }
    });

    // Readiness check
    this.app.get('/ready', (req, res) => {
      // Здесь можно добавить проверки зависимостей (БД, внешние API)
      res.status(200).json({ status: 'ready' });
    });

    // Liveness check
    this.app.get('/live', (req, res) => {
      res.status(200).json({ status: 'alive' });
    });

    // Информация о приложении
    this.app.get('/info', (req, res) => {
      const info = {
        name: 'expenses-tracker-bot',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      };

      res.json(info);
    });

    // Обработка ошибок
    this.app.use((err, req, res, next) => {
      logger.error('Monitoring server error:', { 
        error: err.message, 
        stack: err.stack,
        url: req.url,
        method: req.method
      });
      res.status(500).json({ error: 'Internal server error' });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        logger.startup(`Monitoring server started on port ${this.port}`, {
          port: this.port,
          endpoints: [
            '/health',
            '/metrics',
            '/metrics/json',
            '/ready',
            '/live',
            '/info'
          ]
        });
        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('Monitoring server error:', { error: error.message });
        reject(error);
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Monitoring server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = MonitoringServer; 