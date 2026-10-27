const respond = require('../utils/respond');
const logger = require('../utils/logger');
const { ReceiptError } = require('../services/receipt/errors');

const PAGE_SIZE = 20;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // больше — просим прислать фото (Telegram сожмёт до ~1280px)
const NAME_IN_LIST = 40;
const TYPING_INTERVAL_MS = 4500;
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

// Самый крупный размер фото не больше лимита (размеры в Telegram идут по возрастанию)
function pickPhotoSize(sizes) {
  const fitting = sizes.filter(size => !size.file_size || size.file_size <= MAX_IMAGE_BYTES);
  return fitting.length ? fitting[fitting.length - 1] : sizes[0];
}

// Фото чека → каждая позиция записывается отдельной тратой сразу, затем список чека для правки
// (номер → обычная карточка записи с возвратом к чеку, «Всё верно», «Отменить чек»).
class ReceiptHandlers {
  constructor({ receiptService, expenseHandlers, budgetService, userService, localizationService, formatter }) {
    this.receiptService = receiptService;
    this.expenseHandlers = expenseHandlers;
    this.budgetService = budgetService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
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

  // Картинка файлом: большие и HEIC (кроме Gemini) — просим прислать как фото
  async handleImageDocument(ctx) {
    const document = ctx.message.document;
    const mimeType = documentMime(document);
    const heicUnsupported = /heic|heif/.test(mimeType) && this.receiptService.provider && this.receiptService.provider.name !== 'gemini';
    if (this.receiptService.configured && (document.file_size > MAX_IMAGE_BYTES || heicUnsupported)) {
      if (ctx.chat?.type !== 'private') return;
      const lang = await this.userService.getUserLanguage(ctx.from.id);
      await ctx.reply(this.t(lang, 'receipt_send_as_photo'));
      return;
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
    const [timezone, currency] = await Promise.all([
      this.userService.getUserTimezone(userId),
      this.userService.getUserCurrency(userId)
    ]);
    const limit = await this.receiptService.checkLimit(userId, timezone);
    if (!limit.remaining) {
      const premiumLimit = this.receiptService.premiumLimit;
      const key = limit.isPremium ? 'receipt_limit_premium' : 'receipt_limit_regular';
      const keyboard = limit.isPremium ? [] : [[{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]];
      await ctx.reply(this.t(lang, key, { used: limit.used, limit: limit.limit, premium: premiumLimit }), {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }
    if (fileSize > MAX_IMAGE_BYTES) {
      await ctx.reply(this.t(lang, 'receipt_send_as_photo'));
      return;
    }

    await ctx.sendChatAction('typing').catch(() => {});
    const status = await ctx.reply(this.t(lang, 'receipt_recognizing'));
    const typing = setInterval(() => ctx.sendChatAction('typing').catch(() => {}), TYPING_INTERVAL_MS);
    let receipt;
    try {
      let image;
      try {
        image = await this.download(ctx, fileId);
      } catch (error) {
        logger.warn('Receipt download failed', { userId, error: error.message });
        await this.editStatus(ctx, status.message_id, this.t(lang, 'import_download_error'));
        return;
      }
      try {
        receipt = await this.receiptService.recognize(userId, { image, mimeType, lang, currency, timezone });
      } catch (error) {
        const code = error instanceof ReceiptError ? error.code : 'unavailable';
        logger.warn('Receipt not recognized', { userId, code, error: error.message });
        await this.editStatus(ctx, status.message_id, this.t(lang, ERROR_KEYS[code] || 'receipt_error_unavailable', error.params), { parse_mode: 'Markdown' });
        return;
      }
    } finally {
      clearInterval(typing);
    }

    const familyId = await this.expenseHandlers.familyModeTarget(userId);
    const receiptId = await this.receiptService.record(userId, receipt, { timezone, familyId });
    const view = await this.buildReceiptView(userId, lang, receiptId, 0);
    await this.editStatus(ctx, status.message_id, view.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
    await this.sendBudgetWarnings(ctx, userId, lang, receiptId);
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
    if (printed !== null && Math.abs(printed - itemsTotal) > printed * 0.01) {
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
ReceiptHandlers.MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;

module.exports = ReceiptHandlers;
