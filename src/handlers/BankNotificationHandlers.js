const crypto = require('crypto');
const logger = require('../utils/logger');
const { detect, splitNotifications } = require('../utils/bankNotification');

// Сообщения, пришедшие подряд (пересылка нескольких уведомлений сразу — отдельные сообщения), собираются в одну пачку:
// обработка начинается через DEBOUNCE_MS после последнего, но не позже MAX_WAIT_MS после первого
const DEBOUNCE_MS = 1200;
const MAX_WAIT_MS = 5000;
const PENDING_TTL_MS = 30 * 60 * 1000; // кнопки «Всё равно записать» живут в памяти полчаса
const MAX_PENDING_PER_USER = 10;
const ITEM_MERCHANT_LENGTH = 40;
const FORCEABLE = new Set(['duplicate', 'transfer', 'cash']);

// Источник пересылки: кто/какой чат и когда (и id сообщения канала) — то же сообщение, пересланное ещё раз, узнаётся.
// { key, date } или null — не пересланное
function forwardInfo(message) {
  const origin = message && message.forward_origin;
  if (origin && origin.date) {
    const date = new Date(origin.date * 1000);
    if (origin.type === 'user' && origin.sender_user) return { key: `u:${origin.sender_user.id}:${origin.date}`, date };
    if (origin.type === 'hidden_user') return { key: `h:${origin.sender_user_name || ''}:${origin.date}`, date };
    if (origin.type === 'chat' && origin.sender_chat) return { key: `c:${origin.sender_chat.id}:${origin.date}`, date };
    if (origin.type === 'channel' && origin.chat) return { key: `ch:${origin.chat.id}:${origin.message_id}`, date };
    return { key: `o:${origin.type}:${origin.date}`, date };
  }
  if (message && message.forward_date) {
    const from = message.forward_from ? message.forward_from.id : (message.forward_sender_name || '');
    return { key: `l:${from}:${message.forward_date}`, date: new Date(message.forward_date * 1000) };
  }
  return null;
}

// Уведомления банка: пересланные или вставленные тексты → записи (BankNotificationService), одна карточка или сводка
// партии (как у нескольких записей) и строки о том, что не записано и почему
class BankNotificationHandlers {
  constructor({ bankNotificationService, multiEntryHandlers, expenseHandlers, incomeHandlers, expenseService, incomeService, premiumService, userService, localizationService, formatter, debounceMs = DEBOUNCE_MS, maxWaitMs = MAX_WAIT_MS }) {
    this.service = bankNotificationService;
    this.multiEntryHandlers = multiEntryHandlers;
    this.expenseHandlers = expenseHandlers;
    this.incomeHandlers = incomeHandlers;
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.premiumService = premiumService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.debounceMs = debounceMs;
    this.maxWaitMs = maxWaitMs;
    this.collecting = new Map(); // userId → { items, ctx, lang, startedAt, timer }
    this.chains = new Map(); // userId → обработка пачек пользователя по очереди
    this.tasks = new Set();
    this.pending = new Map(); // token → { userId, results, expiresAt } для «Всё равно записать»
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // Текстовое сообщение в личном чате, похожее на уведомление банка (пересланное — по более мягким признакам)
  accepts(ctx) {
    const message = ctx.message;
    if (!message || typeof message.text !== 'string' || ctx.chat?.type !== 'private') return false;
    return detect(message.text, { forwarded: Boolean(forwardInfo(message)) });
  }

  // Сообщение кладётся в пачку пользователя; ответ придёт, когда пачка соберётся (обработчик апдейта не ждёт)
  async handleMessage(ctx, lang) {
    const message = ctx.message;
    const forward = forwardInfo(message);
    const texts = splitNotifications(message.text, { forwarded: Boolean(forward) });
    const items = texts.map((text, i) => ({
      text,
      forwardKey: forward ? `${forward.key}:${i}` : null,
      forwardDate: forward ? forward.date : null
    }));
    ctx.sendChatAction?.('typing')?.catch?.(() => {});
    this.enqueue(ctx, lang, items);
  }

  enqueue(ctx, lang, items) {
    const userId = ctx.from.id;
    let batch = this.collecting.get(userId);
    if (!batch) {
      batch = { items: [], startedAt: Date.now(), timer: null };
      this.collecting.set(userId, batch);
    }
    batch.items.push(...items);
    batch.ctx = ctx;
    batch.lang = lang;
    clearTimeout(batch.timer);
    const wait = Math.max(0, Math.min(this.debounceMs, batch.startedAt + this.maxWaitMs - Date.now()));
    batch.timer = setTimeout(() => this.flush(userId), wait);
  }

  flush(userId) {
    const batch = this.collecting.get(userId);
    if (!batch) return;
    this.collecting.delete(userId);
    clearTimeout(batch.timer);
    const previous = this.chains.get(userId) || Promise.resolve();
    const task = previous
      .then(() => this.process(batch.ctx, batch.lang, batch.items))
      .catch(error => logger.error('Bank notifications failed', { userId, error: error.message, stack: error.stack }));
    this.chains.set(userId, task);
    this.tasks.add(task);
    task.finally(() => {
      this.tasks.delete(task);
      if (this.chains.get(userId) === task) this.chains.delete(userId);
    });
  }

  // Все собранные пачки обработаны (для тестов и остановки бота)
  async idle() {
    for (const userId of [...this.collecting.keys()]) this.flush(userId);
    while (this.tasks.size) await Promise.all([...this.tasks]);
  }

  async process(ctx, lang, items) {
    const userId = ctx.from.id;
    let statusId = null;
    try {
      const familyId = await this.expenseHandlers.familyModeTarget(userId);
      const outcome = await this.service.ingest(userId, items, {
        familyId,
        onModel: async () => {
          const status = await ctx.reply(this.t(lang, 'bank_reading'));
          statusId = status && status.message_id;
        }
      });
      if (statusId) {
        await ctx.telegram.deleteMessage(ctx.chat.id, statusId).catch(() => {});
        statusId = null;
      }
      await this.present(ctx, lang, outcome);
    } catch (error) {
      logger.error('Bank notifications processing failed', { userId, error: error.message, stack: error.stack });
      await ctx.reply(this.t(lang, 'expense_save_error')).catch(() => {});
    } finally {
      if (statusId) await ctx.telegram.deleteMessage(ctx.chat.id, statusId).catch(() => {});
    }
  }

  // ---------- Ответ ----------

  itemLabel(parsed) {
    if (!parsed || !parsed.ok) return '';
    const amount = this.formatter.formatAmount(parsed.amount, parsed.currency);
    const merchant = parsed.merchant ? ` — ${this.formatter.escapeMarkdown(this.formatter.shorten(parsed.merchant, ITEM_MERCHANT_LENGTH))}` : '';
    return `${amount}${merchant}`;
  }

  skipLine(lang, result) {
    const item = this.itemLabel(result.parsed);
    switch (result.status) {
      case 'duplicate': return this.t(lang, 'bank_skip_duplicate', { item });
      case 'declined': return this.t(lang, 'bank_skip_declined', { item });
      case 'refund': return this.t(lang, 'bank_skip_refund', { item });
      case 'transfer': return this.t(lang, 'bank_skip_transfer', { item });
      case 'cash': return this.t(lang, 'bank_skip_cash', { item });
      case 'unsupported': return this.t(lang, 'bank_skip_unsupported', { currency: result.parsed.currency });
      case 'model_limit':
        return result.isPremium
          ? this.t(lang, 'bank_skip_model_limit', { limit: result.limit })
          : this.t(lang, 'bank_skip_model_limit_regular', { limit: result.limit, premium: this.service.modelLimit(true) });
      case 'model_busy': return this.t(lang, 'bank_skip_model_busy');
      default: return this.t(lang, 'bank_skip_unparsed');
    }
  }

  // Кнопки к пропущенному: «Всё равно записать» / «Записать как трату» (повтор, свои счета, наличные), открыть
  // уже записанное или покупку, которую отменяет возврат (если пропущено одно), премиум при лимите нейросети
  skipButtons(userId, lang, skipped) {
    const rows = [];
    const forceable = skipped.filter(r => FORCEABLE.has(r.status) && r.parsed && r.parsed.ok);
    if (forceable.length) {
      const token = this.remember(userId, forceable);
      let label;
      if (forceable.length > 1) label = this.t(lang, 'button_bank_record_skipped', { count: forceable.length });
      else if (forceable[0].status === 'duplicate') label = this.t(lang, 'button_bank_record_anyway');
      else label = this.t(lang, forceable[0].parsed.direction === 'in' ? 'button_bank_record_income' : 'button_bank_record_expense');
      rows.push([{ text: label, callback_data: `bfa|${token}` }]);
    }
    if (skipped.length === 1) {
      const [only] = skipped;
      const existing = only.existing || {};
      if (only.status === 'duplicate' && existing.expenseId) rows.unshift([{ text: this.t(lang, 'button_bank_open'), callback_data: `ex|${existing.expenseId}|n` }]);
      if (only.status === 'duplicate' && existing.incomeId) rows.unshift([{ text: this.t(lang, 'button_bank_open'), callback_data: `in|${existing.incomeId}` }]);
      if (only.status === 'refund' && only.refundTargetId) rows.push([{ text: this.t(lang, 'button_bank_open_purchase'), callback_data: `ex|${only.refundTargetId}|n` }]);
    }
    if (skipped.some(r => r.status === 'model_limit' && !r.isPremium)) {
      rows.push([{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]);
    }
    return rows;
  }

  remember(userId, results) {
    const now = Date.now();
    for (const [token, entry] of this.pending) {
      if (entry.expiresAt <= now) this.pending.delete(token);
    }
    const own = [...this.pending.entries()].filter(([, entry]) => entry.userId === userId);
    while (own.length >= MAX_PENDING_PER_USER) this.pending.delete(own.shift()[0]);
    const token = crypto.randomBytes(6).toString('hex');
    this.pending.set(token, { userId, results, expiresAt: now + PENDING_TTL_MS });
    return token;
  }

  async present(ctx, lang, { batchId, defaulted, results }) {
    const userId = ctx.from.id;
    const recorded = results.filter(r => r.status === 'recorded');
    const skipped = results.filter(r => r.status !== 'recorded');
    const lines = skipped.map(r => this.skipLine(lang, r));
    const extraRows = this.skipButtons(userId, lang, skipped);

    if (recorded.length === 1 && !skipped.length) return this.showSingle(ctx, lang, recorded[0], defaulted);
    if (recorded.length) {
      const header = [this.t(lang, 'bank_batch_title'), ...lines].join('\n');
      return this.multiEntryHandlers.showRecordedBatch(ctx, lang, batchId, {
        source: 'bank',
        defaulted,
        header,
        send: (text, extra) => ctx.reply(text, { ...extra, reply_markup: { inline_keyboard: [...extraRows, ...extra.reply_markup.inline_keyboard] } })
      });
    }
    return ctx.reply(lines.join('\n\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: extraRows } });
  }

  // Одна запись: обычная карточка траты (отменить, категория, изменить, дата) или подтверждение дохода
  async showSingle(ctx, lang, result, defaulted) {
    const userId = ctx.from.id;
    if (result.expenseId) {
      const expense = await this.expenseService.getExpenseById(userId, result.expenseId);
      const notes = [];
      if (expense.category_guessed) {
        const category = this.formatter.escapeMarkdown(this.formatter.translateCategoryName(expense.category_name, this.localizationService, lang));
        notes.push(defaulted
          ? this.t(lang, 'multi_default_category_hint', { category })
          : this.t(lang, 'bank_category_guessed', { category }));
      }
      const note = await this.expenseHandlers.expenseNote(ctx, userId, lang, expense);
      if (note) notes.push(note);
      await this.expenseHandlers.showCard(ctx, expense.id, 'n', { added: true, remembered: !expense.category_guessed, note: notes.join('\n\n') });
      await this.expenseHandlers.sendBudgetWarnings(ctx, userId, lang, expense.category_name);
      return;
    }
    const income = await this.incomeService.getIncome(userId, result.incomeId);
    const timezone = await this.userService.getUserTimezone(userId);
    const amount = this.formatter.formatAmount(Number(income.amount), income.currency);
    const lines = [
      this.t(lang, 'income_added', { amount, description: this.incomeHandlers.incomeLabel(income, lang) }),
      `📅 ${this.formatter.formatDate(income.created_at_utc, timezone)}`,
      this.t(lang, 'bank_record_label')
    ];
    const note = this.incomeHandlers.achievementService ? await this.incomeHandlers.achievementService.track(userId, 'income_added', { lang }) : '';
    if (note) lines.push('', note);
    await ctx.reply(lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.t(lang, 'button_undo'), callback_data: `income_undo|${income.id}` },
            { text: this.t(lang, 'button_edit_record'), callback_data: `ie|${income.id}` }
          ],
          [{ text: this.t(lang, 'button_record_date'), callback_data: `it|${income.id}` }],
          [{ text: this.t(lang, 'button_income'), callback_data: 'income_menu' }]
        ]
      }
    });
  }

  // callback: bfa|<token> — записать пропущенное (повтор, перевод между своими, наличные) один раз
  async recordAnyway(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const token = ctx.match[1];
    const entry = this.pending.get(token);
    const message = ctx.callbackQuery.message;
    const keyboard = (message && message.reply_markup && message.reply_markup.inline_keyboard) || [];
    const withoutButton = keyboard.map(row => row.filter(button => !String(button.callback_data || '').startsWith('bfa|'))).filter(row => row.length);
    if (!entry || entry.userId !== userId || entry.expiresAt <= Date.now()) {
      if (entry && entry.userId === userId) this.pending.delete(token);
      await ctx.answerCbQuery(this.t(lang, 'bank_button_outdated'), { show_alert: true }).catch(() => {});
      await ctx.editMessageReplyMarkup({ inline_keyboard: withoutButton }).catch(() => {});
      return;
    }
    this.pending.delete(token);
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageReplyMarkup({ inline_keyboard: withoutButton }).catch(() => {});
    const familyId = await this.expenseHandlers.familyModeTarget(userId);
    const outcome = await this.service.recordAnyway(userId, entry.results, { familyId });
    // Ответ — новыми сообщениями (карточка или сводка), сообщение с кнопкой остаётся как было
    const replyCtx = Object.create(ctx, { callbackQuery: { value: undefined }, from: { value: ctx.from }, chat: { value: ctx.chat } });
    await this.present(replyCtx, lang, outcome);
  }
}

BankNotificationHandlers.forwardInfo = forwardInfo;
BankNotificationHandlers.DEBOUNCE_MS = DEBOUNCE_MS;

module.exports = BankNotificationHandlers;
