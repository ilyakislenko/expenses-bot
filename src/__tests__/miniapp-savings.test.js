// Mini App «Копилка»: /api/savings — только свои копилки, правила бота (лимиты, премиум для целей, пересчёт валют,
// «столько нет», удаление — деньги в общую копилку), мастер остатков, прогноз, настройки, сценарии. Настоящий
// SavingsService поверх копилок в памяти.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const SavingsService = require('../services/SavingsService');
const LocalizationService = require('../services/LocalizationService');
const { projectDebts, projectDebt } = require('../utils/debtForecast');
const { cleanPotName, visibleAccounts, ownPots } = require('../utils/savingsView');
const { simulate } = require('../utils/savingsForecast');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const OTHER = 5;
const USD = 80; // 1 USD = 80 RUB

// Копилки в памяти с теми же правилами, что SavingsRepository (блокировки не нужны)
function memoryRepository() {
  let nextId = 1;
  const pots = [];
  const operations = [];
  const settings = new Map();
  const find = (userId, id) => pots.find(p => p.id === Number(id) && p.user_id === userId);
  const op = (userId, potId, amount, kind) => operations.push({ id: operations.length + 1, user_id: userId, pot_id: potId, amount, kind, created_at: new Date(Date.UTC(2026, 10, 8, 10, operations.length)) });
  const insert = (fields) => {
    const pot = { id: nextId++, balance: 0, name: null, yield_rate: null, target_amount: null, target_date: null, goal_mode: 'own', monthly_payment: null, due_day: null, achieved_at: null, created_at: new Date('2026-11-01T00:00:00Z'), ...fields };
    pots.push(pot);
    return pot;
  };
  const toGeneral = (client, userId, pot, amount) => {
    if (Number(pot.balance) <= 0) return;
    const general = pots.find(p => p.user_id === userId && p.kind === 'general');
    general.balance = Number(general.balance) + amount;
    op(userId, pot.id, -Number(pot.balance), 'transfer');
    op(userId, general.id, amount, 'transfer');
    pot.balance = 0;
  };
  return {
    pots, operations,
    insert,
    getPots: async (userId) => pots.filter(p => p.user_id === userId).map(p => ({ ...p })),
    getPot: async (userId, id) => { const p = find(userId, id); return p ? { ...p } : undefined; },
    ensureGeneralPot: async (userId, currency) => pots.find(p => p.user_id === userId && p.kind === 'general') || insert({ user_id: userId, kind: 'general', currency }),
    countGoals: async (userId) => pots.filter(p => p.user_id === userId && p.kind === 'goal').length,
    countAccounts: async (userId) => pots.filter(p => p.user_id === userId && p.kind === 'account').length,
    countDebts: async (userId) => pots.filter(p => p.user_id === userId && p.kind === 'debt').length,
    createDebt: async (userId, { name, amount, currency, rate }) => { const d = insert({ user_id: userId, kind: 'debt', name, balance: amount, currency, yield_rate: rate }); op(userId, d.id, amount, 'set'); return { ...d }; },
    updateDebt: async (userId, id, fields) => { const p = find(userId, id); if (!p || p.kind !== 'debt') return undefined; Object.assign(p, fields); return { ...p }; },
    deleteDebt: async (userId, id) => { const p = find(userId, id); if (!p || p.kind !== 'debt') return undefined; pots.splice(pots.indexOf(p), 1); return p; },
    createAccount: async (userId, { name, currency, yieldRate }) => ({ ...insert({ user_id: userId, kind: 'account', name, currency, yield_rate: yieldRate }) }),
    updateAccount: async (userId, id, fields) => { const p = find(userId, id); if (!p || !['general', 'account'].includes(p.kind)) return undefined; Object.assign(p, fields); return { ...p }; },
    setAccountCurrency: async (userId, id, currency) => { const p = find(userId, id); if (!p || p.kind !== 'account' || Number(p.balance) !== 0) return undefined; p.currency = currency; return { ...p }; },
    createGoal: async (userId, { name, targetAmount, currency }) => ({ ...insert({ user_id: userId, kind: 'goal', name, target_amount: targetAmount, currency, goal_mode: 'total' }) }),
    updateGoal: async (userId, id, fields) => { const p = find(userId, id); if (!p || p.kind !== 'goal') return undefined; Object.assign(p, fields); return { ...p }; },
    changeBalance: async (userId, id, change, kind, debt = false) => {
      const p = find(userId, id);
      if (!p || (p.kind === 'debt') !== debt) return { error: 'not_found' };
      if (p.kind === 'goal' && p.goal_mode !== 'own') return { error: 'not_own' };
      const delta = typeof change === 'function' ? change(Number(p.balance)) : change;
      if (Number(p.balance) + delta < 0) return { error: 'insufficient' };
      p.balance = Number(p.balance) + delta;
      if (delta !== 0) op(userId, p.id, delta, kind);
      return { pot: { ...p }, delta };
    },
    transfer: async (userId, fromId, toId, amountFrom, amountTo) => {
      const from = find(userId, fromId);
      const to = find(userId, toId);
      if (!from || !to || fromId === toId || [from, to].some(p => p.kind === 'debt')) return { error: 'not_found' };
      if ([from, to].some(p => p.kind === 'goal' && p.goal_mode !== 'own')) return { error: 'not_own' };
      if (Number(from.balance) < amountFrom) return { error: 'insufficient' };
      from.balance -= amountFrom;
      to.balance = Number(to.balance) + amountTo;
      op(userId, fromId, -amountFrom, 'transfer');
      op(userId, toId, amountTo, 'transfer');
      return { from: { ...from }, to: { ...to } };
    },
    deletePot: async (userId, id, kind, convert) => {
      const p = find(userId, id);
      if (!p || p.kind !== kind) return null;
      const moved = Number(p.balance);
      toGeneral(null, userId, p, await convert(moved, p.currency));
      pots.splice(pots.indexOf(p), 1);
      return { pot: { ...p, balance: moved }, moved };
    },
    setGoalMode: async (userId, id, mode, convert) => {
      const p = find(userId, id);
      if (!p || p.kind !== 'goal') return null;
      const moved = mode === 'total' ? Number(p.balance) : 0;
      if (moved > 0) toGeneral(null, userId, p, await convert(moved, p.currency));
      p.goal_mode = mode;
      return { goal: { ...p }, moved };
    },
    getRecentOperations: async (userId, potId, limit) => operations.filter(o => o.user_id === userId && o.pot_id === Number(potId)).reverse().slice(0, limit),
    getSettings: async (userId) => settings.get(userId) || null,
    updateSettings: async (userId, fields) => {
      const row = settings.get(userId) || { monthly_contribution: null, inflation_rate: null, yield_rate: null, contribution_growth: null };
      Object.assign(row, fields);
      settings.set(userId, row);
      return row;
    }
  };
}

function setup({ premium = true } = {}) {
  const repo = memoryRepository();
  const currencyUtils = { convert: async (amount, from, to) => (from === to ? amount : from === 'USD' ? amount * USD : amount / USD) };
  const userService = {
    getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'Europe/Moscow', getUserPeriodStartDay: async () => 1
  };
  const premiumService = {
    isPremiumUser: async () => premium,
    getUserLimits: async () => ({ MAX_SAVINGS_GOALS: premium ? 10 : 1 })
  };
  // Взнос «авто» — SavingsScenarioService.contribution; здесь дохода нет — взнос неизвестен
  const savingsScenarioService = {
    build: jest.fn(async (userId) => ({ family: false, userId, income: null, scenarios: [] })),
    contribution: jest.fn(async () => null)
  };
  const savingsService = new SavingsService({
    savingsRepository: repo, userService, premiumService, currencyUtils, scenarios: () => savingsScenarioService
  });
  const achievementService = { track: jest.fn(async () => '🏅 *Новое достижение:* Копилка') };
  const validator = {
    validateDescription: (text) => ({ isValid: !/[<>]/.test(text) }),
    sanitizeText: (text) => text.trim()
  };
  const services = {
    userService, premiumService, savingsService, achievementService, savingsScenarioService,
    localizationService: new LocalizationService(), enhancedValidator: validator
  };
  const app = new MiniAppServer({ port: 0, botToken: TOKEN, get: (name) => services[name] }).app;
  const auth = (id = ME) => `tma ${signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya', language_code: 'ru' }) }, TOKEN)}`;
  const call = (method, path, id = ME) => request(app)[method](`/api${path}`).set('Authorization', auth(id));
  return { app, repo, call, achievementService, savingsScenarioService, savingsService };
}

// Владелец: общая (пустая), наличные 1 000 $ без процентов, сбер 200 000 ₽, цель «от всех» на 500 000 ₽,
// своя цель с 10 000 ₽, ипотека 1 000 000 ₽ под 12% с платежом 20 000 ₽. Чужой — свой счёт
function seed(repo) {
  const general = repo.insert({ user_id: ME, kind: 'general', currency: 'RUB' });
  const cash = repo.insert({ user_id: ME, kind: 'account', name: 'Наличные', currency: 'USD', balance: 1000, yield_rate: 0 });
  const bank = repo.insert({ user_id: ME, kind: 'account', name: 'Сбер', currency: 'RUB', balance: 200000 });
  const car = repo.insert({ user_id: ME, kind: 'goal', name: 'Машина', currency: 'RUB', target_amount: 500000, goal_mode: 'total' });
  const trip = repo.insert({ user_id: ME, kind: 'goal', name: 'Отпуск', currency: 'RUB', target_amount: 100000, goal_mode: 'own', balance: 10000 });
  const mortgage = repo.insert({ user_id: ME, kind: 'debt', name: 'Ипотека', currency: 'RUB', balance: 1000000, yield_rate: 12, monthly_payment: 20000, due_day: 5 });
  const foreign = repo.insert({ user_id: OTHER, kind: 'account', name: 'Чужой', currency: 'RUB', balance: 777 });
  return { general, cash, bank, car, trip, mortgage, foreign };
}

describe('mini app savings: main screen and cards', () => {
  test('signature required; main screen — totals in main currency, debts apart, capital, «in a year», limits', async () => {
    const { app, repo, call } = setup();
    seed(repo);
    await repo.updateSettings(ME, { monthly_contribution: 30000 });
    await request(app).get('/api/savings').expect(401);

    const res = await call('get', '/savings').expect(200);
    const total = 1000 * USD + 200000 + 10000;
    expect(res.body).toMatchObject({ currency: 'RUB', total, debtTotal: 1000000, netWorth: total - 1000000, empty: false, canUpdate: true });
    expect(res.body.monthly).toEqual({ amount: 30000, source: 'manual', periods: null });
    expect(res.body.yearAhead).toBeCloseTo(total + 12 * 30000);
    // Пустая общая копилка при своих счетах скрыта; иконки — по названию
    expect(res.body.accounts.map(a => [a.name, a.icon, a.balance, a.balanceMain])).toEqual([['Наличные', '💵', 1000, 80000], ['Сбер', '💼', 200000, 200000]]);
    expect(res.body.goals.map(g => [g.name, g.mode, g.status.current, g.status.target])).toEqual([['Машина', 'total', total, 500000], ['Отпуск', 'own', 10000, 100000]]);
    expect(res.body.goals[0].status.etaNominal).toBe(Math.ceil((500000 - total) / 30000));
    expect(res.body.sharedGoals).toBeNull();
    expect(res.body.debts[0]).toMatchObject({ name: 'Ипотека', icon: '💳', monthlyPayment: 20000, dueDay: 5, yieldRate: 12, plan: { paidOff: true } });
    expect(res.body.limits).toEqual({ premium: true, accounts: { count: 2, max: 10 }, goals: { count: 2, max: 10 }, debts: { count: 1, max: 10 } });
  });

  test('a new user sees the empty state with the general pot; monthly unknown — no «in a year»', async () => {
    const { call } = setup();
    const res = await call('get', '/savings').expect(200);
    expect(res.body).toMatchObject({ empty: true, total: 0, yearAhead: null, monthly: { amount: null, source: null }, canUpdate: true });
    expect(res.body.accounts).toEqual([expect.objectContaining({ kind: 'general', name: null, icon: '💰' })]);
  });

  test('cards: account — history and where to transfer, goal — status and growth chart, debt — payoff plan and chart', async () => {
    const { repo, call } = setup();
    const pots = seed(repo);
    await repo.updateSettings(ME, { monthly_contribution: 30000 });
    await call('post', `/savings/pots/${pots.bank.id}/balance`).send({ op: 'deposit', amount: 5000 }).expect(200);

    const account = await call('get', `/savings/pots/${pots.bank.id}`).expect(200);
    expect(account.body.operations).toEqual([expect.objectContaining({ amount: 5000, kind: 'deposit', date: '2026-11-08' })]);
    expect(account.body.updated).toBe('2026-11-08');
    expect(account.body.transferTargets.map(p => p.id)).toEqual([pots.general.id, pots.cash.id, pots.trip.id]); // не долги и не цели «от всех»

    const goal = await call('get', `/savings/pots/${pots.car.id}`).expect(200);
    expect(goal.body.status).toMatchObject({ target: 500000, achieved: false });
    expect(goal.body.chart.target).toBe(500000);
    expect(goal.body.chart.values[0]).toBe(goal.body.status.current);

    const debt = await call('get', `/savings/pots/${pots.mortgage.id}`).expect(200);
    expect(debt.body.plan.paidOff).toBe(true);
    expect(debt.body.chart.values).toEqual(projectDebt({ balance: 1000000, rate: 12, payment: 20000, months: debt.body.plan.months }));
    expect(debt.body.chart.values[debt.body.chart.values.length - 1]).toBe(0);
  });

  test('someone else\'s pot does not exist for you', async () => {
    const { repo, call } = setup();
    const { foreign } = seed(repo);
    await call('get', `/savings/pots/${foreign.id}`).expect(404);
    await call('post', `/savings/pots/${foreign.id}/balance`).send({ op: 'deposit', amount: 1 }).expect(404);
    await call('patch', `/savings/pots/${foreign.id}`).send({ name: 'Моё' }).expect(404);
    await call('delete', `/savings/pots/${foreign.id}`).expect(404);
    await call('get', '/savings/pots/abc').expect(404);
    expect(repo.pots.find(p => p.id === foreign.id)).toMatchObject({ name: 'Чужой', balance: 777 });
  });
});

describe('mini app savings: money moves', () => {
  test('deposit in another currency is converted; take out more than there is — refused; new amount 0 is fine', async () => {
    const { repo, call, achievementService } = setup();
    const { cash, bank } = seed(repo);
    const deposit = await call('post', `/savings/pots/${cash.id}/balance`).send({ op: 'deposit', amount: 8000, currency: 'RUB' }).expect(200);
    expect(deposit.body).toMatchObject({ amount: 100, pot: { balance: 1100 }, note: '🏅 Новое достижение: Копилка' });
    expect(achievementService.track).toHaveBeenCalledWith(ME, 'savings_updated', { lang: 'ru' });

    const refused = await call('post', `/savings/pots/${bank.id}/balance`).send({ op: 'withdraw', amount: 200001 }).expect(400);
    expect(refused.body).toEqual({ error: 'savings_insufficient', balance: 200000 });
    await call('post', `/savings/pots/${bank.id}/balance`).send({ op: 'set', amount: 0 }).expect(200);
    expect(repo.pots.find(p => p.id === bank.id).balance).toBe(0);
    await call('post', `/savings/pots/${bank.id}/balance`).send({ op: 'deposit', amount: 0 }).expect(400, { error: 'savings_amount' });
    await call('post', `/savings/pots/${bank.id}/balance`).send({ op: 'steal', amount: 5 }).expect(400);
    await call('post', `/savings/pots/${bank.id}/balance`).send({ op: 'deposit', amount: 5, currency: 'XXX' }).expect(400, { error: 'savings_currency' });
  });

  test('debts and «from all savings» goals are not pots for deposits; a reached goal is reported', async () => {
    const { repo, call } = setup();
    const { car, trip, mortgage } = seed(repo);
    await call('post', `/savings/pots/${mortgage.id}/balance`).send({ op: 'deposit', amount: 5 }).expect(404);
    await call('post', `/savings/pots/${car.id}/balance`).send({ op: 'deposit', amount: 5 }).expect(404);
    const reached = await call('post', `/savings/pots/${trip.id}/balance`).send({ op: 'deposit', amount: 90000 }).expect(200);
    expect(reached.body.achieved).toEqual([{ id: trip.id, name: 'Отпуск' }]);
  });

  test('transfer between own pots converts currency; not enough — refused', async () => {
    const { repo, call } = setup();
    const { cash, bank } = seed(repo);
    const res = await call('post', `/savings/pots/${cash.id}/transfer`).send({ to: bank.id, amount: 100 }).expect(200);
    expect(res.body).toMatchObject({ amountTo: 8000, to: { id: bank.id, balance: 208000 } });
    await call('post', `/savings/pots/${cash.id}/transfer`).send({ to: bank.id, amount: 5000 }).expect(400);
  });

  test('debt: repay, increase, exact amount; can\'t repay more than owed; paid off — its own achievement', async () => {
    const { repo, call, achievementService } = setup();
    const { mortgage } = seed(repo);
    await call('post', `/savings/pots/${mortgage.id}/debt`).send({ op: 'pay', amount: 100000 }).expect(200);
    await call('post', `/savings/pots/${mortgage.id}/debt`).send({ op: 'increase', amount: 50000 }).expect(200);
    expect(repo.pots.find(p => p.id === mortgage.id).balance).toBe(950000);
    const over = await call('post', `/savings/pots/${mortgage.id}/debt`).send({ op: 'pay', amount: 950001 }).expect(400);
    expect(over.body).toEqual({ error: 'savings_overpay', balance: 950000 });
    await call('post', `/savings/pots/${mortgage.id}/debt`).send({ op: 'set', amount: 0 }).expect(200);
    expect(achievementService.track).toHaveBeenLastCalledWith(ME, 'debt_paid_off', { lang: 'ru' });
    expect(repo.operations.filter(o => o.pot_id === mortgage.id).map(o => o.kind)).toEqual(['withdraw', 'deposit', 'set']);
  });
});

describe('mini app savings: adding, settings, deleting', () => {
  test('new account with currency, rate and current amount; names are checked; 10 accounts at most', async () => {
    const { repo, call } = setup();
    const res = await call('post', '/savings/accounts').send({ name: '  Вклад ', currency: 'USD', yieldRate: 4, balance: 3000 }).expect(200);
    expect(repo.pots.find(p => p.id === res.body.id)).toMatchObject({ kind: 'account', name: 'Вклад', currency: 'USD', yield_rate: 4, balance: 3000 });
    await call('post', '/savings/accounts').send({ name: '' }).expect(400, { error: 'savings_name' });
    await call('post', '/savings/accounts').send({ name: 'x'.repeat(61) }).expect(400, { error: 'savings_name' });
    await call('post', '/savings/accounts').send({ name: '<b>' }).expect(400, { error: 'savings_name' });
    await call('post', '/savings/accounts').send({ name: 'Вклад', yieldRate: 301 }).expect(400, { error: 'savings_rate' });
    const plain = await call('post', '/savings/accounts').send({ name: 'Наличные' }).expect(200);
    expect(repo.pots.find(p => p.id === plain.body.id)).toMatchObject({ currency: 'RUB', yield_rate: null, balance: 0 });
    for (let i = 0; i < 8; i++) await call('post', '/savings/accounts').send({ name: `Счёт ${i}` }).expect(200);
    const limit = await call('post', '/savings/accounts').send({ name: 'Лишний' }).expect(403);
    expect(limit.body).toEqual({ error: 'savings_limit', limit: 10 });
  });

  test('goals: one free (more — premium 402), premium up to 10; own pot and future deadline right away', async () => {
    const free = setup({ premium: false });
    await free.call('post', '/savings/goals').send({ name: 'Машина', target: 1500000 }).expect(200);
    await free.call('post', '/savings/goals').send({ name: 'Ещё', target: 1000 }).expect(402, { error: 'premium_required', feature: 'savings_goals' });

    const paid = setup();
    await paid.call('post', '/savings/goals').send({ name: 'Отпуск', target: 1000, targetDate: '2020-01-01' }).expect(400, { error: 'savings_date' });
    const res = await paid.call('post', '/savings/goals').send({ name: 'Отпуск', target: 300000, mode: 'own', targetDate: '2099-12-31' }).expect(200);
    expect(paid.repo.pots.find(p => p.id === res.body.id)).toMatchObject({ kind: 'goal', goal_mode: 'own', target_amount: 300000, target_date: '2099-12-31', currency: 'RUB' });
    expect(paid.achievementService.track).toHaveBeenCalledWith(ME, 'goal_created', { lang: 'ru' });
    for (let i = 0; i < 9; i++) await paid.call('post', '/savings/goals').send({ name: `Цель ${i}`, target: 1000 }).expect(200);
    await paid.call('post', '/savings/goals').send({ name: 'Лишняя', target: 1000 }).expect(403, { error: 'savings_goal_limit', limit: 10 });
  });

  test('new debt with rate, payment and payment day; terms edited in place', async () => {
    const { repo, call } = setup();
    const res = await call('post', '/savings/debts').send({ name: 'Кредитка', amount: 45000, rate: 29.9, monthlyPayment: 5000, dueDay: 20 }).expect(200);
    const debt = () => repo.pots.find(p => p.id === res.body.id);
    expect(debt()).toMatchObject({ kind: 'debt', balance: 45000, currency: 'RUB', yield_rate: 29.9, monthly_payment: 5000, due_day: 20 });
    await call('post', '/savings/debts').send({ name: 'Долг', amount: 100, dueDay: 32 }).expect(400, { error: 'savings_due_day' });
    await call('patch', `/savings/pots/${res.body.id}`).send({ yieldRate: 0, monthlyPayment: null, dueDay: null, name: 'Карта' }).expect(200);
    expect(debt()).toMatchObject({ name: 'Карта', yield_rate: null, monthly_payment: null, due_day: null });
    await call('patch', `/savings/pots/${res.body.id}`).send({ dueDay: 0 }).expect(400);
  });

  test('account settings: own rate or «as in settings», currency only while empty; goal: target, deadline, mode moves money', async () => {
    const { repo, call } = setup();
    const { cash, trip, general } = seed(repo);
    await call('patch', `/savings/pots/${cash.id}`).send({ yieldRate: null }).expect(200);
    expect(repo.pots.find(p => p.id === cash.id).yield_rate).toBeNull();
    await call('patch', `/savings/pots/${cash.id}`).send({ currency: 'EUR' }).expect(400, { error: 'savings_currency_locked' });
    await call('patch', `/savings/pots/${general.id}`).send({ name: 'Подушка' }).expect(200);
    expect(repo.pots.find(p => p.id === general.id).name).toBe('Подушка');

    await call('patch', `/savings/pots/${trip.id}`).send({ target: 150000, targetDate: '2099-06-30' }).expect(200);
    expect(repo.pots.find(p => p.id === trip.id)).toMatchObject({ target_amount: 150000, target_date: '2099-06-30' });
    await call('patch', `/savings/pots/${trip.id}`).send({ targetDate: null }).expect(200);
    expect(repo.pots.find(p => p.id === trip.id).target_date).toBeNull();
    const mode = await call('patch', `/savings/pots/${trip.id}`).send({ mode: 'total' }).expect(200);
    expect(mode.body).toMatchObject({ moved: 10000, pot: { mode: 'total' } });
    expect(repo.pots.find(p => p.id === general.id).balance).toBe(10000);
  });

  test('deleting: account and goal money goes to the general pot (by rate), debt just disappears, general stays', async () => {
    const { repo, call } = setup();
    const { cash, trip, mortgage, general } = seed(repo);
    await call('delete', `/savings/pots/${cash.id}`).expect(200, { moved: 1000, currency: 'USD' });
    await call('delete', `/savings/pots/${trip.id}`).expect(200, { moved: 10000, currency: 'RUB' });
    expect(repo.pots.find(p => p.id === general.id).balance).toBe(1000 * USD + 10000);
    await call('delete', `/savings/pots/${mortgage.id}`).expect(200, { moved: 0, currency: 'RUB' });
    await call('delete', `/savings/pots/${general.id}`).expect(400, { error: 'savings_general' });
    expect(repo.pots.filter(p => p.user_id === ME).map(p => p.kind)).toEqual(['general', 'account', 'goal']);
  });
});

describe('mini app savings: update wizard, forecast, settings, scenarios', () => {
  test('update wizard: queue like the bot (general only if not empty, accounts, own goals, debts), steps quiet, one finish', async () => {
    const { repo, call, achievementService } = setup();
    const { cash, bank, trip, mortgage } = seed(repo);
    const queue = await call('get', '/savings/update').expect(200);
    expect(queue.body.steps.map(s => s.id)).toEqual([cash.id, bank.id, trip.id, mortgage.id]);
    expect(queue.body.before).toMatchObject({ total: 290000, netWorth: 290000 - 1000000, debts: true });

    await call('post', `/savings/pots/${bank.id}/balance`).send({ op: 'set', amount: 250000, wizard: true }).expect(200);
    await call('post', `/savings/pots/${mortgage.id}/debt`).send({ op: 'set', amount: 980000, wizard: true }).expect(200);
    expect(achievementService.track).not.toHaveBeenCalled();
    const done = await call('post', '/savings/update/finish').expect(200);
    expect(done.body).toMatchObject({ total: 340000, netWorth: 340000 - 980000, debts: true, note: '🏅 Новое достижение: Копилка' });
    expect(achievementService.track).toHaveBeenCalledTimes(1);
  });

  test('forecast: 10 years month by month with today\'s money and debts; unknown monthly — only debts', async () => {
    const { repo, call } = setup();
    seed(repo);
    const unknown = await call('get', '/savings/forecast').expect(200);
    expect(unknown.body.savings).toBeNull();
    expect(unknown.body.debts).toHaveLength(121);

    await call('patch', '/savings/settings').send({ monthly: 30000, inflationRate: 8, yieldRate: 10 }).expect(200);
    const res = await call('get', '/savings/forecast').expect(200);
    const expected = simulate({ parts: [{ balance: 80000, yieldRate: 0 }, { balance: 200000, yieldRate: null }, { balance: 10000, yieldRate: null }], monthly: 30000, yieldRate: 10, inflationRate: 8, contributionGrowth: 0, months: 120 });
    expect(res.body.savings.nominal).toEqual(expected.points.map(p => p.nominal));
    expect(res.body.savings.real[120]).toBeLessThan(res.body.savings.nominal[120]);
    expect(res.body.monthly).toMatchObject({ amount: 30000, source: 'manual' });
    expect(res.body.ownRates).toBe(true);
  });

  test('automatic monthly — the default scenario\'s amount: home «in a year» and the forecast use it, manual wins', async () => {
    const { repo, call, savingsScenarioService } = setup();
    seed(repo);
    savingsScenarioService.contribution.mockResolvedValue({ amount: 213000, income: 300000, spending: 87000, key: 'current', periods: 1 });
    const home = await call('get', '/savings').expect(200);
    const total = 1000 * USD + 200000 + 10000;
    expect(savingsScenarioService.contribution).toHaveBeenCalledWith(ME);
    expect(home.body.monthly).toEqual({ amount: 213000, source: 'auto', periods: 1 });
    expect(home.body.yearAhead).toBeCloseTo(total + 12 * 213000);
    const forecast = await call('get', '/savings/forecast').expect(200);
    expect(forecast.body.savings.nominal[12]).toBeCloseTo(home.body.yearAhead);

    await call('patch', '/savings/settings').send({ monthly: 30000 }).expect(200);
    const manual = await call('get', '/savings').expect(200);
    expect(manual.body.monthly).toEqual({ amount: 30000, source: 'manual', periods: null });
    expect(manual.body.yearAhead).toBeCloseTo(total + 12 * 30000);
  });

  test('settings: manual monthly or automatic, rates within limits, 0 — not counted', async () => {
    const { repo, call } = setup();
    seed(repo);
    await call('patch', '/savings/settings').send({ monthly: 0, contributionGrowth: 5 }).expect(200);
    let res = await call('get', '/savings/settings').expect(200);
    expect(res.body).toMatchObject({ manualMonthly: 0, monthly: { source: 'manual', amount: 0 }, settings: { contributionGrowth: 5 }, limits: { yieldRate: 300, inflationRate: 300, contributionGrowth: 100 } });
    await call('patch', '/savings/settings').send({ monthly: null, contributionGrowth: 0 }).expect(200);
    res = await call('get', '/savings/settings').expect(200);
    expect(res.body).toMatchObject({ manualMonthly: null, monthly: { source: null }, settings: { contributionGrowth: 0 } });
    expect(repo.pots.length).toBeGreaterThan(0);
    await call('patch', '/savings/settings').send({ contributionGrowth: 101 }).expect(400, { error: 'savings_rate' });
    await call('patch', '/savings/settings').send({ inflationRate: 7.55 }).expect(200);
    await call('patch', '/savings/settings').send({ monthly: -5 }).expect(400);
    await call('patch', '/savings/settings').send({}).expect(400);
  });

  test('scenarios — the bot\'s SavingsScenarioService for the signed user', async () => {
    const { call, savingsScenarioService } = setup();
    const res = await call('get', '/savings/scenarios').expect(200);
    expect(savingsScenarioService.build).toHaveBeenCalledWith(ME);
    expect(res.body).toMatchObject({ userId: ME, income: null, scenarios: [] });
  });
});

describe('savings helpers shared by the bot and the app', () => {
  test('debts in main currency by month, pot names, visible accounts, own pots', () => {
    const debts = [
      { balance: 1000, balanceMain: 80000, yield_rate: null, monthly_payment: 100 },
      { balance: 0, balanceMain: 0, yield_rate: 10, monthly_payment: 5 }
    ];
    expect(projectDebts(debts, 3)).toEqual([80000, 72000, 64000, 56000]);
    const validator = { validateDescription: (t) => ({ isValid: !t.includes('<') }), sanitizeText: (t) => t };
    expect(cleanPotName('  Вклад ', validator)).toBe('Вклад');
    expect(cleanPotName('', validator)).toBeNull();
    expect(cleanPotName('<x>', validator)).toBeNull();
    const accounts = [{ kind: 'general', balance: 0 }, { kind: 'account', balance: 5 }];
    expect(visibleAccounts(accounts)).toEqual([accounts[1]]);
    expect(visibleAccounts([accounts[0]])).toEqual([accounts[0]]);
    const pots = [...accounts, { kind: 'goal', goal_mode: 'total' }, { kind: 'goal', goal_mode: 'own' }, { kind: 'debt' }];
    expect(ownPots(pots).map(p => p.kind)).toEqual(['general', 'account', 'goal']);
  });
});
