// «🤖 Спроси бота»: вопрос обычными словами → намерение (быстрый разбор или нейросеть, assistant/*) → проверка →
// расчёт по записям пользователя → ответ по шаблонам. Модель только переводит вопрос в JSON из маленькой схемы:
// ни SQL, ни числа, ни текст ответа она не пишет.
const logger = require('../utils/logger');
const { USER_LIMITS } = require('../utils/constants');
const { localToday } = require('../utils/period');
const { normalizeIntent, cleanTerm } = require('./assistant/intent');
const { parseFastPath } = require('./assistant/fastPath');
const { buildMessages } = require('./assistant/prompt');
const { resolvePeriod, comparisonPeriods, elapsedDays } = require('./assistant/periods');
const { searchStem, expandTerms, matchCategory, mentionsCategory, stemPhrase } = require('./assistant/text');
const { AnswerComposer } = require('./assistant/compose');
const { isTaxRefundAvailable } = require('../utils/taxRefund');

// Сколько вопрос может ждать нейросеть вместе с очередью. Вопросы встают в очереди перед чеками (receipt/chain.js),
// но идущий чек не прерывается — дольше не ждём: честно отвечаем «нейросеть занята» с местом в очереди
const MODEL_DEADLINE_MS = 30000;
const MAX_QUESTION_LENGTH = 300;
const MAX_TERMS = 3;
const WRONG_REFUNDS_PER_DAY = 1;
const PER_DAYS = { day: 1, week: 7, month: 30.44 };
// Кнопки-примеры (ai|<n>, тексты ai_example_<n>) — готовые намерения: ответ сразу и на любом языке, без нейросети
const EXAMPLE_INTENTS = {
  1: { type: 'spend_total', period: { kind: 'month', offset: 0 } },
  2: { type: 'spend_by_category', period: { kind: 'month', offset: -1 } },
  3: { type: 'spend_total', period: { kind: 'last_n_days', n: 7 }, categories: ['Еда'] },
  4: { type: 'compare_periods', period: { kind: 'month', offset: 0 } },
  5: { type: 'largest_purchase', period: { kind: 'year', offset: 0 } },
  6: { type: 'average_daily', period: { kind: 'month', offset: 0 } }
};

// Сколько трат нашлось (у сравнения — в обоих периодах)
function found(result) {
  if (typeof result.count === 'number') return result.count;
  return result.current ? result.current.count + result.previous.count : 0;
}

class AssistantService {
  constructor({ assistantRepository, provider, expenseService, incomeService, savingsService, budgetService, planningService = null, premiumService, localizationService, formatter, currencyUtils, taxRefundService = null, modelDeadlineMs = MODEL_DEADLINE_MS }) {
    this.assistantRepository = assistantRepository;
    this.provider = provider;
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.savingsService = savingsService;
    this.budgetService = budgetService;
    this.planningService = planningService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.currencyUtils = currencyUtils;
    this.modelDeadlineMs = modelDeadlineMs;
    this.taxRefundService = taxRefundService;
  }

  get premiumLimit() {
    return USER_LIMITS.premium.MAX_ASSISTANT_QUESTIONS_PER_DAY;
  }

  get freeLimit() {
    return USER_LIMITS.regular.MAX_ASSISTANT_QUESTIONS_PER_DAY;
  }

  modelCallsLimit(isPremium) {
    return (isPremium ? USER_LIMITS.premium : USER_LIMITS.regular).MAX_ASSISTANT_MODEL_CALLS_PER_DAY;
  }

  get modelAvailable() {
    return !!(this.provider && this.provider.configured);
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

  // Вопрос к нейросети → { raw } или { error: 'model_down' | 'model_busy' | 'model_limit', position }.
  // usage.modelCalls — сколько раз для вопроса спросили модель (идёт в дневной потолок, с ответом или без).
  // Не дождались своей очереди (слот занят чеком) — модель не спрашивали: «нейросеть занята» с местом в очереди
  async askModel(question, context, { onStatus, usage }) {
    if (!this.modelAvailable) return { error: 'model_down' };
    if (usage.callsLeft === undefined) {
      usage.callsLeft = this.modelCallsLimit(context.isPremium) - await this.assistantRepository.countModelCalls(context.userId, context.today);
    }
    if (usage.callsLeft - usage.modelCalls <= 0) return { error: 'model_limit', limit: this.modelCallsLimit(context.isPremium) };
    let cancelled = false;
    let timer = null;
    let position = null;
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
        onStatus: (status) => {
          position = status.position;
          if (onStatus) onStatus(status);
        },
        isCancelled: () => cancelled,
        owner: context.userId
      }).then(raw => ({ raw }));
      const outcome = await Promise.race([request, deadline]);
      request.catch(() => {}); // опоздавший ответ (или ошибка) после срока никому не нужен
      if (outcome.timeout) {
        if (position > 0) {
          logger.warn('Assistant model busy', { userId: context.userId, position, ms: Date.now() - started });
          return { error: 'model_busy', position };
        }
        usage.modelCalls++;
        throw new Error('assistant model deadline');
      }
      usage.modelCalls++;
      logger.info('Assistant intent from model', { userId: context.userId, ms: Date.now() - started, type: outcome.raw && outcome.raw.type });
      return { raw: outcome.raw };
    } catch (error) {
      if (error.code === 'busy') return { error: 'model_busy', position: null };
      if (error.message !== 'assistant model deadline' && position !== null && position <= 0) usage.modelCalls++;
      logger.warn('Assistant model failed', { userId: context.userId, error: error.message, code: error.code, ms: Date.now() - started });
      // Модель приняла запрос, но не ответила вовремя — она занята (чек из другого процесса, большая очередь в самой
      // Ollama), а не выключена: честнее «занята, спроси через минуту». Не подключились / отказ — «не отвечает»
      const slow = error.message === 'assistant model deadline' || (error.code === 'network' && /(?:^|: )timeout$/.test(error.message));
      return { error: slow ? 'model_busy' : 'model_down', position: null };
    } finally {
      clearTimeout(timer);
    }
  }

  // Вопрос → { status: 'answered', text, keyboard, intent, source, questionId } | { status: 'not_understood' |
  // 'model_down' | 'model_busy' | 'model_limit' | 'period_unclear' | 'future', position? }.
  // example — номер кнопки-примера: намерение готовое, вопрос не разбирается.
  // В журнал (лимиты) пишутся ответы и вопросы без ответа, для которых спрашивали модель
  async answer(userId, question, { lang, onStatus, example = null } = {}) {
    const started = Date.now();
    const text = String(question || '').trim().slice(0, MAX_QUESTION_LENGTH);
    const context = await this.loadContext(userId, lang);
    const resolved = await this.resolve(text, context, { onStatus, example });
    const modelCalls = resolved.usage ? resolved.usage.modelCalls : 0;
    const ms = Date.now() - started;
    if (resolved.status !== 'ok') {
      if (modelCalls) {
        await this.assistantRepository.logQuestion(userId, context.today, { intentType: resolved.status, source: 'model', ms, answered: false, modelCalls });
      }
      return { status: resolved.status, source: resolved.source, position: resolved.position, limit: resolved.limit };
    }
    const { intent, result, source } = resolved;
    const { text: answerText, keyboard } = new AnswerComposer({ localizationService: this.localizationService, formatter: this.formatter, lang }).compose(result);
    const questionId = await this.assistantRepository.logQuestion(userId, context.today, { intentType: intent.type, source, ms, modelCalls });
    // «🙅 Не то» — рядом с «🤖 Ещё вопрос»: вопрос возвращается в лимит, можно спросить точнее
    keyboard[keyboard.length - 1].push({ text: this.localizationService.getText(lang, 'ai_button_wrong'), callback_data: `aiw|${questionId}` });
    logger.info('Assistant answered', { userId, type: intent.type, source, ms, modelCalls });
    return { status: 'answered', text: answerText, keyboard, intent, source, questionId };
  }

  // «🙅 Не то»: ответ не засчитывается в дневной лимит — не больше WRONG_REFUNDS_PER_DAY раз в день (иначе кнопка
  // снимала бы лимит совсем); вызовы модели остаются в потолке. 'marked' | 'done' | 'used' | 'missing'
  async markWrong(userId, questionId) {
    return this.assistantRepository.markWrong(userId, questionId, { refundsPerDay: WRONG_REFUNDS_PER_DAY });
  }

  // Вопрос → проверенное намерение и посчитанный результат: { status: 'ok', intent, result, source, usage } или
  // { status: <без ответа>, usage }.
  // Быстрый разбор понял вопрос целиком — модель не нужна. Иначе спрашиваем модель, но то, что быстрый разбор понял
  // уверенно (период, второй период сравнения, валюта, число), остаётся его: модель дополняет, а не заменяет
  async resolve(text, context, { onStatus, example = null } = {}) {
    const usage = { modelCalls: 0 };
    const ctx = { ...context, question: text };
    if (EXAMPLE_INTENTS[example]) {
      const { intent } = normalizeIntent(EXAMPLE_INTENTS[example], ctx);
      return { status: 'ok', intent, result: await this.compute(intent, ctx), source: 'example', usage };
    }
    const fast = parseFastPath(text, ctx);
    let raw;
    let source;
    if (fast && fast.confident) {
      raw = fast.intent;
      source = 'fast';
    } else {
      const asked = await this.askModel(text, ctx, { onStatus, usage });
      if (asked.error) return { status: asked.error, position: asked.position, limit: asked.limit, usage };
      raw = fast ? this.keepFast(fast.intent, asked.raw) : asked.raw;
      source = 'model';
    }
    const checked = normalizeIntent(raw, ctx);
    if (!checked.ok) return { status: checked.reason === 'future' ? 'future' : 'not_understood', source, usage };
    // В вопросе есть слово о времени, которого не понял быстрый разбор, а модель период не назвала — не подставляем
    // молча «этот месяц»
    if (source === 'model' && checked.defaultedPeriod && fast && fast.unresolvedTime) return { status: 'period_unclear', source, usage };
    let { intent } = checked;
    let result = await this.compute(intent, ctx);
    // Быстрый разбор принял слово за поиск по описанию («на лекарства»), а таких трат нет: возможно, это смысл,
    // а не слово из описания (лекарства → «Здоровье»). Спросим модель, но возьмём от неё только категории и слова
    // поиска — период и тип быстрый разбор понял сам
    if (source === 'fast' && intent.terms.length && found(result) === 0 && this.modelAvailable) {
      const asked = await this.askModel(text, ctx, { onStatus, usage });
      const filter = asked.raw && typeof asked.raw === 'object' ? asked.raw : null;
      const second = filter ? normalizeIntent({ ...fast.intent, categories: filter.categories, text_filter: filter.text_filter }, ctx) : null;
      if (second && second.ok && (second.intent.categories.length || second.intent.terms.length)
        && JSON.stringify(second.intent) !== JSON.stringify(intent)) {
        intent = second.intent;
        result = await this.compute(intent, ctx);
        source = 'model';
      }
    }
    const described = await this.preferDescriptions(intent, fast, ctx);
    if (described) ({ intent, result } = described);
    return { status: 'ok', intent, result, source, usage };
  }

  // Ответ модели, где поля, уверенно разобранные быстрым разбором, остаются его
  keepFast(fastIntent, modelRaw) {
    if (!modelRaw || typeof modelRaw !== 'object' || Array.isArray(modelRaw)) return modelRaw;
    const merged = { ...modelRaw };
    if (fastIntent.period) merged.period = fastIntent.period;
    if (fastIntent.compare_to) merged.compare_to = fastIntent.compare_to;
    if (fastIntent.currency) merged.currency = fastIntent.currency;
    if (fastIntent.limit) merged.limit = fastIntent.limit;
    if (fastIntent.per) merged.per = fastIntent.per;
    return merged;
  }

  // Модель назвала категорию, которой в вопросе нет («на кофе» → «Кафе», «на обеды» → «Еда»): если слово из вопроса
  // встречается в описаниях — считаем по описаниям. В этом периоде нашлось — ответ по ним; не нашлось, но такие траты
  // бывают в других категориях — тоже по описаниям («обедов на этой неделе не было»). Категория остаётся, если слова
  // в описаниях нет совсем или все такие траты — в этой категории (лекарства → «Здоровье»)
  async preferDescriptions(intent, fast, context) {
    if (!fast || !intent.categories.length || intent.terms.length) return null;
    if (intent.categories.some(category => mentionsCategory(context.question, category))) return null;
    const filters = [].concat(fast.intent.text_filter || []);
    const words = (filters.length ? filters : fast.words)
      .map(cleanTerm).filter(Boolean)
      .filter(term => !matchCategory(term, context.categories));
    if (!words.length) return null;
    const byText = { ...intent, categories: [], terms: words.slice(0, MAX_TERMS) };
    const result = await this.compute(byText, context);
    if (found(result) > 0) return { intent: byText, result };
    const everywhere = await this.expenseRows(context, resolvePeriod({ kind: 'all' }, { today: context.today, startDay: context.startDay }), byText);
    const names = new Set(intent.categories.map(category => category.name));
    if (everywhere.some(row => !names.has(row.category_name))) return { intent: byText, result };
    return null;
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

  // Слова поиска — основы слов с синонимами и написанием брендов («нетфликс» найдёт и «Netflix»)
  async expenseRows(context, period, intent) {
    return this.assistantRepository.findExpenses(context.userId, context.timezone, period.start, period.end, {
      categoryNames: intent.categories.map(c => c.name),
      terms: expandTerms(intent.terms.map(searchStem).filter(Boolean))
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
    if (intent.type === 'subscriptions') return { ...base, currency: context.currency, ...(await this.subscriptions(context)) };
    if (intent.type === 'debt_status') return { ...base, currency: context.currency, ...(await this.debts(context)) };
    if (intent.type === 'tax_refund') return { ...base, currency: context.currency, ...(await this.taxRefund(intent, context)) };
    if (intent.type === 'forecast') {
      const forecast = this.planningService ? await this.planningService.getForecast(context.userId) : { mode: 'none' };
      return { ...base, ...forecast, currency: forecast.currency || context.currency };
    }

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
        // в неделю — ×7, в месяц — ×30,44 (средний месяц) от средней в день за прошедшие дни периода
        return { ...base, period, total, count, days, average: total / days * (PER_DAYS[intent.per] || 1) };
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

  // Подписки — те же, что на экране «🔁 Подписки» (найденные и регулярные-подписки, без премиума — первые N)
  async subscriptions(context) {
    if (!this.planningService) return { items: [], totalMonthly: 0, hiddenCount: 0, hiddenMonthly: 0 };
    const subs = await this.planningService.getSubscriptions(context.userId);
    return {
      items: subs.shown.map(sub => ({ label: sub.label, monthly: sub.monthlyMain })),
      count: subs.all.length,
      totalMonthly: subs.totalMonthly,
      hiddenCount: subs.hiddenCount,
      hiddenMonthly: subs.hiddenMonthly
    };
  }

  // Долги из накоплений. Если долг назван в вопросе («по кредитке» — «Кредитка») — только он
  async debts(context) {
    const state = await this.savingsService.getState(context.userId);
    const all = [];
    for (const debt of state.debts) {
      const payment = debt.monthly_payment ? await this.currencyUtils.convert(debt.monthly_payment, debt.currency, state.currency) : null;
      all.push({ name: debt.name, amount: debt.balanceMain, payment });
    }
    const asked = new Set(stemPhrase(context.question || '').split(' ').filter(w => w.length >= 3));
    const named = all.filter(debt => stemPhrase(debt.name).split(' ').some(w => asked.has(w)));
    const debts = named.length ? named : all;
    return { debts, total: debts.reduce((sum, debt) => sum + debt.amount, 0), all: all.length };
  }

  // «💡 Верни 13%» за год из вопроса (без года — текущий; за пределами окна вычетов — ближайший год окна): строки итога
  // те же, что на экране раздела. Не рубли — taxUnavailable
  async taxRefund(intent, context) {
    if (!this.taxRefundService || !isTaxRefundAvailable(context.lang, context.currency)) return { taxUnavailable: true };
    const currentYear = Number(context.today.slice(0, 4));
    const spec = intent.period;
    const asked = spec.kind === 'month' && spec.offset === 0
      ? currentYear
      : Number(resolvePeriod(spec, { today: context.today, startDay: context.startDay }).start.slice(0, 4));
    const year = this.taxRefundService.clampYear(asked, currentYear);
    const summary = await this.taxRefundService.summary(context.userId, year, { timezone: context.timezone, currentYear });
    return { year, count: summary.count, lines: this.taxRefundService.summaryLines(summary) };
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
