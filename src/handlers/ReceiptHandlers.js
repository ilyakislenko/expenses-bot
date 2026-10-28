const respond = require('../utils/respond');
const logger = require('../utils/logger');
const { runImageTask } = require('../services/receipt/imageWorker');
const { localNow } = require('../services/receipt/normalize');
const { sumCheck, editLine, setLineCategory, removeLine, addLine, setDraftDate, MAX_ITEMS } = require('../services/receipt/draftEdit');
const { localToday } = require('../utils/period');
const { packDate, unpackDate, checkRecordDate, parseRecordDate, localDateOf, datePickerKeyboard, DATE_ERROR_KEYS } = require('../utils/recordDate');

const PAGE_SIZE = 20; // строк на странице списка чека и черновика
// JPEG (фото и файлы) готовит imagePrep — поворот, поиск чека, уменьшение, поэтому годится всё, что отдаёт Telegram;
// остальные форматы уходят модели как есть — только небольшие
const MAX_FILE_BYTES = 20 * 1024 * 1024; // предел скачивания файлов ботом в Telegram
const MAX_RAW_IMAGE_BYTES = 1.5 * 1024 * 1024;
const NAME_IN_LIST = 40;
const FRAME_CACHE_MS = 30 * 60 * 1000; // подготовленный кадр для «повернуть» в памяти (без него — скачать и подготовить заново)
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
  constructor({ receiptService, expenseHandlers, expenseService, budgetService, userService, premiumService, localizationService, formatter, stateService, validator, achievementService = null, referralService = null }) {
    this.receiptService = receiptService;
    this.expenseHandlers = expenseHandlers;
    this.expenseService = expenseService; // категории и запомненная категория для строк черновика
    this.budgetService = budgetService;
    this.userService = userService;
    this.premiumService = premiumService; // лимит длины названия строки — как у описания записи
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService; // ввод текстом: строка черновика (rd_in:…), дата чека (dt_in:r:…)
    this.validator = validator;
    this.achievementService = achievementService;
    this.referralService = referralService;
    this.tasks = new Set(); // фоновые распознавания
    this.busyUsers = new Set(); // у кого сейчас распознаётся чек (по одному на пользователя)
    // `${userId}:${messageId}` → подготовленный кадр для «повернуть на 90°». Только ускорение: черновик и сведения
    // о кадре — в БД (receiptService.saveDraft), после перезапуска кадр готовится заново из фото в Telegram
    this.frames = new Map();
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
        let text = this.t(lang, key, { used: limit.used, limit: limit.limit, premium: this.receiptService.premiumLimit });
        let keyboard = limit.isPremium ? [] : [[{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]];
        if (!limit.isPremium && this.referralService) ({ text, keyboard } = await this.referralService.withUpsell(userId, lang, text, keyboard));
        await ctx.reply(text, {
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
      this.track(userId, this.recognizeAndRecord(ctx, { image, mimeType, userId, lang, timezone, currency, statusId: status.message_id, fileId, sourceMime: mimeType }));
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
  // prepared — image уже подготовлен (кнопка «повернуть»), retry — разрешена вторая попытка; fileId/sourceMime — фото
  // в Telegram, turn — на сколько градусов image повёрнут относительно подготовленного фото (для «повернуть» после рестарта)
  async recognizeAndRecord(ctx, { image, mimeType, userId, lang, timezone, currency, statusId, fileId = null, sourceMime = mimeType, turn = 0, prepared = false, retry = true, small = false, lowResolution = false }) {
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
      // Кадр для «повернуть»: фото в Telegram и поворот — в БД, сам подготовленный кадр — в памяти на 30 минут
      const frame = fileId ? {
        fileId, mimeType: sourceMime, turn: (turn + (result.turn || 0)) % 360,
        small: result.small, lowResolution: result.lowResolution, lang, timezone, currency
      } : null;
      await statusEdits;
      stopTyping();
      if (result.error) {
        const code = result.error.code;
        logger.warn('Receipt not recognized', { userId, code, error: result.error.message, attempts: result.attempts });
        if (code === 'unreadable') {
          // Не разобрали даже повёрнутым: советы и кнопка «повернуть на 90°» (только для JPEG)
          const canRotate = result.mimeType === 'image/jpeg' && !!frame;
          if (canRotate) await this.keepFrame(userId, statusId, frame, result.image, null);
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
        const canRotate = result.mimeType === 'image/jpeg' && !!frame;
        await this.keepFrame(userId, statusId, canRotate ? frame : null, canRotate ? result.image : null, { receipt, timezone });
        const view = await this.buildDraftView(userId, lang, receipt, { canRotate, lowResolution: result.lowResolution });
        await this.editStatus(ctx, statusId, view.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
        return;
      }
      const receiptId = await this.recordReceipt(userId, receipt, timezone);
      const view = await this.buildReceiptView(userId, lang, receiptId, 0);
      const text = await this.withNotes(ctx, userId, lang, receiptId, view.text);
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

  // Черновик и/или сведения о кадре — в БД, подготовленный кадр — в памяти (ускорение)
  async keepFrame(userId, messageId, frame, image, draft) {
    await this.receiptService.saveDraft(userId, messageId, { receipt: draft ? draft.receipt : null, timezone: draft ? draft.timezone : null, frame });
    const now = Date.now();
    for (const [key, stored] of this.frames) {
      if (stored.expiresAt <= now) this.frames.delete(key);
    }
    if (frame && image) this.frames.set(`${userId}:${messageId}`, { image, expiresAt: now + FRAME_CACHE_MS });
  }

  // Подготовленный кадр с учётом уже сделанных поворотов: из памяти или заново из фото в Telegram
  async frameImage(ctx, key, frame) {
    const cached = this.frames.get(key);
    this.frames.delete(key);
    if (cached && cached.expiresAt > Date.now()) return cached.image;
    const prep = await runImageTask('prepare', await this.download(ctx, frame.fileId), { mimeType: frame.mimeType });
    return frame.turn ? (await runImageTask('rotate', prep.image, { degrees: frame.turn })).image : prep.image;
  }

  // Кнопки сообщения больше ничего не сделают: объяснить и убрать их, чтобы не нажимать снова
  async expireButtons(ctx, lang, key) {
    await ctx.answerCbQuery(this.t(lang, key), { show_alert: true }).catch(() => {});
    await Promise.resolve().then(() => ctx.editMessageReplyMarkup({ inline_keyboard: [] })).catch(() => {});
  }

  // rvr — тот же подготовленный кадр, повёрнутый ещё на 90° по часовой; одна попытка, очередь и «один чек за раз»
  // как у нового фото, в месячный лимит засчитывается только записанный чек
  async rotateAndRetry(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const messageId = ctx.callbackQuery.message?.message_id;
    const key = `${userId}:${messageId}`;
    if (this.busyUsers.has(userId)) {
      await ctx.answerCbQuery(this.t(lang, 'receipt_busy'), { show_alert: true }).catch(() => {});
      return;
    }
    this.busyUsers.add(userId);
    let started = false;
    try {
      const frame = await this.receiptService.takeFrame(userId, messageId);
      if (!frame) {
        this.frames.delete(key);
        // Исправленный вручную черновик не поворачивается (новое распознавание стёрло бы правки): кнопки остаются
        const draft = await this.receiptService.getDraft(userId, messageId);
        if (draft.status === 'ok' && draft.receipt.edited) {
          await ctx.answerCbQuery(this.t(lang, 'receipt_rotate_edited'), { show_alert: true }).catch(() => {});
          await this.renderDraft(ctx, userId, lang, draft, 0);
          return;
        }
        await this.expireButtons(ctx, lang, 'receipt_rotate_outdated');
        return;
      }
      await ctx.answerCbQuery().catch(() => {});
      await respond(ctx, this.t(lang, 'receipt_retrying'), { reply_markup: { inline_keyboard: [] } });
      let image;
      try {
        image = (await runImageTask('rotate', await this.frameImage(ctx, key, frame), { degrees: 90 })).image;
      } catch (error) {
        logger.warn('Receipt frame restore failed', { userId, error: error.message });
        await respond(ctx, this.t(lang, 'receipt_draft_outdated'), { reply_markup: { inline_keyboard: [] } });
        return;
      }
      this.track(userId, this.recognizeAndRecord(ctx, {
        image, mimeType: 'image/jpeg', userId, lang: frame.lang, timezone: frame.timezone, currency: frame.currency,
        statusId: messageId, fileId: frame.fileId, sourceMime: frame.mimeType, turn: (frame.turn + 90) % 360,
        prepared: true, retry: false, small: frame.small, lowResolution: frame.lowResolution
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

  // Советы по съёмке; у сжатого Telegram-фото с мелким чеком — ещё «пришли файлом»
  photoTips(lang, lowResolution) {
    const tips = this.t(lang, 'receipt_photo_tips');
    return lowResolution ? `${tips}\n${this.t(lang, 'receipt_small_photo_tip')}` : tips;
  }

  // Черновик: сверка суммы строк с итогом чека, строки страницами по 20 (номер → экран строки), «➕ Добавить строку»,
  // «📅 Дата», «✅ Записать как есть» (после правок — «✅ Записать»; без строк кнопки нет), «🔄 Повернуть» (только пока
  // черновик не правили: новое распознавание стёрло бы правки), «❌ Отмена»
  async buildDraftView(userId, lang, receipt, { canRotate = false, lowResolution = false, page = 0 } = {}) {
    const categories = await this.receiptService.categoriesById(userId);
    const check = sumCheck(receipt);
    const title = receipt.merchant ? this.formatter.escapeMarkdown(receipt.merchant) : this.t(lang, 'receipt_title_default');
    const parts = [`🧾 ${title}`];
    if (receipt.date) parts.push(this.formatter.formatLocalDate(receipt.date) + (receipt.time ? ` ${receipt.time}` : ''));
    parts.push(this.t(lang, 'receipt_items_count', { count: receipt.items.length }), `*${this.formatter.formatAmount(check.itemsTotal, receipt.currency)}*`);
    const lines = [parts.join(' · ')];
    if (!receipt.edited) {
      lines.push(this.t(lang, 'receipt_low_confidence', {
        total: receipt.total !== null ? this.formatter.formatAmount(receipt.total, receipt.currency) : '—'
      }), this.photoTips(lang, lowResolution));
    }
    if (receipt.items.length) lines.push(this.draftSumLine(lang, receipt, check));
    lines.push('');

    const keyboard = [];
    if (!receipt.items.length) {
      lines.push(this.t(lang, 'receipt_draft_empty'));
    } else {
      const pages = Math.ceil(receipt.items.length / PAGE_SIZE);
      const current = Math.min(Math.max(page, 0), pages - 1);
      const start = current * PAGE_SIZE;
      const slice = receipt.items.slice(start, start + PAGE_SIZE);
      slice.forEach((item, i) => {
        const category = categories.get(item.categoryId);
        const categoryName = this.formatter.translateCategoryName(category ? category.name : '—', this.localizationService, lang);
        const label = item.name || categoryName;
        lines.push(`${start + i + 1}. ${this.formatter.escapeMarkdown(this.formatter.shorten(label, NAME_IN_LIST))} — ${this.formatter.formatAmount(item.amount, receipt.currency)} · ${(category && category.icon) || '📦'} ${this.formatter.escapeMarkdown(categoryName)}`);
      });
      lines.push('', this.t(lang, 'receipt_draft_tap_line'));
      for (let i = 0; i < slice.length; i += 5) {
        keyboard.push(slice.slice(i, i + 5).map((item, j) => ({ text: String(start + i + j + 1), callback_data: `rdl|${start + i + j}` })));
      }
      if (pages > 1) {
        keyboard.push([
          current > 0 ? { text: '‹', callback_data: `rdp|${current - 1}` } : { text: ' ', callback_data: 'noop' },
          { text: `${current + 1}/${pages}`, callback_data: 'noop' },
          current < pages - 1 ? { text: '›', callback_data: `rdp|${current + 1}` } : { text: ' ', callback_data: 'noop' }
        ]);
      }
    }
    keyboard.push([
      { text: this.t(lang, 'button_receipt_add_line'), callback_data: 'rda' },
      { text: this.t(lang, 'button_record_date'), callback_data: 'rdt' }
    ]);
    if (receipt.items.length) {
      keyboard.push([{ text: this.t(lang, receipt.edited ? 'button_receipt_record_edited' : 'button_receipt_record_draft'), callback_data: 'rvd|1' }]);
    }
    if (canRotate && !receipt.edited) keyboard.push([{ text: this.t(lang, 'button_receipt_rotate'), callback_data: 'rvr' }]);
    keyboard.push([{ text: this.t(lang, 'button_cancel'), callback_data: 'rvd|0' }]);
    return { text: lines.join('\n'), keyboard };
  }

  // Сумма строк против напечатанного итога: до копейки — «сходится», в пределах 3% (порог уверенности) — «почти
  // сходится» с разницей, иначе — разница
  draftSumLine(lang, receipt, check) {
    const amount = (value) => this.formatter.formatAmount(value, receipt.currency);
    if (check.total === null) return this.t(lang, 'receipt_draft_no_total', { items: amount(check.itemsTotal) });
    const params = { items: amount(check.itemsTotal), total: amount(check.total), diff: amount(Math.abs(check.diff)) };
    if (check.exact) return this.t(lang, 'receipt_draft_sum_ok', params);
    return this.t(lang, check.matches ? 'receipt_draft_sum_close' : 'receipt_draft_sum_diff', params);
  }

  // rvd|1 — записать черновик как есть, rvd|0 — отменить
  async resolveDraft(ctx, record) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const messageId = ctx.callbackQuery.message?.message_id;
    const key = `${userId}:${messageId}`;
    const taken = await this.receiptService.takeDraft(userId, messageId);
    if (taken.status === 'missing') {
      await this.expireButtons(ctx, lang, 'receipt_draft_outdated');
      return;
    }
    if (taken.status === 'busy') {
      await ctx.answerCbQuery().catch(() => {});
      return;
    }
    if (record && !taken.receipt.items.length) {
      await this.receiptService.releaseDraft(userId, messageId);
      await ctx.answerCbQuery(this.t(lang, 'receipt_draft_empty'), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    if (!record) {
      await this.receiptService.deleteDraft(userId, messageId);
      this.frames.delete(key);
      await respond(ctx, this.t(lang, 'receipt_draft_canceled'), { reply_markup: { inline_keyboard: [] } });
      return;
    }
    let receiptId;
    try {
      receiptId = await this.recordReceipt(userId, taken.receipt, taken.timezone);
    } catch (error) {
      await this.receiptService.releaseDraft(userId, messageId).catch(() => {});
      throw error;
    }
    await this.receiptService.deleteDraft(userId, messageId);
    this.frames.delete(key);
    const view = await this.buildReceiptView(userId, lang, receiptId, 0);
    const text = await this.withNotes(ctx, userId, lang, receiptId, view.text);
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
    await this.sendBudgetWarnings(ctx, userId, lang, receiptId);
  }

  // ---------- Правка черновика до записи (строки, категория, новая строка, дата) ----------
  // Черновик правится в БД (receiptService.updateDraft) и переживает перезапуск; записывающийся черновик не правится.
  // Кнопки привязаны к сообщению черновика; ввод текстом — состояние rd_in:<сообщение>:<e — строка | a — новая | d — дата>[:<строка>],
  // после ввода черновик присылается заново под ним и переезжает на новое сообщение.

  // Черновик устарел — объяснить и убрать кнопки, записывается — alert. null — показывать нечего
  async usableDraft(ctx, lang, draft) {
    if (draft.status === 'missing') {
      await this.expireButtons(ctx, lang, 'receipt_draft_outdated');
      return null;
    }
    if (draft.status === 'busy') {
      await ctx.answerCbQuery(this.t(lang, 'receipt_draft_busy'), { show_alert: true }).catch(() => {});
      return null;
    }
    return draft;
  }

  async loadDraft(ctx, lang) {
    return this.usableDraft(ctx, lang, await this.receiptService.getDraft(ctx.from.id, ctx.callbackQuery.message?.message_id));
  }

  draftView(userId, lang, draft, page) {
    return this.buildDraftView(userId, lang, draft.receipt, {
      canRotate: !!draft.frame, lowResolution: !!(draft.frame && draft.frame.lowResolution), page
    });
  }

  async renderDraft(ctx, userId, lang, draft, page) {
    const view = await this.draftView(userId, lang, draft, page);
    await respond(ctx, view.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
  }

  lineLabel(item, categories, lang) {
    const category = categories.get(item.categoryId);
    const categoryName = this.formatter.translateCategoryName(category ? category.name : '—', this.localizationService, lang);
    return { label: item.name || categoryName, categoryName, icon: (category && category.icon) || '📦' };
  }

  // rdp|<page> — черновик (страница строк), сюда же «⬅️ К черновику»
  async showDraft(ctx, page = 0) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const draft = await this.loadDraft(ctx, lang);
    if (!draft) return;
    await ctx.answerCbQuery().catch(() => {});
    await this.renderDraft(ctx, userId, lang, draft, page);
  }

  // rdl|<строка> — экран строки: название, сумма, количество × цена (если известны), категория
  async showDraftLine(ctx, index) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const draft = await this.loadDraft(ctx, lang);
    if (!draft) return;
    await ctx.answerCbQuery().catch(() => {});
    const { receipt } = draft;
    const item = receipt.items[index];
    if (!item) return this.renderDraft(ctx, userId, lang, draft, 0);
    const { label, categoryName, icon } = this.lineLabel(item, await this.receiptService.categoriesById(userId), lang);
    let amountLine = `💰 *${this.formatter.formatAmount(item.amount, receipt.currency)}*`;
    if (item.price !== null && item.price !== undefined && Number(item.quantity) > 0) {
      amountLine += ` · ${this.t(lang, 'receipt_line_quantity', {
        quantity: String(Number(item.quantity)).replace('.', ','), price: this.formatter.formatAmount(Number(item.price), receipt.currency)
      })}`;
    }
    const text = [
      this.t(lang, 'receipt_line_title', { n: index + 1, count: receipt.items.length }), '',
      `📝 ${this.formatter.escapeMarkdown(label)}`, amountLine, `🏷 ${icon} ${this.formatter.escapeMarkdown(categoryName)}`
    ].join('\n');
    await respond(ctx, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.t(lang, 'button_edit_record'), callback_data: `rde|${index}` },
            { text: this.t(lang, 'button_change_category'), callback_data: `rdc|${index}` }
          ],
          [{ text: this.t(lang, 'button_receipt_remove_line'), callback_data: `rdx|${index}` }],
          [{ text: this.t(lang, 'button_receipt_back_to_draft'), callback_data: `rdp|${Math.floor(index / PAGE_SIZE)}` }]
        ]
      }
    });
  }

  // rde|<строка> — новая сумма и/или название следующим сообщением (разбор и лимиты — как у ✏️ записи)
  async startDraftLineEdit(ctx, index) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const draft = await this.loadDraft(ctx, lang);
    if (!draft) return;
    await ctx.answerCbQuery().catch(() => {});
    const item = draft.receipt.items[index];
    if (!item) return this.renderDraft(ctx, userId, lang, draft, 0);
    const { label } = this.lineLabel(item, await this.receiptService.categoriesById(userId), lang);
    this.stateService.setUserState(userId, `rd_in:${ctx.callbackQuery.message.message_id}:e:${index}`);
    const current = `${this.formatter.escapeMarkdown(this.formatter.shorten(label, NAME_IN_LIST))} — ${this.formatter.formatAmount(item.amount, draft.receipt.currency)}`;
    await respond(ctx, this.t(lang, 'receipt_line_edit_prompt', { n: index + 1, current }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_back'), callback_data: `rdl|${index}` }]] }
    });
  }

  // rda — новая строка следующим сообщением («120 хлеб»; категория — запомненная по названию, иначе «Другое»)
  async startDraftLineAdd(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const draft = await this.loadDraft(ctx, lang);
    if (!draft) return;
    if (draft.receipt.items.length >= MAX_ITEMS) {
      await ctx.answerCbQuery(this.t(lang, 'receipt_line_limit', { max: MAX_ITEMS }), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    this.stateService.setUserState(userId, `rd_in:${ctx.callbackQuery.message.message_id}:a`);
    const lastPage = Math.max(0, Math.ceil(draft.receipt.items.length / PAGE_SIZE) - 1);
    await respond(ctx, this.t(lang, 'receipt_line_add_prompt'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_back'), callback_data: `rdp|${lastPage}` }]] }
    });
  }

  // rdc|<строка> — категории пользователя для строки
  async chooseDraftLineCategory(ctx, index) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const draft = await this.loadDraft(ctx, lang);
    if (!draft) return;
    await ctx.answerCbQuery().catch(() => {});
    if (!draft.receipt.items[index]) return this.renderDraft(ctx, userId, lang, draft, 0);
    const categories = await this.expenseService.getCategories(userId);
    const keyboard = [];
    for (let i = 0; i < categories.length; i += 2) {
      keyboard.push(categories.slice(i, i + 2).map(category => ({
        text: `${category.icon} ${this.formatter.translateCategoryName(category.name, this.localizationService, lang)}`,
        callback_data: `rds|${index}|${category.id}`
      })));
    }
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: `rdl|${index}` }]);
    await respond(ctx, this.t(lang, 'receipt_line_category', { n: index + 1 }), { reply_markup: { inline_keyboard: keyboard } });
  }

  // rds|<строка>|<categoryId>
  async setDraftLineCategory(ctx, index, categoryId) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const category = (await this.expenseService.getCategories(userId)).find(c => c.id === categoryId);
    if (!category) {
      await ctx.answerCbQuery(this.t(lang, 'callback_data_not_found')).catch(() => {});
      return;
    }
    const draft = await this.usableDraft(ctx, lang, await this.receiptService.updateDraft(
      userId, ctx.callbackQuery.message?.message_id, (receipt) => setLineCategory(receipt, index, categoryId)
    ));
    if (!draft) return;
    await ctx.answerCbQuery(draft.status === 'ok' ? this.t(lang, 'expense_category_changed', {
      category: this.formatter.translateCategoryName(category.name, this.localizationService, lang)
    }) : undefined).catch(() => {});
    await this.renderDraft(ctx, userId, lang, draft, Math.floor(index / PAGE_SIZE));
  }

  // rdx|<строка> — убрать строку (последнюю тоже: пустой черновик просто нельзя записать)
  async removeDraftLine(ctx, index) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const draft = await this.usableDraft(ctx, lang, await this.receiptService.updateDraft(
      userId, ctx.callbackQuery.message?.message_id, (receipt) => removeLine(receipt, index)
    ));
    if (!draft) return;
    await ctx.answerCbQuery(draft.status === 'ok' ? this.t(lang, 'receipt_line_removed') : undefined).catch(() => {});
    await this.renderDraft(ctx, userId, lang, draft, Math.floor(index / PAGE_SIZE));
  }

  // rdt — дата покупки: тот же выбор дня, что у записи
  async showDraftDatePicker(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const draft = await this.loadDraft(ctx, lang);
    if (!draft) return;
    await ctx.answerCbQuery().catch(() => {});
    const { receipt } = draft;
    const timezone = await this.userService.getUserTimezone(userId);
    const current = receipt.date
      ? this.formatter.formatLocalDate(receipt.date) + (receipt.time ? ` ${receipt.time}` : '')
      : this.t(lang, 'date_not_set');
    const keyboard = datePickerKeyboard((key) => this.t(lang, key), {
      today: localToday(timezone), current: receipt.date, pick: (date) => `rdt|${packDate(date)}`, other: 'rdto', back: 'rdp|0'
    });
    await respond(ctx, this.t(lang, 'date_picker_draft_title', { current }), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // rdt|<YYYYMMDD>
  async setDraftDateFromButton(ctx, packed) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const timezone = await this.userService.getUserTimezone(userId);
    const date = unpackDate(packed);
    const error = date ? checkRecordDate(date, localToday(timezone)) : 'format';
    if (error) {
      await ctx.answerCbQuery(this.t(lang, DATE_ERROR_KEYS[error]), { show_alert: true }).catch(() => {});
      return;
    }
    const draft = await this.usableDraft(ctx, lang, await this.receiptService.updateDraft(
      userId, ctx.callbackQuery.message?.message_id, (receipt) => setDraftDate(receipt, date, localNow(timezone))
    ));
    if (!draft) return;
    await ctx.answerCbQuery(this.t(lang, 'date_changed', { date: this.formatter.formatLocalDate(date) })).catch(() => {});
    await this.renderDraft(ctx, userId, lang, draft, 0);
  }

  // rdto — другая дата текстом
  async startDraftDateInput(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const draft = await this.loadDraft(ctx, lang);
    if (!draft) return;
    await ctx.answerCbQuery().catch(() => {});
    this.stateService.setUserState(userId, `rd_in:${ctx.callbackQuery.message.message_id}:d`);
    await respond(ctx, this.t(lang, 'date_enter_prompt'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_back'), callback_data: 'rdt' }]] }
    });
  }

  // Ввод при rd_in:<сообщение>:<op>[:<строка>]. Ошибка ввода — подсказка, ввод ждёт дальше
  async handleDraftInput(ctx, text, lang, state) {
    const userId = ctx.from.id;
    const [, messagePart, op, indexPart] = state.split(':');
    const messageId = Number(messagePart);
    const index = Number(indexPart);
    let change;
    if (op === 'd') {
      const timezone = await this.userService.getUserTimezone(userId);
      const parsed = parseRecordDate(text, localToday(timezone));
      if (parsed.error) return ctx.reply(this.t(lang, DATE_ERROR_KEYS[parsed.error]), { parse_mode: 'Markdown' });
      change = (receipt) => setDraftDate(receipt, parsed.date, localNow(timezone));
    } else {
      const limits = await this.premiumService.getUserLimits(userId);
      const parsed = this.validator.parseEditExpense(text, limits.MAX_DESCRIPTION_LENGTH);
      if (!parsed.isValid) return ctx.reply(this.expenseHandlers.editErrorText(lang, parsed.error, limits.MAX_DESCRIPTION_LENGTH));
      if (op === 'e') {
        change = (receipt) => editLine(receipt, index, { amount: parsed.amount, name: parsed.description });
      } else {
        if (parsed.amount === undefined) return ctx.reply(this.t(lang, 'receipt_line_need_amount'), { parse_mode: 'Markdown' });
        const categories = await this.expenseService.getCategories(userId);
        const category = await this.expenseService.getRememberedCategory(userId, parsed.description, categories)
          || await this.expenseService.getDefaultCategory();
        change = (receipt) => addLine(receipt, { amount: parsed.amount, name: parsed.description, categoryId: category.id });
      }
    }
    const draft = await this.receiptService.updateDraft(userId, messageId, change);
    this.stateService.deleteUserState(userId);
    if (draft.status === 'missing') return ctx.reply(this.t(lang, 'receipt_draft_outdated'));
    if (draft.status === 'busy') return ctx.reply(this.t(lang, 'receipt_draft_busy'));
    if (draft.status === 'unchanged' && op === 'a') await ctx.reply(this.t(lang, 'receipt_line_limit', { max: MAX_ITEMS }));
    const items = draft.receipt.items.length;
    const page = op === 'e' ? Math.floor(index / PAGE_SIZE) : op === 'a' ? Math.max(0, Math.ceil(items / PAGE_SIZE) - 1) : 0;
    await this.resendDraft(ctx, userId, lang, messageId, draft, page);
  }

  // Черновик под вводом пользователя: новое сообщение, черновик переезжает на него, у старого (там была подсказка
  // ввода) кнопки убираются
  async resendDraft(ctx, userId, lang, messageId, draft, page) {
    const view = await this.draftView(userId, lang, draft, page);
    const sent = await ctx.reply(view.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
    if (!(await this.receiptService.moveDraft(userId, messageId, sent.message_id))) {
      await ctx.telegram.editMessageText(ctx.chat.id, sent.message_id, undefined, this.t(lang, 'receipt_draft_outdated')).catch(() => {});
      return;
    }
    const cached = this.frames.get(`${userId}:${messageId}`);
    this.frames.delete(`${userId}:${messageId}`);
    if (cached) this.frames.set(`${userId}:${sent.message_id}`, cached);
    await ctx.telegram.editMessageReplyMarkup(ctx.chat.id, messageId, undefined, { inline_keyboard: [] }).catch(() => {});
  }

  // Записанный чек: строка достижений (первый чек, серия…) и подколка злого режима под списком
  async withNotes(ctx, userId, lang, receiptId, text) {
    const achievements = this.achievementService ? await this.achievementService.track(userId, 'receipt_recorded', { lang }) : '';
    const expenses = await this.receiptService.getExpenses(userId, receiptId);
    const roast = await this.expenseHandlers.roastNote(ctx, userId, lang, expenses, { source: 'receipt' });
    const note = [achievements, roast].filter(Boolean).join('\n\n');
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
    keyboard.push([{ text: this.t(lang, 'button_receipt_date'), callback_data: `rt|${receiptId}` }]);
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

  // ---------- Дата записанного чека: purchased_date и день всех его трат (время каждой остаётся) ----------

  // Чек можно перенести (не отменён). Иначе — alert, null
  async activeReceipt(ctx, lang, receiptId) {
    const receipt = await this.receiptService.getReceipt(ctx.from.id, receiptId);
    if (receipt && receipt.status !== 'undone') return receipt;
    await ctx.answerCbQuery(this.t(lang, receipt ? 'receipt_already_undone' : 'receipt_not_found'), { show_alert: true }).catch(() => {});
    return null;
  }

  // rt|<id> — выбор дня
  async showReceiptDatePicker(ctx, receiptId) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const receipt = await this.activeReceipt(ctx, lang, receiptId);
    if (!receipt) return;
    await ctx.answerCbQuery().catch(() => {});
    const timezone = await this.userService.getUserTimezone(userId);
    const expenses = await this.receiptService.getExpenses(userId, receiptId);
    const current = receipt.purchased_day || (expenses[0] ? localDateOf(expenses[0].created_at_utc, timezone) : null);
    const keyboard = datePickerKeyboard((key) => this.t(lang, key), {
      today: localToday(timezone), current,
      pick: (date) => `rtd|${receiptId}|${packDate(date)}`, other: `rto|${receiptId}`, back: `rv|${receiptId}|0`
    });
    await respond(ctx, this.t(lang, 'date_picker_receipt_title', {
      current: current ? this.formatter.formatLocalDate(current) : this.t(lang, 'date_not_set')
    }), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // Проверка дня и перенос чека: { date, result } или { error } (ключ текста)
  async moveReceipt(userId, receiptId, date) {
    const timezone = await this.userService.getUserTimezone(userId);
    const result = await this.receiptService.setDate(userId, receiptId, date, timezone);
    return result ? { result } : { error: 'receipt_already_undone' };
  }

  // rtd|<id>|<YYYYMMDD>
  async setReceiptDate(ctx, receiptId, packed) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const timezone = await this.userService.getUserTimezone(userId);
    const date = unpackDate(packed);
    const error = date ? checkRecordDate(date, localToday(timezone)) : 'format';
    if (error) {
      await ctx.answerCbQuery(this.t(lang, DATE_ERROR_KEYS[error]), { show_alert: true }).catch(() => {});
      return;
    }
    const moved = await this.moveReceipt(userId, receiptId, date);
    if (moved.error) {
      await ctx.answerCbQuery(this.t(lang, moved.error), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery(this.t(lang, 'receipt_date_changed', { date: this.formatter.formatLocalDate(date), count: moved.result.expenses })).catch(() => {});
    const view = await this.buildReceiptView(userId, lang, receiptId, 0);
    await respond(ctx, view.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
  }

  // rto|<id> — другая дата текстом (состояние dt_in:r:<чек>:<сообщение с подсказкой>)
  async startReceiptDateInput(ctx, receiptId) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (!(await this.activeReceipt(ctx, lang, receiptId))) return;
    await ctx.answerCbQuery().catch(() => {});
    this.stateService.setUserState(userId, `dt_in:r:${receiptId}:${ctx.callbackQuery.message.message_id}`);
    await respond(ctx, this.t(lang, 'date_enter_prompt'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_back'), callback_data: `rt|${receiptId}` }]] }
    });
  }

  async handleReceiptDateInput(ctx, text, lang, state) {
    const userId = ctx.from.id;
    const [, , receiptPart, messagePart] = state.split(':');
    const receiptId = Number(receiptPart);
    const timezone = await this.userService.getUserTimezone(userId);
    const parsed = parseRecordDate(text, localToday(timezone));
    if (parsed.error) return ctx.reply(this.t(lang, DATE_ERROR_KEYS[parsed.error]), { parse_mode: 'Markdown' });
    const moved = await this.moveReceipt(userId, receiptId, parsed.date);
    this.stateService.deleteUserState(userId);
    if (moved.error) return ctx.reply(this.t(lang, moved.error));
    await ctx.telegram.editMessageReplyMarkup(ctx.chat.id, Number(messagePart), undefined, { inline_keyboard: [] }).catch(() => {});
    const view = await this.buildReceiptView(userId, lang, receiptId, 0);
    const note = this.t(lang, 'receipt_date_changed', { date: this.formatter.formatLocalDate(parsed.date), count: moved.result.expenses });
    await ctx.reply(`${note}\n\n${view.text}`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
  }
}

ReceiptHandlers.isImageDocument = isImageDocument;
ReceiptHandlers.pickPhotoSize = pickPhotoSize;
ReceiptHandlers.MAX_FILE_BYTES = MAX_FILE_BYTES;
ReceiptHandlers.keepTyping = keepTyping;

module.exports = ReceiptHandlers;
