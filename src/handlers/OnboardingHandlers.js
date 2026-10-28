const respond = require('../utils/respond');
const logger = require('../utils/logger');
const rules = require('../utils/onboarding');
const { SAVAGE_LANGUAGES } = require('../utils/roast');
const { generateCurrencyKeyboard, generateTimeKeyboard, DEFAULT_REMINDER_HOURS } = require('../utils/constants');
const { getTimezoneDisplayName } = require('../utils/timezoneCalculator');
const BudgetHandlers = require('./BudgetHandlers');

const BUDGET_STATE = 'onb_budget';
const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;
const mark = (on, text) => `${on ? '✅' : '☐'} ${text}`;
const pick = (on, text) => `${on ? '✅ ' : ''}${text}`;
// «📅 Сводка дня» → «Сводка дня»: подписи кнопок без эмодзи, чтобы перечислить их в одной строке
const plain = (text) => text.replace(/^[^\p{L}\p{N}]+/u, '');

// «🧭 Настроим бота под тебя»: экран на вопрос, одно сообщение редактируется от вопроса к вопросу.
// callback_data: onb|<шаг>|t|<код> — отметка в вопросе с выбором, onb|<шаг>|n — «Дальше», onb|<шаг>|s — «Пропустить»,
// onb|x — «Пропустить всё», onb|o|<шаг> — открыть шаг («Назад»), onb|p|a|<число> / onb|p|d — день зарплаты,
// onb|r|a|<e|me|no> — напоминания. Валюта и часовой пояс — существующие кнопки с `|ob` (set_currency, time),
// злой режим — существующие rstl/rstg/rsty с источником `o`. Ход опроса — в БД, поэтому старые кнопки и
// рестарт процесса продолжают с нужного места, а кнопки законченного опроса отвечают «уже закончена».
class OnboardingHandlers {
  constructor({ onboardingService, userService, roastService = null, roastHandlers = null, commandHandlers, localizationService, formatter, stateService, validator, premiumService, referralService = null, voiceService = null, receiptService = null }) {
    this.onboardingService = onboardingService;
    this.userService = userService;
    this.roastService = roastService;
    this.roastHandlers = roastHandlers;
    this.commandHandlers = commandHandlers;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.validator = validator;
    this.premiumService = premiumService;
    this.referralService = referralService;
    this.voiceService = voiceService;
    this.receiptService = receiptService;
    // Выбор уровня злого режима из опроса возвращается сюда (rstl|…|o, rstgs|…|o, rsty|o)
    if (roastHandlers) {
      roastHandlers.registerOrigin('o', { back: 'onb|o|m', show: (ctx, notice) => this.afterRoast(ctx, notice) });
    }
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  async lang(ctx) {
    return this.userService.getUserLanguage(ctx.from.id);
  }

  inputOptions() {
    return rules.inputOptions({
      voice: !!(this.voiceService && this.voiceService.configured),
      receipt: !!(this.receiptService && this.receiptService.configured)
    });
  }

  // ===== Вход =====

  // /start: незаконченный опрос продолжается с текущего вопроса, иначе — обычный /start
  async start(ctx) {
    const draft = await this.onboardingService.getActive(ctx.from.id).catch((error) => {
      logger.error('Failed to load onboarding', { userId: ctx.from.id, error: error.message });
      return null;
    });
    // Опрос, застрявший на вопросе о времени после «Пропустить всё» (так было в прошлой версии), — закончить
    if (draft && draft.lastCall) return this.finish(ctx, draft, 'skipped');
    if (draft) return this.show(ctx, draft, draft.step, { fresh: true });
    return this.commandHandlers.start(ctx);
  }

  // /setup и ⚙️ Настройки → «🧭 Настроить под себя»: новый проход (незаконченный — продолжить)
  async setup(ctx) {
    const userId = ctx.from.id;
    const state = await this.onboardingService.getState(userId);
    if (!state.exists) return this.commandHandlers.start(ctx);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const active = rules.isActive(state.answers) ? state.answers : null;
    const draft = active || await this.onboardingService.begin(userId, 'setup');
    return this.show(ctx, draft, draft.step);
  }

  // Новый пользователь выбрал язык (set_language|<код>|ob): первый вопрос. Вернулся к языку «Назад» — тот же опрос
  async beginNew(ctx, language) {
    const userId = ctx.from.id;
    const state = await this.onboardingService.getState(userId);
    let draft = rules.isActive(state.answers) ? state.answers : null;
    if (draft) {
      draft = await this.onboardingService.changeLanguage(userId, draft, language);
    } else if (state.completedAt) {
      // Кнопка языка из старого онбординга у того, кто уже настроил бота: язык сохранён, опрос не начинаем.
      // Клавиатура внизу — на новом языке (старые подписи кнопок уже не распознаются)
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
      return ctx.reply(this.t(language, 'language_set'), { reply_markup: await this.commandHandlers.mainKeyboardMarkup(userId, language) });
    } else {
      draft = await this.onboardingService.begin(userId, 'new', { language });
    }
    return this.show(ctx, draft, 'g');
  }

  // Черновик для кнопок валюты/пояса с `|ob`: незаконченный опрос или (кнопки онбординга до опроса) новый
  async draftForLegacyStep(userId) {
    const state = await this.onboardingService.getState(userId);
    if (rules.isActive(state.answers)) return state.answers;
    if (state.exists && !state.completedAt && !state.answers) {
      const language = await this.userService.getUserLanguage(userId);
      return this.onboardingService.begin(userId, 'new', { language });
    }
    return null;
  }

  // set_currency|<код>|ob
  async answerCurrency(ctx, currency) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const draft = await this.draftForLegacyStep(userId);
    if (!draft) {
      // Опрос закончен: выбор всё равно сохраняем — пользователь явно нажал валюту
      await this.userService.setUserCurrency(userId, currency);
      return this.stale(ctx, lang, this.t(lang, 'currency_set', { currency }));
    }
    await ctx.answerCbQuery(this.t(lang, 'currency_set', { currency })).catch(() => {});
    const updated = await this.onboardingService.answerCurrency(userId, draft, currency);
    return this.showStep(ctx, updated, rules.nextStep(updated, 'c'));
  }

  // time|<ч>|<м>|ob — пояс уже сохранён и подтверждён (CallbackHandlers.handleTimezoneSelection)
  async afterTimezone(ctx, timezone) {
    const userId = ctx.from.id;
    const draft = await this.draftForLegacyStep(userId);
    if (!draft) {
      // Необязательный вопрос о времени после конца опроса: включаем напоминание и пишем, что настроено
      const { answers: finished } = await this.onboardingService.getState(userId);
      if (finished && finished.lastCall) {
        await this.onboardingService.answerTimezoneLater(userId, finished, timezone);
        return respond(ctx, await this.timezoneSavedText(userId, await this.lang(ctx), timezone), { parse_mode: 'Markdown' });
      }
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
      return;
    }
    const updated = await this.onboardingService.answerTimezone(userId, draft, timezone);
    // Вопрос о времени после «Пропустить всё» в прошлой версии был последним
    if (updated.lastCall) return this.finish(ctx, updated, 'skipped');
    return this.showStep(ctx, updated, rules.nextStep(updated, 'z'));
  }

  // «🕐 Часовой пояс: …» и что теперь с напоминаниями — ответ на необязательный вопрос о времени
  async timezoneSavedText(userId, lang, timezone) {
    const settings = await this.userService.getReminderSettings(userId);
    const hours = Array.isArray(settings.reminder_hours) ? settings.reminder_hours : DEFAULT_REMINDER_HOURS;
    return [
      this.t(lang, 'onb_done_timezone', { timezone: this.formatter.escapeMarkdown(getTimezoneDisplayName(timezone)) }),
      settings.reminder_enabled && hours.length
        ? this.t(lang, 'onb_done_reminders', { hours: hours.map(hourLabel).join(', ') })
        : this.t(lang, 'onb_done_reminders_off')
    ].join('\n');
  }

  // Необязательный вопрос о времени отдельным сообщением после конца опроса: кнопки time|…|ob и tzh|…|ob работают
  // и потом. edit — переключатель минут (tzh) редактирует то же сообщение
  async sendTimezoneQuestion(ctx, lang, { half, edit = false } = {}) {
    const keyboard = generateTimeKeyboard(this.localizationService, lang, { onboarding: true, half });
    keyboard.pop(); // «Назад» к валюте — опрос уже закончен
    const current = await this.userService.getUserTimezone(ctx.from.id);
    const text = this.t(lang, 'onb_q_timezone_last', { timezone: this.formatter.escapeMarkdown(getTimezoneDisplayName(current || 'UTC')) });
    const extra = { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } };
    if (edit) return respond(ctx, text, extra);
    return ctx.reply(text, extra);
  }

  // tzh|<0|1>|ob — те же кнопки времени с минутами, сдвинутыми на полчаса (Индия, Иран…), и обратно
  async showTimezone(ctx, half) {
    const userId = ctx.from.id;
    const draft = await this.onboardingService.getActive(userId);
    if (!draft || draft.step !== 'z') {
      const { answers: finished } = await this.onboardingService.getState(userId);
      if (!(finished && finished.lastCall)) return this.stale(ctx, await this.lang(ctx));
      await ctx.answerCbQuery().catch(() => {});
      return this.sendTimezoneQuestion(ctx, await this.lang(ctx), { half, edit: true });
    }
    await ctx.answerCbQuery().catch(() => {});
    return this.show(ctx, draft, 'z', { half });
  }

  // ob_currency — «Назад» с клавиатуры часового пояса
  async openCurrency(ctx) {
    const draft = await this.onboardingService.getActive(ctx.from.id);
    if (!draft) return this.stale(ctx, await this.lang(ctx));
    await ctx.answerCbQuery().catch(() => {});
    const updated = await this.onboardingService.open(ctx.from.id, draft, 'c');
    return this.show(ctx, updated, 'c');
  }

  // ===== Кнопки опроса =====

  async handle(ctx) {
    const userId = ctx.from.id;
    const [, step, action = '', value = ''] = ctx.callbackQuery.data.split('|');
    const draft = await this.onboardingService.getActive(userId);
    const lang = await this.lang(ctx);
    if (!draft) return this.stale(ctx, lang);

    if (step === 'x') {
      await ctx.answerCbQuery().catch(() => {});
      // Опрос заканчивается сразу (с главной клавиатурой); вопрос о времени, если его не было, — отдельным
      // необязательным сообщением (finish)
      return this.finish(ctx, draft, 'skipped');
    }
    if (step === 'o') {
      await ctx.answerCbQuery().catch(() => {});
      const updated = await this.onboardingService.open(userId, draft, action);
      return this.show(ctx, updated, rules.steps(updated).includes(action) ? action : updated.step);
    }
    if (!rules.steps(draft).includes(step)) {
      // Кнопка шага, которого в этом проходе нет (например, бюджет после снятия цели) — текущий вопрос
      await ctx.answerCbQuery().catch(() => {});
      return this.show(ctx, draft, draft.step);
    }
    if (action === 's') {
      if (draft.lastCall) {
        await ctx.answerCbQuery().catch(() => {});
        return this.finish(ctx, draft, 'skipped');
      }
      await ctx.answerCbQuery().catch(() => {});
      const { draft: updated, next } = await this.onboardingService.skip(userId, draft, step);
      return this.showStep(ctx, updated, next);
    }

    await ctx.answerCbQuery().catch(() => {});
    const service = this.onboardingService;
    let updated = draft;
    switch (`${step}|${action}`) {
      case 'g|t':
        updated = await service.toggle(userId, draft, 'goals', value, rules.GOALS);
        return this.show(ctx, updated, 'g');
      case 'g|n':
        updated = await service.confirmGoals(userId, draft);
        return this.showStep(ctx, updated, rules.nextStep(updated, 'g'));
      case 'i|t':
        updated = await service.toggle(userId, draft, 'inputs', value, this.inputOptions());
        return this.show(ctx, updated, 'i');
      case 'i|n':
        updated = await service.confirmInputs(userId, draft);
        return this.showStep(ctx, updated, rules.nextStep(updated, 'i'));
      case 'n|t':
        await service.notifySelection(userId, draft);
        updated = await service.toggle(userId, draft, 'notify', value, service.notifyOptions());
        return this.show(ctx, updated, 'n');
      case 'n|n':
        await service.notifySelection(userId, draft);
        updated = await service.confirmNotify(userId, draft);
        return this.showStep(ctx, updated, rules.nextStep(updated, 'n'));
      case 'p|d':
        return this.showPaydayGrid(ctx, draft, lang);
      case 'p|a':
        if (rules.paydayToPeriodDay(value) === null) return this.show(ctx, draft, 'p');
        updated = await service.answerPayday(userId, draft, value);
        return this.showStep(ctx, updated, rules.nextStep(updated, 'p'));
      case 'r|a':
        if (!rules.reminderPlan(value)) return this.show(ctx, draft, 'r');
        updated = await service.answerReminders(userId, draft, value);
        return this.showStep(ctx, updated, rules.nextStep(updated, 'r'));
      default:
        return this.show(ctx, draft, step);
    }
  }

  // Ответ злого режима сохранён (RoastHandlers.applyLevel → источник `o`): это последний вопрос
  async afterRoast(ctx, notice) {
    if (ctx.callbackQuery) await ctx.answerCbQuery(notice || undefined).catch(() => {});
    const userId = ctx.from.id;
    const draft = await this.onboardingService.getActive(userId);
    if (!draft) {
      // Старые кнопки злого режима из законченного опроса: уровень сохранён, показываем его экран
      return this.roastHandlers.showSettings(ctx);
    }
    const { level } = await this.roastService.getSettings(userId);
    const updated = await this.onboardingService.answerRoast(userId, draft, level);
    return this.showStep(ctx, updated, rules.nextStep(updated, 'm'));
  }

  // Ввод суммы бюджета. true — сообщение обработано; false — это не сумма, а например трата «250 кофе»:
  // она записывается как обычно, вопрос о бюджете ждёт дальше
  async handleBudgetInput(ctx, text, lang) {
    const userId = ctx.from.id;
    const draft = await this.onboardingService.getActive(userId);
    if (!draft || draft.step !== 'b') {
      this.stateService.deleteUserState(userId);
      return false;
    }
    const parsed = this.validator.parseMoneyInput(text, { maxAmount: BudgetHandlers.MAX_BUDGET_AMOUNT, maxDescriptionLength: 80, requireDescription: false });
    if (parsed.isValid && !parsed.description) {
      const currency = parsed.currency || await this.userService.getUserCurrency(userId);
      this.stateService.deleteUserState(userId);
      const updated = await this.onboardingService.answerBudget(userId, draft, parsed.amount, currency);
      await this.showStep(ctx, updated, rules.nextStep(updated, 'b'));
      return true;
    }
    const hasDigits = /\d/.test(text);
    // Трата вроде «250 кофе» и вопрос боту «? …» обрабатываются как обычно, вопрос о бюджете ждёт дальше
    if (text.trim().startsWith('?')) return false;
    if (hasDigits && /\p{L}/u.test(text) && !/^\s*[\d\s.,]+\s*[A-Za-z]{3}\s*$/.test(text)) return false;
    const currency = await this.userService.getUserCurrency(userId);
    const tooBig = hasDigits && Number(text.replace(/[^\d.,]/g, '').replace(',', '.')) > BudgetHandlers.MAX_BUDGET_AMOUNT;
    let reply = this.t(lang, 'onb_budget_invalid');
    if (tooBig) reply = this.t(lang, 'onb_budget_too_big', { max: this.formatter.formatAmount(BudgetHandlers.MAX_BUDGET_AMOUNT, currency) });
    else if (!hasDigits) reply = this.t(lang, 'onb_budget_need_number', { example: `30000 ${currency}` });
    await ctx.reply(reply, { parse_mode: 'Markdown' });
    return true;
  }

  // ===== Экраны =====

  // Следующий шаг или (вопросы кончились) итоговый экран
  async showStep(ctx, draft, step) {
    if (!step) return this.finish(ctx, draft, 'completed');
    return this.show(ctx, draft, step);
  }

  async show(ctx, draft, step, { fresh = false, half } = {}) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const screen = await this.screen(ctx, draft, step, lang, { half });
    if (step === 'b') this.stateService.setUserState(userId, BUDGET_STATE);
    else if (this.stateService.getUserState(userId) === BUDGET_STATE) this.stateService.deleteUserState(userId);
    await this.send(ctx, draft, screen.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: screen.keyboard } }, { fresh });
  }

  // Из кнопки — редактируем то же сообщение; из текста/команды — новое сообщение, у прошлого убираем кнопки
  async send(ctx, draft, text, extra, { fresh = false } = {}) {
    const message = ctx.callbackQuery && ctx.callbackQuery.message;
    let messageId = null;
    if (message && !fresh) {
      try {
        await ctx.editMessageText(text, extra);
        messageId = message.message_id;
      } catch (error) {
        const description = String(error.description || (error.response && error.response.description) || error.message);
        if (description.includes('message is not modified')) messageId = message.message_id;
      }
    }
    if (!messageId) {
      const sent = await ctx.reply(text, extra);
      messageId = sent && sent.message_id;
      if (draft.mid && draft.mid !== messageId && ctx.chat) {
        await ctx.telegram.editMessageReplyMarkup(ctx.chat.id, draft.mid, undefined, { inline_keyboard: [] }).catch(() => {});
      }
    }
    if (messageId && draft.mid !== messageId && draft.status === 'active') {
      draft.mid = messageId;
      await this.onboardingService.save(ctx.from.id, draft);
    }
  }

  header(lang, draft, step) {
    const { n, total } = rules.progress(draft, step);
    return this.t(lang, 'onb_header', { n, total });
  }

  // [Пропустить] [Пропустить всё] и «Назад» к предыдущему вопросу (с первого — к языку или в Настройки)
  controls(lang, draft, step) {
    const prev = rules.prevStep(draft, step);
    const back = prev ? `onb|o|${prev}` : (draft.mode === 'new' ? 'ob_language' : 'settings');
    return [
      [{ text: this.t(lang, 'onb_button_skip'), callback_data: `onb|${step}|s` }, { text: this.t(lang, 'onb_button_skip_all'), callback_data: 'onb|x' }],
      [{ text: this.t(lang, 'button_back'), callback_data: back }]
    ];
  }

  async screen(ctx, draft, step, lang, { half } = {}) {
    const userId = ctx.from.id;
    const head = this.header(lang, draft, step);
    const t = (key, params) => this.t(lang, key, params);
    const controls = this.controls(lang, draft, step);
    const next = (code) => [{ text: t('onb_button_next'), callback_data: `onb|${code}|n` }];
    const body = (question) => ({ text: `${head}\n\n${question}` });

    switch (step) {
      case 'g': {
        const rows = rules.GOALS.map((code) => [{ text: mark(draft.goals.includes(code), t(`onb_goal_${code}`)), callback_data: `onb|g|t|${code}` }]);
        return { text: `${head}\n\n${t('onb_intro')}\n\n${t('onb_q_goals')}`, keyboard: [...rows, next('g'), ...controls] };
      }
      case 'c': {
        const current = await this.userService.getUserCurrency(userId);
        const keyboard = generateCurrencyKeyboard(this.localizationService, lang, 'set_currency', controls[1][0].callback_data, '|ob');
        keyboard.pop(); // своя «Назад» — в controls
        const marked = keyboard.map((row) => row.map((b) => (b.callback_data === `set_currency|${current}|ob` ? { ...b, text: `✅ ${b.text}` } : b)));
        return { ...body(t('onb_q_currency')), keyboard: [...marked, ...controls] };
      }
      case 'z': {
        const keyboard = generateTimeKeyboard(this.localizationService, lang, { onboarding: true, half });
        keyboard.pop(); // «Назад» (ob_currency) — в controls
        return { ...body(t('onb_q_timezone')), keyboard: [...keyboard, ...controls] };
      }
      case 'p': {
        const chosen = draft.answers.payday;
        const day = (d) => ({ text: pick(chosen === d, String(d)), callback_data: `onb|p|a|${d}` });
        return {
          ...body(t('onb_q_payday')),
          keyboard: [
            rules.PAYDAYS.slice(0, 3).map(day),
            rules.PAYDAYS.slice(3).map(day),
            [{ text: t('onb_payday_other'), callback_data: 'onb|p|d' }, { text: pick(chosen === 0, t('onb_payday_irregular')), callback_data: 'onb|p|a|0' }],
            ...controls
          ]
        };
      }
      case 'b': {
        const currency = await this.userService.getUserCurrency(userId);
        let text = `${head}\n\n${t('onb_q_budget', { example: `30000 ${currency}`, other: currency === 'USD' ? 'EUR' : 'USD' })}`;
        const trialUntil = await this.trialUntil(userId);
        if (trialUntil) text += `\n\n${t('onb_budget_trial', { date: trialUntil })}`;
        return { text, keyboard: controls };
      }
      case 'i': {
        const rows = this.inputOptions().map((code) => [{ text: mark(draft.inputs.includes(code), t(`onb_input_${code}`)), callback_data: `onb|i|t|${code}` }]);
        return { ...body(t('onb_q_input')), keyboard: [...rows, next('i'), ...controls] };
      }
      case 'r': {
        const chosen = draft.answers.reminders;
        const rows = [['e', 'onb_rem_evening'], ['me', 'onb_rem_both'], ['no', 'onb_rem_off']]
          .map(([code, key]) => [{ text: pick(chosen === code, t(key)), callback_data: `onb|r|a|${code}` }]);
        return { ...body(t('onb_q_reminders')), keyboard: [...rows, ...controls] };
      }
      case 'n': {
        const selected = await this.onboardingService.notifySelection(userId, draft);
        const rows = this.onboardingService.notifyOptions()
          .map((code) => [{ text: mark(selected.includes(code), t(`onb_notify_${code}`)), callback_data: `onb|n|t|${code}` }]);
        return { ...body(t('onb_q_notify')), keyboard: [...rows, next('n'), ...controls] };
      }
      case 'm': {
        const current = this.roastService ? (await this.roastService.getSettings(userId)).level : 'off';
        // «Без цензуры» — только на ru и en; на других языках вопрос только про ехидный
        const savage = SAVAGE_LANGUAGES.includes(lang);
        const levels = rules.ROAST_LEVELS.filter((level) => savage || level !== 'savage');
        const marked = !savage && current === 'savage' ? 'spicy' : current;
        const rows = levels.map((level) => [{ text: pick(marked === level, t(`onb_roast_${level}`)), callback_data: `rstl|${level}|o` }]);
        return { ...body(t(savage ? 'onb_q_roast' : 'onb_q_roast_spicy_only')), keyboard: [...rows, ...controls] };
      }
      default:
        throw new Error(`Unknown onboarding step: ${step}`);
    }
  }

  // «Другое число»: сетка 1–31, «Назад» — к вопросу о зарплате
  async showPaydayGrid(ctx, draft, lang) {
    const keyboard = [];
    for (let start = 1; start <= 31; start += 7) {
      const row = [];
      for (let d = start; d < start + 7 && d <= 31; d++) {
        row.push({ text: pick(draft.answers.payday === d, String(d)), callback_data: `onb|p|a|${d}` });
      }
      keyboard.push(row);
    }
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: 'onb|o|p' }]);
    await this.send(ctx, draft, `${this.header(lang, draft, 'p')}\n\n${this.t(lang, 'onb_q_payday_other')}`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Дата конца пробного периода (ДД.ММ.ГГГГ), если премиум сейчас пробный
  async trialUntil(userId) {
    if (!this.referralService) return null;
    const source = await this.referralService.getPremiumSource(userId).catch(() => null);
    if (source !== 'trial') return null;
    const status = await this.userService.getPremiumStatus(userId);
    if (!status.isPremium || !status.expiresAt) return null;
    const date = new Date(status.expiresAt);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  }

  // Кнопка законченного опроса: alert и кнопки убираем
  async stale(ctx, lang, notice = null) {
    await ctx.answerCbQuery(notice || this.t(lang, 'onb_stale'), { show_alert: !notice }).catch(() => {});
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
  }

  // ===== Итог =====

  async finish(ctx, draft, status) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    if (this.stateService.getUserState(userId) === BUDGET_STATE) this.stateService.deleteUserState(userId);
    // Новый пользователь без своего времени: после итога — необязательный вопрос о времени (lastCall)
    const askTime = draft.mode === 'new' && !draft.answers.timezone;
    if (askTime) draft.lastCall = true;
    const finished = await this.onboardingService.finish(userId, draft, status, { language: lang });
    // Уже записывал траты (повторный проход или трата посреди опроса) — без «первой траты»
    const recorded = await this.onboardingService.hasRecorded(userId);
    const roastSample = await this.roastSample(userId, lang, finished);
    const { text, keyboard } = this.doneScreen(lang, finished, { recorded, roastSample });
    await this.send(ctx, finished, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });

    // Главная клавиатура — отдельным сообщением (у сообщения одна клавиатура: inline или reply)
    let note = this.t(lang, recorded ? 'onb_keyboard_note_short' : 'onb_keyboard_note');
    if (finished.mode === 'new' && this.referralService && await this.referralService.getPendingInviter(userId).catch(() => null)) {
      note += `\n\n${this.t(lang, 'referral_welcome_note', {
        expenses: this.referralService.config.ACTIVATION_EXPENSES,
        activeDays: this.referralService.config.ACTIVATION_DAYS,
        days: this.referralService.rewardDays
      })}`;
    }
    await ctx.reply(note, { parse_mode: 'Markdown', reply_markup: await this.commandHandlers.mainKeyboardMarkup(userId, lang) });
    if (askTime) await this.sendTimezoneQuestion(ctx, lang);
  }

  // Злой режим включён в опросе — пример подколки, чтобы было понятно, чего ждать (молчит он до первого повода)
  async roastSample(userId, lang, draft) {
    const level = draft.answers && draft.answers.roast;
    if (!this.roastService || !level || level === 'off') return null;
    try {
      const [settings, currency] = await Promise.all([this.roastService.getSettings(userId), this.userService.getUserCurrency(userId)]);
      return this.roastService.sampleLine(lang, level, settings.gender, currency);
    } catch (error) {
      logger.warn('Roast sample failed', { userId, error: error.message });
      return null;
    }
  }

  // Только то, что опрос действительно поменял (у нового пользователя — всегда пояс и напоминания: они стоят и без
  // ответа), первый шаг и кнопки к разделам по целям
  doneScreen(lang, draft, { recorded = false, roastSample = null } = {}) {
    const t = (key, params) => this.t(lang, key, params);
    const a = draft.answers || {};
    const isNew = draft.mode === 'new';
    const zone = (timezone) => this.formatter.escapeMarkdown(getTimezoneDisplayName(timezone));
    const configured = [];
    if (a.currency) configured.push(t('onb_done_currency', { currency: a.currency }));
    if (a.timezone) configured.push(t('onb_done_timezone', { timezone: zone(a.timezone) }));
    else if (isNew) configured.push(a.timezoneAuto ? t('onb_done_timezone_guess', { timezone: zone(a.timezoneAuto) }) : t('onb_done_timezone_unknown'));
    if (a.periodDay) configured.push(t('onb_done_period', { day: a.periodDay }));
    if (a.budget) configured.push(t('onb_done_budget', { amount: this.formatter.formatAmount(a.budget.amount, a.budget.currency) }));
    if (a.reminders) {
      const plan = rules.reminderPlan(a.reminders);
      configured.push(plan && plan.enabled ? t('onb_done_reminders', { hours: plan.hours.map(hourLabel).join(', ') }) : t('onb_done_reminders_off'));
    } else if (isNew) {
      // Без ответа (onboardingService.defaultSchedule): одно вечером, если пояс известен, иначе выключены
      const plan = rules.reminderPlan(rules.DEFAULT_REMINDERS);
      configured.push(a.timezone || a.timezoneAuto
        ? t('onb_done_reminders', { hours: plan.hours.map(hourLabel).join(', ') })
        : t('onb_done_reminders_auto_off'));
    }
    if (a.notify) {
      const on = rules.NOTIFY.filter((code) => a.notify[code]);
      configured.push(on.length ? t('onb_done_notify', { list: on.map((code) => plain(t(`onb_notify_${code}`))).join(', ') }) : t('onb_done_notify_none'));
    }
    if (a.roast) configured.push(t('onb_done_roast', { level: t(`roast_level_${a.roast}`) }));
    if (roastSample) configured.push(t('roast_enabled_sample', { sample: roastSample }), t('roast_enabled_when'));

    const lines = [t('onb_done_title'), ''];
    if (configured.length) lines.push(t('onb_done_configured'), ...configured);
    else lines.push(t('onb_done_nothing'));
    lines.push('', t(recorded ? 'onb_done_next_step' : 'onb_done_first_step'));
    const inputs = this.inputOptions().filter((code) => draft.inputs.includes(code));
    if (inputs.includes('voice')) lines.push(t('onb_done_tip_voice'));
    if (inputs.includes('receipt')) lines.push(t('onb_done_tip_receipt'));
    if (inputs.includes('statement')) lines.push(t('onb_done_tip_statement'));

    const actions = rules.finalActions(draft).map((action) => ({ text: t(action.key), callback_data: action.callback }));
    const keyboard = [];
    for (let i = 0; i < actions.length; i += 2) keyboard.push(actions.slice(i, i + 2));
    return { text: lines.join('\n'), keyboard };
  }
}

OnboardingHandlers.BUDGET_STATE = BUDGET_STATE;

module.exports = OnboardingHandlers;
