// Mini App: вход только с подписью Telegram (initData), данные — сценарии своего пользователя, кривые в браузере —
// тот же savingsForecast, что в боте; кнопка в боте — только когда задан адрес приложения.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const vm = require('vm');
const request = require('supertest');
const { verifyInitData, signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const SavingsHandlers = require('../handlers/SavingsHandlers');
const Formatter = require('../utils/formatter');
const { simulate } = require('../utils/savingsForecast');

const TOKEN = '123456:TEST-token';
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);
const fields = (id = 907470387, authDate = NOW / 1000 - 60) => ({ auth_date: String(authDate), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya', language_code: 'ru' }) });

describe('Telegram initData', () => {
  test('a string signed with the bot token gives the user; tampering, another token, staleness or no hash — nothing', () => {
    const signed = signInitData(fields(), TOKEN);
    expect(verifyInitData(signed, TOKEN, { now: NOW })).toMatchObject({ id: 907470387 });

    const tampered = signed.replace(encodeURIComponent('"id":907470387'), encodeURIComponent('"id":1066875127'));
    expect(tampered).not.toBe(signed);
    expect(verifyInitData(tampered, TOKEN, { now: NOW })).toBeNull();
    expect(verifyInitData(signed, '999:other', { now: NOW })).toBeNull();
    expect(verifyInitData(signInitData(fields(907470387, NOW / 1000 - 2 * 86400), TOKEN), TOKEN, { now: NOW })).toBeNull();
    expect(verifyInitData(new URLSearchParams(fields()).toString(), TOKEN, { now: NOW })).toBeNull();
    expect(verifyInitData('', TOKEN)).toBeNull();
  });
});

describe('mini app server core', () => {
  // Контейнер-заглушка: только то, что нужно /api/me
  function server({ family = null, familyMode = false, rateLimit } = {}) {
    const services = {
      localizationService: new LocalizationService(),
      userService: {
        getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'Asia/Bangkok', getUserPeriodStartDay: async () => 1,
        getUserById: async (id) => ({ id, first_name: 'Ilya', username: 'ilu', family_mode: familyMode }),
        getPremiumStatus: async () => ({ isPremium: true, expiresAt: '2027-01-01T00:00:00.000Z', daysRemaining: 54 }),
        isUserAdmin: async () => false
      },
      premiumService: { isPremiumUser: async () => true },
      familyService: { getUserFamily: async () => family },
      familyRepository: { getFamilyMembers: async () => [{ id: 907470387, first_name: 'Ilya', role: 'owner' }, { id: 2, username: 'yulia', role: 'member' }] },
      budgetService: { scopeFor: async (id) => (family && familyMode ? { familyId: family.id } : id) }
    };
    const get = jest.fn((name) => services[name]);
    return { app: new MiniAppServer({ port: 0, botToken: TOKEN, get, rateLimit }).app, get };
  }
  const auth = (id) => `tma ${signInitData(fields(id, Math.floor(Date.now() / 1000) - 60), TOKEN)}`;

  test('API only with a Telegram signature; /api/me — the signed user with language, money units, family and home scope', async () => {
    const { app, get } = server({ family: { id: 7, owner_id: '907470387' }, familyMode: true });
    await request(app).get('/api/me').expect(401);
    await request(app).get('/api/me').set('Authorization', 'tma query_id=x&user=%7B%22id%22%3A1%7D&hash=' + 'a'.repeat(64)).expect(401);
    expect(get).not.toHaveBeenCalled();

    const res = await request(app).get('/api/me').set('Authorization', auth(907470387)).expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({
      user: { id: 907470387, firstName: 'Ilya' }, lang: 'ru', locale: 'ru', currency: 'RUB', timezone: 'Asia/Bangkok', startDay: 1,
      premium: { active: true, daysRemaining: 54 }, isAdmin: false, homeScope: 'family',
      family: { id: 7, isOwner: true, mode: true, members: [{ id: 907470387, name: 'Ilya' }, { id: 2, name: 'yulia' }] },
      units: { thousand: '{n} тыс', million: '{n} млн', comma: true, symbol: '₽' }
    });
    expect(res.body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.strings).toMatchObject({ core_tab_today: 'Сегодня', category_food: expect.any(String) });

    const alone = await request(server().app).get('/api/me').set('Authorization', auth(5)).expect(200);
    expect(alone.body).toMatchObject({ family: null, homeScope: 'mine' });
    await request(server().app).get('/api/nope').set('Authorization', auth(5)).expect(404, { error: 'not_found' });
  });

  test('too many requests from one user are cut off, others are not affected', async () => {
    const { app } = server({ rateLimit: 5 });
    for (let i = 0; i < 5; i++) await request(app).get('/api/me').set('Authorization', auth(1)).expect(200);
    await request(app).get('/api/me').set('Authorization', auth(1)).expect(429);
    await request(app).get('/api/me').set('Authorization', auth(2)).expect(200);
  });

  test('the page opens inside Telegram only, the browser gets the bot\'s own forecast math', async () => {
    const { app } = server();
    const page = await request(app).get('/').expect(200);
    expect(page.text).toContain('telegram-web-app.js');
    expect(page.headers['content-security-policy']).toContain('frame-ancestors https://web.telegram.org');
    expect(page.headers['x-powered-by']).toBeUndefined();

    const script = await request(app).get('/forecast.js').expect(200);
    const sandbox = { window: {} };
    vm.runInNewContext(script.text, sandbox);
    const input = { parts: [{ balance: 838000, yieldRate: 12 }], monthly: 211000, yieldRate: 8, inflationRate: 5, contributionGrowth: 3, months: 24 };
    expect(JSON.stringify(sandbox.window.savingsForecast.simulate(input))).toBe(JSON.stringify(simulate(input)));
  });
});

describe('mini app strings', () => {
  const { slices, LANGS, SLICES } = require('../miniapp/i18n');
  const PREFIX = { core: 'core_', expenses: 'ex_', overview: 'ov_', income: 'inc_', plans: 'plan_', savings: 'sav_', profile: 'prof_', extras: 'xtra_' };

  test('every section has all 13 languages with the same keys, its own prefix (or error_*), no key in two sections', () => {
    expect(Object.keys(slices).sort()).toEqual([...SLICES].sort());
    const owner = new Map();
    for (const [slice, table] of Object.entries(slices)) {
      const keys = Object.keys(table.ru).sort();
      expect(keys.length).toBeGreaterThan(0);
      for (const lang of LANGS) expect([slice, lang, Object.keys(table[lang] || {}).sort()]).toEqual([slice, lang, keys]);
      for (const key of keys) {
        expect([slice, key, key.startsWith(PREFIX[slice]) || key.startsWith('error_')]).toEqual([slice, key, true]);
        expect([key, owner.get(key) || slice]).toEqual([key, slice]);
        owner.set(key, slice);
      }
    }
  });
});

describe('bot button to the mini app', () => {
  test('savings forecast and scenarios get «📱 Play with it in the app» only when the app address is set', async () => {
    const localization = new LocalizationService();
    const handlers = (miniAppUrl) => new SavingsHandlers({
      savingsService: {}, userService: { getUserLanguage: async () => 'ru' }, localizationService: localization, formatter: new Formatter({ convert: async (a) => a }),
      savingsScenarioService: {
        build: async () => ({ family: false, currency: 'RUB', total: 1000, income: { amount: 300000, periods: 1 }, rates: {}, scenarios: [{ key: 'plan', spending: 150000, monthly: 150000, points: [1000, 151000] }] })
      },
      miniAppUrl
    });
    const ctx = () => ({ from: { id: 1 }, callbackQuery: { data: 'svfs', message: { message_id: 3 } }, answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true) });
    const withApp = ctx();
    await handlers('https://app.example.org/').showScenarios(withApp);
    expect(withApp.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard[0]).toEqual([
      { text: localization.getText('ru', 'miniapp_button'), web_app: { url: 'https://app.example.org/#/savings/scenarios' } }
    ]);
    const without = ctx();
    await handlers(null).showScenarios(without);
    expect(JSON.stringify(without.editMessageText.mock.calls[0][1].reply_markup)).not.toContain('web_app');
  });

  test('«☰ More» opens the app first, only when the app address is set', () => {
    const { generateMoreMenu } = require('../utils/constants');
    const localization = new LocalizationService();
    const withApp = generateMoreMenu(localization, 'ru', false, { miniAppUrl: 'https://app.example.org/' });
    expect(withApp[0]).toEqual([{ text: '📱 Открыть приложение', web_app: { url: 'https://app.example.org/' } }]);
    expect(JSON.stringify(generateMoreMenu(localization, 'ru', false, { miniAppUrl: null }))).not.toContain('web_app');
  });
});
