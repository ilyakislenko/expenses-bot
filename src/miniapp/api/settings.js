const { DEFAULT_REMINDER_HOURS, DAILY_PLAN } = require('../../utils/constants');
const { summaryHour } = require('../../services/DailySummaryService');
const { calculateTimezoneFromUserTime, getTimezoneDisplayName } = require('../../utils/timezoneCalculator');
const { LEVELS, GENDERS, SAVAGE_LANGUAGES } = require('../../utils/roast');
const { PAY_SUPPORT } = require('../../config/bot');
const { refreshChatKeyboard } = require('./profileHelpers');

const MAX_REMINDER_HOURS = 3; // как в боте: reminder_hours_limit
const bool = (value, http) => {
  if (typeof value !== 'boolean') throw http.badRequest('bad_bool');
  return value;
};

// Настройки — как экраны ⚙️ бота: язык, валюта, пояс, начало периода, напоминания (часы, сводка дня и недели,
// «☀️ План на день», приглашение в квиз), «😈 Злой режим». Валюта дохода — /api/income/currency (раздел доходов),
// «Платежи утром» и «Предупреждать о списании» — /api/plans/reminders (раздел планов). Плюс справка и баг-репорт.
module.exports = (router, { get, http }) => {
  // Уровень злого режима для показа: «без цензуры» есть только на ru/en, на других языках сохранённый savage — ехидный
  async function roastState(ctx) {
    const roastService = get('roastService');
    const settings = await roastService.getSettings(ctx.userId);
    const savageLanguage = SAVAGE_LANGUAGES.includes(ctx.lang);
    const level = !savageLanguage && settings.level === 'savage' ? 'spicy' : settings.level;
    return {
      level,
      gender: settings.gender || null,
      levels: LEVELS.filter(code => savageLanguage || code !== 'savage').map(code => ({ value: code, label: ctx.t(`roast_level_${code}`) })),
      genders: GENDERS.map(code => ({ value: code, label: ctx.t(`roast_gender_${code}`) }))
    };
  }

  async function reminderState(userId) {
    const settings = await get('userService').getReminderSettings(userId);
    const custom = Array.isArray(settings.reminder_hours);
    return {
      reminders: {
        enabled: !!settings.reminder_enabled,
        hours: (custom ? [...settings.reminder_hours] : [...DEFAULT_REMINDER_HOURS]).sort((a, b) => a - b),
        custom,
        max: MAX_REMINDER_HOURS
      },
      dailySummary: { enabled: !!settings.daily_summary_enabled, hour: summaryHour(settings.daily_summary_hour) },
      weeklyInsight: !!settings.weekly_insight_enabled
    };
  }

  router.get('/settings', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const localization = get('localizationService');
    const [reminders, dailyPlan, quizInvites, roast] = await Promise.all([
      reminderState(req.userId),
      get('dailyPlanService').getSettings(req.userId),
      get('quizService').getInvitesEnabled(req.userId),
      roastState(ctx)
    ]);
    res.json({
      language: ctx.lang,
      languages: localization.getSupportedLanguages(),
      currency: ctx.currency,
      timezone: ctx.timezone,
      timezoneLabel: getTimezoneDisplayName(ctx.timezone),
      startDay: ctx.startDay,
      ...reminders,
      dailyPlan: { enabled: !!dailyPlan.enabled, hour: dailyPlan.hour, hours: DAILY_PLAN.HOURS },
      quizInvites: !!quizInvites,
      roast
    });
  }));

  // Язык; чат получает reply-клавиатуру на новом языке, как после выбора языка в боте. Каждая смена — сообщение
  // в чат: лимит 'settings' (10 в минуту)
  router.put('/settings/language', http.wrap(async (req, res) => {
    const localization = get('localizationService');
    const language = req.body.language;
    if (!localization.isLanguageSupported(language)) throw http.badRequest('bad_language');
    http.rateLimit(get, req.userId, 'settings');
    await get('userService').setUserLanguage(req.userId, language);
    await refreshChatKeyboard(get, req.userId, language, localization.getText(language, 'keyboard_updated'));
    res.json({ language });
  }));

  router.put('/settings/currency', http.wrap(async (req, res) => {
    const currency = String(req.body.currency || '');
    if (!get('enhancedValidator').validateCurrency(currency).isValid) throw http.badRequest('bad_currency');
    await get('userService').setUserCurrency(req.userId, currency);
    res.json({ currency });
  }));

  // Пояс — как в боте: пользователь выбирает, сколько у него сейчас времени; сохраняется фиксированный пояс без
  // летнего времени (utils/timezoneCalculator). half — минуты со сдвигом на полчаса (Индия, Иран…)
  router.put('/settings/timezone', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const hour = http.int(req.body.hour, { min: 0, max: 23, code: 'bad_time' });
    const minute = http.int(req.body.minute, { min: 0, max: 59, code: 'bad_time' });
    const timezone = calculateTimezoneFromUserTime(hour, minute, new Date(), { language: ctx.lang, half: req.body.half === true });
    await get('userService').setUserTimezone(req.userId, timezone);
    res.json({ timezone, timezoneLabel: getTimezoneDisplayName(timezone) });
  }));

  router.put('/settings/period-start', http.wrap(async (req, res) => {
    const day = http.int(req.body.day, { min: 1, max: 31, code: 'bad_day' });
    await get('userService').setUserPeriodStartDay(req.userId, day);
    res.json({ startDay: day });
  }));

  // Напоминания: вкл/выкл и до трёх часов; hours: null — часы по умолчанию (как «Сбросить» в боте)
  router.put('/settings/reminders', http.wrap(async (req, res) => {
    const userService = get('userService');
    const { enabled, hours } = req.body;
    if (enabled !== undefined) await userService.setReminderEnabled(req.userId, bool(enabled, http));
    if (hours !== undefined) {
      if (hours === null) {
        await userService.setReminderHours(req.userId, null);
      } else {
        if (!Array.isArray(hours)) throw http.badRequest('bad_hours');
        const list = [...new Set(hours.map(h => http.int(h, { min: 0, max: 23, code: 'bad_hours' })))].sort((a, b) => a - b);
        if (list.length > MAX_REMINDER_HOURS) throw http.badRequest('reminder_hours_limit');
        await userService.setReminderHours(req.userId, list);
      }
    }
    res.json(await reminderState(req.userId));
  }));

  // Ежедневная сводка: выбор часа её включает (как в боте)
  router.put('/settings/daily-summary', http.wrap(async (req, res) => {
    const userService = get('userService');
    if (req.body.hour !== undefined) {
      await userService.setDailySummaryHour(req.userId, http.int(req.body.hour, { min: 0, max: 23, code: 'bad_hour' }));
    } else {
      await userService.setDailySummaryEnabled(req.userId, bool(req.body.enabled, http));
    }
    res.json(await reminderState(req.userId));
  }));

  router.put('/settings/weekly-insight', http.wrap(async (req, res) => {
    await get('userService').setWeeklyInsightEnabled(req.userId, bool(req.body.enabled, http));
    res.json(await reminderState(req.userId));
  }));

  // «Показать сейчас»: текст сводки недели (работает и при выключенной); нет трат за 4 недели — text: null
  router.get('/settings/weekly-insight', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const insight = await get('weeklyInsightService').buildInsight(req.userId, ctx.lang);
    res.json({ text: insight ? insight.text : null });
  }));

  // «☀️ План на день»: вкл/выкл и утренний час (DAILY_PLAN.HOURS)
  router.put('/settings/daily-plan', http.wrap(async (req, res) => {
    const dailyPlan = get('dailyPlanService');
    if (req.body.enabled !== undefined) await dailyPlan.setEnabled(req.userId, bool(req.body.enabled, http));
    if (req.body.hour !== undefined) {
      const hour = http.int(req.body.hour, { min: 0, max: 23, code: 'bad_hour' });
      if (!(await dailyPlan.setHour(req.userId, hour))) throw http.badRequest('bad_hour');
    }
    const settings = await dailyPlan.getSettings(req.userId);
    res.json({ enabled: !!settings.enabled, hour: settings.hour, hours: DAILY_PLAN.HOURS });
  }));

  router.put('/settings/quiz-invites', http.wrap(async (req, res) => {
    const enabled = bool(req.body.enabled, http);
    await get('quizService').setInvitesEnabled(req.userId, enabled);
    res.json({ quizInvites: enabled });
  }));

  // «😈 Злой режим» — правила RoastHandlers.applyLevel: не «выкл» — сначала обращение (gender), «без цензуры» — только
  // ru/en, с правом на него (иначе 402) и разовым подтверждением 18+ (adult: true). Только что включили — пример подколки
  router.put('/settings/roast', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const roastService = get('roastService');
    const { gender, adult } = req.body;
    let { level } = req.body;
    if (gender !== undefined) {
      if (!GENDERS.includes(gender)) throw http.badRequest('bad_gender');
      await roastService.setGender(req.userId, gender);
    }
    let sample = null;
    if (level !== undefined) {
      if (!LEVELS.includes(level)) throw http.badRequest('bad_level');
      if (level === 'savage' && !SAVAGE_LANGUAGES.includes(ctx.lang)) level = 'spicy';
      const settings = await roastService.getSettings(req.userId);
      if (level !== 'off') {
        if (!settings.gender) throw http.badRequest('roast_gender_required');
        if (level === 'savage') {
          if (!(await roastService.savageAllowed(req.userId))) throw http.premiumRequired('roast_savage');
          if (!settings.adultConfirmed) {
            if (adult !== true) throw http.badRequest('roast_adult_required');
            await roastService.confirmAdult(req.userId);
          }
        }
      }
      await roastService.setLevel(req.userId, level);
      if (level !== 'off' && level !== settings.level) {
        const line = roastService.sampleLine(ctx.lang, level, settings.gender, ctx.currency);
        // Пример — Markdown для чата: в приложении без экранирования
        sample = line ? line.replace(/\\([_*`[\]])/g, '$1') : null;
      }
    }
    res.json({ ...(await roastState(ctx)), sample });
  }));

  // Справка: поддержка и документы для платежей Telegram (/paysupport, /terms, /privacy, /refund) — из .env
  router.get('/help', http.wrap(async (req, res) => {
    const value = (v) => (v && v !== '-' ? v : null);
    res.json({
      supportUsername: value(PAY_SUPPORT.supportUsername),
      supportEmail: value(PAY_SUPPORT.supportEmail),
      termsUrl: value(PAY_SUPPORT.termsUrl),
      privacyUrl: value(PAY_SUPPORT.privacyUrl),
      refundUrl: value(PAY_SUPPORT.refundPolicyUrl)
    });
  }));

  // Сообщить об ошибке / идея: те же проверки, что у бота (AdminService.submitBugReport)
  router.post('/bug-reports', http.wrap(async (req, res) => {
    const text = typeof req.body.text === 'string' ? req.body.text : '';
    const result = await get('adminService').submitBugReport(req.userId, text);
    if (!result.ok) throw http.badRequest(`bug_report_${result.error}`, result.excess ? { excess: result.excess } : null);
    res.status(201).json({ ok: true });
  }));
};
