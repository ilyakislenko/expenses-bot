const logger = require('../utils/logger');
const { USER_LIMITS } = require('../utils/constants');
const { addDays, customPeriod, parseYmd, ymd } = require('../utils/period');
const { commaDecimal } = require('../utils/savingsView');
const {
  PACE_EMOJI, SCAN_DAYS, PAYDAY_SCAN_DAYS, INFLATION_WINDOW_DAYS,
  daysBetween, expectedIncome, computeAllowance, nextIncomeDate, normalizeMerchant, detectSubscriptions, detectPaydays,
  paydayDates, monthlyDates, debtDates, subscriptionDates, buildCalendar, computeInflation, isKnownSubscription, shortHash
} = require('../utils/planning');
const { subRef } = require('../utils/subscriptionAlerts');
const RecurringExpenseService = require('./RecurringExpenseService');

const AVERAGE_PERIODS = 3; // средний доход — за столько прошлых периодов, в которых был доход
const NEW_USER_DAYS = 14; // подсказку «добавь доход или бюджет» в «Сегодня» видят только новые пользователи
const BILL_REMINDER_HOUR = 9; // утреннее напоминание о платежах — в 9:00 по местному времени
const CALENDAR_DAYS = 30;
const RESERVE_MAX_DAYS = 31; // резерв на платежи после конца периода — до следующего дохода, но не дальше месяца
const SUBS_NUDGE_NAMES = 3; // в строке о найденных подписках — столько названий, остальные — «и ещё N»

function localDateHour(timezone, now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', hourCycle: 'h23', hour: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

// Подписка, которую ждём в календаре и резерве «Можно сегодня»: отмечена «✅» или известная, и её не отменяют
function isExpected(sub) {
  return (sub.confirmed || sub.known) && !(sub.alert && sub.alert.state === 'cancelling');
}

// «🧭 Планирование»: можно потратить сегодня, календарь платежей, найденные подписки, личная инфляция.
// Расчёты — в utils/planning.js, здесь — данные, валюты и премиум.
class PlanningService {
  constructor({ planningRepository, expenseService, recurringExpenseService, budgetService, premiumService, userService, userNotificationRepository, notificationService, localizationService, formatter, currencyUtils }) {
    this.planningRepository = planningRepository;
    this.expenseService = expenseService;
    this.recurringExpenseService = recurringExpenseService;
    this.budgetService = budgetService;
    this.premiumService = premiumService;
    this.userService = userService;
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.currencyUtils = currencyUtils;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
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

  async limits(userId) {
    const isPremium = await this.premiumService.isPremiumUser(userId);
    return { isPremium, limits: isPremium ? USER_LIMITS.premium : USER_LIMITS.regular };
  }

  // ========================================
  // ДОХОД ПЕРИОДА
  // ========================================

  // Записанный доход текущего периода, ожидаемые выплаты до конца периода (по истории: зарплата, аванс),
  // средний доход прошлых периодов и итог — ожидаемый доход (null — о доходах ничего не известно)
  async incomeOutlook(userId, { today, startDay, period, timezone, currency }, convert) {
    const since = [customPeriod(today, startDay, -AVERAGE_PERIODS).start, addDays(today, -PAYDAY_SCAN_DAYS)].sort()[0];
    const raw = await this.planningRepository.getIncomeRowsSince(userId, timezone, since);
    const rows = await Promise.all(raw.map(async row => ({ ...row, amount: await convert(row.amount, row.currency) })));
    const sumIn = (start, end) => rows.filter(r => r.date >= start && r.date < end).reduce((sum, r) => sum + r.amount, 0);
    const countIn = (start, end) => rows.filter(r => r.date >= start && r.date < end).length;

    const recorded = sumIn(period.start, period.end);
    const samples = [];
    for (let offset = -1; offset >= -AVERAGE_PERIODS; offset--) {
      const p = customPeriod(today, startDay, offset);
      if (countIn(p.start, p.end)) samples.push(sumIn(p.start, p.end));
    }
    const average = samples.length ? samples.reduce((sum, v) => sum + v, 0) / samples.length : null;
    const streams = detectPaydays(rows, { today }).map(stream => ({ ...stream, currency }));
    // По дате: «аванс ~20.11, зарплата ~05.11» читается как ошибка
    const upcomingList = paydayDates(streams, today, period.end).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const upcoming = upcomingList.reduce((sum, item) => sum + item.stream.amount, 0);
    return {
      recorded,
      upcoming,
      upcomingList,
      average,
      averagePeriods: samples.length,
      streams,
      income: expectedIncome({ recorded, upcoming, average })
    };
  }

  // ========================================
  // МОЖНО ПОТРАТИТЬ СЕГОДНЯ
  // ========================================

  // Подписки для резерва в «Можно сегодня» — как в календаре: отмеченные пользователем или известные.
  // Ошибка поиска подписок расчёт не ломает — резерв без них
  async reservedSubscriptions(userId) {
    try {
      const { visible } = await this.getSubscriptions(userId);
      return visible.filter(isExpected);
    } catch (error) {
      logger.warn('Subscriptions for allowance failed', { userId, error: error.message });
      return [];
    }
  }

  async getAllowance(userId) {
    const ctx = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const { timezone, currency, today, period } = ctx;
    const convert = this.converter(currency);
    const [split, recurring, debts, contribution, outlook, statuses, subscriptions] = await Promise.all([
      this.planningRepository.getSpendSplit(userId, timezone, period.start, today),
      this.recurringExpenseService.list(userId),
      this.planningRepository.getDebts(userId),
      this.planningRepository.getMonthlyContribution(userId),
      this.incomeOutlook(userId, ctx, convert),
      this.budgetService.getStatus(userId, { timezone, currency, period }),
      this.reservedSubscriptions(userId)
    ]);

    let spentBefore = 0;
    let spentToday = 0;
    for (const row of split) {
      spentBefore += await convert(row.before + row.bills_today, row.currency);
      spentToday += await convert(row.today, row.currency);
    }

    // Резерв на платежи — до следующего ожидаемого дохода, если он позже конца периода: аренда 3-го при зарплате
    // 5-го ляжет на деньги этого периода. Дохода по истории не видно — до конца периода
    const nextIncome = nextIncomeDate(outlook.streams, today, addDays(period.end, RESERVE_MAX_DAYS));
    const reserveUntil = nextIncome && nextIncome > period.end ? nextIncome : period.end;

    // Регулярные и подписки, которые ещё спишутся до reserveUntil (уже списанные — в «потрачено»);
    // budgetBills — только до конца периода (общий бюджет — на период)
    let bills = 0;
    let budgetBills = 0;
    const billsList = [];
    const reserve = async (item, date) => {
      const amount = await convert(item.amount, item.currency);
      bills += amount;
      if (date < period.end) budgetBills += amount;
      billsList.push({ ...item, date });
    };
    for (const item of recurring) {
      if (!item.nextChargeDate) continue;
      for (const date of monthlyDates(item.nextChargeDate, item.day_of_month, reserveUntil)) {
        if (date >= today) await reserve(item, date);
      }
    }
    for (const sub of subscriptions) {
      for (const date of subscriptionDates(sub, today, reserveUntil)) await reserve(sub, date);
    }

    // Платежи по долгам: с числом — если оно ещё впереди до reserveUntil, без числа — доля по оставшимся дням периода
    const daysLeft = daysBetween(today, period.end);
    const periodDays = daysBetween(period.start, period.end);
    const recurringKeys = new Set(recurring.map(r => normalizeMerchant(r.description)).filter(Boolean));
    let debtsTotal = 0;
    let budgetDebts = 0;
    let debtsProrated = false;
    for (const debt of debts) {
      if (!(debt.monthly_payment > 0) || !(debt.balance > 0) || recurringKeys.has(normalizeMerchant(debt.name))) continue;
      const payment = await convert(debt.monthly_payment, debt.currency);
      if (debt.due_day) {
        const dates = debtDates(debt, today, reserveUntil);
        debtsTotal += payment * dates.length;
        budgetDebts += payment * dates.filter(date => date < period.end).length;
      } else {
        const share = Math.round(payment * daysLeft / periodDays);
        debtsTotal += share;
        budgetDebts += share;
        debtsProrated = true;
      }
    }

    // Общий бюджет учитываем и при доходе: лимит дня не больше остатка бюджета на день
    const total = statuses.find(b => b.category_name === null);
    const budget = total ? total.limit : null;
    const savings = contribution !== null && contribution > 0 ? contribution : 0;
    const result = computeAllowance({
      daysLeft, periodDays, income: outlook.income, budget, spentBefore, spentToday,
      bills, debts: debtsTotal, savings, budgetBills, budgetDebts
    });
    return {
      ...result, currency, today, period, daysLeft, outlook, budget, nextIncome, reserveUntil,
      spentBefore, bills, budgetBills, billsList, debtsTotal, budgetDebts, debtsProrated,
      savings: result.mode === 'income' ? savings : 0
    };
  }

  // Компактная строка для «📅 Сегодня» и обзора. Без дохода и бюджета — подсказка (только новым пользователям)
  // или null. Ошибка расчёта не ломает экран — строки просто нет.
  async allowanceLine(userId, lang, { hintForNew = true } = {}) {
    try {
      const allowance = await this.getAllowance(userId);
      if (allowance.mode === 'none') {
        if (!hintForNew) return null;
        const user = await this.userService.getUserById(userId);
        const ageDays = user?.created_at ? (Date.now() - new Date(user.created_at).getTime()) / 86400000 : Infinity;
        return ageDays < NEW_USER_DAYS ? this.t(lang, 'pl_line_none') : null;
      }
      return this.formatLine(lang, allowance);
    } catch (error) {
      logger.warn('Allowance line failed', { userId, error: error.message });
      return null;
    }
  }

  formatLine(lang, allowance) {
    const money = (value) => this.formatter.formatAmount(Math.round(value), allowance.currency);
    if (allowance.deficit > 0) return this.t(lang, 'pl_line_over', { amount: money(allowance.deficit) });
    return this.t(lang, 'pl_line', { amount: money(allowance.daily), spent: money(allowance.spentToday), pace: PACE_EMOJI[allowance.pace] });
  }

  // ========================================
  // ПОДПИСКИ
  // ========================================

  // Подписки по убыванию цены в месяц в основной валюте: найденные в тратах (без скрытых) и регулярные траты-подписки
  // (заведённые из «✅ Это подписка», с названием известного сервиса или отмеченные «🔔» в карточке регулярной).
  // Без премиума видны первые PLANNING_SUBSCRIPTIONS (shown, им же — предупреждения о списании), остальные — числом и
  // суммой; visible — найденные в тратах из видимых (календарь, «Можно сегодня», сводка недели: регулярные там и так
  // есть). alert — отметка «🔕 не напоминать» / «🚫 отменяю». today — подмена «сегодня» (cron с заданным временем)
  async getSubscriptions(userId, { today: todayOverride = null } = {}) {
    const ctx = await this.expenseService.getPeriodContext(userId, 'day', 0);
    const { timezone, currency } = ctx;
    const today = todayOverride || ctx.today;
    const convert = this.converter(currency);
    const [rows, recurring, marks, alerts, { isPremium, limits }] = await Promise.all([
      this.planningRepository.getExpenseRowsSince(userId, timezone, addDays(today, -SCAN_DAYS)),
      this.recurringExpenseService.list(userId),
      this.planningRepository.getMarks(userId),
      this.planningRepository.getAlerts(userId),
      this.limits(userId)
    ]);
    const excludeKeys = new Set(recurring.map(r => normalizeMerchant(r.description)).filter(Boolean));
    const detected = detectSubscriptions(rows, { today, excludeKeys });
    const all = [];
    let dismissed = 0;
    for (const sub of detected) {
      if (marks.get(sub.key) === 'dismissed') {
        dismissed++;
        continue;
      }
      all.push({
        ...sub,
        kind: 'detected',
        ref: subRef(sub.key),
        confirmed: marks.get(sub.key) === 'confirmed',
        alert: alerts.get(sub.key) || null,
        monthlyMain: await convert(sub.monthlyCost, sub.currency)
      });
    }
    for (const item of recurring) {
      const key = normalizeMerchant(item.description);
      const known = isKnownSubscription(item.description);
      if (!key || (marks.get(key) !== 'confirmed' && !known)) continue;
      if (marks.get(key) === 'dismissed') {
        dismissed++;
        continue;
      }
      const amount = Number(item.amount);
      all.push({
        kind: 'recurring',
        id: shortHash(`r|${item.id}`),
        ref: subRef(key),
        recurringId: item.id,
        key,
        label: String(item.description || '').trim(),
        amount,
        currency: item.currency,
        cadence: 'monthly',
        day: item.day_of_month,
        nextDate: RecurringExpenseService.nextChargeDate(item.day_of_month, item.last_charged_month, today),
        monthlyCost: amount,
        categoryId: item.category_id || null,
        confirmed: marks.get(key) === 'confirmed',
        known,
        alert: alerts.get(key) || null,
        monthlyMain: await convert(amount, item.currency)
      });
    }
    all.sort((a, b) => b.monthlyMain - a.monthlyMain);
    const shown = all.slice(0, limits.PLANNING_SUBSCRIPTIONS);
    const hidden = all.slice(shown.length);
    return {
      currency, timezone, today, isPremium, all, shown, dismissed,
      visible: shown.filter(sub => sub.kind === 'detected'),
      hiddenCount: hidden.length,
      hiddenMonthly: hidden.reduce((sum, s) => sum + s.monthlyMain, 0),
      totalMonthly: all.reduce((sum, s) => sum + s.monthlyMain, 0)
    };
  }

  // «✅ Это подписка»: ежемесячная становится регулярной тратой (первое списание — в следующем месяце, если в этом
  // уже было), остальные отмечаются. { converted, sub, recurring } или { error: 'outdated' | 'recurring_limit' }
  async confirmSubscription(userId, subId) {
    const { visible, today } = await this.getSubscriptions(userId);
    const sub = visible.find(s => s.id === subId);
    if (!sub) return { error: 'outdated' };
    if (sub.cadence !== 'monthly') {
      await this.planningRepository.setMark(userId, sub.key, 'confirmed');
      return { converted: false, sub };
    }
    const [categories, { limits }] = await Promise.all([this.expenseService.getCategories(userId), this.limits(userId)]);
    const category = categories.find(c => c.id === sub.categoryId) || await this.expenseService.getDefaultCategory();
    const t = parseYmd(today);
    const day = sub.day || parseYmd(sub.lastDate).d;
    try {
      const recurring = await this.recurringExpenseService.create(userId, {
        amount: sub.amount,
        currency: sub.currency,
        description: sub.label.slice(0, limits.MAX_DESCRIPTION_LENGTH).trim(),
        dayOfMonth: day,
        categoryId: category ? category.id : null,
        paidThisMonth: sub.lastDate >= ymd(t.y, t.m, 1)
      });
      await this.planningRepository.setMark(userId, sub.key, 'confirmed');
      logger.info('Subscription converted to recurring', { userId, recurringId: recurring.id, cadence: sub.cadence });
      return { converted: true, sub, day, recurring };
    } catch (error) {
      if (error.code === 'recurring_limit') return { error: 'recurring_limit' };
      throw error;
    }
  }

  // «🙈 Не подписка»: больше не показываем (регулярная трата остаётся, просто не в списке подписок).
  // { sub } или { error: 'outdated' }
  async dismissSubscription(userId, subId) {
    const { shown } = await this.getSubscriptions(userId);
    const sub = shown.find(s => s.id === subId);
    if (!sub) return { error: 'outdated' };
    await this.planningRepository.setMark(userId, sub.key, 'dismissed');
    return { sub };
  }

  async restoreDismissed(userId) {
    return this.planningRepository.clearDismissed(userId);
  }

  // Строка для сводки недели: новые найденные подписки — один раз на каждую (user_notifications
  // 'subscription_found'). '' — новых нет; ошибка сводку не ломает
  async subscriptionNudge(userId, lang) {
    try {
      const { visible } = await this.getSubscriptions(userId);
      const fresh = [];
      // Отмеченные и те, о которых пользователь уже ответил на предупреждение («🔕» / «🚫»), — не новость
      for (const sub of visible.filter(s => !s.confirmed && !s.alert)) {
        if (await this.userNotificationRepository.markSent(userId, 'subscription_found', sub.key.slice(0, 64))) fresh.push(sub);
      }
      if (!fresh.length) return '';
      const names = fresh.slice(0, SUBS_NUDGE_NAMES).map(sub => this.formatter.escapeMarkdown(this.formatter.shorten(sub.label, 30))).join(', ');
      const more = fresh.length - SUBS_NUDGE_NAMES;
      const list = more > 0 ? `${names} ${this.t(lang, 'pl_subs_more', { count: more })}` : names;
      return this.t(lang, 'pl_subs_nudge', { count: fresh.length, list });
    } catch (error) {
      logger.warn('Subscription nudge failed', { userId, error: error.message });
      return '';
    }
  }

  // ========================================
  // КАЛЕНДАРЬ ПЛАТЕЖЕЙ
  // ========================================

  // Платежи и ожидаемые доходы на days дней: регулярные траты, долги с платежом, подписки (видимые по тарифу),
  // зарплата по истории. subs — уже посчитанные getSubscriptions (чтобы не искать дважды)
  async getCalendar(userId, { days = CALENDAR_DAYS, subs = null } = {}) {
    const ctx = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const convert = this.converter(ctx.currency);
    const [recurring, debts, subscriptions, outlook, remindersOn] = await Promise.all([
      this.recurringExpenseService.list(userId),
      this.planningRepository.getDebts(userId),
      subs ? Promise.resolve(subs) : this.getSubscriptions(userId),
      this.incomeOutlook(userId, ctx, convert),
      this.planningRepository.isBillRemindersEnabled(userId)
    ]);
    const calendar = buildCalendar({
      today: ctx.today,
      days,
      recurring,
      debts,
      // В календаре — только отмеченные пользователем или известные подписки (бренд, связь, интернет…), кроме тех,
      // что пользователь отменяет («🚫 Отменю»)
      subscriptions: subscriptions.visible.filter(isExpected),
      paydays: outlook.streams
    });
    let outTotal = 0;
    let inTotal = 0;
    for (const item of calendar.items) {
      if (item.kind === 'income') inTotal += await convert(item.amount, item.currency);
      else if (!item.paid) outTotal += await convert(item.amount, item.currency);
    }
    return { ...calendar, currency: ctx.currency, today: ctx.today, outTotal, inTotal, remindersOn, debts };
  }

  async setDueDay(userId, potId, day) {
    return this.planningRepository.setDebtDueDay(userId, potId, day);
  }

  async getDebt(userId, potId) {
    return this.planningRepository.getDebt(userId, potId);
  }

  async isBillRemindersEnabled(userId) {
    return this.planningRepository.isBillRemindersEnabled(userId);
  }

  // Переключить утренние напоминания о платежах; новое значение
  async toggleBillReminders(userId) {
    const value = !(await this.planningRepository.isBillRemindersEnabled(userId));
    await this.setBillRemindersEnabled(userId, value);
    return value;
  }

  async setBillRemindersEnabled(userId, enabled) {
    await this.planningRepository.setBillRemindersEnabled(userId, enabled);
  }

  // ========================================
  // ЛИЧНАЯ ИНФЛЯЦИЯ
  // ========================================

  async getInflation(userId) {
    const { timezone, currency, today } = await this.expenseService.getPeriodContext(userId, 'day', 0);
    const [rows, { isPremium, limits }] = await Promise.all([
      this.planningRepository.getReceiptItemsSince(userId, timezone, addDays(today, -INFLATION_WINDOW_DAYS), currency),
      this.limits(userId)
    ]);
    return { ...computeInflation(rows, { today }), currency, today, isPremium, itemsLimit: limits.PLANNING_INFLATION_ITEMS };
  }

  // Изменение в процентах со знаком: «+4,1%» (десятичная запятая — как в остальных экранах языка)
  formatPercent(lang, ratio) {
    const value = Math.round(ratio * 1000) / 10;
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    const text = Math.abs(value).toFixed(1);
    return `${sign}${commaDecimal(lang) ? text.replace('.', ',') : text}%`;
  }

  // ========================================
  // УТРЕННЕЕ НАПОМИНАНИЕ О ПЛАТЕЖАХ
  // ========================================

  // Текст напоминания: платежи сегодня и завтра (без доходов) и строка «можно сегодня». null — платежей нет
  async buildBillReminder(userId, lang) {
    const calendar = await this.getCalendar(userId, { days: 2 });
    const items = calendar.items.filter(item => item.kind !== 'income');
    if (!items.length) return null;
    const lines = [`🔔 *${this.t(lang, 'pl_bills_title')}*`];
    for (const [date, titleKey] of [[calendar.today, 'pl_cal_today'], [addDays(calendar.today, 1), 'pl_cal_tomorrow']]) {
      const dayItems = items.filter(item => item.date === date);
      if (!dayItems.length) continue;
      lines.push('', `*${this.t(lang, titleKey)}, ${this.shortDate(date)}*`);
      lines.push(...dayItems.map(item => this.itemLine(lang, item)));
    }
    const allowanceLine = await this.allowanceLine(userId, lang, { hintForNew: false });
    if (allowanceLine) lines.push('', allowanceLine);
    return { text: lines.join('\n'), today: calendar.today };
  }

  shortDate(date) {
    const [, m, d] = date.split('-');
    return `${d}.${m}`;
  }

  // Строка календаря: значок вида, название (экранировано), сумма; доход — с «+», списанная сегодня — ✅
  itemLine(lang, item) {
    const icons = { recurring: '🔁', debt: '💳', subscription: '📺', income: '💵' };
    const label = item.label ? this.formatter.escapeMarkdown(this.formatter.shorten(item.label, 32)) : this.t(lang, 'pl_cal_income_default');
    const amount = this.formatter.formatAmount(Math.round(item.amount * 100) / 100, item.currency);
    const suffix = item.paid ? ` · ${this.t(lang, 'pl_cal_paid')}` : '';
    return `${icons[item.kind]} ${label} — ${item.kind === 'income' ? '+' : ''}${amount}${suffix}`;
  }

  // Cron (каждый час): в 9:00 по местному времени, включившим напоминания, по разу за локальный день,
  // только если сегодня или завтра что-то спишется
  async processBillReminders(now = new Date()) {
    const candidates = await this.planningRepository.getBillReminderCandidates();
    let sent = 0;
    for (const candidate of candidates) {
      try {
        const local = localDateHour(candidate.timezone, now);
        if (local.hour !== BILL_REMINDER_HOUR) continue;
        const lang = candidate.language || 'en';
        const reminder = await this.buildBillReminder(candidate.id, lang);
        if (!reminder) continue;
        if (!(await this.userNotificationRepository.markSent(candidate.id, 'bill_reminder', local.date))) continue;
        await this.notificationService.sendMessage(candidate.id, reminder.text, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'pl_button_calendar'), callback_data: 'plc' }]] }
        });
        sent++;
      } catch (error) {
        logger.warn('Bill reminder not delivered', { userId: candidate.id, error: error.message });
      }
    }
    return sent;
  }
}

PlanningService.BILL_REMINDER_HOUR = BILL_REMINDER_HOUR;
PlanningService.CALENDAR_DAYS = CALENDAR_DAYS;
PlanningService.localDateHour = localDateHour;

module.exports = PlanningService;
