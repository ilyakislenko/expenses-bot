const logger = require('../utils/logger');
const { addDays } = require('../utils/period');
const { normalizeMerchant, subscriptionDates } = require('../utils/planning');
const { findCancelService, APP_STORE, GOOGLE_PLAY } = require('../config/subscriptionCancel');
const {
  WARN_DAYS_OPTIONS, STILL_CHARGING_DAYS, isWarnHour, normalizeWarnDays, subRef, subscriptionWarnDays, trialStage,
  warnKey, chargeAfter
} = require('../utils/subscriptionAlerts');
const { packDate } = require('../utils/recordDate');

const WEEK_LINE_NAMES = 4; // в строке сводки недели — столько списаний, остальные — «и ещё N»

function localDateHour(timezone, now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', hourCycle: 'h23', hour: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

function shortDate(date) {
  const [, m, d] = date.split('-');
  return `${d}.${m}`;
}

// Предупреждения о списании подписок (за N дней, днём, по разу на списание), пробные периоды (за день и в день
// окончания), «🚫 Отменю» с подсказкой, как отменить, и одной мягкой заметкой, если оплата всё же пришла.
// Подписки — из PlanningService.getSubscriptions (найденные в тратах и регулярные-подписки, видимые по тарифу);
// отметки «уже напомнил» — user_notifications: sub_warn (списание), sub_still (заметка), sub_scan (день разобран).
class SubscriptionAlertService {
  constructor({ planningService, planningRepository, expenseService, userNotificationRepository, notificationService, localizationService, formatter }) {
    this.planningService = planningService;
    this.planningRepository = planningRepository;
    this.expenseService = expenseService;
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  async today(userId) {
    return (await this.expenseService.getPeriodContext(userId, 'day', 0)).today;
  }

  money(amount, currency) {
    return this.formatter.formatAmount(Math.round(Number(amount) * 100) / 100, currency);
  }

  name(text, max = 40) {
    return this.formatter.escapeMarkdown(this.formatter.shorten(String(text || '').trim(), max));
  }

  // ========================================
  // НАСТРОЙКА
  // ========================================

  async getSettings(userId) {
    const settings = await this.planningRepository.getWarnSettings(userId);
    return { enabled: settings.enabled, days: normalizeWarnDays(settings.days) };
  }

  // Переключить «🔔 Предупреждать о списании»; новое значение
  async toggleWarn(userId) {
    const { enabled } = await this.getSettings(userId);
    await this.planningRepository.setWarnEnabled(userId, !enabled);
    return !enabled;
  }

  // За сколько дней (1, 2, 3, 7); выбор включает предупреждения. null — такого варианта нет
  async setWarnDays(userId, days) {
    if (!WARN_DAYS_OPTIONS.includes(days)) return null;
    await this.planningRepository.setWarnDays(userId, days);
    return days;
  }

  daysPhrase(lang, days) {
    return this.t(lang, `sub_days_${days}`);
  }

  // ========================================
  // ПОДПИСКА ИЛИ ПРОБНЫЙ ПЕРИОД ПО КНОПКЕ
  // ========================================

  // ref из кнопки: 10 hex — подписка (ключ продавца), t<id> — пробный период. null — уже нет (старая кнопка)
  async resolve(userId, ref) {
    if (/^t\d+$/.test(ref)) {
      const trial = await this.planningRepository.getTrial(userId, Number(ref.slice(1)));
      return trial && trial.end_date ? { kind: 'trial', ref, trial, name: trial.name } : null;
    }
    const subs = await this.planningService.getSubscriptions(userId);
    const sub = subs.all.find(s => s.ref === ref);
    if (sub) return { kind: 'sub', ref, sub, key: sub.key, name: sub.label, alert: sub.alert };
    // Подписка пропала из списка (давно не было оплат), а отметка «отменяю» / «не напоминать» осталась
    const alerts = await this.planningRepository.getAlerts(userId);
    for (const [key, alert] of alerts) {
      if (subRef(key) === ref) return { kind: 'sub', ref, sub: null, key, name: key, alert };
    }
    return null;
  }

  // «✅ Нужна» / «✅ Оставляю» / «↩️ Передумал»: об этом списании больше не напоминаю (напоминание и так одно на
  // списание), отметка «отменяю» снимается — снова предупреждаю; пробный период — без напоминания в день окончания
  async keep(userId, ref) {
    const target = await this.resolve(userId, ref);
    if (!target) return null;
    if (target.kind === 'trial') await this.planningRepository.setTrialState(userId, target.trial.id, 'kept');
    else if (target.alert && target.alert.state === 'cancelling') await this.planningRepository.clearAlert(userId, target.key);
    return target;
  }

  // «🚫 Отменю»: напоминания по ней прекращаются; если оплата всё же придёт — одна мягкая заметка
  async cancel(userId, ref) {
    const target = await this.resolve(userId, ref);
    if (!target) return null;
    if (target.kind === 'trial') await this.planningRepository.setTrialState(userId, target.trial.id, 'cancelling');
    else await this.planningRepository.setAlert(userId, target.key, 'cancelling', await this.today(userId));
    return target;
  }

  // «🔕 Не напоминать про эту»
  async mute(userId, ref) {
    const target = await this.resolve(userId, ref);
    if (!target) return null;
    if (target.kind === 'trial') await this.planningRepository.setTrialState(userId, target.trial.id, 'muted');
    else await this.planningRepository.setAlert(userId, target.key, 'muted', await this.today(userId));
    return target;
  }

  // «🔔 Напоминать о списании» из карточки: снять «🔕»/«🚫»; неотмеченная найденная — отмечается подпиской
  async unmute(userId, ref) {
    const target = await this.resolve(userId, ref);
    if (!target) return null;
    if (target.kind === 'trial') {
      await this.planningRepository.setTrialState(userId, target.trial.id, 'active');
      return target;
    }
    await this.planningRepository.clearAlert(userId, target.key);
    if (target.sub && !target.sub.confirmed && !target.sub.known) await this.planningRepository.setMark(userId, target.key, 'confirmed');
    return target;
  }

  // ========================================
  // РЕГУЛЯРНАЯ ТРАТА: ПРЕДУПРЕЖДАТЬ ЛИ
  // ========================================

  // Регулярная трата — подписка, если её завели из «✅ Это подписка», назвали известным сервисом или включили
  // «🔔» в карточке: тогда о ней предупреждаю (аренду и кредит — нет: о них есть «Платежи утром»).
  // { subscription, warns, muted, cancelling, locked (за пределами видимых без премиума), enabled, days }
  async recurringStatus(userId, recurringId) {
    const [subs, settings] = await Promise.all([this.planningService.getSubscriptions(userId), this.getSettings(userId)]);
    const entry = subs.all.find(s => s.kind === 'recurring' && s.recurringId === recurringId);
    if (!entry) return { subscription: false, ...settings };
    const state = entry.alert ? entry.alert.state : null;
    const locked = !subs.shown.includes(entry);
    return {
      subscription: true,
      ref: entry.ref,
      muted: state === 'muted',
      cancelling: state === 'cancelling',
      locked,
      warns: settings.enabled && !state && !locked,
      ...settings
    };
  }

  // Включить / выключить предупреждения о регулярной трате. Новое состояние или null — траты нет
  async toggleRecurring(userId, recurringId) {
    const item = await this.planningService.recurringExpenseService.get(userId, recurringId);
    if (!item) return null;
    const key = normalizeMerchant(item.description);
    if (!key) return null;
    const status = await this.recurringStatus(userId, recurringId);
    if (status.subscription && !status.muted && !status.cancelling) {
      await this.planningRepository.setAlert(userId, key, 'muted', await this.today(userId));
      return false;
    }
    await this.planningRepository.clearAlert(userId, key);
    if (!status.subscription) await this.planningRepository.setMark(userId, key, 'confirmed');
    return true;
  }

  // ========================================
  // ПРОБНЫЕ ПЕРИОДЫ
  // ========================================

  async trialLimit(userId) {
    const { isPremium, limits } = await this.planningService.limits(userId);
    return { isPremium, max: limits.SUB_TRIALS };
  }

  // Можно ли добавить ещё один: { ok, isPremium, max, count }
  async canAddTrial(userId, today) {
    const [{ isPremium, max }, count] = await Promise.all([
      this.trialLimit(userId),
      this.planningRepository.countActiveTrials(userId, today)
    ]);
    return { ok: count < max, isPremium, max, count };
  }

  // Шаг 1: название и цена → черновик без даты. { id } или { error: 'limit' }
  async startTrial(userId, { name, amount = null, currency = null }) {
    const today = await this.today(userId);
    if (!(await this.canAddTrial(userId, today)).ok) return { error: 'limit' };
    const id = await this.planningRepository.createTrialDraft(userId, { name, amount, currency, createdOn: today });
    return { id };
  }

  // Шаг 2: дата окончания. { trial, today } или { error: 'outdated' | 'limit' }
  async finishTrial(userId, trialId, endDate) {
    const today = await this.today(userId);
    if (!(await this.canAddTrial(userId, today)).ok) return { error: 'limit' };
    const trial = await this.planningRepository.setTrialEnd(userId, trialId, endDate);
    return trial ? { trial, today } : { error: 'outdated' };
  }

  // Действующие (окончание сегодня или позже)
  async getTrials(userId, today = null) {
    return this.planningRepository.getTrials(userId, today || await this.today(userId));
  }

  async getTrial(userId, trialId) {
    const trial = await this.planningRepository.getTrial(userId, trialId);
    return trial && trial.end_date ? trial : null;
  }

  async deleteTrial(userId, trialId) {
    return this.planningRepository.deleteTrial(userId, trialId);
  }

  // ========================================
  // КАК ОТМЕНИТЬ
  // ========================================

  // Текст и кнопки-ссылки «Как отменить»: сервис из списка (config/subscriptionCancel.js) — его страница;
  // App Store и Google Play — общие шаги со ссылками; неизвестный сервис — совет найти раздел «Подписка».
  // recurring — регулярная трата бота: после отмены её нужно удалить (иначе бот продолжит записывать)
  cancelGuide(lang, { name, key = '', recurringId = null }) {
    const service = findCancelService(name, key);
    const lines = [`❓ *${this.t(lang, 'sub_cancel_title', { name: this.name(name) })}*`, '', this.t(lang, 'sub_cancel_intro')];
    const urls = [];
    if (service && !service.store) {
      lines.push(this.t(lang, 'sub_cancel_service', { service: service.name }));
      if (service.manage) urls.push([{ text: this.t(lang, 'sub_button_open_service', { service: service.name }), url: service.manage }]);
      if (service.help) urls.push([{ text: this.t(lang, 'sub_button_help_service', { service: service.name }), url: service.help }]);
    }
    const stores = [];
    if (!service || service.store !== 'google') {
      lines.push(this.t(lang, 'sub_cancel_apple'));
      stores.push({ text: this.t(lang, 'sub_button_appstore'), url: APP_STORE.manage });
    }
    if (!service || service.store !== 'apple') {
      lines.push(this.t(lang, 'sub_cancel_google'));
      stores.push({ text: this.t(lang, 'sub_button_googleplay'), url: GOOGLE_PLAY.manage });
    }
    urls.push(stores);
    if (!service) lines.push(this.t(lang, 'sub_cancel_generic'));
    lines.push('', this.t(lang, 'sub_cancel_tip'));
    if (recurringId) lines.push('', this.t(lang, 'sub_cancel_recurring', { name: this.name(name) }));
    return { text: lines.join('\n'), urlRows: urls, service };
  }

  // ========================================
  // СООБЩЕНИЯ
  // ========================================

  // Предупреждение: «Через 2 дня, 31.10, спишется «Netflix» ≈ 799 ₽. Нужна?» и три кнопки.
  // item: { ref, name, date, days, amount, currency, trial }
  warningMessage(lang, item) {
    const params = {
      when: this.t(lang, `sub_when_${item.days}`),
      date: shortDate(item.date),
      name: this.name(item.name),
      amount: item.amount ? this.money(item.amount, item.currency) : ''
    };
    const key = item.trial ? (item.amount ? 'sub_trial_text' : 'sub_trial_text_noprice') : 'sub_warn_text';
    const packed = packDate(item.date);
    return {
      text: this.t(lang, key, params),
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.t(lang, 'sub_button_keep'), callback_data: `plwk|${item.ref}|${packed}` },
            { text: this.t(lang, 'sub_button_cancel'), callback_data: `plwx|${item.ref}|${packed}` }
          ],
          [{ text: this.t(lang, 'sub_button_mute'), callback_data: `plwm|${item.ref}` }]
        ]
      }
    };
  }

  // «Отменял, а оплата пришла» — одна заметка. Авто-запись регулярной траты: бот сам её записал — просим удалить
  stillChargingMessage(lang, { ref, name, row }) {
    const params = { name: this.name(name), amount: this.money(row.amount, row.currency), date: shortDate(row.date) };
    const keyboard = [];
    if (row.recurring_expense_id) {
      keyboard.push([{ text: this.t(lang, 'sub_button_delete_recurring'), callback_data: `recurring_delete|${row.recurring_expense_id}` }]);
    }
    keyboard.push([{ text: this.t(lang, 'sub_button_how'), callback_data: `plwh|${ref}` }]);
    keyboard.push([
      { text: this.t(lang, 'sub_button_keep_now'), callback_data: `plwk|${ref}` },
      { text: this.t(lang, 'sub_button_mute'), callback_data: `plwm|${ref}` }
    ]);
    return {
      text: this.t(lang, row.recurring_expense_id ? 'sub_still_recurring' : 'sub_still_text', params),
      reply_markup: { inline_keyboard: keyboard }
    };
  }

  async send(userId, message) {
    await this.notificationService.sendMessage(userId, message.text, { parse_mode: 'Markdown', reply_markup: message.reply_markup });
  }

  // ========================================
  // CRON
  // ========================================

  // Каждый час: днём по местному времени (10:00–20:59) — один разбор в локальный день. Отметка «уже напомнил»
  // ставится до отправки (INSERT … ON CONFLICT): перезапуск и наложение запусков не дают второго сообщения.
  // День отмечается разобранным после прохода без ошибок; сбой — повтор в следующий час (отправленное не повторится)
  async processDue(now = new Date()) {
    const candidates = await this.planningRepository.getWarnCandidates();
    let sent = 0;
    for (const candidate of candidates) {
      try {
        const local = localDateHour(candidate.timezone, now);
        if (!isWarnHour(local.hour)) continue;
        if (await this.userNotificationRepository.isSent(candidate.id, 'sub_scan', local.date)) continue;
        sent += await this.processUser(candidate, local.date);
        await this.userNotificationRepository.markSent(candidate.id, 'sub_scan', local.date);
      } catch (error) {
        logger.warn('Subscription warnings failed', { userId: candidate.id, error: error.message });
      }
    }
    return sent;
  }

  // Предупреждения одного пользователя за локальный день today; число отправленных
  async processUser(user, today) {
    const lang = user.language || 'en';
    const userId = user.id;
    const warnDays = normalizeWarnDays(user.sub_warn_days);
    let sent = 0;
    const claim = (kind, key) => this.userNotificationRepository.markSent(userId, kind, key.slice(0, 64));

    // Подписки, видимые по тарифу: отмеченные «✅» или известные, без «🔕» и «🚫»
    if (user.sub_warn_enabled) {
      const subs = await this.planningService.getSubscriptions(userId, { today });
      for (const sub of subs.shown) {
        if (!(sub.confirmed || sub.known) || sub.alert) continue;
        const days = subscriptionWarnDays(sub.nextDate, today, warnDays);
        if (days === null) continue;
        if (!(await claim('sub_warn', warnKey(sub.ref, sub.nextDate)))) continue;
        await this.send(userId, this.warningMessage(lang, {
          ref: sub.ref, name: sub.label, date: sub.nextDate, days, amount: sub.amount, currency: sub.currency
        }));
        sent++;
      }
    }

    // Пробные периоды: за день и в день окончания (при любой настройке — пользователь сам их добавил)
    const trials = await this.planningRepository.getTrials(userId, addDays(today, -STILL_CHARGING_DAYS));
    for (const trial of trials) {
      const stage = trialStage(trial, today);
      if (stage === null) continue;
      const ref = `t${trial.id}`;
      if (!(await claim('sub_warn', warnKey(ref, trial.end_date, stage)))) continue;
      await this.send(userId, this.warningMessage(lang, {
        ref, name: trial.name, date: trial.end_date, days: stage, amount: trial.amount, currency: trial.currency, trial: true
      }));
      sent++;
    }

    // «🚫 Отменю», а оплата пришла позже — одна заметка (ищем STILL_CHARGING_DAYS дней после отметки)
    const watch = [];
    for (const [key, alert] of await this.planningRepository.getAlerts(userId)) {
      if (alert.state === 'cancelling' && alert.since >= addDays(today, -STILL_CHARGING_DAYS)) {
        watch.push({ ref: subRef(key), key, since: alert.since, name: null, noteKey: `${subRef(key)}|${alert.since}` });
      }
    }
    for (const trial of trials) {
      if (trial.state === 'cancelling') {
        watch.push({ ref: `t${trial.id}`, key: normalizeMerchant(trial.name), since: addDays(trial.end_date, -1), name: trial.name, noteKey: `t${trial.id}` });
      }
    }
    const pending = watch.filter(item => item.key && item.since < today);
    if (pending.length) {
      const since = pending.reduce((min, item) => (item.since < min ? item.since : min), pending[0].since);
      const rows = await this.planningRepository.getExpenseRowsSince(userId, user.timezone || 'UTC', addDays(since, 1));
      for (const item of pending) {
        const row = chargeAfter(rows, item.key, item.since);
        if (!row) continue;
        if (!(await claim('sub_still', item.noteKey))) continue;
        await this.send(userId, this.stillChargingMessage(lang, { ref: item.ref, name: item.name || row.description, row }));
        sent++;
      }
    }
    return sent;
  }

  // ========================================
  // СВОДКА НЕДЕЛИ
  // ========================================

  // «🗓 На этой неделе спишутся: Netflix 31.10 ≈ 799 ₽, …» — подписки, видимые по тарифу (отмеченные или известные,
  // не отменяемые), и окончания пробных периодов за 7 дней с today. '' — ничего; ошибка сводку не ломает
  async weekLine(userId, lang, today) {
    try {
      const until = addDays(today, 7);
      const [subs, trials] = await Promise.all([
        this.planningService.getSubscriptions(userId, { today }),
        this.planningRepository.getTrials(userId, today)
      ]);
      const items = [];
      for (const sub of subs.shown) {
        if (!(sub.confirmed || sub.known) || (sub.alert && sub.alert.state === 'cancelling')) continue;
        for (const date of subscriptionDates(sub, today, until)) items.push({ date, name: sub.label, amount: sub.amount, currency: sub.currency });
      }
      for (const trial of trials) {
        if (trial.end_date >= until || trial.state === 'cancelling') continue;
        items.push({ date: trial.end_date, name: trial.name, amount: trial.amount, currency: trial.currency });
      }
      if (!items.length) return '';
      items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const shown = items.slice(0, WEEK_LINE_NAMES).map(item => {
        const head = `${this.name(item.name, 24)} ${shortDate(item.date)}`;
        return item.amount ? `${head} ≈ ${this.money(item.amount, item.currency)}` : head;
      }).join(', ');
      const more = items.length - WEEK_LINE_NAMES;
      const list = more > 0 ? `${shown} ${this.t(lang, 'pl_subs_more', { count: more })}` : shown;
      return this.t(lang, 'sub_week_line', { list });
    } catch (error) {
      logger.warn('Subscription week line failed', { userId, error: error.message });
      return '';
    }
  }
}

SubscriptionAlertService.localDateHour = localDateHour;
SubscriptionAlertService.shortDate = shortDate;

module.exports = SubscriptionAlertService;
