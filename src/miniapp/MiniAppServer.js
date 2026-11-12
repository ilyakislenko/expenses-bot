const fs = require('fs');
const path = require('path');
const express = require('express');
const logger = require('../utils/logger');
const { verifyInitData } = require('./initData');
const http = require('./http');
const { registerApi } = require('./api');

const PUBLIC_DIR = path.join(__dirname, 'public');
const FORECAST_SOURCE = path.join(__dirname, '..', 'utils', 'savingsForecast.js');
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 300; // запросов API в минуту на пользователя
const REQUEST_TIMEOUT_MS = 60 * 1000;

// Mini App в Telegram — тот же функционал, что в боте, экранами (src/miniapp/public — SPA без сборки, ES-модули).
// Слушает только 127.0.0.1: наружу её выводит туннель (Cloudflare Tunnel → MINIAPP_PORT); бот, мониторинг и база
// наружу не смотрят. Вход в /api — только из Telegram: «Authorization: tma <initData>», подпись — токеном бота
// (initData.js); req.userId — из подписи, данные — только этого пользователя (и его семьи там, где это семейное).
// Маршруты — модули api/*.js (api/index.js), сервисы берутся из контейнера (get), как у обработчиков бота.
class MiniAppServer {
  constructor({ port, host = '127.0.0.1', botToken, get, rateLimit = RATE_LIMIT }) {
    this.rateLimit = rateLimit;
    this.port = port;
    this.host = host;
    this.botToken = botToken;
    this.get = get;
    this.hits = new Map(); // userId → { start, count } — простой лимит запросов
    this.app = express();
    this.app.disable('x-powered-by');
    this.setupRoutes();
  }

  limited(userId, now = Date.now()) {
    const entry = this.hits.get(userId);
    if (!entry || now - entry.start > RATE_WINDOW_MS) {
      if (this.hits.size > 10000) this.hits.clear();
      this.hits.set(userId, { start: now, count: 1 });
      return false;
    }
    entry.count += 1;
    return entry.count > this.rateLimit;
  }

  setupRoutes() {
    this.app.use((req, res, next) => {
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors https://web.telegram.org https://*.telegram.org 'self'"
      });
      next();
    });

    // Расчёт прогноза накоплений для браузера — тот же файл, что у бота (window.savingsForecast)
    const forecastScript = `(function () {\nvar module = { exports: {} };\n${fs.readFileSync(FORECAST_SOURCE, 'utf8')}\nwindow.savingsForecast = module.exports;\n})();\n`;
    this.app.get('/forecast.js', (req, res) => res.type('application/javascript').set('Cache-Control', 'no-cache').send(forecastScript));
    this.app.use(express.static(PUBLIC_DIR, { index: 'index.html', setHeaders: (res) => res.set('Cache-Control', 'no-cache') }));

    const api = express.Router();
    api.use((req, res, next) => {
      const header = req.get('authorization') || '';
      const user = header.startsWith('tma ') ? verifyInitData(header.slice(4), this.botToken) : null;
      if (!user) return res.status(401).json({ error: 'auth' });
      if (this.limited(user.id)) return res.status(429).json({ error: 'rate' });
      req.userId = user.id;
      req.telegramUser = user;
      res.set('Cache-Control', 'no-store');
      next();
    });
    api.use(express.json({ limit: '200kb' }));
    api.use(http.attachContext(this.get));
    registerApi(api, { get: this.get, http });
    api.use((req, res) => res.status(404).json({ error: 'not_found' }));
    // eslint-disable-next-line no-unused-vars
    api.use((error, req, res, next) => {
      if (error instanceof http.HttpError) return res.status(error.status).json({ error: error.code, ...(error.extra || {}) });
      if (error.type === 'entity.too.large') return res.status(413).json({ error: 'too_large' });
      if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json' });
      logger.error('Mini app API failed', { userId: req.userId, path: req.path, error: error.message, stack: error.stack });
      res.status(500).json({ error: 'server' });
    });
    this.app.use('/api', api);
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, this.host, () => {
        logger.startup(`Mini app server started on ${this.host}:${this.port}`);
        resolve();
      });
      // Весь запрос (заголовки и тело) — не дольше минуты: медленные загрузки не держат память (по умолчанию 300 с)
      this.server.requestTimeout = REQUEST_TIMEOUT_MS;
      this.server.on('error', reject);
    });
  }

  stop() {
    return new Promise((resolve) => (this.server ? this.server.close(() => resolve()) : resolve()));
  }
}

module.exports = MiniAppServer;
