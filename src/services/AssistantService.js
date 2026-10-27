// «🤖 Спроси бота»: вопрос обычными словами → намерение (быстрый разбор или нейросеть, assistant/*) → проверка →
// расчёт по записям пользователя → ответ по шаблонам. Модель только переводит вопрос в JSON из маленькой схемы:
// ни SQL, ни числа, ни текст ответа она не пишет.
const logger = require('../utils/logger');
const { USER_LIMITS } = require('../utils/constants');
const { localToday } = require('../utils/period');
const { normalizeIntent } = require('./assistant/intent');
const { parseFastPath } = require('./assistant/fastPath');
const { buildMessages } = require('./assistant/prompt');
const { resolvePeriod, comparisonPeriods, elapsedDays } = require('./assistant/periods');
const { searchStem } = require('./assistant/text');
const { AnswerComposer } = require('./assistant/compose');

// Сколько вопрос может ждать нейросеть вместе с очередью (локальная модель занята чеком — не ждём минутами)
const MODEL_DEADLINE_MS = 75000;
const MAX_QUESTION_LENGTH = 300;
// Кнопки-примеры (ai|<n>, тексты ai_example_<n>) — готовые намерения: ответ сразу и на любом языке, без нейросети
const EXAMPLE_INTENTS = {
  1: { type: 'spend_total', period: { kind: 'month', offset: 0 } },
  2: { type: 'spend_by_category', period: { kind: 'month', offset: -1 } },
  3: { type: 'spend_total', period: { kind: 'last_n_days', n: 7 }, categories: ['Еда'] },
  4: { type: 'compare_periods', period: { kind: 'month', offset: 0 } },
  5: { type: 'largest_purchase', period: { kind: 'year', offset: 0 } },
  6: { type: 'average_daily', period: { kind: 'month', offset: 0 } }
};

class AssistantService {
  constructor({ assistantRepository, provider, expenseService, incomeService, savingsService, budgetService, premiumService, localizationService, formatter, currencyUtils, modelDeadlineMs = MODEL_DEADLINE_MS }) {
    this.assistantRepository = assistantRepository;
    this.provider = provider;
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.savingsService = savingsService;
    this.budgetService = budgetService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.currencyUtils = currencyUtils;
    this.modelDeadlineMs = modelDeadlineMs;
  }

  get premiumLimit() {
    return USER_LIMITS.premium.MAX_ASSISTANT_QUESTIONS_PER_DAY;
  }

  get freeLimit() {
    return USER_LIMITS.regular.MAX_ASSISTANT_QUESTIONS_PER_DAY;
  }

  // Дневной лимит отвеченных вопросов по локальной дате: { used, limit, remaining, isPremium }
  async checkLimit(userId, timezone) {
    const isPremium = await this.premiumService.isPremiumUser(userId);
    const limit = isPremium ? this.premiumLimit : this.freeLimit;
    const used = await this.assistantRepository.countAnswered(userId, localToday(timezone));
    return { used, limit, remaining: Math.max(0, limit - used), isPremium };
  }

  // Всё о пользователе, что нужно для разбора и расчёта
  async loadContext(userId, lang) {
    const [{ timezone, currency, startDay, today }, isPremium, rawCategories] = await Promise.all([
      this.expenseService.getPeriodContext(userId, 'month', 0),
      this.premiumService.isPremiumUser(userId),
      this.expenseService.getCategories(userId)
    ]);
    const categories = rawCategories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      label: this.formatter.translateCategoryName(category.name, this.localizationService, lang)
    }));
    return { userId, lang, timezone, currency, startDay, today, isPremium, categories };
  }

  // Вопрос → { raw, source } (source: fast | model | fallback) или { error: 'not_understood' | 'model_down' }.
  // Вопрос, разобранный быстрым разбором целиком, модели не отправляется (skipFast — всё равно спросить модель).
  async understand(question, context, { onStatus, skipFast = false } = {}) {
    const fast = parseFastPath(question, context);
    if (fast && fast.confident && !skipFast) return { raw: fast.intent, source: 'fast' };
    if (!this.provider || !this.provider.configured) {
      return fast && fast.usable ? { raw: fast.intent, source: 'fallback' } : { error: 'model_down' };
    }
    let cancelled = false;
    let timer = null;
    const deadline = new Promise((resolve) => {
      timer = setTimeout(() => {
        cancelled = true;
        resolve({ timeout: true });
      }, this.modelDeadlineMs);
    });
    const started = Date.now();
    try {
      const request = this.provider.complete({
        messages: buildMessages({ question, today: context.today, startDay: context.startDay, categories: context.categories.map(c => c.label) }),
        onStatus,
        isCancelled: () => cancelled
      }).then(raw => ({ raw }));
      const outcome = await Promise.race([request, deadline]);
      request.catch(() => {}); // опоздавший ответ (или ошибка) после срока никому не нужен
      if (outcome.timeout) throw new Error('assistant model deadline');
      logger.info('Assistant intent from model', { userId: context.userId, ms: Date.now() - started, type: outcome.raw && outcome.raw.type });
      const checked = normalizeIntent(outcome.raw, { ...context, question });
      // Модель не поняла, а быстрый разбор узнал тип — берём его
      if (!checked.ok && checked.reason === 'unknown' && fast && fast.usable) return { raw: fast.intent, source: 'fallback' };
      return { raw: outcome.raw, source: 'model' };
    } catch (error) {
      logger.warn('Assistant model failed', { userId: context.userId, error: error.message, code: error.code, ms: Date.now() - started });
      if (fast && fast.usable) return { raw: fast.intent, source: 'fallback' };
      return { error: 'model_down' };
    } finally {
      clearTimeout(timer);
    }
  }

  // Вопрос → { status: 'answered', text, keyboard, intent, source } | { status: 'not_understood' | 'model_down' | 'future' }.
  // example — номер кнопки-примера: намерение готовое, вопрос не разбирается
  async answer(userId, question, { lang, onStatus, example = null } = {}) {
    const started = Date.now();
    const text = String(question || '').trim().slice(0, MAX_QUESTION_LENGTH);
    const context = await this.loadContext(userId, lang);
    const resolved = await this.resolve(text, context, { onStatus, example });
    if (resolved.status !== 'ok') return resolved;
    const { intent, result, source } = resolved;
    const { text: answerText, keyboard } = new AnswerComposer({ localizationService: this.localizationService, formatter: this.formatter, lang }).compose(result);
    const ms = Date.now() - started;
    await this.assistantRepository.logAnswered(userId, context.today, { intentType: intent.type, source, ms });
    logger.info('Assistant answered', { userId, type: intent.type, source, ms });
    return { status: 'answered', text: answerText, keyboard, intent, source };
  }

  // Вопрос → проверенное намерение и посчитанный результат: { status: 'ok', intent, result, source } или
  // { status: 'not_understood' | 'model_down' | 'future' }
  async resolve(text, context, { onStatus, example = null } = {}) {
    let understood = EXAMPLE_INTENTS[example]
      ? { raw: EXAMPLE_INTENTS[example], source: 'example' }
      : await this.understand(text, context, { onStatus });
    if (understood.error) return { status: understood.error };
    const checked = normalizeIntent(understood.raw, { ...context, question: text });
    if (!checked.ok) return { status: checked.reason === 'future' ? 'future' : 'not_understood', source: understood.source };
    let { intent } = checked;
    let result = await this.compute(intent, context);
    // Быстрый разбор принял слово за поиск по описанию («на лекарства»), а таких трат нет: возможно, это смысл,
    // а не слово из описания (лекарства → «Здоровье») — спросим модель и возьмём её ответ, если он другой
    if (understood.source === 'fast' && intent.terms.length && result.count === 0 && this.provider && this.provider.configured) {
      const retry = await this.understand(text, context, { onStatus, skipFast: true });
      const second = retry.raw ? normalizeIntent(retry.raw, { ...context, question: text }) : null;
      if (retry.source === 'model' && second && second.ok && JSON.stringify(second.intent) !== JSON.stringify(intent)) {
        understood = retry;
        intent = second.intent;
        result = await this.compute(intent, context);
      }
    }
    return { status: 'ok', intent, result, source: understood.source };
  }

  // ---------- Расчёт ----------

  // Множитель пересчёта валюты в валюту ответа (курс запрашивается по разу на валюту)
  rateCache(target) {
    const rates = new Map();
    return async (currency) => {
      if (currency === target) return 1;
      if (!rates.has(currency)) rates.set(currency, await this.currencyUtils.convert(1, currency, target));
      return rates.get(currency);
    };
  }

  async expenseRows(context, period, intent) {
    return this.assistantRepository.findExpenses(context.userId, context.timezone, period.start, period.end, {
      categoryNames: intent.categories.map(c => c.name),
      terms: intent.terms.map(searchStem).filter(Boolean)
    });
  }

  // Строки трат → итог в валюте ответа и записи с суммой в ней (value)
  async valueRows(rows, rate) {
    const valued = [];
    let total = 0;
    for (const row of rows) {
      const value = Number(row.amount) * await rate(row.currency);
      total += value;
      valued.push({ ...row, value });
    }
    return { rows: valued, total, count: rows.length };
  }

  async sumTotals(byCurrency, rate) {
    let total = 0;
    for (const { currency, total: amount } of byCurrency) total += Number(amount) * await rate(currency);
    return total;
  }

  async compute(intent, context) {
    const currency = intent.currency || context.currency;
    const rate = this.rateCache(currency);
    const base = { intent, currency };
    const periodContext = { today: context.today, startDay: context.startDay };

    if (intent.type === 'savings_status') return { ...base, currency: context.currency, ...(await this.savings(context)) };
    if (intent.type === 'budget_status') return { ...base, currency: context.currency, ...(await this.budgets(context)) };

    if (intent.type === 'compare_periods') {
      const periods = comparisonPeriods(intent.period, intent.compareTo, periodContext);
      if (!periods) {
        // У «всего времени» нет предыдущего — сравниваем этот период с прошлым
        return this.compute({ ...intent, period: { kind: 'month', offset: 0 } }, context);
      }
      const [current, previous] = await Promise.all([
        this.expenseRows(context, periods.current, intent).then(rows => this.valueRows(rows, rate)),
        this.expenseRows(context, periods.previous, intent).then(rows => this.valueRows(rows, rate))
      ]);
      return {
        ...base,
        period: periods.current,
        current: { period: periods.current, total: current.total, count: current.count },
        previous: { period: periods.previous, total: previous.total, count: previous.count },
        toDate: periods.toDate,
        days: periods.days
      };
    }

    const period = resolvePeriod(intent.period, periodContext);
    if (intent.type === 'income_total' || intent.type === 'balance') {
      const incomes = await this.incomeService.getTotals(context.userId, context.timezone, period);
      const income = await this.sumTotals(incomes.byCurrency, rate);
      if (intent.type === 'income_total') return { ...base, period, total: income, count: incomes.count };
      const expenses = await this.expenseService.getTotals(context.userId, context.timezone, period);
      const spent = await this.sumTotals(expenses.byCurrency, rate);
      return { ...base, period, income, expenses: spent, balance: income - spent, incomeCount: incomes.count, expenseCount: expenses.count };
    }

    const { rows, total, count } = await this.valueRows(await this.expenseRows(context, period, intent), rate);
    switch (intent.type) {
      case 'spend_total':
      case 'count_records':
        return { ...base, period, total, count };
      case 'spend_by_category': {
        const byName = new Map();
        for (const row of rows) {
          const name = row.category_name || 'Другое';
          const entry = byName.get(name) || { name, icon: row.category_icon, total: 0 };
          entry.total += row.value;
          byName.set(name, entry);
        }
        return { ...base, period, total, count, categories: [...byName.values()].sort((a, b) => b.total - a.total) };
      }
      case 'top_expenses':
      case 'largest_purchase': {
        const items = [...rows].sort((a, b) => b.value - a.value || (a.created_at_utc < b.created_at_utc ? 1 : -1)).slice(0, intent.limit);
        return { ...base, period, total, count, items };
      }
      case 'average_daily': {
        // За всё время — от первой записи, иначе от начала периода до сегодня
        const effective = intent.period.kind === 'all' && rows.length ? { ...period, start: rows[0].local_date } : period;
        const days = elapsedDays(effective, context.today);
        return { ...base, period, total, count, days, average: total / days };
      }
      default:
        throw new Error(`Unsupported assistant intent: ${intent.type}`);
    }
  }

  async savings(context) {
    const state = await this.savingsService.getState(context.userId);
    const goals = [];
    for (const goal of state.goals) {
      const status = await this.savingsService.goalStatus(goal, state);
      goals.push({ name: goal.name, current: status.current, target: status.target, ratio: status.ratio });
    }
    return {
      total: state.total,
      debtTotal: state.debtTotal,
      netWorth: state.netWorth,
      goals,
      empty: state.total === 0 && state.debtTotal === 0 && !goals.length
    };
  }

  async budgets(context) {
    const { period } = await this.expenseService.getPeriodContext(context.userId, 'month', 0);
    if (!context.isPremium) {
      const totals = await this.expenseService.getTotals(context.userId, context.timezone, period);
      const spent = await this.sumTotals(totals.byCurrency, this.rateCache(context.currency));
      return { period, locked: true, spent };
    }
    const statuses = await this.budgetService.getStatus(context.userId, { timezone: context.timezone, currency: context.currency, period });
    const budgets = statuses
      .sort((a, b) => (a.category_name === null ? -1 : b.category_name === null ? 1 : b.ratio - a.ratio))
      .map(budget => ({ label: this.budgetService.budgetName(budget, context.lang), spent: budget.spent, limit: budget.limit, ratio: budget.ratio }));
    return { period, locked: false, budgets };
  }
}

AssistantService.MAX_QUESTION_LENGTH = MAX_QUESTION_LENGTH;
AssistantService.EXAMPLE_INTENTS = EXAMPLE_INTENTS;

module.exports = AssistantService;
