const logger = require('../utils/logger');
const { USER_LIMITS, ROAST } = require('../utils/constants');
const { addDays } = require('../utils/period');
const { daysBetween } = require('../utils/planning');
const { LEVELS, GENDERS, TRIGGER_PRIORITY, junkKind, median, renderTemplate, pickVariant, timeContexts, isPayday } = require('../utils/roast');
const roastTemplates = require('../locales/roast');

const PREFIX = '😈 ';
const DESCRIPTION_IN_LINE = 40;
const WEEK_SAME_PERCENT = 5; // как «как обычно» в сводке недели
const MONTH_SAME_PERCENT = 5;
const MONTH_BAD_PERCENT = 10; // «плохой» итог месяца: на 10% дороже прошлого к этому же дню…
const MONTH_BAD_JUNK = 5; // …или 5+ вредных трат, или общий бюджет превышен
const MONTH_JUNK_MIN = 2;
const PAYDAY_HISTORY_DAYS = 180; // медиана дохода — по доходам за полгода

// «😈 Злой режим»: подколка к подтверждению записи (один самый сильный повод на действие, с лимитом в день),
// строка к сводке недели и «Разнос месяца». Тексты — src/locales/roast, правила — utils/roast.js.
// Никогда не бросает исключение наружу из afterExpenses/weeklyLine: запись траты важнее шутки.
class RoastService {
  constructor({ roastRepository, expenseService, budgetService, planningService = null, premiumService, reportService, userNotificationRepository, localizationService, formatter, currencyUtils, random = Math.random, now = () => new Date() }) {
    this.roastRepository = roastRepository;
    this.expenseService = expenseService;
    this.budgetService = budgetService;
    this.planningService = planningService;
    this.premiumService = premiumService;
    this.reportService = reportService;
    this.userNotificationRepository = userNotificationRepository;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.currencyUtils = currencyUtils;
    this.random = random;
    this.now = now;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // ========================================
  // НАСТРОЙКИ
  // ========================================

  async getSettings(userId) {
    return this.roastRepository.getSettings(userId);
  }

  // Без цензуры можно всем, пока USER_LIMITS.regular.ROAST_SAVAGE не выключен (тогда — только премиуму)
  async savageAllowed(userId) {
    if (USER_LIMITS.regular.ROAST_SAVAGE !== false) return true;
    return USER_LIMITS.premium.ROAST_SAVAGE !== false && await this.premiumService.isPremiumUser(userId);
  }

  // Уровень, которым реально подкалывать: savage без права на него — ехидный
  async effectiveLevel(userId, level) {
    if (level === 'savage' && !(await this.savageAllowed(userId))) return 'spicy';
    return level;
  }

  async setLevel(userId, level) {
    if (!LEVELS.includes(level)) throw new Error(`Unknown roast level: ${level}`);
    await this.roastRepository.setLevel(userId, level);
  }

  async setGender(userId, gender) {
    if (!GENDERS.includes(gender)) throw new Error(`Unknown gender: ${gender}`);
    await this.roastRepository.setGender(userId, gender);
  }

  async confirmAdult(userId) {
    await this.roastRepository.confirmAdult(userId);
  }

  // ========================================
  // ШАБЛОНЫ
  // ========================================

  // Варианты семейства (у вредной траты — свои для вида + общие; у языка без вариантов для вида — только общие)
  variants(lang, level, family, kind = null) {
    const set = roastTemplates(lang)[level] || {};
    const own = kind ? (set[`${family}_${kind}`] || []) : [];
    return own.concat(set[family] || []);
  }

  // Выбор варианта: в ситуации (ночь, выходные, понедельник, зарплата) с вероятностью ROAST.CONTEXT_CHANCE —
  // ситуационный; у вредной траты с вероятностью ROAST.SUBTYPE_CHANCE — свой для вида (у языка без них — общий);
  // иначе — любой обычный. Свои для вида идут первыми в variants(), поэтому ключи вариантов одинаковые во всех ветках
  pick(lang, level, family, params, gender, recent, kind = null, contexts = []) {
    const name = kind ? `${level}.${family}.${kind}` : `${level}.${family}`;
    const all = this.variants(lang, level, family, kind);
    const ownCount = kind ? all.length - this.variants(lang, level, family).length : 0;
    const base = { params, gender: gender || 'x', recent, random: this.random };
    const situational = contexts.length && this.random() < ROAST.CONTEXT_CHANCE
      ? pickVariant(name, all, { ...base, contexts, situational: true, freshOnly: true })
      : null;
    const own = !situational && ownCount && this.random() < ROAST.SUBTYPE_CHANCE
      ? pickVariant(name, all.slice(0, ownCount), { ...base, freshOnly: true })
      : null;
    const picked = situational || own || pickVariant(name, all, base);
    // Шаблон может начинаться с параметра («общий бюджет — уже 80%») — фраза всё равно с заглавной
    return picked && { ...picked, text: picked.text.charAt(0).toUpperCase() + picked.text.slice(1) };
  }

  label(lang, key, params = {}) {
    return renderTemplate(roastTemplates(lang).labels[key], params) || '';
  }

  money(value, currency) {
    return this.formatter.formatAmount(Math.round(value), currency);
  }

  categoryText(name, lang) {
    return this.formatter.escapeMarkdown(this.formatter.translateCategoryName(name || '—', this.localizationService, lang));
  }

  describe(expense, lang) {
    const raw = expense.description
      || this.formatter.translateCategoryName(expense.category_name || '—', this.localizationService, lang);
    return this.formatter.escapeMarkdown(this.formatter.shorten(raw, DESCRIPTION_IN_LINE));
  }

  // Пересчёт в основную валюту: один курс на валюту за вызов
  converter(main) {
    const rates = new Map();
    return async (amount, currency) => {
      const value = Number(amount) || 0;
      if (!value || !currency || currency === main) return value;
      if (!rates.has(currency)) rates.set(currency, await this.currencyUtils.convert(1, currency, main));
      return value * rates.get(currency);
    };
  }

  // ========================================
  // ПОДКОЛКА ПОСЛЕ ЗАПИСИ
  // ========================================

  // Укладывается ли ещё одна подколка в лимит (точная проверка — атомарно в claim)
  withinCap(state, today, now = Date.now()) {
    const sameDay = state.day === today;
    if (sameDay && state.dayCount >= ROAST.MAX_PER_DAY) return false;
    if (state.lastAt && now - new Date(state.lastAt).getTime() < ROAST.MIN_GAP_MINUTES * 60000) return false;
    return true;
  }

  // Строка к подтверждению записи ('' — молчим): только личный чат, только свои траты записавшего, уровень не off,
  // один повод по TRIGGER_PRIORITY. source: 'text' | 'batch' | 'receipt' (у чека нет «импульсной покупки» —
  // большой чек продуктов не импульс). broken — сорванные этим действием челленджи (AchievementService.track)
  async afterExpenses(ctx, { userId, lang, expenses, broken = [], source = 'text' }) {
    try {
      if (!ctx || !ctx.chat || ctx.chat.type !== 'private' || !ctx.from || Number(ctx.from.id) !== Number(userId)) return '';
      const own = (expenses || []).filter(expense => expense && Number(expense.user_id) === Number(userId));
      if (!own.length) return '';
      const settings = await this.roastRepository.getSettings(userId);
      if (settings.level === 'off') return '';
      const level = await this.effectiveLevel(userId, settings.level);

      const data = await this.actionData(userId, own, { broken, source, lang });
      const state = await this.roastRepository.getState(userId);
      const capped = !this.withinCap(state, data.today);

      let trigger = null;
      for (const kind of TRIGGER_PRIORITY) {
        if (capped && kind !== 'budget_over') continue;
        trigger = await this.detect(kind, data);
        if (trigger) break;
      }
      if (!trigger) return '';

      const contexts = await this.contexts(data);
      const picked = this.pick(lang, level, trigger.family, trigger.params, settings.gender, state.recent, trigger.junk, contexts);
      if (!picked) return '';
      const claimed = await this.roastRepository.claim(userId, {
        today: data.today,
        force: trigger.kind === 'budget_over',
        maxPerDay: ROAST.MAX_PER_DAY,
        gapMinutes: ROAST.MIN_GAP_MINUTES,
        variantKey: picked.key,
        keep: ROAST.RECENT_VARIANTS
      });
      if (!claimed) return '';
      logger.info('Roast sent', { userId, trigger: trigger.kind, level, variant: picked.key, contexts });
      return PREFIX + picked.text;
    } catch (error) {
      logger.warn('Roast failed', { userId, error: error.message });
      return '';
    }
  }

  // Ситуации сейчас в поясе пользователя: ночь, выходные, понедельник и «только зарплата пришла» (доход не меньше
  // медианы своих доходов за полгода — в последние 3 дня). Ошибка — просто без ситуации
  async contexts(data) {
    const contexts = timeContexts(this.now(), data.timezone);
    try {
      const rows = await this.roastRepository.getIncomes(data.userId, data.timezone, addDays(data.today, -PAYDAY_HISTORY_DAYS));
      const incomes = [];
      for (const row of rows) incomes.push({ value: await data.convert(row.amount, row.currency), date: row.local_date });
      if (isPayday(incomes, data.today)) contexts.push('payday');
    } catch (error) {
      logger.warn('Roast payday check failed', { userId: data.userId, error: error.message });
    }
    return contexts;
  }

  // Всё о действии, что нужно поводам; дорогое (бюджеты, лимит дня, история) — лениво и один раз
  async actionData(userId, own, { broken, source, lang }) {
    const context = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const convert = this.converter(context.currency);
    const rows = await this.roastRepository.getActionRows(userId, context.timezone, own.map(expense => Number(expense.id)));
    const dates = new Map(rows.map(row => [Number(row.id), row.local_date]));
    const items = [];
    for (const expense of own) {
      items.push({
        expense,
        value: await convert(expense.amount, expense.currency),
        localDate: dates.get(Number(expense.id)) || context.today
      });
    }
    const memo = new Map();
    const once = (key, load) => {
      if (!memo.has(key)) memo.set(key, load());
      return memo.get(key);
    };
    return {
      userId, lang, source, broken: broken || [], items, convert, ...context,
      once
    };
  }

  async detect(kind, data) {
    switch (kind) {
      case 'budget_over': return this.detectBudget(data, 'over');
      case 'budget_80': return this.detectBudget(data, '80');
      case 'challenge': return this.detectChallenge(data);
      case 'allowance': return this.detectAllowance(data);
      case 'impulse': return this.detectImpulse(data);
      case 'junk': return this.detectJunk(data);
      default: return null;
    }
  }

  // Бюджеты (премиум), которые это действие перевело за 100% или за 80%: до действия было меньше порога, после — не меньше
  async budgetCrossings(data) {
    return data.once('budgets', async () => {
      if (!(await this.premiumService.isPremiumUser(data.userId))) return { over: [], warn: [] };
      const { timezone, currency, period } = data;
      const statuses = await this.budgetService.getStatus(data.userId, { timezone, currency, period });
      const inPeriod = data.items.filter(item => item.localDate >= period.start && item.localDate < period.end);
      const over = [];
      const warn = [];
      for (const status of statuses) {
        if (!(status.limit > 0)) continue;
        const relevant = status.category_name === null
          ? inPeriod
          : inPeriod.filter(item => item.expense.category_name === status.category_name);
        if (!relevant.length) continue;
        const action = relevant.reduce((sum, item) => sum + item.value, 0);
        const before = (status.spent - action) / status.limit;
        const entry = { status, action, relevant };
        if (before < 1 && status.ratio >= 1) over.push(entry);
        else if (before < 0.8 && status.ratio >= 0.8 && status.ratio < 1) warn.push(entry);
      }
      const byRatio = (a, b) => b.status.ratio - a.status.ratio;
      return { over: over.sort(byRatio), warn: warn.sort(byRatio) };
    });
  }

  budgetParams(data, entry) {
    const { status } = entry;
    const top = entry.relevant.reduce((best, item) => (!best || item.value > best.value ? item : best), null);
    const budget = status.category_name === null
      ? this.label(data.lang, 'total_budget')
      : this.label(data.lang, 'category_budget', { category: this.categoryText(status.category_name, data.lang) });
    return {
      budget,
      limit: this.money(status.limit, data.currency),
      spent: this.money(status.spent, data.currency),
      over: status.spent > status.limit ? this.money(status.spent - status.limit, data.currency) : null,
      left: status.limit > status.spent ? this.money(status.limit - status.spent, data.currency) : null,
      percent: Math.round(status.ratio * 100),
      amount: this.money(top.value, data.currency),
      desc: this.describe(top.expense, data.lang),
      days_left: Math.max(1, daysBetween(data.today, data.period.end))
    };
  }

  async detectBudget(data, which) {
    const crossings = await this.budgetCrossings(data);
    if (which === '80') {
      const entry = crossings.warn[0];
      return entry ? { kind: 'budget_80', family: 'budget_80', params: this.budgetParams(data, entry) } : null;
    }
    // Превышение — по разу на бюджет за период (и лимит: после его изменения — снова), даже если день исчерпан
    for (const entry of crossings.over) {
      const refKey = `${entry.status.id}:${data.period.start}:${Number(entry.status.amount)}`;
      if (await this.userNotificationRepository.markSent(data.userId, 'roast_budget_over', refKey)) {
        return { kind: 'budget_over', family: 'budget_over', params: this.budgetParams(data, entry) };
      }
    }
    return null;
  }

  detectChallenge(data) {
    const challenge = data.broken[0];
    if (!challenge) return null;
    const item = data.items.find(i => i.expense.category_name === challenge.category_name) || data.items[0];
    const held = challenge.start_date && challenge.today ? daysBetween(challenge.start_date, challenge.today) : 0;
    return {
      kind: 'challenge',
      family: 'challenge',
      params: {
        category: this.categoryText(challenge.category_name, data.lang),
        days: held >= 1 ? held : null,
        amount: this.money(item.value, data.currency),
        desc: this.describe(item.expense, data.lang)
      }
    };
  }

  // Лимит «Можно сегодня» был цел до этого действия и превышен им (только траты с сегодняшней датой)
  async detectAllowance(data) {
    if (!this.planningService) return null;
    const todayValue = data.items.filter(item => item.localDate === data.today).reduce((sum, item) => sum + item.value, 0);
    if (!(todayValue > 0)) return null;
    const allowance = await this.planningService.getAllowance(data.userId);
    if (!allowance || allowance.mode === 'none' || !(allowance.daily > 0)) return null;
    const before = allowance.spentToday - todayValue;
    if (before > allowance.daily || allowance.spentToday <= allowance.daily) return null;
    const top = data.items.reduce((best, item) => (!best || item.value > best.value ? item : best), null);
    const times = Math.floor(allowance.spentToday / allowance.daily);
    return {
      kind: 'allowance',
      family: 'allowance',
      params: {
        daily: this.money(allowance.daily, data.currency),
        spent: this.money(allowance.spentToday, data.currency),
        over: this.money(allowance.spentToday - allowance.daily, data.currency),
        amount: this.money(todayValue, data.currency),
        desc: this.describe(top.expense, data.lang),
        times: times >= 2 ? times : null
      }
    };
  }

  // Свои траты за ROAST.HISTORY_DAYS дней до действия в основной валюте: [{ value, category_name }]
  async history(data) {
    return data.once('history', async () => {
      const since = addDays(data.today, -ROAST.HISTORY_DAYS);
      const rows = await this.roastRepository.getHistory(data.userId, data.timezone, since, data.items.map(item => Number(item.expense.id)));
      const list = [];
      for (const row of rows) list.push({ value: await data.convert(row.amount, row.currency), category_name: row.category_name });
      return { list, median: list.length >= ROAST.IMPULSE_MIN_HISTORY ? median(list.map(r => r.value)) : null };
    });
  }

  // Вид вредной траты; авто-запись регулярной (подписка, списанная сама) — не повод
  junkOf(expense) {
    return junkKind(expense.description, { recurring: !!expense.recurring_expense_id });
  }

  // Самая крупная трата действия — в IMPULSE_FACTOR раз больше медианы своих трат (нужна история)
  async detectImpulse(data) {
    if (data.source === 'receipt') return null;
    const { list, median: typical } = await this.history(data);
    if (!(typical > 0)) return null;
    const top = data.items.reduce((best, item) => (!best || item.value > best.value ? item : best), null);
    const ratio = top.value / typical;
    if (ratio < ROAST.IMPULSE_FACTOR) return null;
    const sameCategory = list.filter(row => row.category_name && row.category_name === top.expense.category_name);
    const categoryTypical = sameCategory.length >= 3 ? median(sameCategory.map(row => row.value)) : null;
    const categoryTimes = categoryTypical > 0 ? Math.floor(top.value / categoryTypical) : 0;
    return {
      kind: 'impulse',
      family: 'impulse',
      params: {
        amount: this.money(top.value, data.currency),
        desc: this.describe(top.expense, data.lang),
        median: this.money(typical, data.currency),
        times: Math.floor(ratio),
        category: this.categoryText(top.expense.category_name, data.lang),
        cat_times: categoryTimes >= 2 ? categoryTimes : null
      }
    };
  }

  // Вредная трата (фастфуд, доставка, алкоголь, сигареты, энергетики, такси): заметная по сумме (не меньше
  // медианы) или уже привычка (JUNK_HABIT_COUNT-я такая за период)
  async detectJunk(data) {
    const junk = data.items
      .map(item => ({ ...item, kind: this.junkOf(item.expense) }))
      .filter(item => item.kind)
      .sort((a, b) => b.value - a.value)[0];
    if (!junk) return null;
    const periodExpenses = await this.expenseService.getExpenses(data.userId, data.timezone, data.period);
    let count = 0;
    let sum = 0;
    for (const expense of periodExpenses) {
      if (this.junkOf(expense) !== junk.kind) continue;
      count += 1;
      sum += await data.convert(expense.amount, expense.currency);
    }
    if (!count) {
      count = 1;
      sum = junk.value;
    }
    const { median: typical } = await this.history(data);
    const notable = (typical > 0 && junk.value >= typical) || count >= ROAST.JUNK_HABIT_COUNT;
    if (!notable) return null;
    return {
      kind: 'junk',
      family: 'junk',
      junk: junk.kind,
      params: {
        amount: this.money(junk.value, data.currency),
        desc: this.describe(junk.expense, data.lang),
        // «уже N-й раз за период» — только когда это не первая такая трата
        count: count >= 2 ? count : null,
        sum: count >= 2 ? this.money(sum, data.currency) : null
      }
    };
  }

  // ========================================
  // СВОДКА НЕДЕЛИ
  // ========================================

  // Строка к сводке недели ('' — режим выключен или сравнивать не с чем). summary — WeeklyInsightService.summarizeWeeks
  async weeklyLine(userId, lang, summary, currency) {
    try {
      if (!summary || !summary.enoughHistory) return '';
      const settings = await this.roastRepository.getSettings(userId);
      if (settings.level === 'off') return '';
      const level = await this.effectiveLevel(userId, settings.level);
      const family = summary.percent >= WEEK_SAME_PERCENT ? 'week_more' : summary.percent <= -WEEK_SAME_PERCENT ? 'week_less' : 'week_same';
      const state = await this.roastRepository.getState(userId);
      const picked = this.pick(lang, level, family, {
        total: this.money(summary.total, currency),
        percent: Math.abs(Math.round(summary.percent)),
        amount: this.money(Math.abs(summary.diff), currency)
      }, settings.gender, state.recent);
      if (!picked) return '';
      await this.roastRepository.rememberVariants(userId, [picked.key], ROAST.RECENT_VARIANTS);
      return PREFIX + picked.text;
    } catch (error) {
      logger.warn('Weekly roast failed', { userId, error: error.message });
      return '';
    }
  }

  // ========================================
  // «РАЗНОС МЕСЯЦА»
  // ========================================

  // Разнос текущего периода на уровне level ('spicy' | 'savage'). { text (Markdown), shareText (без разметки, без
  // описаний и названий категорий — только числа; короткий: начало, одна строка сравнения/бюджета/вредного, вывод), hasData }
  async monthRoast(userId, lang, { level, gender }) {
    const { timezone, currency, today, period } = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const previous = (await this.expenseService.getPeriodContext(userId, 'month', -1)).period;
    const convert = this.converter(currency);
    const money = (value) => this.money(value, currency);
    const state = await this.roastRepository.getState(userId);
    const recent = [...state.recent];
    const shown = [];
    const line = (family, params, kind = null) => {
      const picked = this.pick(lang, level, family, params, gender, recent, kind);
      if (!picked) return null;
      recent.unshift(picked.key);
      shown.unshift(picked.key);
      return picked.text;
    };

    const title = `😈 *${this.t(lang, 'roast_month_title', { range: this.formatter.formatPeriodRange(period) })}*`;
    const expenses = await this.expenseService.getExpenses(userId, timezone, period);
    if (!expenses.length) {
      const empty = line('month_empty', {});
      await this.roastRepository.rememberVariants(userId, shown, ROAST.RECENT_VARIANTS);
      return { text: [title, '', empty].join('\n'), shareText: empty, hasData: false };
    }

    const values = [];
    for (const expense of expenses) values.push({ expense, value: await convert(expense.amount, expense.currency) });
    const spent = values.reduce((sum, item) => sum + item.value, 0);
    const periodDays = daysBetween(period.start, period.end);
    const elapsed = Math.min(periodDays, daysBetween(period.start, today) + 1);

    const lines = [];
    const share = [];
    const open = line('month_open', { spent: money(spent), count: expenses.length, days: elapsed });
    if (open) { lines.push(`💸 ${open}`); share.push(`💸 ${open}`); }

    const categories = await this.reportService.categoryBreakdown(userId, timezone, period, currency);
    if (categories.length && spent > 0) {
      const top = categories[0];
      const topLine = line('month_top', {
        category: this.categoryText(top.name, lang),
        sum: money(top.total),
        share: Math.round(top.total / spent * 100)
      });
      if (topLine) lines.push(`🥇 ${topLine}`);
    }

    const biggest = values.reduce((best, item) => (!best || item.value > best.value ? item : best), null);
    const biggestLine = line('month_biggest', { amount: money(biggest.value), desc: this.describe(biggest.expense, lang) });
    if (biggestLine) lines.push(`💥 ${biggestLine}`);

    // К этому же дню прошлого периода
    const sameDays = { start: previous.start, end: [addDays(previous.start, elapsed), previous.end].sort()[0] };
    const prevTotals = await this.expenseService.getTotals(userId, timezone, sameDays);
    let percent = null;
    if (prevTotals.count) {
      const prevSpent = await this.formatter.sumInCurrency(prevTotals.byCurrency, currency);
      if (prevSpent > 0) {
        percent = Math.round((spent - prevSpent) / prevSpent * 100);
        const params = { percent: Math.abs(percent), amount: money(Math.abs(spent - prevSpent)) };
        const vsLine = percent >= MONTH_SAME_PERCENT ? line('month_more', params)
          : percent <= -MONTH_SAME_PERCENT ? line('month_less', params) : null;
        if (vsLine) {
          const mark = percent > 0 ? '📈' : '📉';
          lines.push(`${mark} ${vsLine}`);
          share.push(`${mark} ${vsLine}`);
        }
      }
    }

    let budgetOver = false;
    if (await this.premiumService.isPremiumUser(userId)) {
      const statuses = await this.budgetService.getStatus(userId, { timezone, currency, period });
      const total = statuses.find(status => status.category_name === null && status.limit > 0);
      if (total) {
        budgetOver = total.ratio > 1;
        const budgetLine = budgetOver
          ? line('month_budget_over', { over: money(total.spent - total.limit), limit: money(total.limit), percent: Math.round(total.ratio * 100) })
          : line('month_budget_ok', { left: money(total.limit - total.spent), limit: money(total.limit), percent: Math.round(total.ratio * 100) });
        if (budgetLine) { lines.push(`🎯 ${budgetLine}`); share.push(`🎯 ${budgetLine}`); }
      }
    }

    const junk = values.filter(item => this.junkOf(item.expense));
    if (junk.length >= MONTH_JUNK_MIN) {
      const junkLine = line('month_junk', { count: junk.length, sum: money(junk.reduce((sum, item) => sum + item.value, 0)) });
      if (junkLine) { lines.push(`🍟 ${junkLine}`); share.push(`🍟 ${junkLine}`); }
    }

    const bad = budgetOver || (percent !== null && percent >= MONTH_BAD_PERCENT) || junk.length >= MONTH_BAD_JUNK;
    const verdict = line(bad ? 'month_verdict_bad' : 'month_verdict_good', {});
    if (verdict) { lines.push('', `😈 ${verdict}`); share.push(`😈 ${verdict}`); }

    await this.roastRepository.rememberVariants(userId, shown, ROAST.RECENT_VARIANTS);
    const shareText = [...share.slice(0, 2), ...(share.length > 2 ? [share[share.length - 1]] : [])].join('\n');
    return { text: [title, '', ...lines].join('\n'), shareText, hasData: true };
  }
}

RoastService.PREFIX = PREFIX;

module.exports = RoastService;
