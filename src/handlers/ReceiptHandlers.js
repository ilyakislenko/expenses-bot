const respond = require('../utils/respond');
const logger = require('../utils/logger');
const { runImageTask } = require('../services/receipt/imageWorker');

const PAGE_SIZE = 20;
// JPEG (фото и файлы) готовит imagePrep — поворот, поиск чека, уменьшение, поэтому годится всё, что отдаёт Telegram;
// остальные форматы уходят модели как есть — только небольшие
const MAX_FILE_BYTES = 20 * 1024 * 1024; // предел скачивания файлов ботом в Telegram
const MAX_RAW_IMAGE_BYTES = 1.5 * 1024 * 1024;
const NAME_IN_LIST = 40;
const DRAFT_TTL_MS = 30 * 60 * 1000; // черновик и кадр для кнопки «повернуть»
const DRAFT_LINES = 40; // черновик без пагинации — показываем первые строки
const TYPING_INTERVAL_MS = 4000;

// «печатает…» в чате, пока идёт долгая операция (статус Telegram держится ~5 с). Возвращает stop()
function keepTyping(ctx, intervalMs = TYPING_INTERVAL_MS) {
  const timer = setInterval(() => ctx.sendChatAction('typing').catch(() => {}), intervalMs);
  return () => clearInterval(timer);
}

const IMAGE_MIME = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i;
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|heic|heif)$/i;
const MIME_BY_EXTENSION = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' };

const ERROR_KEYS = {
  not_configured: 'receipt_not_configured',
  quota: 'receipt_error_quota',
  unreadable: 'receipt_unreadable',
  not_receipt: 'receipt_not_receipt',
  currency: 'receipt_currency_unsupported'
};

// Картинка, присланная файлом (jpg/png/webp/heic)
function isImageDocument(document = {}) {
  return IMAGE_MIME.test(document.mime_type || '') || IMAGE_EXTENSION.test(document.file_name || '');
}

function documentMime(document) {
  if (IMAGE_MIME.test(document.mime_type || '')) return document.mime_type.toLowerCase().replace('image/jpg', 'image/jpeg');
  const ext = (String(document.file_name || '').match(IMAGE_EXTENSION) || [])[1];
  return MIME_BY_EXTENSION[String(ext).toLowerCase()] || 'image/jpeg';
}

// Самый крупный размер фото (размеры в Telegram идут по возрастанию)
function pickPhotoSize(sizes) {
  const fitting = sizes.filter(size => !size.file_size || size.file_size <= MAX_FILE_BYTES);
  return fitting.length ? fitting[fitting.length - 1] : sizes[0];
}

// Фото чека → каждая позиция записывается отдельной тратой сразу, затем список чека для правки
// (номер → обычная карточка записи с возвратом к чеку, «Всё верно», «Отменить чек»).
class ReceiptHandlers {
  constructor({ receiptService, expenseHandlers, budgetService, userService, localizationService, formatter, achievementService = null }) {
    this.receiptService = receiptService;
    this.expenseHandlers = expenseHandlers;
    this.budgetService = budgetService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.achievementService = achievementService;
    this.tasks = new Set(); // фоновые распознавания
    this.busyUsers = new Set(); // у кого сейчас распознаётся чек (по одному на пользователя)
    this.drafts = new Map(); // `${userId}:${messageId}` → неуверенно распознанный чек до подтверждения | null — уже записывается
    this.rotations = new Map(); // `${userId}:${messageId}` → подготовленный кадр для кнопки «повернуть на 90°»
    // «⬅️ Назад» на карточке позиции (back r.<receiptId>.<page>) и экран после удаления позиции
    expenseHandlers.registerBackView('r', (ctx, [receiptId, page]) => this.showReceipt(ctx, receiptId, page));
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // Фото в личном чате
  async handlePhoto(ctx) {
    const size = pickPhotoSize(ctx.message.photo || []);
    if (!size) return;
    await this.processImage(ctx, { fileId: size.file_id, fileSize: size.file_size, mimeType: 'image/jpeg' });
  }

  // Картинка файлом: JPEG до 20 МБ — полное разрешение (лучше для мелкого и далёкого чека); HEIC — только Gemini;
  // PNG/WebP — как есть, если небольшие
  async handleImageDocument(ctx) {
    const document = ctx.message.document;
    const mimeType = documentMime(document);
    if (this.receiptService.configured && ctx.chat?.type === 'private') {
      const heicUnsupported = /heic|heif/.test(mimeType) && !this.receiptService.provider.acceptsHeic;
      const tooBig = document.file_size > (mimeType === 'image/jpeg' ? MAX_FILE_BYTES : MAX_RAW_IMAGE_BYTES);
      if (heicUnsupported || tooBig) {
        const lang = await this.userService.getUserLanguage(ctx.from.id);
        const key = heicUnsupported ? 'receipt_heic_unsupported' : mimeType === 'image/jpeg' ? 'receipt_file_too_big' : 'receipt_send_as_photo';
        await ctx.reply(this.t(lang, key));
        return;
      }
    }
    await this.processImage(ctx, { fileId: document.file_id, fileSize: document.file_size, mimeType });
  }

  async download(ctx, fileId) {
    const link = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(link.href || String(link));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  // Сообщение «Распознаю чек…» превращается в результат или текст ошибки
  async editStatus(ctx, messageId, text, extra = {}) {
    try {
      await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, text, extra);
    } catch (error) {
      await ctx.reply(text, extra);
    }
  }

  async processImage(ctx, { fileId, fileSize, mimeType }) {
    if (ctx.chat?.type !== 'private') return;
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (!this.receiptService.configured) {
      await ctx.reply(this.t(lang, 'receipt_not_configured'), { parse_mode: 'Markdown' });
      return;
    }
    // Один чек за раз на пользователя: локальная модель распознаёт минуту-две
    if (this.busyUsers.has(userId)) {
      await ctx.reply(this.t(lang, 'receipt_busy'));
      return;
    }
    this.busyUsers.add(userId);
    let started = false;
    try {
      const [timezone, currency] = await Promise.all([
        this.userService.getUserTimezone(userId),
        this.userService.getUserCurrency(userId)
      ]);
      const limit = await this.receiptService.checkLimit(userId, timezone);
      if (!limit.remaining) {
        const key = limit.isPremium ? 'receipt_limit_premium' : 'receipt_limit_regular';
        const keyboard = limit.isPremium ? [] : [[{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]];
        await ctx.reply(this.t(lang, key, { used: limit.used, limit: limit.limit, premium: this.receiptService.premiumLimit }), {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
        return;
      }
      if (fileSize > MAX_FILE_BYTES) {
        await ctx.reply(this.t(lang, 'receipt_file_too_big'));
        return;
      }

      await ctx.sendChatAction('typing').catch(() => {});
      let image;
      try {
        image = await this.download(ctx, fileId);
      } catch (error) {
        logger.warn('Receipt download failed', { userId, error: error.message });
        await ctx.reply(this.t(lang, 'import_download_error'));
        return;
      }

      const status = await ctx.reply(this.t(lang, 'receipt_recognizing'));
      // Распознавание может идти минуту-две (локальная модель на сервере): обработчик апдейта его не ждёт,
      // иначе polling задержит остальных пользователей, а Telegraf оборвёт обработчик по таймауту (90 с).
      // При перезапуске бота незаконченное распознавание просто теряется.
      this.track(userId, this.recognizeAndRecord(ctx, { image, mimeType, userId, lang, timezone, currency, statusId: status.message_id }));
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

  // Фоновая часть: подготовить кадр, распознать (при неудаче — ещё раз повёрнутым на 180°), записать или показать
  // черновик/ошибку с кнопкой «повернуть на 90°». Ошибки не выходят наружу — превращаются в текст.
  // prepared — image уже подготовлен (кнопка «повернуть»), retry — разрешена вторая попытка
  async recognizeAndRecord(ctx, { image, mimeType, userId, lang, timezone, currency, statusId, prepared = false, retry = true, small = false, lowResolution = false }) {
    const stopTyping = keepTyping(ctx);
    let statusText = prepared ? this.t(lang, 'receipt_retrying') : this.t(lang, 'receipt_recognizing');
    let statusEdits = Promise.resolve();
    // Очередь занятого локального слота, «может занять 1–2 минуты» у локальной модели, «поворачиваю». Правки идут
    // по очереди, итоговое сообщение — после них, чтобы запоздавшая правка его не затёрла
    const setStatus = (text) => {
      if (text === statusText) return;
      statusText = text;
      statusEdits = statusEdits.then(() => ctx.telegram.editMessageText(ctx.chat.id, statusId, undefined, text)).catch(() => {});
    };
    const onStatus = ({ position, local }) => {
      if (position) setStatus(this.t(lang, 'receipt_queued', { position }));
      else if (statusText !== this.t(lang, 'receipt_retrying')) setStatus(this.t(lang, local ? 'receipt_recognizing_slow' : 'receipt_recognizing'));
    };
    const onRetry = () => setStatus(this.t(lang, 'receipt_retrying'));
    try {
      const result = await this.receiptService.recognizePhoto(userId, { image, mimeType, lang, currency, timezone, onStatus, onRetry, prepared, retry, small, lowResolution });
      const frame = { image: result.image, small: result.small, lowResolution: result.lowResolution, lang, timezone, currency };
      await statusEdits;
      stopTyping();
      if (result.error) {
        const code = result.error.code;
        logger.warn('Receipt not recognized', { userId, code, error: result.error.message, attempts: result.attempts });
        if (code === 'unreadable') {
          // Не разобрали даже повёрнутым: советы и кнопка «повернуть на 90°» (кадр — в памяти; только для JPEG)
          const canRotate = result.mimeType === 'image/jpeg';
          if (canRotate) this.saveRotation(userId, statusId, frame);
          await this.editStatus(ctx, statusId, `${this.t(lang, 'receipt_unreadable')}\n\n${this.photoTips(lang, result.lowResolution)}`, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: canRotate ? [[{ text: this.t(lang, 'button_receipt_rotate'), callback_data: 'rvr' }]] : [] }
          });
          return;
        }
        await this.editStatus(ctx, statusId, this.t(lang, ERROR_KEYS[code] || 'receipt_error_unavailable', result.error.params), { parse_mode: 'Markdown' });
        return;
      }
      const { receipt } = result;
      if (receipt.lowConfidence) {
        // Цифры не сходятся — не записываем сами: черновик, советы и кнопка «повернуть на 90°»
        const canRotate = result.mimeType === 'image/jpeg';
        this.saveDraft(userId, statusId, { receipt, timezone });
        if (canRotate) this.saveRotation(userId, statusId, frame);
        const view = await this.buildDraftView(userId, lang, receipt, { canRotate, lowResolution: result.lowResolution });
        await this.editStatus(ctx, statusId, view.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
        return;
      }
      const receiptId = await this.recordReceipt(userId, receipt, timezone);
      const view = await this.buildReceiptView(userId, lang, receiptId, 0);
      const text = await this.withAchievementNote(userId, lang, view.text);
      await this.editStatus(ctx, statusId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
      await this.sendBudgetWarnings(ctx, userId, lang, receiptId);
    } catch (error) {
      logger.error('Receipt processing failed', { userId, error: error.message, stack: error.stack });
      await this.editStatus(ctx, statusId, this.t(lang, 'receipt_error_unavailable')).catch(() => {});
    } finally {
      stopTyping();
    }
  }

  // ---------- Кнопка «повернуть на 90° и попробовать» ----------

  saveRotation(userId, messageId, entry) {
    const now = Date.now();
    for (const [key, stored] of this.rotations) {
      if (stored.expiresAt <= now) this.rotations.delete(key);
    }
    this.rotations.set(`${userId}:${messageId}`, { ...entry, expiresAt: now + DRAFT_TTL_MS });
  }

  // rvr — тот же подготовленный кадр, повёрнутый ещё на 90° по часовой; одна попытка, очередь и «один чек за раз»
  // как у нового фото, в месячный лимит засчитывается только записанный чек
  async rotateAndRetry(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const messageId = ctx.callbackQuery.message?.message_id;
    const key = `${userId}:${messageId}`;
    const entry = this.rotations.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.rotations.delete(key);
      await ctx.answerCbQuery(this.t(lang, 'receipt_rotate_outdated'), { show_alert: true }).catch(() => {});
      return;
    }
    if (this.busyUsers.has(userId)) {
      await ctx.answerCbQuery(this.t(lang, 'receipt_busy'), { show_alert: true }).catch(() => {});
      return;
    }
    this.busyUsers.add(userId);
    this.rotations.delete(key);
    this.drafts.delete(key);
    let started = false;
    try {
      await ctx.answerCbQuery().catch(() => {});
      const { image } = await runImageTask('rotate', entry.image, { degrees: 90 });
      await respond(ctx, this.t(lang, 'receipt_retrying'), { reply_markup: { inline_keyboard: [] } });
      this.track(userId, this.recognizeAndRecord(ctx, {
        image, mimeType: 'image/jpeg', userId, lang: entry.lang, timezone: entry.timezone, currency: entry.currency,
        statusId: messageId, prepared: true, retry: false, small: entry.small, lowResolution: entry.lowResolution
      }));
      started = true;
    } finally {
      if (!started) this.busyUsers.delete(userId);
    }
  }

  async recordReceipt(userId, receipt, timezone) {
    const familyId = await this.expenseHandlers.familyModeTarget(userId);
    return this.receiptService.record(userId, receipt, { timezone, familyId });
  }

  // ---------- Черновик неуверенно распознанного чека ----------

  saveDraft(userId, messageId, draft) {
    const now = Date.now();
    for (const [key, stored] of this.drafts) {
      if (stored && stored.expiresAt <= now) this.drafts.delete(key);
    }
    this.drafts.set(`${userId}:${messageId}`, { ...draft, expiresAt: now + DRAFT_TTL_MS });
  }

  // Синхронно забирает черновик: undefined — нет или устарел, null — уже записывается
  takeDraft(userId, messageId) {
    const key = `${userId}:${messageId}`;
    if (!this.drafts.has(key)) return undefined;
    const draft = this.drafts.get(key);
    if (draft && draft.expiresAt <= Date.now()) {
      this.drafts.delete(key);
      return undefined;
    }
    if (draft) this.drafts.set(key, null);
    return draft;
  }

  // Советы по съёмке; у сжатого Telegram-фото с мелким чеком — ещё «пришли файлом»
  photoTips(lang, lowResolution) {
    const tips = this.t(lang, 'receipt_photo_tips');
    return lowResolution ? `${tips}\n${this.t(lang, 'receipt_small_photo_tip')}` : tips;
  }

  async buildDraftView(userId, lang, receipt, { canRotate = false, lowResolution = false } = {}) {
    const categories = await this.receiptService.categoriesById(userId);
    const title = receipt.merchant ? this.formatter.escapeMarkdown(receipt.merchant) : this.t(lang, 'receipt_title_default');
    const parts = [`🧾 ${title}`];
    if (receipt.date) parts.push(this.formatter.formatLocalDate(receipt.date) + (receipt.time ? ` ${receipt.time}` : ''));
    parts.push(this.t(lang, 'receipt_items_count', { count: receipt.items.length }), `*${this.formatter.formatAmount(receipt.itemsTotal, receipt.currency)}*`);
    const lines = [parts.join(' · '), this.t(lang, 'receipt_low_confidence', {
      total: receipt.total !== null ? this.formatter.formatAmount(receipt.total, receipt.currency) : '—'
    }), this.photoTips(lang, lowResolution), ''];
    receipt.items.slice(0, DRAFT_LINES).forEach((item, i) => {
      const category = categories.get(item.categoryId);
      const categoryName = this.formatter.translateCategoryName(category ? category.name : '—', this.localizationService, lang);
      const label = item.name || categoryName;
      lines.push(`${i + 1}. ${this.formatter.escapeMarkdown(this.formatter.shorten(label, NAME_IN_LIST))} — ${this.formatter.formatAmount(item.amount, receipt.currency)} · ${(category && category.icon) || '📦'} ${this.formatter.escapeMarkdown(categoryName)}`);
    });
    if (receipt.items.length > DRAFT_LINES) lines.push('…');
    return {
      text: lines.join('\n'),
      keyboard: [
        [{ text: this.t(lang, 'button_receipt_record_draft'), callback_data: 'rvd|1' }],
        ...(canRotate ? [[{ text: this.t(lang, 'button_receipt_rotate'), callback_data: 'rvr' }]] : []),
        [{ text: this.t(lang, 'button_cancel'), callback_data: 'rvd|0' }]
      ]
    };
  }

  // rvd|1 — записать черновик как есть, rvd|0 — отменить
  async resolveDraft(ctx, record) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const messageId = ctx.callbackQuery.message?.message_id;
    const draft = this.takeDraft(userId, messageId);
    if (draft === undefined) {
      await ctx.answerCbQuery(this.t(lang, 'receipt_draft_outdated'), { show_alert: true }).catch(() => {});
      return;
    }
    if (draft === null) {
      await ctx.answerCbQuery().catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    if (!record) {
      this.drafts.delete(`${userId}:${messageId}`);
      this.rotations.delete(`${userId}:${messageId}`);
      await respond(ctx, this.t(lang, 'receipt_draft_canceled'), { reply_markup: { inline_keyboard: [] } });
      return;
    }
    let receiptId;
    try {
      receiptId = await this.recordReceipt(userId, draft.receipt, draft.timezone);
    } catch (error) {
      this.drafts.set(`${userId}:${messageId}`, draft);
      throw error;
    }
    this.drafts.delete(`${userId}:${messageId}`);
    this.rotations.delete(`${userId}:${messageId}`);
    const view = await this.buildReceiptView(userId, lang, receiptId, 0);
    const text = await this.withAchievementNote(userId, lang, view.text);
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
    await this.sendBudgetWarnings(ctx, userId, lang, receiptId);
  }

  // Записанный чек: строка достижений (первый чек, серия…) под списком
  async withAchievementNote(userId, lang, text) {
    if (!this.achievementService) return text;
    const note = await this.achievementService.track(userId, 'receipt_recorded', { lang });
    return note ? `${text}\n\n${note}` : text;
  }

  // Бюджеты проверяются один раз на чек (по каждой его категории и общий), а не на каждую позицию
  async sendBudgetWarnings(ctx, userId, lang, receiptId) {
    const expenses = await this.receiptService.getExpenses(userId, receiptId);
    const categoryNames = [...new Set(expenses.map(expense => expense.category_name).filter(Boolean))];
    const seen = new Set();
    const warnings = [];
    for (const name of categoryNames) {
      for (const warning of await this.budgetService.checkAfterExpense(userId, name)) {
        const key = `${warning.id}:${warning.level}`;
        if (seen.has(key)) continue;
        seen.add(key);
        warnings.push(warning);
      }
    }
    if (!warnings.length) return;
    await ctx.reply(warnings.map(warning => this.budgetService.warningText(lang, warning)).join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_budgets'), callback_data: 'bg_menu' }]] }
    });
  }

  amounts(expenses) {
    const totals = new Map();
    for (const expense of expenses) totals.set(expense.currency, (totals.get(expense.currency) || 0) + Number(expense.amount));
    return [...totals.entries()].map(([currency, total]) => this.formatter.formatAmount(total, currency)).join(' + ');
  }

  async header(userId, lang, receipt, expenses) {
    const title = receipt.merchant ? this.formatter.escapeMarkdown(receipt.merchant) : this.t(lang, 'receipt_title_default');
    let date;
    if (receipt.purchased_day) {
      date = this.formatter.formatLocalDate(receipt.purchased_day) + (receipt.purchased_hm ? ` ${receipt.purchased_hm}` : '');
    } else {
      date = this.formatter.formatDate(receipt.created_at, await this.userService.getUserTimezone(userId));
    }
    const parts = [`🧾 ${title}`, date, this.t(lang, 'receipt_items_count', { count: expenses.length })];
    if (expenses.length) parts.push(`*${this.amounts(expenses)}*`);
    return parts.join(' · ');
  }

  // Список позиций чека по текущим данным (после правок и удалений)
  async buildReceiptView(userId, lang, receiptId, page = 0) {
    const receipt = await this.receiptService.getReceipt(userId, receiptId);
    if (!receipt) return { text: this.t(lang, 'receipt_not_found'), keyboard: [] };
    if (receipt.status === 'undone') return { text: this.t(lang, 'receipt_already_undone'), keyboard: [] };
    const expenses = await this.receiptService.getExpenses(userId, receiptId);
    const lines = [await this.header(userId, lang, receipt, expenses)];
    if (!expenses.length) {
      lines.push('', this.t(lang, 'receipt_all_deleted'));
      return { text: lines.join('\n'), keyboard: [] };
    }

    const printed = receipt.printed_total !== null ? Number(receipt.printed_total) : null;
    const itemsTotal = Number(receipt.items_total);
    // Позиции не подгоняются к итогу силой: любое расхождение больше копейки показываем
    if (printed !== null && Math.abs(printed - itemsTotal) > 0.01) {
      lines.push(this.t(lang, 'receipt_total_mismatch', {
        printed: this.formatter.formatAmount(printed, receipt.currency),
        items: this.formatter.formatAmount(itemsTotal, receipt.currency)
      }));
    }
    if (expenses.some(expense => expense.family_id)) lines.push(this.t(lang, 'receipt_family_note'));

    const pages = Math.ceil(expenses.length / PAGE_SIZE);
    const current = Math.min(Math.max(page, 0), pages - 1);
    const slice = expenses.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
    lines.push('');
    slice.forEach((expense, i) => {
      const categoryName = this.formatter.translateCategoryName(expense.category_name || '—', this.localizationService, lang);
      const label = expense.description || categoryName;
      lines.push(`${current * PAGE_SIZE + i + 1}. ${this.formatter.escapeMarkdown(this.formatter.shorten(label, NAME_IN_LIST))} — ${this.formatter.formatAmount(Number(expense.amount), expense.currency)} · ${expense.category_icon || '📦'} ${this.formatter.escapeMarkdown(categoryName)}`);
    });
    lines.push('', this.t(lang, 'receipt_tap_number'));

    const back = `r.${receiptId}.${current}`;
    const keyboard = [];
    for (let i = 0; i < slice.length; i += 5) {
      keyboard.push(slice.slice(i, i + 5).map((expense, j) => ({
        text: String(current * PAGE_SIZE + i + j + 1),
        callback_data: `ex|${expense.id}|${back}`
      })));
    }
    if (pages > 1) {
      keyboard.push([
        current > 0 ? { text: '‹', callback_data: `rv|${receiptId}|${current - 1}` } : { text: ' ', callback_data: 'noop' },
        { text: `${current + 1}/${pages}`, callback_data: 'noop' },
        current < pages - 1 ? { text: '›', callback_data: `rv|${receiptId}|${current + 1}` } : { text: ' ', callback_data: 'noop' }
      ]);
    }
    keyboard.push([
      { text: this.t(lang, 'button_receipt_ok'), callback_data: `rvok|${receiptId}` },
      { text: this.t(lang, 'button_receipt_undo'), callback_data: `rvx|${receiptId}` }
    ]);
    return { text: lines.join('\n'), keyboard };
  }

  // rv|<id>|<page> и возврат с карточки позиции
  async showReceipt(ctx, receiptId, page = 0) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const view = await this.buildReceiptView(ctx.from.id, lang, receiptId, page);
    await respond(ctx, view.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
  }

  // rvok|<id> — «Всё верно»: кнопки убираются, остаётся короткая сводка
  async confirm(ctx, receiptId) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const receipt = await this.receiptService.confirm(userId, receiptId);
    if (!receipt) {
      await ctx.answerCbQuery(this.t(lang, 'receipt_already_undone'), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    const full = await this.receiptService.getReceipt(userId, receiptId);
    const expenses = await this.receiptService.getExpenses(userId, receiptId);
    const text = `${await this.header(userId, lang, full, expenses)}\n${this.t(lang, 'receipt_confirmed')}`;
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [] } });
  }

  // rvx|<id> — подтверждение отмены чека
  async askUndo(ctx, receiptId) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const receipt = await this.receiptService.getReceipt(userId, receiptId);
    if (!receipt || receipt.status === 'undone') {
      await ctx.answerCbQuery(this.t(lang, 'receipt_already_undone'), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    const expenses = await this.receiptService.getExpenses(userId, receiptId);
    await respond(ctx, this.t(lang, 'receipt_undo_confirm', { count: expenses.length, total: this.amounts(expenses) || '0' }), {
      reply_markup: {
        inline_keyboard: [
          [{ text: this.t(lang, 'button_receipt_undo_confirm'), callback_data: `rvxc|${receiptId}` }],
          [{ text: this.t(lang, 'button_back'), callback_data: `rv|${receiptId}|0` }]
        ]
      }
    });
  }

  // rvxc|<id> — удалить все оставшиеся траты чека
  async undo(ctx, receiptId) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const result = await this.receiptService.undo(userId, receiptId);
    if (!result) {
      await ctx.answerCbQuery(this.t(lang, 'receipt_already_undone'), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'receipt_undone', { count: result.expenses }), { reply_markup: { inline_keyboard: [] } });
  }
}

ReceiptHandlers.isImageDocument = isImageDocument;
ReceiptHandlers.pickPhotoSize = pickPhotoSize;
ReceiptHandlers.MAX_FILE_BYTES = MAX_FILE_BYTES;
ReceiptHandlers.keepTyping = keepTyping;

module.exports = ReceiptHandlers;
