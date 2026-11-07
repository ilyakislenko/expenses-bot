const fs = require('fs');
const path = require('path');
const express = require('express');
const logger = require('../utils/logger');
const { verifyInitData } = require('./initData');
const { currencySymbol, commaDecimal } = require('../utils/savingsView');
const ruLocale = require('../locales/ru');

const PUBLIC_DIR = path.join(__dirname, 'public');
const FORECAST_SOURCE = path.join(__dirname, '..', 'utils', 'savingsForecast.js');
const INTL_LOCALES = { jp: 'ja', kz: 'kk' };
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 30; // запросов данных в минуту на пользователя
const STRING_PREFIXES = ['miniapp_', 'savings_scen_leg_'];

// Mini App в Telegram (кнопка web_app в боте): страница и API сценариев накоплений. Слушает только 127.0.0.1 —
// наружу её выводит туннель (Cloudflare Tunnel → MINIAPP_PORT), мониторинг и бот наружу не смотрят.
// Вход — только из Telegram: заголовок «Authorization: tma <initData>», подпись проверяется токеном бота (initData.js).
// Кривые считает браузер тем же utils/savingsForecast.js, что и бот (/forecast.js — тот же файл в обёртке).
class MiniAppServer {
  constructor({ port, host = '127.0.0.1', botToken, savingsScenarioService, userService, localizationService }) {
    this.port = port;
    this.host = host;
    this.botToken = botToken;
    this.savingsScenarioService = savingsScenarioService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.hits = new Map(); // userId → { start, count } — простой лимит запросов
    this.app = express();
    this.app.disable('x-powered-by');
    this.setupRoutes();
  }

  // Строки интерфейса на языке пользователя в боте (ключи miniapp_* и подписи кривых)
  strings(lang) {
    const keys = Object.keys(ruLocale).filter(key => STRING_PREFIXES.some(prefix => key.startsWith(prefix)));
    return Object.fromEntries(keys.map(key => [key, this.localizationService.getText(lang, key)]));
  }

  limited(userId, now = Date.now()) {
    const entry = this.hits.get(userId);
    if (!entry || now - entry.start > RATE_WINDOW_MS) {
      if (this.hits.size > 10000) this.hits.clear();
      this.hits.set(userId, { start: now, count: 1 });
      return false;
    }
    entry.count += 1;
    return entry.count > RATE_LIMIT;
  }

  setupRoutes() {
    this.app.use((req, res, next) => {
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors https://web.telegram.org https://*.telegram.org 'self'"
      });
      next();
    });

    const forecastScript = `(function () {\nvar module = { exports: {} };\n${fs.readFileSync(FORECAST_SOURCE, 'utf8')}\nwindow.savingsForecast = module.exports;\n})();\n`;
    this.app.get('/forecast.js', (req, res) => res.type('application/javascript').set('Cache-Control', 'no-cache').send(forecastScript));
    this.app.use(express.static(PUBLIC_DIR, { index: 'index.html', setHeaders: (res) => res.set('Cache-Control', 'no-cache') }));

    this.app.get('/api/scenarios', async (req, res) => {
      const header = req.get('authorization') || '';
      const user = header.startsWith('tma ') ? verifyInitData(header.slice(4), this.botToken) : null;
      if (!user) return res.status(401).json({ error: 'auth' });
      if (this.limited(user.id)) return res.status(429).json({ error: 'rate' });
      try {
        const lang = await this.userService.getUserLanguage(user.id);
        const result = await this.savingsScenarioService.build(user.id);
        res.set('Cache-Control', 'no-store').json({
          lang,
          locale: INTL_LOCALES[lang] || lang,
          strings: this.strings(lang),
          units: {
            thousand: this.localizationService.getText(lang, 'savings_compact_thousand'),
            million: this.localizationService.getText(lang, 'savings_compact_million'),
            comma: commaDecimal(lang),
            symbol: currencySymbol(result.currency)
          },
          currency: result.currency,
          today: result.today,
          family: result.family,
          total: result.total,
          parts: result.parts,
          income: result.income,
          rates: result.rates,
          scenarios: result.scenarios.map(({ key, spending, periods }) => ({ key, spending, periods: periods || null }))
        });
      } catch (error) {
        logger.error('Mini app scenarios failed', { userId: user.id, error: error.message });
        res.status(500).json({ error: 'server' });
      }
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, this.host, () => {
        logger.startup(`Mini app server started on ${this.host}:${this.port}`);
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  stop() {
    return new Promise((resolve) => (this.server ? this.server.close(() => resolve()) : resolve()));
  }
}

module.exports = MiniAppServer;
