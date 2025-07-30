const request = require('supertest');
const express = require('express');
const MonitoringServer = require('../utils/monitoring');
const logger = require('../utils/logger');
const { getMetrics, getMetricsJson } = require('../utils/metrics');

describe('Monitoring System', () => {
  let monitoringServer;

  beforeAll(async () => {
    monitoringServer = new MonitoringServer(3002); // Используем другой порт для тестов
    await monitoringServer.start();
  });

  afterAll(async () => {
    await monitoringServer.stop();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(monitoringServer.app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(monitoringServer.app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.text).toContain('process_cpu_seconds_total');
    });

    it('should return JSON metrics', async () => {
      const response = await request(monitoringServer.app)
        .get('/metrics/json')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Application Info', () => {
    it('should return application information', async () => {
      const response = await request(monitoringServer.app)
        .get('/info')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'expenses-tracker-bot');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('nodeVersion');
      expect(response.body).toHaveProperty('platform');
      expect(response.body).toHaveProperty('arch');
      expect(response.body).toHaveProperty('pid');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
    });
  });

  describe('Readiness and Liveness', () => {
    it('should return ready status', async () => {
      const response = await request(monitoringServer.app)
        .get('/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('should return alive status', async () => {
      const response = await request(monitoringServer.app)
        .get('/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      await request(monitoringServer.app)
        .get('/unknown')
        .expect(404);
    });
  });
});

describe('Logger', () => {
  it('should have specialized logging methods', () => {
    expect(typeof logger.startup).toBe('function');
    expect(typeof logger.request).toBe('function');
    expect(typeof logger.response).toBe('function');
    expect(typeof logger.database).toBe('function');
    expect(typeof logger.telegram).toBe('function');
    expect(typeof logger.security).toBe('function');
    expect(typeof logger.performance).toBe('function');
  });

  it('should log with metadata', () => {
    const testMeta = { userId: 123, action: 'test' };
    
    // Проверяем, что методы не выбрасывают ошибки
    expect(() => {
      logger.startup('Test startup', testMeta);
      logger.request('Test request', testMeta);
      logger.database('Test database', testMeta);
      logger.telegram('Test telegram', testMeta);
    }).not.toThrow();
  });
});

describe('Metrics', () => {
  it('should return metrics in Prometheus format', async () => {
    const metrics = await getMetrics();
    expect(typeof metrics).toBe('string');
    expect(metrics).toContain('# HELP');
    expect(metrics).toContain('# TYPE');
  });

  it('should return metrics in JSON format', async () => {
    const metrics = await getMetricsJson();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics.length).toBeGreaterThan(0);
  });
}); 