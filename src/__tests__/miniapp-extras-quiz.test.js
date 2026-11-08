// Mini App «Квиз недели»: статус недели, приглашения, игра в приложении тем же QuizService (ответ засчитывается один
// раз, поздний — «не успел», чужая сессия — 404), вопрос из чата остаётся в чате, в чат из приложения ничего не уходит.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const QuizService = require('../services/QuizService');
const Formatter = require('../utils/formatter');
const { QUIZ } = require('../utils/constants');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const OTHER = 1066875127;
const OPEN = new Date('2026-10-29T17:00:00Z'); // четверг 20:00 МСК — квиз открыт
const WEEK = '2026-10-26';
const QUESTIONS = Array.from({ length: 5 }, (_, i) => ({ kind: `k${i}`, text: `Q${i}?`, options: ['a', 'b', 'c', 'd'], correct: i % 4, explanation: `x${i}` }));

// Репозиторий в памяти с семантикой SQL QuizRepository (то, что нужно экрану и игре)
class MemoryQuizRepo {
  constructor() {
    this.sessions = [];
    this.polls = new Map();
    this.invites = new Map();
    this.nextId = 1;
  }

  copy(row) { return row ? JSON.parse(JSON.stringify(row)) : null; }
  async usedTriviaIds() { return []; }
  async getInvitesEnabled(userId) { return this.invites.get(userId) !== false; }
  async setInvitesEnabled(userId, enabled) { this.invites.set(userId, enabled); }
  async getSession(userId, weekKey) { return this.copy(this.sessions.find(s => s.user_id === userId && s.week_key === weekKey)); }
  async getSessionById(id) { return this.copy(this.sessions.find(s => s.id === id)); }
  async getLastFinished(userId) { return this.copy(this.sessions.filter(s => s.user_id === userId && s.status === 'finished').pop()); }
  async getLastDraw() { return null; }
  async userPrizes() { return []; }
  async createSession(userId, weekKey, lang, questions) {
    if (this.sessions.some(s => s.user_id === userId && s.week_key === weekKey)) return null;
    const row = { id: this.nextId++, user_id: userId, week_key: weekKey, lang, questions, total: questions.length, current_index: 0, asked_index: -1, asked_at: null, correct_count: 0, missed_count: 0, missed_streak: 0, answers: '', score: 0, status: 'active' };
    this.sessions.push(row);
    return this.copy(row);
  }
  async claimAsk(id, index, now) {
    const s = this.sessions.find(x => x.id === id);
    if (!s || s.status !== 'active' || s.current_index !== index || s.asked_index >= index) return null;
    Object.assign(s, { asked_index: index, asked_at: now });
    return this.copy(s);
  }
  async releaseAsk(id, index) { const s = this.sessions.find(x => x.id === id); if (s.asked_index === index) s.asked_index = index - 1; }
  async advance(id, index, { correct, missed, mark, pauseAfter }) {
    const s = this.sessions.find(x => x.id === id);
    if (!s || s.current_index !== index || s.status === 'finished') return null;
    s.current_index++;
    s.correct_count += correct ? 1 : 0;
    s.missed_count += missed ? 1 : 0;
    const streak = missed ? s.missed_streak + 1 : 0;
    if (missed && streak >= pauseAfter && s.current_index < s.total) s.status = 'paused';
    s.missed_streak = streak;
    s.answers += mark;
    return this.copy(s);
  }
  async resume(id) { const s = this.sessions.find(x => x.id === id); if (s.status !== 'paused') return null; Object.assign(s, { status: 'active', missed_streak: 0 }); return this.copy(s); }
  async finish(id, score) {
    const s = this.sessions.find(x => x.id === id);
    if (s.status === 'finished' || s.current_index < s.total) return null;
    Object.assign(s, { status: 'finished', score });
    return this.copy(s);
  }
  async finishedScores(weeks, exclude) { return this.sessions.filter(s => s.status === 'finished' && weeks.includes(s.week_key) && s.id !== exclude).map(s => s.score); }
  async finishedWeeks(userId) { return this.sessions.filter(s => s.user_id === userId && s.status === 'finished').map(s => s.week_key); }
  // Как SQL: текущий вопрос не задан, а прошлый задан не в приложении (a…)
  async stuckSessions() {
    const polls = [...this.polls.values()];
    return this.sessions.filter(s => s.status === 'active' && s.current_index < s.total
      && !polls.some(p => p.session_id === s.id && p.question_index === s.current_index)
      && !polls.some(p => p.session_id === s.id && p.question_index === s.current_index - 1 && p.poll_id.startsWith('a'))).map(s => this.copy(s));
  }
  async insertPoll(p) {
    if (this.polls.has(p.pollId) || [...this.polls.values()].some(x => x.session_id === p.sessionId && x.question_index === p.index)) return;
    this.polls.set(p.pollId, { poll_id: p.pollId, session_id: p.sessionId, user_id: p.userId, question_index: p.index, message_id: p.messageId, correct_option: p.correctOption, kind: p.kind, deadline: p.deadline, status: 'open', chosen_option: null });
  }
  async getPoll(id) { return this.copy(this.polls.get(id)); }
  async getQuestionPoll(sessionId, index) { return this.copy([...this.polls.values()].find(p => p.session_id === sessionId && p.question_index === index)); }
  async claimAnswer(id, userId, option, now, grace) {
    const p = this.polls.get(id);
    if (!p || p.user_id !== userId || p.status !== 'open' || now.getTime() > new Date(p.deadline).getTime() + grace) return null;
    Object.assign(p, { status: 'answered', chosen_option: option });
    return this.copy(p);
  }
  async expirePoll(id, now, grace, force = false) {
    const p = this.polls.get(id);
    if (!p || p.status !== 'open' || !(force || now.getTime() > new Date(p.deadline).getTime() + grace)) return null;
    p.status = 'missed';
    return this.copy(p);
  }
  async expiredOpenPolls(now, grace) { return [...this.polls.values()].filter(p => p.status === 'open' && new Date(p.deadline).getTime() + grace < now.getTime()).map(p => p.poll_id); }
}

function setup() {
  const repo = new MemoryQuizRepo();
  let polls = 0;
  const telegram = {
    callApi: jest.fn(async (method) => {
      if (method === 'sendPoll') { polls++; return { message_id: 100 + polls, poll: { id: `${5000 + polls}` } }; }
      return { message_id: 900 };
    }),
    sendPhoto: jest.fn(async () => ({})),
    sendMessage: jest.fn(async () => ({}))
  };
  const localizationService = new LocalizationService();
  const userService = {
    getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'Europe/Moscow', getUserPeriodStartDay: async () => 1
  };
  const achievementService = { track: jest.fn(async () => '🏅 *Знаток*') };
  const quizService = new QuizService({
    quizRepository: repo,
    userService,
    localizationService,
    formatter: new Formatter({ convert: async (amount) => amount }),
    notificationService: { bot: { telegram }, botUsername: () => 'TestQuizBot' },
    userNotificationRepository: {},
    achievementService,
    timers: false
  });
  quizService.buildQuestions = jest.fn(async () => QUESTIONS);
  const services = { localizationService, userService, premiumService: { isPremiumUser: async () => false }, quizService };
  const app = new MiniAppServer({ port: 0, botToken: TOKEN, get: (name) => services[name] }).app;
  return { app, repo, telegram, quizService, achievementService };
}

const auth = (id = ME) => `tma ${signInitData({
  auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya', language_code: 'ru' })
}, TOKEN)}`;

const at = (date) => jest.setSystemTime(date);
const later = (ms) => new Date(OPEN.getTime() + ms);

beforeEach(() => {
  // Подменяем только часы (Date): сеть supertest живёт на настоящих таймерах
  jest.useFakeTimers({ now: OPEN, doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'hrtime', 'performance'] });
});
afterEach(() => jest.useRealTimers());

describe('quiz screen', () => {
  test('open week: status with the numbers of the bot screen; invites on/off only for yourself; bad input', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/quiz').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ state: 'open', questions: 5, seconds: QUIZ.OPEN_PERIOD_SEC, grandDays: 30, hour: QUIZ.OPEN_HOUR, invites: true, result: null, draw: null, progress: null });
    expect(res.body.closes).toMatch(/01\.11/);
    expect(res.body.nextOpen).toMatch(/05\.11/);

    await request(app).put('/api/quiz/invites').set('Authorization', auth()).send({ enabled: false }).expect(200, { invites: false });
    expect((await request(app).get('/api/quiz').set('Authorization', auth())).body.invites).toBe(false);
    expect((await request(app).get('/api/quiz').set('Authorization', auth(OTHER))).body.invites).toBe(true);
    await request(app).put('/api/quiz/invites').set('Authorization', auth()).send({ enabled: true }).expect(200, { invites: true });
    await request(app).put('/api/quiz/invites').set('Authorization', auth()).send({ enabled: 'no' }).expect(400, { error: 'bad_enabled' });

    const rules = await request(app).get('/api/quiz/rules').set('Authorization', auth()).expect(200);
    expect(rules.body).toMatchObject({ questions: 5, correct: 10, finish: 10, perfect: 20, max: 80, grandCount: 1, grandDays: 30, runnerCount: 3, runnerDays: 7, perfectDays: 1, drawHour: 12 });
  });

  test('closed window: when it opens and the last result; play says closed', async () => {
    const { app } = setup();
    at(new Date('2026-11-03T09:00:00Z')); // вторник
    const res = await request(app).get('/api/quiz').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ state: 'closed', last: null });
    expect(res.body.nextOpen).toMatch(/05\.11/);
    await request(app).post('/api/quiz/start').set('Authorization', auth()).expect(200, { status: 'closed', hour: QUIZ.OPEN_HOUR, questions: 5 });
  });
});

describe('playing in the app', () => {
  test('a whole quiz: questions without the answer, each answer counted once, results, nothing sent to the chat', async () => {
    const { app, repo, telegram, achievementService } = setup();
    let finish = null;
    for (let i = 0; i < 5; i++) {
      at(later(i * 30000));
      const q = await request(app).post('/api/quiz/start').set('Authorization', auth()).expect(200);
      expect(q.body).toEqual({ status: 'question', session: 1, index: i, total: 5, text: `Q${i}?`, options: ['a', 'b', 'c', 'd'], seconds: QUIZ.OPEN_PERIOD_SEC, remainingMs: QUIZ.OPEN_PERIOD_SEC * 1000 });
      // Повторный «Продолжить» — тот же вопрос с оставшимся временем
      at(later(i * 30000 + 3000));
      const again = await request(app).post('/api/quiz/start').set('Authorization', auth()).expect(200);
      expect(again.body).toMatchObject({ index: i, remainingMs: QUIZ.OPEN_PERIOD_SEC * 1000 - 3000 });

      const answer = await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 1, question: i, option: QUESTIONS[i].correct }).expect(200);
      expect(answer.body).toMatchObject({ outcome: 'correct', late: false, correct: QUESTIONS[i].correct, explanation: `x${i}`, finished: i === 4 });
      // Второй раз — не засчитывается
      await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 1, question: i, option: 1 }).expect(409, { error: 'quiz_answered' });
      if (i === 4) finish = answer.body;
    }
    expect(finish.result).toEqual({ correct: 5, total: 5, points: 80, answers: ['c', 'c', 'c', 'c', 'c'], percent: null, streak: 1, perfect: true, perfectDays: QUIZ.PERFECT_DAYS });
    expect(finish.achievement).toBe('🏅 Знаток');
    expect(achievementService.track).toHaveBeenCalledTimes(1);
    expect(achievementService.track).toHaveBeenCalledWith(ME, 'quiz_finished', { lang: 'ru' });
    expect(repo.sessions[0]).toMatchObject({ status: 'finished', score: 80, correct_count: 5 });
    // Ни опросов, ни итога в чат
    expect(telegram.callApi).not.toHaveBeenCalled();
    expect(telegram.sendPhoto).not.toHaveBeenCalled();
    expect(telegram.sendMessage).not.toHaveBeenCalled();

    const screen = await request(app).get('/api/quiz').set('Authorization', auth()).expect(200);
    expect(screen.body).toMatchObject({ state: 'finished', result: { points: 80, perfect: true }, progress: null });
    await request(app).post('/api/quiz/start').set('Authorization', auth()).expect(200, { status: 'finished', hour: QUIZ.OPEN_HOUR, questions: 5 });
  });

  test('only your own session and an asked question; option checked', async () => {
    const { app, repo } = setup();
    await request(app).post('/api/quiz/start').set('Authorization', auth()).expect(200);
    await request(app).post('/api/quiz/answer').set('Authorization', auth(OTHER)).send({ session: 1, question: 0, option: 0 }).expect(404, { error: 'not_found' });
    await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 1, question: 1, option: 0 }).expect(404);
    await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 99, question: 0, option: 0 }).expect(404);
    await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 1, question: 0, option: 4 }).expect(400, { error: 'bad_option' });
    await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 1, question: 0, option: 'b' }).expect(400, { error: 'bad_option' });
    await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 1, question: 0 }).expect(400, { error: 'bad_option' });
    await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ question: 0, option: 0 }).expect(400, { error: 'bad_session' });
    expect(repo.sessions[0]).toMatchObject({ current_index: 0, answers: '' });
    const ok = await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 1, question: 0, option: 2 }).expect(200);
    expect(ok.body).toMatchObject({ outcome: 'wrong', correct: 0 });
    expect(repo.sessions[0]).toMatchObject({ current_index: 1, answers: 'w', correct_count: 0 });
  });

  test('late answer — missed; time up; two misses — pause, «Continue» resumes; an abandoned question expires on return', async () => {
    const { app, repo, telegram, quizService } = setup();
    await request(app).post('/api/quiz/start').set('Authorization', auth()).expect(200);
    // В пределах запаса — засчитался бы; позже срока + ANSWER_GRACE_MS — «не успел»
    at(later(QUIZ.OPEN_PERIOD_SEC * 1000 + QUIZ.ANSWER_GRACE_MS + 1));
    const late = await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 1, question: 0, option: 0 }).expect(200);
    expect(late.body).toMatchObject({ outcome: 'missed', late: true, correct: 0, finished: false });
    expect(repo.sessions[0]).toMatchObject({ current_index: 1, answers: 'm', correct_count: 0 });

    const q1 = await request(app).post('/api/quiz/start').set('Authorization', auth()).expect(200);
    expect(q1.body.index).toBe(1);
    const timeUp = await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 1, question: 1, option: null }).expect(200);
    expect(timeUp.body).toMatchObject({ outcome: 'missed', late: false, correct: 1 });
    expect((await request(app).get('/api/quiz').set('Authorization', auth())).body).toMatchObject({ state: 'paused', progress: { done: 2, total: 5 } });

    const q2 = await request(app).post('/api/quiz/start').set('Authorization', auth()).expect(200);
    expect(q2.body.index).toBe(2);
    expect(repo.sessions[0].status).toBe('active');
    // Ушёл с вопроса: фоновая проверка ставит «не успел», но следующий вопрос в чат не шлёт
    const away = new Date(Date.now() + QUIZ.OPEN_PERIOD_SEC * 1000 + QUIZ.ANSWER_GRACE_MS + 1000);
    await quizService.sweep(away);
    await quizService.sweep(new Date(away.getTime() + 5 * 60000));
    expect(repo.sessions[0]).toMatchObject({ current_index: 3, answers: 'mmm' });
    expect(telegram.callApi).not.toHaveBeenCalled();
    at(new Date(away.getTime() + 5 * 60000));
    expect((await request(app).get('/api/quiz').set('Authorization', auth())).body).toMatchObject({ state: 'playing', progress: { done: 3, total: 5 } });
    const q3 = await request(app).post('/api/quiz/start').set('Authorization', auth()).expect(200);
    expect(q3.body).toMatchObject({ index: 3, remainingMs: QUIZ.OPEN_PERIOD_SEC * 1000 });
  });

  test('a question already sent to the chat stays there: the app says so and does not answer it', async () => {
    const { app, telegram, quizService } = setup();
    await quizService.start(ME, OPEN); // «▶️ Играть» в чате — опрос
    expect(telegram.callApi).toHaveBeenCalledTimes(1);
    const screen = await request(app).get('/api/quiz').set('Authorization', auth()).expect(200);
    expect(screen.body).toMatchObject({ state: 'in_chat', progress: { done: 0, total: 5 }, chatLink: 'https://t.me/TestQuizBot' });
    await request(app).post('/api/quiz/start').set('Authorization', auth()).expect(200, { status: 'in_chat', chatLink: 'https://t.me/TestQuizBot' });
    await request(app).post('/api/quiz/answer').set('Authorization', auth()).send({ session: 1, question: 0, option: 0 }).expect(404);
    expect(telegram.callApi).toHaveBeenCalledTimes(1);
    // Ответ в чате — следующий вопрос снова в чат, приложение по-прежнему отправляет туда
    await quizService.answerPoll('5001', ME, [0], later(1000));
    expect(telegram.callApi).toHaveBeenCalledTimes(2);
    expect((await request(app).post('/api/quiz/start').set('Authorization', auth())).body.status).toBe('in_chat');
  });
});
