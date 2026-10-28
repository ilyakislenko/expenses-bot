const logger = require('../utils/logger');
const rules = require('../utils/onboarding');

// «🧭 Настроим бота под тебя»: черновик ответов в users.onboarding_answers и применение ответов через
// существующие настройки (валюта, начало периода, бюджет, напоминания, сводки, злой режим).
// Каждый ответ сразу меняет настройку — «Пропустить всё» и брошенный опрос сохраняют уже отвеченное.
class OnboardingService {
  constructor({ userService, budgetService, planningService = null, achievementService = null, premiumService, funnelService, now = () => new Date() }) {
    this.userService = userService;
    this.budgetService = budgetService;
    this.planningService = planningService;
    this.achievementService = achievementService;
    this.premiumService = premiumService;
    this.funnelService = funnelService;
    this.now = now;
  }

  // exists: false — пользователя ещё нет в БД (первое сообщение — не /start)
  async getState(userId) {
    const state = await this.userService.getOnboarding(userId);
    return state ? { ...state, exists: true } : { answers: null, completedAt: null, exists: false };
  }

  // Незаконченный опрос или null
  async getActive(userId) {
    const { answers } = await this.getState(userId);
    return rules.isActive(answers) ? answers : null;
  }

  // Пользователь уже записал хотя бы одну трату (шаг воронки first_expense)
  async hasRecorded(userId) {
    return this.funnelService.hasEvent(userId, 'first_expense');
  }

  async save(userId, draft, options) {
    draft.updatedAt = this.now().toISOString();
    await this.userService.saveOnboarding(userId, draft, options);
    return draft;
  }

  // mode: 'new' — сразу после выбора языка (с часовым поясом), 'setup' — повторный проход (/setup, Настройки).
  // Новому пользователю основная валюта сразу ставится по языку — на шаге валюты она отмечена как текущая
  async begin(userId, mode, { language } = {}) {
    const { answers: previous } = await this.getState(userId);
    const budgetAllowed = await this.premiumService.isPremiumUser(userId);
    let currency = null;
    if (mode === 'new' && rules.LANGUAGE_CURRENCY[language]) {
      currency = rules.LANGUAGE_CURRENCY[language];
      await this.userService.setUserCurrency(userId, currency);
    }
    const draft = rules.newDraft(mode, { previous, budgetAllowed, currency, now: this.now() });
    await this.save(userId, draft);
    if (mode === 'new') await this.funnelService.track(userId, 'onboarding_started');
    return draft;
  }

  // Ответ на шаг: шаг больше не пропущен, дальше — следующий вопрос
  advance(draft, step) {
    draft.skipped = (draft.skipped || []).filter((s) => s !== step);
    draft.step = rules.nextStep(draft, step) || draft.step;
    return draft;
  }

  async open(userId, draft, step) {
    if (!rules.steps(draft).includes(step)) return draft;
    draft.step = step;
    return this.save(userId, draft);
  }

  async toggle(userId, draft, field, value, allowed) {
    if (!allowed.includes(value)) return draft;
    draft[field] = rules.toggle(draft[field] || [], value).filter((v) => allowed.includes(v));
    return this.save(userId, draft);
  }

  async confirmGoals(userId, draft) {
    draft.answers.goals = true;
    return this.save(userId, this.advance(draft, 'g'));
  }

  async confirmInputs(userId, draft) {
    draft.answers.inputs = true;
    return this.save(userId, this.advance(draft, 'i'));
  }

  async answerCurrency(userId, draft, currency) {
    await this.userService.setUserCurrency(userId, currency);
    draft.answers.currency = currency;
    delete draft.answers.currencyAuto;
    return this.save(userId, this.advance(draft, 'c'));
  }

  // Новый пользователь вернулся к языку и выбрал другой: валюта по языку меняется, если её не выбирали сами
  async changeLanguage(userId, draft, language) {
    const currency = rules.LANGUAGE_CURRENCY[language];
    if (draft.answers.currencyAuto && currency && currency !== draft.answers.currency) {
      await this.userService.setUserCurrency(userId, currency);
      draft.answers.currency = currency;
    }
    draft.step = 'g';
    return this.save(userId, draft);
  }

  // Пояс уже сохранён обработчиком time|…|ob
  async answerTimezone(userId, draft, timezone) {
    draft.answers.timezone = timezone;
    return this.save(userId, this.advance(draft, 'z'));
  }

  async answerPayday(userId, draft, payday) {
    const day = rules.paydayToPeriodDay(payday);
    if (day === null) return draft;
    await this.userService.setUserPeriodStartDay(userId, day);
    draft.answers.payday = Number(payday);
    draft.answers.periodDay = day;
    return this.save(userId, this.advance(draft, 'p'));
  }

  async answerBudget(userId, draft, amount, currency) {
    await this.budgetService.setBudget(userId, null, amount, currency);
    draft.answers.budget = { amount, currency };
    return this.save(userId, this.advance(draft, 'b'));
  }

  async answerReminders(userId, draft, code) {
    const plan = rules.reminderPlan(code);
    if (!plan) return draft;
    if (plan.hours) await this.userService.setReminderHours(userId, plan.hours);
    await this.userService.setReminderEnabled(userId, plan.enabled);
    draft.answers.reminders = code;
    return this.save(userId, this.advance(draft, 'r'));
  }

  // Текущие значения того, что можно присылать
  async currentNotify(userId) {
    const [settings, month, bills] = await Promise.all([
      this.userService.getReminderSettings(userId),
      this.achievementService ? this.achievementService.isWrappedEnabled(userId) : false,
      this.planningService ? this.planningService.isBillRemindersEnabled(userId) : false
    ]);
    return { daily: !!settings.daily_summary_enabled, weekly: !!settings.weekly_insight_enabled, month: !!month, bills: !!bills };
  }

  // Доступные пункты «что присылать» (итоги месяца и платежи — если есть их сервисы)
  notifyOptions() {
    return rules.NOTIFY.filter((code) => (code === 'month' ? !!this.achievementService : code === 'bills' ? !!this.planningService : true));
  }

  async notifySelection(userId, draft) {
    if (Array.isArray(draft.notify)) return draft.notify;
    const options = this.notifyOptions();
    draft.notify = rules.initialNotify(draft, await this.currentNotify(userId)).filter((code) => options.includes(code));
    await this.save(userId, draft);
    return draft.notify;
  }

  async confirmNotify(userId, draft) {
    const plan = rules.notifyPlan(draft.notify || []);
    await this.userService.setDailySummaryEnabled(userId, plan.daily);
    await this.userService.setWeeklyInsightEnabled(userId, plan.weekly);
    if (this.achievementService) await this.achievementService.setWrappedEnabled(userId, plan.month);
    else delete plan.month;
    if (this.planningService) await this.planningService.setBillRemindersEnabled(userId, plan.bills);
    else delete plan.bills;
    draft.answers.notify = plan;
    return this.save(userId, this.advance(draft, 'n'));
  }

  // Уровень уже сохранён злым режимом (RoastHandlers) — здесь только ответ опроса
  async answerRoast(userId, draft, level) {
    draft.answers.roast = level;
    return this.save(userId, this.advance(draft, 'm'));
  }

  // «Пропустить»: настройка не меняется; у вопросов с выбором сбрасываем отметки этого прохода
  async skip(userId, draft, step) {
    if (!rules.steps(draft).includes(step)) return draft;
    if (step === 'g') draft.goals = [];
    if (step === 'i') draft.inputs = [];
    if (step === 'n') draft.notify = null;
    const next = rules.nextStep(draft, step);
    draft.skipped = [...new Set([...(draft.skipped || []), step])];
    if (next) draft.step = next;
    return { draft: await this.save(userId, draft), next };
  }

  // status: 'completed' — дошёл до конца, 'skipped' — «Пропустить всё»
  async finish(userId, draft, status) {
    draft.status = status;
    draft.finishedAt = this.now().toISOString();
    await this.save(userId, draft, { finished: true });
    await this.funnelService.track(userId, status === 'skipped' ? 'onboarding_skipped' : 'onboarding_completed');
    logger.info('Onboarding finished', { userId, status, mode: draft.mode, goals: draft.goals });
    return draft;
  }
}

module.exports = OnboardingService;
