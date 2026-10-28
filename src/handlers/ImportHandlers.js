const respond = require('../utils/respond');
const logger = require('../utils/logger');
const { ImportError, MAX_FILE_BYTES, isSupportedDocument } = require('../utils/statement');
const { parseStatementIsolated } = require('../utils/statement/worker');
const { downloadTelegramFile } = require('../utils/telegramFile');

const ERROR_KEYS = {
  csv_columns: 'import_csv_columns',
  unknown_format: 'import_unknown_format',
  pdf: 'import_pdf_error',
  empty: 'import_empty',
  too_many: 'import_too_many',
  too_complex: 'import_too_complex'
};

// Импорт банковской выписки: файл (.csv/.pdf/.txt) в любой момент → превью (ничего не записано) →
// выбор по переводам → запись одной партией с кнопкой отмены. Сам файл не сохраняется.
class ImportHandlers {
  constructor({ importService, expenseService, userService, localizationService, formatter, receiptService, achievementService = null }) {
    this.importService = importService;
    this.expenseService = expenseService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.receiptService = receiptService;
    this.achievementService = achievementService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // «☰ Ещё» → «📥 Импорт выписки» и /import: поддерживаемые форматы и как выгрузить выписку
  async showIntro(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    // Подсказка про фото чека — только если распознавание настроено
    const text = this.receiptService && this.receiptService.configured
      ? `${this.t(lang, 'import_intro')}\n\n${this.t(lang, 'import_receipt_hint')}`
      : this.t(lang, 'import_intro');
    await respond(ctx, text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_back'), callback_data: 'back_to_menu' }]] }
    });
  }

  async download(ctx, fileId) {
    return downloadTelegramFile(ctx.telegram, fileId, { maxBytes: MAX_FILE_BYTES });
  }

  async handleDocument(ctx) {
    const userId = ctx.from.id;
    const document = ctx.message.document;
    const lang = await this.userService.getUserLanguage(userId);
    if (!isSupportedDocument(document)) {
      await ctx.reply(this.t(lang, 'import_unsupported_file'));
      return;
    }
    if (document.file_size > MAX_FILE_BYTES) {
      await ctx.reply(this.t(lang, 'import_file_too_big'));
      return;
    }
    await ctx.sendChatAction('typing').catch(() => {});

    let buffer;
    try {
      buffer = await this.download(ctx, document.file_id);
    } catch (error) {
      logger.warn('Statement download failed', { userId, error: error.message });
      await ctx.reply(this.t(lang, 'import_download_error'));
      return;
    }
    if (buffer.length > MAX_FILE_BYTES) {
      await ctx.reply(this.t(lang, 'import_file_too_big'));
      return;
    }

    const userCurrency = await this.userService.getUserCurrency(userId);
    let parsed;
    try {
      parsed = await parseStatementIsolated(buffer, { defaultCurrency: userCurrency });
    } catch (error) {
      if (!(error instanceof ImportError)) throw error;
      logger.info('Statement not imported', { userId, reason: error.code });
      await ctx.reply(this.t(lang, ERROR_KEYS[error.code], error.params), { parse_mode: 'Markdown' });
      return;
    }

    const session = await this.importService.prepare(userId, parsed);
    const { text, keyboard } = await this.renderPreview(lang, session, userCurrency);
    const message = await ctx.reply(text, { parse_mode: 'Markdown', ...(keyboard.length ? { reply_markup: { inline_keyboard: keyboard } } : {}) });
    if (keyboard.length) this.importService.saveSession(userId, message.message_id, session);
  }

  // Выписка этого сообщения: undefined — устарела (alert, кнопки превью убираются), null — уже записывается (тихо)
  async sessionFor(ctx, lang, take = false) {
    const messageId = ctx.callbackQuery.message?.message_id;
    const session = take
      ? this.importService.takeSession(ctx.from.id, messageId)
      : this.importService.getSession(ctx.from.id, messageId);
    if (session === undefined) {
      await ctx.answerCbQuery(this.t(lang, 'import_outdated'), { show_alert: true }).catch(() => {});
      await Promise.resolve().then(() => ctx.editMessageReplyMarkup({ inline_keyboard: [] })).catch(() => {});
    } else if (session === null) await ctx.answerCbQuery().catch(() => {});
    return session;
  }

  // imx|1 — учесть переводы, imx|0 — пропустить
  async setTransfers(ctx, include) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const session = await this.sessionFor(ctx, lang);
    if (!session) return;
    session.includeTransfers = include;
    await ctx.answerCbQuery().catch(() => {});
    const userCurrency = await this.userService.getUserCurrency(userId);
    const { text, keyboard } = await this.renderPreview(lang, session, userCurrency);
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // imgo — записать
  async confirm(ctx) {
    const userId = ctx.from.id;
    const messageId = ctx.callbackQuery.message?.message_id;
    const lang = await this.userService.getUserLanguage(userId);
    const session = await this.sessionFor(ctx, lang, true);
    if (!session) return;
    await ctx.answerCbQuery().catch(() => {});
    const userCurrency = await this.userService.getUserCurrency(userId);
    const summary = await this.importService.summarize(session, userCurrency);
    let result;
    try {
      result = await this.importService.commit(userId, session);
    } catch (error) {
      logger.error('Statement import failed', { userId, error: error.message });
      this.importService.saveSession(userId, messageId, session);
      await ctx.reply(this.t(lang, 'import_error'));
      return;
    }
    this.importService.deleteSession(userId, messageId);

    const skipped = { ...summary.skipped, duplicates: summary.skipped.duplicates + result.raced };
    const lines = [
      this.t(lang, 'import_done_title'),
      this.t(lang, 'import_done_expenses', { count: result.expenses }),
      this.t(lang, 'import_done_incomes', { count: result.incomes })
    ];
    const skippedLines = this.skippedLines(lang, skipped);
    if (skippedLines.length) lines.push('', this.t(lang, 'import_done_skipped'), ...skippedLines);
    if (result.importId && this.achievementService) {
      const note = await this.achievementService.track(userId, 'import_done', { lang });
      if (note) lines.push('', note);
    }
    const keyboard = [[{ text: this.t(lang, 'button_overview'), callback_data: 'ov|0' }]];
    if (result.importId) keyboard.push([{ text: this.t(lang, 'button_import_undo'), callback_data: `imu|${result.importId}` }]);
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // imno — отмена до записи
  async cancel(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    this.importService.deleteSession(userId, ctx.callbackQuery.message?.message_id);
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'import_canceled'));
  }

  // imu|<id> — отменить записанный импорт
  async undo(ctx, importId) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const result = await this.importService.undo(userId, importId);
    if (!result) {
      await ctx.answerCbQuery(this.t(lang, 'import_undo_missing'), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'import_undone', result), {
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_overview'), callback_data: 'ov|0' }]] }
    });
  }

  money(byCurrency, fallbackCurrency) {
    if (!byCurrency.length) return this.formatter.formatAmount(0, fallbackCurrency);
    return byCurrency.map(({ currency, total }) => this.formatter.formatAmount(total, currency)).join(' + ');
  }

  skippedLines(lang, skipped) {
    const lines = [];
    const add = (count, key) => {
      if (count) lines.push(this.t(lang, key, { count }));
    };
    add(skipped.duplicates, 'import_skip_duplicates');
    add(skipped.manual, 'import_skip_manual');
    add(skipped.transfers, 'import_skip_transfers');
    add(skipped.failed, 'import_skip_failed');
    add(skipped.currency, 'import_skip_currency');
    add(skipped.invalid, 'import_skip_invalid');
    return lines;
  }

  // Превью: период, траты и доходы, топ категорий, переводы (вопрос или выбор), пропуски; кнопки по шагу
  async renderPreview(lang, session, userCurrency) {
    const summary = await this.importService.summarize(session, userCurrency);
    const lines = [this.t(lang, 'import_preview_title', { source: this.t(lang, `import_source_${session.source}`) })];
    if (summary.period) {
      const { from, to } = summary.period;
      const period = from === to
        ? this.formatter.formatLocalDate(from)
        : `${this.formatter.formatLocalDate(from)} – ${this.formatter.formatLocalDate(to)}`;
      lines.push(`📅 ${period}`);
    }
    // Даты вида 10/05 без дней больше 12: порядок угадан — сказать, как прочитан
    if (session.dateOrder && session.dateOrder.guessed) lines.push(this.t(lang, `import_date_order_${session.dateOrder.order}`));
    const counts = [];
    if (summary.expenses.count) {
      counts.push(this.t(lang, 'import_preview_expenses', { count: summary.expenses.count, total: this.money(summary.expenses.byCurrency, userCurrency) }));
    }
    if (summary.incomes.count) {
      counts.push(this.t(lang, 'import_preview_incomes', { count: summary.incomes.count, total: this.money(summary.incomes.byCurrency, userCurrency) }));
    }
    if (counts.length) lines.push('', ...counts);
    if (summary.topCategories.length) {
      lines.push('', this.t(lang, 'import_preview_top'));
      for (const category of summary.topCategories) {
        const name = this.formatter.escapeMarkdown(this.expenseService.translateCategoryName(category.name, this.localizationService, lang));
        lines.push(`${category.icon || '📦'} ${name} — ${this.formatter.formatAmount(category.total, userCurrency)}`);
      }
    }
    const transfers = summary.transfers;
    if (transfers.count) {
      lines.push('', this.t(lang, 'import_preview_transfers', {
        count: transfers.count,
        out: this.money(transfers.out, userCurrency),
        in: this.money(transfers.in, userCurrency)
      }));
      const choiceKey = session.includeTransfers === null ? 'import_preview_transfers_ask'
        : session.includeTransfers ? 'import_preview_transfers_on' : 'import_preview_transfers_off';
      lines.push(this.t(lang, choiceKey));
    }
    const skippedLines = this.skippedLines(lang, summary.skipped);
    if (skippedLines.length) lines.push('', this.t(lang, 'import_preview_skipped'), ...skippedLines);

    const keyboard = [];
    const cancelRow = [{ text: this.t(lang, 'button_cancel'), callback_data: 'imno' }];
    const transfersOn = { text: this.t(lang, 'button_import_transfers_on', { count: transfers.count }), callback_data: 'imx|1' };
    const transfersOff = { text: this.t(lang, 'button_import_transfers_off'), callback_data: 'imx|0' };
    if (!summary.toWriteCount && !transfers.count) {
      lines.push('', this.t(lang, 'import_nothing_new'));
      return { text: lines.join('\n'), keyboard };
    }
    lines.push('', this.t(lang, 'import_preview_footer'));
    if (transfers.count && session.includeTransfers === null) {
      keyboard.push([transfersOn], [transfersOff], cancelRow);
    } else {
      if (summary.toWriteCount) keyboard.push([{ text: this.t(lang, 'button_import_confirm'), callback_data: 'imgo' }]);
      if (transfers.count) keyboard.push([session.includeTransfers ? transfersOff : transfersOn]);
      keyboard.push(cancelRow);
    }
    return { text: lines.join('\n'), keyboard };
  }
}

module.exports = ImportHandlers;
