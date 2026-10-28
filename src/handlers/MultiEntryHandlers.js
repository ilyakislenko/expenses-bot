const respond = require('../utils/respond');
const logger = require('../utils/logger');
const { parseEntries, MAX_ENTRIES } = require('../utils/multiEntry');
const { normalizeSpokenText } = require('../utils/numberWords');
const moneyInputErrorText = require('./moneyInputErrors');
const { keepTyping, MAX_FILE_BYTES } = require('./ReceiptHandlers');
const { MAX_INCOME_AMOUNT } = require('./IncomeHandlers');
const { isQuestion } = require('./AssistantHandlers');

const MAX_VOICE_SECONDS = 60;
const NAME_IN_LIST = 40;
const TRANSCRIPT_IN_MESSAGE = 600;

// Расшифровка голоса → записи: числа словами в цифры, несколько записей без разделителей тоже («кофе 250 такси 400»)
function parseSpoken(transcript) {
  return parseEntries(normalizeSpokenText(transcript), { runs: true });
}

// Одна запись текстом для обычного ввода («250 USD кофе», доход — «+50000 зарплата»). Если описание начинается со
// слова-валюты («250 try …»), валюта указывается явно, чтобы описание не стало валютой
function entryText(entry, currencyToken, defaultCurrency) {
  const currency = entry.currency || (entry.description && currencyToken(entry.description.split(/\s+/)[0]) ? defaultCurrency : null);
  const text = [String(entry.amount), currency, entry.description].filter(Boolean).join(' ');
  return entry.kind === 'income' ? `+${text}` : text;
}

// Несколько записей одним сообщением («кофе 250, такси 400, +50000 зарплата») и голосовые сообщения.
// Записи сразу пишутся партией (EntryBatchService), сводка — номера → обычные карточки (back v.<batchId>),
// «↩️ Отменить всё». Одна запись — обычный ввод (выбор категории и т.д.).
class MultiEntryHandlers {
  constructor({ entryBatchService, voiceService, expenseHandlers, incomeHandlers, expenseService, incomeService, premiumService, userService, localizationService, formatter, validator, achievementService = null, assistantHandlers = null }) {
    this.entryBatchService = entryBatchService;
    this.voiceService = voiceService;
    this.expenseHandlers = expenseHandlers;
    this.incomeHandlers = incomeHandlers;
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.premiumService = premiumService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.validator = validator;
    this.achievementService = achievementService;
    this.assistantHandlers = assistantHandlers;
    this.tasks = new Set(); // фоновые распознавания голоса
    this.busyUsers = new Set(); // у кого сейчас распознаётся голосовое (по одному на пользователя)
    // «⬅️ Назад» на карточке записи (back v.<batchId>) и экран после её удаления
    expenseHandlers.registerBackView('v', (ctx, [batchId]) => this.showBatch(ctx, batchId));
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // Текстовое сообщение: true — это несколько записей и они обработаны; false — обычный ввод
  async handleText(ctx, text, lang) {
    const entries = parseEntries(text);
    if (!entries || entries.length < 2) return false;
    await this.recordEntries(ctx, entries, lang, { source: 'text' });
    return true;
  }

  // Проверка сумм, обрезка описаний по лимиту, запись партией и сводка: новым сообщением или правкой statusId
  async recordEntries(ctx, entries, lang, { source, statusId = null, header = '' }) {
    const userId = ctx.from.id;
    const send = (text, extra = {}) => (statusId ? this.editStatus(ctx, statusId, text, extra) : ctx.reply(text, extra));
    const prefix = header ? `${header}\n\n` : '';

    if (entries.length > MAX_ENTRIES) {
      await send(prefix + this.t(lang, 'multi_too_many', { max: MAX_ENTRIES }), { parse_mode: 'Markdown' });
      return;
    }
    const maxAmount = { expense: this.validator.limits.maxAmount, income: MAX_INCOME_AMOUNT };
    const invalid = entries.find(entry => !(entry.amount >= this.validator.limits.minAmount && entry.amount <= maxAmount[entry.kind]));
    if (invalid) {
      const errorText = invalid.kind === 'income'
        ? await moneyInputErrorText(this, userId, lang, 'amount', 'income', MAX_INCOME_AMOUNT)
        : await this.expenseHandlers.inputErrorText(userId, lang, 'amount');
      await send(prefix + errorText, { parse_mode: 'Markdown' });
      return;
    }

    const limits = await this.premiumService.getUserLimits(userId);
    const prepared = entries.map(entry => ({
      ...entry,
      description: entry.description ? this.validator.sanitizeText(entry.description, limits.MAX_DESCRIPTION_LENGTH) || null : null
    }));
    const familyId = await this.expenseHandlers.familyModeTarget(userId);
    const { batchId, defaulted } = await this.entryBatchService.record(userId, prepared, { source, familyId });
    const { expenses } = await this.entryBatchService.getItems(userId, batchId);
    const categoryNames = [...new Set(expenses.map(expense => expense.category_name).filter(Boolean))];
    const view = await this.buildBatchView(userId, lang, batchId, { header, defaulted });
    const event = source === 'voice' ? 'voice_used' : (expenses.length ? 'expense_added' : 'income_added');
    const broken = [];
    const achievements = await this.achievementNote(userId, event, lang, categoryNames, broken);
    const roast = expenses.length ? await this.expenseHandlers.roastNote(ctx, userId, lang, expenses, { broken, source: 'batch' }) : '';
    const note = [achievements, roast].filter(Boolean).join('\n\n');
    await send(note ? `${view.text}\n\n${note}` : view.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });

    if (categoryNames.length) await this.expenseHandlers.sendBudgetWarnings(ctx, userId, lang, categoryNames);
  }

  // Строка достижений к сводке или голосовому ('' — нечего сказать; track сам не бросает исключений);
  // broken — сюда кладутся сорванные челленджи (повод для злого режима)
  async achievementNote(userId, event, lang, categoryNames = [], broken = null) {
    if (!this.achievementService) return '';
    return this.achievementService.track(userId, event, { lang, categoryNames, broken });
  }

  // Расшифровка голосового — вопрос боту («сколько я потратил на такси?»), если «🤖 Спроси бота» подключён
  isSpokenQuestion(text) {
    return Boolean(this.assistantHandlers) && isQuestion(text);
  }

  amounts(items) {
    const totals = new Map();
    for (const item of items) totals.set(item.currency, (totals.get(item.currency) || 0) + Number(item.amount));
    return [...totals.entries()].map(([currency, total]) => this.formatter.formatAmount(total, currency)).join(' + ');
  }

  // Сводка партии по текущим данным: траты, затем доходы; номера → карточки
  async buildBatchView(userId, lang, batchId, { header = '', defaulted = 0 } = {}) {
    const prefix = header ? `${header}\n\n` : '';
    const batch = await this.entryBatchService.getBatch(userId, batchId);
    if (!batch) return { text: prefix + this.t(lang, 'multi_not_found'), keyboard: [] };
    if (batch.status === 'undone') return { text: prefix + this.t(lang, 'multi_already_undone'), keyboard: [] };
    const { expenses, incomes } = await this.entryBatchService.getItems(userId, batchId);
    if (!expenses.length && !incomes.length) return { text: prefix + this.t(lang, 'multi_all_deleted'), keyboard: [] };

    const lines = [`✅ *${this.t(lang, 'multi_recorded_title', { count: expenses.length + incomes.length })}*`, ''];
    const buttons = [];
    expenses.forEach((expense) => {
      const categoryName = this.formatter.translateCategoryName(expense.category_name || '—', this.localizationService, lang);
      const label = this.formatter.escapeMarkdown(this.formatter.shorten(expense.description || categoryName, NAME_IN_LIST));
      const family = expense.family_id ? ' · 👨‍👩‍👧‍👦' : '';
      lines.push(`${buttons.length + 1}. ${label} — *${this.formatter.formatAmount(Number(expense.amount), expense.currency)}* · ${expense.category_icon || '📦'} ${this.formatter.escapeMarkdown(categoryName)}${family}`);
      buttons.push({ text: String(buttons.length + 1), callback_data: `ex|${expense.id}|v.${batchId}` });
    });
    incomes.forEach((income) => {
      const label = this.formatter.escapeMarkdown(this.formatter.shorten(income.description || this.t(lang, 'multi_income_label'), NAME_IN_LIST));
      lines.push(`${buttons.length + 1}. ${label} — *+${this.formatter.formatAmount(Number(income.amount), income.currency)}* · 💵 ${this.t(lang, 'multi_income_label')}`);
      buttons.push({ text: String(buttons.length + 1), callback_data: `in|${income.id}` });
    });
    if (expenses.length > 1) lines.push('', this.t(lang, 'multi_expenses_total', { total: this.amounts(expenses) }));
    if (defaulted) {
      const fallback = await this.expenseService.getDefaultCategory();
      lines.push('', this.t(lang, 'multi_default_category_hint', {
        category: this.formatter.escapeMarkdown(this.formatter.translateCategoryName(fallback.name, this.localizationService, lang))
      }));
    }
    lines.push('', this.t(lang, 'multi_tap_number'));

    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 5) keyboard.push(buttons.slice(i, i + 5));
    keyboard.push([{ text: this.t(lang, 'button_multi_undo_all'), callback_data: `vcx|${batchId}` }]);
    return { text: prefix + lines.join('\n'), keyboard };
  }

  // vcb|<id> и «⬅️ Назад» с карточки записи партии
  async showBatch(ctx, batchId) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const view = await this.buildBatchView(ctx.from.id, lang, batchId);
    await respond(ctx, view.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
  }

  // vcx|<id> — «↩️ Отменить всё»: удаляет оставшиеся записи партии
  async undo(ctx, batchId) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const result = await this.entryBatchService.undo(userId, batchId);
    if (!result) {
      await ctx.answerCbQuery(this.t(lang, 'multi_already_undone'), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'multi_undone', { count: result.expenses + result.incomes }), { reply_markup: { inline_keyboard: [] } });
  }

  // ---------- Голосовые сообщения ----------

  async editStatus(ctx, messageId, text, extra = {}) {
    try {
      await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, text, extra);
    } catch (error) {
      await ctx.reply(text, extra);
    }
  }

  async download(ctx, fileId) {
    return require('../utils/telegramFile').downloadTelegramFile(ctx.telegram, fileId, { maxBytes: MAX_FILE_BYTES });
  }

  // Голосовое в личном чате: проверки, «🎙 Распознаю голос…», распознавание — в фоне (обработчик апдейта не ждёт)
  async handleVoice(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const voice = ctx.message.voice;
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (!this.voiceService.configured) {
      await ctx.reply(this.t(lang, 'voice_not_configured'), { parse_mode: 'Markdown' });
      return;
    }
    if (voice.duration > MAX_VOICE_SECONDS || voice.file_size > MAX_FILE_BYTES) {
      await ctx.reply(this.t(lang, 'voice_too_long', { max: MAX_VOICE_SECONDS }), { parse_mode: 'Markdown' });
      return;
    }
    if (this.busyUsers.has(userId)) {
      await ctx.reply(this.t(lang, 'voice_busy'));
      return;
    }
    this.busyUsers.add(userId);
    let started = false;
    try {
      const timezone = await this.userService.getUserTimezone(userId);
      const limit = await this.voiceService.checkLimit(userId, timezone);
      if (!limit.remaining) {
        const key = limit.isPremium ? 'voice_limit_premium' : 'voice_limit_regular';
        const keyboard = limit.isPremium ? [] : [[{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]];
        await ctx.reply(this.t(lang, key, { used: limit.used, limit: limit.limit, premium: this.voiceService.premiumLimit }), {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
        return;
      }
      const status = await ctx.reply(this.t(lang, 'voice_recognizing'));
      // Распознавание — секунды или очередь за другими голосовыми: polling не ждёт, при рестарте бота оно теряется
      this.track(userId, this.recognizeVoice(ctx, { fileId: voice.file_id, durationSec: voice.duration, userId, lang, timezone, statusId: status.message_id }));
      started = true;
    } finally {
      if (!started) this.busyUsers.delete(userId);
    }
  }

  track(userId, promise) {
    const task = promise.finally(() => {
      this.busyUsers.delete(userId);
      this.tasks.delete(task);
    });
    this.tasks.add(task);
  }

  // Все фоновые распознавания завершены (для тестов)
  async idle() {
    await Promise.all([...this.tasks]);
  }

  // Фоновая часть: скачать, распознать, показать расшифровку и записать. Ошибки превращаются в текст
  async recognizeVoice(ctx, { fileId, durationSec, userId, lang, timezone, statusId }) {
    const stopTyping = keepTyping(ctx);
    let statusText = this.t(lang, 'voice_recognizing');
    let statusEdits = Promise.resolve();
    const setStatus = (text) => {
      if (text === statusText) return;
      statusText = text;
      statusEdits = statusEdits.then(() => ctx.telegram.editMessageText(ctx.chat.id, statusId, undefined, text)).catch(() => {});
    };
    const onQueued = (position) => setStatus(position ? this.t(lang, 'voice_queued', { position }) : this.t(lang, 'voice_recognizing'));
    try {
      const audio = await this.download(ctx, fileId);
      const transcript = await this.voiceService.transcribe(userId, audio, {
        lang, timezone, durationSec, onQueued, usable: text => Boolean(parseSpoken(text)) || this.isSpokenQuestion(text)
      });
      await statusEdits;
      stopTyping();
      if (!transcript) {
        await this.editStatus(ctx, statusId, this.t(lang, 'voice_empty'));
        return;
      }
      const heard = this.t(lang, 'voice_heard', { text: this.formatter.escapeMarkdown(this.formatter.shorten(transcript, TRANSCRIPT_IN_MESSAGE)) });
      // «Сколько я потратил на такси?» голосом — вопрос боту (whisper ставит «?» в конце вопроса)
      if (this.isSpokenQuestion(transcript)) {
        logger.info('Voice parsed', { userId, question: true });
        await this.editStatus(ctx, statusId, heard, { parse_mode: 'Markdown' });
        await this.assistantHandlers.ask(ctx, transcript, lang);
        return;
      }
      const entries = parseSpoken(transcript);
      logger.info('Voice parsed', { userId, entries: entries ? entries.length : 0 });
      if (!entries) {
        await this.editStatus(ctx, statusId, `${heard}\n\n${this.t(lang, 'voice_no_amount')}`, { parse_mode: 'Markdown' });
        return;
      }
      if (entries.length > 1) {
        await this.recordEntries(ctx, entries, lang, { source: 'voice', statusId, header: heard });
        return;
      }
      // Одна запись — как будто её написали текстом: выбор категории, карточка, ошибки ввода
      const [entry] = entries;
      await this.editStatus(ctx, statusId, heard, { parse_mode: 'Markdown' });
      const defaultCurrency = entry.kind === 'income'
        ? await this.incomeService.getIncomeCurrency(userId)
        : await this.userService.getUserCurrency(userId);
      const text = entryText(entry, token => this.validator.resolveCurrencyToken(token), defaultCurrency);
      if (entry.kind === 'income') await this.incomeHandlers.handleIncomeInput(ctx, text, lang);
      else await this.expenseHandlers.handleExpenseInput(ctx, text, lang);
      // Сама запись (и её строка достижений) — в обычном вводе; здесь только «первое голосовое»
      const note = await this.achievementNote(userId, 'voice_used', lang);
      if (note) await ctx.reply(note, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Voice processing failed', { userId, code: error.code, error: error.message });
      await statusEdits;
      await this.editStatus(ctx, statusId, this.t(lang, 'voice_error'), { parse_mode: 'Markdown' }).catch(() => {});
    } finally {
      stopTyping();
    }
  }
}

MultiEntryHandlers.parseSpoken = parseSpoken;
MultiEntryHandlers.entryText = entryText;
MultiEntryHandlers.MAX_VOICE_SECONDS = MAX_VOICE_SECONDS;

module.exports = MultiEntryHandlers;
