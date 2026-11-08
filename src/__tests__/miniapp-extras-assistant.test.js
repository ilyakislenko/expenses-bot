// Mini App «Спроси бота»: те же проверки и лимиты, что в боте (AssistantService), ответ в фоне с опросом,
// один вопрос за раз — общий с ботом, кнопки ответа — ссылки на экраны приложения, «Не то» — только свой ответ.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const AssistantService = require('../services/AssistantService');
const AssistantHandlers = require('../handlers/AssistantHandlers');
const { linkFor, markdownParts } = require('../miniapp/api/assistant');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const OTHER = 1066875127;
const localization = new LocalizationService();
const ru = (key, params) => localization.getText('ru', key, params);

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

function server({ remaining = 5, isPremium = false } = {}) {
  const limit = { remaining, isPremium };
  const assistantService = {
    checkLimit: jest.fn(async () => {
      const max = limit.isPremium ? 100 : 5;
      return { used: max - limit.remaining, limit: max, remaining: limit.remaining, isPremium: limit.isPremium };
    }),
    answer: jest.fn(async () => ({
      status: 'answered',
      text: '💸 *Траты за ноябрь*\nИтого: *1 200 ₽*',
      keyboard: [[{ text: '🏷 Открыть категорию', callback_data: 'oc|12|-1|0' }], [{ text: '🤖 Ещё вопрос', callback_data: 'ai' }, { text: '🙅 Не то', callback_data: 'aiw|55' }]],
      questionId: 55
    })),
    markWrong: jest.fn(async (userId, id) => (userId === ME && id === 55 ? 'marked' : 'missing'))
  };
  const services = {
    localizationService: localization,
    userService: {
      getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'Europe/Moscow', getUserPeriodStartDay: async () => 1
    },
    premiumService: { isPremiumUser: async () => limit.isPremium },
    assistantService
  };
  const get = jest.fn((name) => services[name]);
  return { app: new MiniAppServer({ port: 0, botToken: TOKEN, get }).app, assistantService, limit };
}

const auth = (id = ME) => `tma ${signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya', language_code: 'ru' }) }, TOKEN)}`;

afterEach(async () => {
  await AssistantService.turns.idle();
});

describe('mini app «Спроси бота»', () => {
  test('screen: six examples in the user language, today’s limit, nothing pending', async () => {
    const { app } = server({ remaining: 3 });
    const res = await request(app).get('/api/assistant').set('Authorization', auth()).expect(200);
    expect(res.body.examples).toHaveLength(6);
    expect(res.body.examples[0]).toBe(ru('ai_example_1'));
    expect(res.body).toMatchObject({ maxLength: 300, pending: null, limit: { used: 2, limit: 5, remaining: 3, isPremium: false, premiumLimit: 100 } });
  });

  test('validation: empty, only «?», longer than 300 characters, unknown example — 400, nothing asked', async () => {
    const { app, assistantService } = server();
    await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({}).expect(400, { error: 'assistant_empty' });
    await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({ question: ' ?  ' }).expect(400, { error: 'assistant_empty' });
    await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({ question: 'а'.repeat(301) }).expect(400, { error: 'assistant_too_long', max: 300 });
    await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({ example: 7 }).expect(400, { error: 'assistant_example' });
    expect(assistantService.answer).not.toHaveBeenCalled();
    expect(AssistantService.turns.busy.size).toBe(0);
  });

  test('over the daily limit: free — 402 with the bot’s premium pitch, premium — 429; the model is not asked', async () => {
    const { app, assistantService, limit } = server({ remaining: 0 });
    const free = await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({ question: 'сколько на кофе?' }).expect(402);
    expect(free.body).toMatchObject({ error: 'premium_required', feature: 'assistant', limit: { remaining: 0, limit: 5 } });
    expect(free.body.text).toContain('Вопросы на сегодня закончились: 5 из 5');
    limit.isPremium = true;
    const premium = await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({ question: 'сколько на кофе?' }).expect(429);
    expect(premium.body).toMatchObject({ error: 'assistant_limit' });
    expect(premium.body.text).toBe(ru('ai_limit_premium', { used: 100, limit: 100 }));
    expect(assistantService.answer).not.toHaveBeenCalled();
    expect(AssistantService.turns.busy.size).toBe(0);
  });

  test('an example: ready intent by number, answer in the background, Markdown as parts, button → app link, fresh limit', async () => {
    const { app, assistantService } = server({ remaining: 3 });
    const posted = await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({ example: 3 }).expect(202);
    expect(posted.body).toMatchObject({ status: 'thinking', question: ru('ai_example_3') });
    expect(assistantService.answer).toHaveBeenCalledWith(ME, ru('ai_example_3'), expect.objectContaining({ lang: 'ru', example: 3 }));
    await AssistantService.turns.idle();
    const job = await request(app).get(`/api/assistant/questions/${posted.body.id}`).set('Authorization', auth()).expect(200);
    expect(job.body).toMatchObject({
      status: 'answered',
      answer: {
        id: 55,
        parts: [{ text: '💸 ' }, { text: 'Траты за ноябрь', bold: true }, { text: '\nИтого: ' }, { text: '1 200 ₽', bold: true }],
        link: { path: '/overview/category/12?offset=-1', label: 'Открыть категорию' }
      },
      limit: { remaining: 3 }
    });
    // чужой вопрос не виден
    await request(app).get(`/api/assistant/questions/${posted.body.id}`).set('Authorization', auth(OTHER)).expect(404);
  });

  test('one question at a time (shared with the bot): busy while thinking, queue position, then «не понял» with examples', async () => {
    const { app, assistantService } = server();
    const gate = deferred();
    assistantService.answer.mockImplementation(async (userId, question, { onStatus }) => {
      onStatus({ position: 2 });
      await gate.promise;
      return { status: 'not_understood' };
    });
    const posted = await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({ question: '? куда ушли деньги' }).expect(202);
    expect(posted.body.question).toBe('куда ушли деньги');
    expect((await request(app).get(`/api/assistant/questions/${posted.body.id}`).set('Authorization', auth())).body).toMatchObject({ status: 'thinking', position: 2 });
    await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({ question: 'ещё вопрос?' }).expect(409, { error: 'assistant_busy' });
    // бот видит того же пользователя занятым
    const handlers = new AssistantHandlers({ assistantService: new AssistantService({}), userService: {}, stateService: {}, localizationService: localization });
    expect(handlers.busyUsers.has(ME)).toBe(true);
    const screen = await request(app).get('/api/assistant').set('Authorization', auth()).expect(200);
    expect(screen.body.pending).toMatchObject({ id: posted.body.id, question: 'куда ушли деньги', status: 'thinking' });
    // другой пользователь не ждёт
    await request(app).post('/api/assistant/questions').set('Authorization', auth(OTHER)).send({ question: 'сколько?' }).expect(202);

    gate.resolve();
    await AssistantService.turns.idle();
    const done = await request(app).get(`/api/assistant/questions/${posted.body.id}`).set('Authorization', auth()).expect(200);
    const text = done.body.parts.map(p => p.text).join('');
    expect(done.body.status).toBe('failed');
    expect(text).toContain('Не понял вопрос');
    expect(text).toContain(`• ${ru('ai_example_1')}`);
    expect(handlers.busyUsers.has(ME)).toBe(false);
  });

  test('a failed calculation is «не получилось», and the user is free again', async () => {
    const { app, assistantService } = server();
    assistantService.answer.mockRejectedValueOnce(new Error('db down'));
    const posted = await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({ question: 'сколько я потратил?' }).expect(202);
    await AssistantService.turns.idle();
    const job = await request(app).get(`/api/assistant/questions/${posted.body.id}`).set('Authorization', auth()).expect(200);
    expect(job.body.status).toBe('failed');
    expect(job.body.parts.map(p => p.text).join('')).toBe(ru('ai_error'));
    await request(app).post('/api/assistant/questions').set('Authorization', auth()).send({ question: 'сколько я потратил?' }).expect(202);
  });

  test('«Не то»: only the user’s own answer; someone else’s or unknown — 404', async () => {
    const { app, assistantService } = server();
    await request(app).post('/api/assistant/answers/55/wrong').set('Authorization', auth()).expect(200, { result: 'marked' });
    expect(assistantService.markWrong).toHaveBeenCalledWith(ME, 55);
    await request(app).post('/api/assistant/answers/55/wrong').set('Authorization', auth(OTHER)).expect(404, { error: 'assistant_answer' });
    await request(app).post('/api/assistant/answers/abc/wrong').set('Authorization', auth()).expect(404);
    assistantService.markWrong.mockResolvedValueOnce('used');
    await request(app).post('/api/assistant/answers/55/wrong').set('Authorization', auth()).expect(200, { result: 'used' });
  });

  test('bot answer buttons map to app screens', () => {
    const today = '2026-11-08';
    expect(linkFor('ov|0', today)).toBe('/overview');
    expect(linkFor('ov|-1', today)).toBe('/overview?offset=-1');
    expect(linkFor('oc|7|-2|0', today)).toBe('/overview/category/7?offset=-2');
    expect(linkFor('oc|7|0|0', today)).toBe('/overview/category/7');
    expect(linkFor('dy|-1|0', today)).toBe('/today?date=2026-11-07');
    expect(linkFor('dy|0|0', today)).toBe('/today?date=2026-11-08');
    expect(linkFor('income_menu', today)).toBe('/income');
    expect(linkFor('sv', today)).toBe('/savings');
    expect(linkFor('pls', today)).toBe('/plans/subscriptions');
    expect(linkFor('bg_menu', today)).toBe('/budgets');
    expect(linkFor('premium_subscription', today)).toBe('/premium');
    expect(linkFor('pl', today)).toBe('/plans');
    expect(linkFor('tax|2025', today)).toBe('/tax?year=2025');
    expect(linkFor('ai', today)).toBeNull();
    expect(linkFor('aiw|5', today)).toBeNull();
  });

  test('bot Markdown → plain parts: bold, italic, escapes, unpaired marks stay text', () => {
    expect(markdownParts('*Итого:* _за день_ кафе\\_бар 2 \\* 3 и 5 * 2')).toEqual([
      { text: 'Итого:', bold: true }, { text: ' ' }, { text: 'за день', italic: true }, { text: ' кафе_бар 2 * 3 и 5 * 2' }
    ]);
  });
});

describe('AssistantService question helpers (bot and mini app)', () => {
  test('question checks, limit message and «no answer» texts', () => {
    expect(AssistantService.prepareQuestion('  ?? сколько на кофе ')).toEqual({ question: 'сколько на кофе' });
    expect(AssistantService.prepareQuestion('？')).toEqual({ error: 'empty' });
    expect(AssistantService.prepareQuestion('x'.repeat(301))).toEqual({ error: 'too_long' });
    expect(AssistantService.examples(ru)).toEqual([1, 2, 3, 4, 5, 6].map(n => ru(`ai_example_${n}`)));
    expect(AssistantService.limitMessage({ used: 7, limit: 5, remaining: 0, isPremium: false }, ru)).toBe(ru('ai_limit_regular', { used: 5, limit: 5, premium: 100 }));
    const examples = [1, 2, 3].map(n => `• ${ru(`ai_example_${n}`)}`).join('\n');
    expect(AssistantService.failureMessage({ status: 'model_busy', position: 3 }, ru)).toBe(ru('ai_model_busy', { examples, position: 3 }));
    expect(AssistantService.failureMessage({ status: 'model_busy', position: null }, ru)).toBe(ru('ai_model_busy_now', { examples }));
    expect(AssistantService.failureMessage({ status: 'future' }, ru)).toBe(ru('ai_future'));
    expect(AssistantService.failureMessage({ status: 'whatever' }, ru)).toBe(ru('ai_not_understood', { examples }));
  });
});
