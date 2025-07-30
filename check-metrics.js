#!/usr/bin/env node

const http = require('http');
const https = require('https');

class MetricsChecker {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async makeRequest(path) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }

  parseMetrics(metricsText) {
    const lines = metricsText.split('\n');
    const metrics = {};

    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      
      const match = line.match(/^(\w+)(?:\{([^}]+)\})?\s+([0-9.]+)/);
      if (match) {
        const [, name, labels, value] = match;
        const key = labels ? `${name}{${labels}}` : name;
        metrics[key] = parseFloat(value);
      }
    }

    return metrics;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTime(seconds) {
    if (seconds < 1) return (seconds * 1000).toFixed(2) + 'ms';
    return seconds.toFixed(2) + 's';
  }

  async checkHealth() {
    try {
      const data = await this.makeRequest('/health');
      const health = JSON.parse(data);
      console.log('✅ Bot Status:', health.status);
      console.log('⏰ Uptime:', this.formatTime(health.uptime));
      console.log('📅 Timestamp:', health.timestamp);
      return true;
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return false;
    }
  }

  async checkMetrics() {
    try {
      const data = await this.makeRequest('/metrics');
      const metrics = this.parseMetrics(data);
      
      console.log('\n📊 System Metrics:');
      console.log('─'.repeat(50));
      
      // CPU
      const cpuTotal = metrics['process_cpu_seconds_total'] || 0;
      const cpuUser = metrics['process_cpu_user_seconds_total'] || 0;
      const cpuSystem = metrics['process_cpu_system_seconds_total'] || 0;
      
      console.log(`CPU Total: ${cpuTotal.toFixed(2)}s`);
      console.log(`CPU User: ${cpuUser.toFixed(2)}s`);
      console.log(`CPU System: ${cpuSystem.toFixed(2)}s`);

      // Memory
      const memoryBytes = metrics['process_resident_memory_bytes'] || 0;
      const memoryMB = memoryBytes / 1024 / 1024;
      const memoryStatus = memoryMB > 500 ? '⚠️  HIGH' : 
                          memoryMB > 100 ? '⚠️  MEDIUM' : '✅ OK';
      
      console.log(`Memory: ${memoryMB.toFixed(1)}MB ${memoryStatus}`);

      // Event Loop Lag
      const eventLoopLag = metrics['nodejs_eventloop_lag_seconds'] || 0;
      const lagStatus = eventLoopLag > 0.1 ? '⚠️  HIGH' : 
                       eventLoopLag > 0.01 ? '⚠️  MEDIUM' : '✅ OK';
      
      console.log(`Event Loop Lag: ${this.formatTime(eventLoopLag)} ${lagStatus}`);

      // Uptime
      const startTime = metrics['process_start_time_seconds'] || 0;
      const uptime = Date.now() / 1000 - startTime;
      const uptimeHours = uptime / 3600;
      console.log(`Uptime: ${uptimeHours.toFixed(1)} hours`);

      // Telegram metrics
      console.log('\n🤖 Telegram Bot Metrics:');
      console.log('─'.repeat(50));
      
      const totalRequests = metrics['telegram_requests_total{status="success"}'] || 0;
      const errorRequests = metrics['telegram_errors_total'] || 0;
      const totalWithErrors = totalRequests + errorRequests;
      const errorRate = totalWithErrors > 0 ? (errorRequests / totalWithErrors * 100) : 0;
      
      console.log(`Total Requests: ${totalRequests}`);
      console.log(`Errors: ${errorRequests}`);
      console.log(`Error Rate: ${errorRate.toFixed(2)}%`);

      // Business metrics
      console.log('\n📈 Business Metrics:');
      console.log('─'.repeat(50));
      
      const activeUsers = metrics['active_users_total'] || 0;
      const totalExpenses = metrics['expenses_total'] || 0;
      const totalAmount = metrics['expenses_amount_total'] || 0;
      
      console.log(`Active Users: ${activeUsers}`);
      console.log(`Total Expenses: ${totalExpenses}`);
      console.log(`Total Amount: ${totalAmount.toFixed(2)}`);

      return true;
    } catch (error) {
      console.log('❌ Metrics check failed:', error.message);
      return false;
    }
  }

  async checkPrometheus() {
    try {
      const data = await this.makeRequest('http://localhost:9090/api/v1/status/config');
      console.log('\n✅ Prometheus is running');
      return true;
    } catch (error) {
      console.log('❌ Prometheus check failed:', error.message);
      return false;
    }
  }

  async checkGrafana() {
    try {
      const data = await this.makeRequest('http://localhost:3000');
      console.log('✅ Grafana is running');
      return true;
    } catch (error) {
      console.log('❌ Grafana check failed:', error.message);
      return false;
    }
  }

  async run() {
    console.log('🔍 Checking Expenses Bot Monitoring System...\n');
    
    const healthOk = await this.checkHealth();
    if (healthOk) {
      await this.checkMetrics();
    }
    
    console.log('\n🔧 Monitoring Services:');
    console.log('─'.repeat(50));
    await this.checkPrometheus();
    await this.checkGrafana();
    
    console.log('\n📋 Access URLs:');
    console.log('─'.repeat(50));
    console.log('• Grafana Dashboard: http://localhost:3000 (admin/admin)');
    console.log('• Prometheus: http://localhost:9090');
    console.log('• Bot Metrics: http://localhost:3001/metrics');
    console.log('• Bot Health: http://localhost:3001/health');
  }
}

// CLI usage
if (require.main === module) {
  const checker = new MetricsChecker();
  checker.run().catch(console.error);
}

module.exports = MetricsChecker; 