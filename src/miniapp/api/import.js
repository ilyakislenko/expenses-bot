const crypto = require('crypto');
const { upload } = require('../upload');
const logger = require('../../utils/logger');
const { ImportError, MAX_FILE_BYTES, isSupportedDocument } = require('../../utils/statement');
const { parseStatementIsolated } = require('../../utils/statement/worker');
const { categoryLabel } = require('../serialize');

// «Импорт выписки» (как ImportHandlers в боте): файл → превью (ничего не записано) → правки → запись одной партией;
// история партий с отменой. Тот же разбор (utils/statement в отдельном потоке), те же лимиты (20 МБ, 5000 операций,
// rateLimiter 'import': 10 файлов за 10 минут — общий счётчик с ботом) и та же память превью в ImportService
// (30 минут, до 5 на пользователя) — под id вида app:<random> вместо id сообщения.
//   GET    /api/import → { imports: [{ id, source, sourceLabel, createdAt, expenses, incomes, period }] }
//   POST   /api/import/preview?name=<имя файла> (тело — файл) → превью (ниже)
//   GET    /api/import/preview/:id → превью
//   PATCH  /api/import/preview/:id { transfers: bool } → превью
//   PATCH  /api/import/preview/:id/operations/:index { include?: bool, categoryId?: int } → превью
//   POST   /api/import/preview/:id/confirm → { importId, expenses, incomes, skipped, achievement }
//   DELETE /api/import/preview/:id → { ok } (отмена превью)
//   DELETE /api/import/:id → { expenses, incomes } (отмена импорта; нет партии — 404 import_undone)
// Превью: { id, source, sourceLabel, period, dateOrder, currency, expenses, incomes, transfers { count, out, in, include },
//   toWriteCount, topCategories, skipped, operations: [{ index, kind, date, time, amount, currency, description,
//   category, status: new|transfer|manual|duplicate|own, excluded, write }], categories }
const ERROR_CODES = {
  csv_columns: 'import_csv_columns',
  unknown_format: 'import_unknown_format',
  pdf: 'import_pdf_error',
  empty: 'import_empty',
  too_many: 'import_too_many',
  too_complex: 'import_too_complex'
};
const ID_PATTERN = /^app:[0-9a-f]{16}$/;

// Текст бота (заметка о достижении) — в приложении без разметки Markdown
const plain = (text) => String(text || '').replace(/\\([_*[\]`])/g, '$1').replace(/[*_`]/g, '');

module.exports = (router, { get, http }) => {
  const sessionOf = (ctx, id) => {
    if (!ID_PATTERN.test(String(id))) throw http.badRequest('import_outdated');
    const session = get('importService').getSession(ctx.userId, id);
    if (!session) throw http.badRequest('import_outdated'); // устарела или уже записывается
    return session;
  };

  const categoriesOf = async (ctx) => (await get('expenseService').getCategories(ctx.userId))
    .map(c => ({ id: Number(c.id), label: categoryLabel(c.name, ctx, get), icon: c.icon || '📦' }));

  async function preview(ctx, id, session) {
    const summary = await get('importService').summarize(session, ctx.currency);
    const include = session.includeTransfers === true;
    const operations = session.operations.map((op, index) => {
      const status = op.status === 'new' && op.isTransfer ? 'transfer' : op.status;
      return {
        index,
        kind: op.kind,
        date: op.date.slice(0, 10),
        time: op.date.slice(11, 16),
        amount: op.amount,
        currency: op.currency,
        description: op.description || null,
        category: op.kind === 'expense' && op.categoryId ? { id: Number(op.categoryId), label: categoryLabel(op.categoryName, ctx, get), icon: op.categoryIcon || '📦' } : null,
        status,
        excluded: !!op.excluded,
        write: op.status === 'new' && !op.excluded && (!op.isTransfer || include)
      };
    });
    return {
      id,
      source: session.source,
      sourceLabel: ctx.t(`import_source_${session.source}`),
      period: summary.period,
      dateOrder: session.dateOrder && session.dateOrder.guessed ? session.dateOrder.order : null,
      currency: ctx.currency,
      expenses: summary.expenses,
      incomes: summary.incomes,
      transfers: { ...summary.transfers, include },
      toWriteCount: summary.toWriteCount,
      topCategories: summary.topCategories.map(c => ({ label: categoryLabel(c.name, ctx, get), icon: c.icon || '📦', total: Math.round(c.total * 100) / 100 })),
      skipped: { ...summary.skipped, excluded: session.operations.filter(op => op.status === 'new' && op.excluded).length },
      operations,
      categories: await categoriesOf(ctx)
    };
  }

  router.get('/import', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const rows = await get('importService').history(ctx.userId, ctx.timezone);
    res.json({
      imports: rows.map(row => ({
        id: Number(row.id),
        source: row.source,
        sourceLabel: ctx.t(`import_source_${row.source}`),
        createdAt: new Date(row.created_at).toISOString(),
        expenses: Number(row.expenses),
        incomes: Number(row.incomes),
        period: row.first_day ? { from: row.first_day, to: row.last_day } : null
      }))
    });
  }));

  // Лимит и тип файла (по имени и заголовку) — до чтения тела (upload.js); размер больше 20 МБ — 413 too_large
  const fileUpload = upload({
    limit: MAX_FILE_BYTES,
    type: () => true,
    before: (req, ctx) => {
      http.rateLimit(get, ctx.userId, 'import', 'import_rate');
      const name = http.str(req.query.name, { max: 255, def: '' });
      if (!isSupportedDocument({ file_name: name, mime_type: req.get('content-type') })) throw http.badRequest('import_unsupported_file');
    }
  });

  router.post('/import/preview', fileUpload, http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!buffer.length) throw http.badRequest('import_unsupported_file');
    if (buffer.length > MAX_FILE_BYTES) throw http.badRequest('import_file_too_big');

    let parsed;
    try {
      parsed = await parseStatementIsolated(buffer, { defaultCurrency: ctx.currency });
    } catch (error) {
      if (!(error instanceof ImportError)) throw error;
      logger.info('Statement not imported', { userId: ctx.userId, reason: error.code, app: true });
      throw http.badRequest(ERROR_CODES[error.code] || 'import_unknown_format');
    }
    const importService = get('importService');
    const session = await importService.prepare(ctx.userId, parsed);
    // Переводы в приложении — переключатель, по умолчанию выключен (бот советует их пропустить)
    if (session.operations.some(op => op.status === 'new' && op.isTransfer)) session.includeTransfers = false;
    const id = `app:${crypto.randomBytes(8).toString('hex')}`;
    importService.saveSession(ctx.userId, id, session);
    res.json(await preview(ctx, id, session));
  }));

  router.get('/import/preview/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    res.json(await preview(ctx, req.params.id, sessionOf(ctx, req.params.id)));
  }));

  router.patch('/import/preview/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const session = sessionOf(ctx, req.params.id);
    const body = req.body || {};
    if (typeof body.transfers !== 'boolean') throw http.badRequest('bad_request');
    session.includeTransfers = body.transfers;
    res.json(await preview(ctx, req.params.id, session));
  }));

  router.patch('/import/preview/:id/operations/:index', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const session = sessionOf(ctx, req.params.id);
    const index = http.int(req.params.index, { min: 0, max: session.operations.length - 1 });
    const body = req.body || {};
    const changes = {};
    if (body.include !== undefined) {
      if (typeof body.include !== 'boolean') throw http.badRequest('bad_request');
      changes.include = body.include;
    }
    if (body.categoryId !== undefined) changes.categoryId = http.int(body.categoryId, { min: 1 });
    if (!Object.keys(changes).length) throw http.badRequest('bad_request');
    if (!await get('importService').updateOperation(ctx.userId, session, index, changes)) throw http.badRequest('import_operation_locked');
    res.json(await preview(ctx, req.params.id, session));
  }));

  router.post('/import/preview/:id/confirm', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const id = req.params.id;
    if (!ID_PATTERN.test(String(id))) throw http.badRequest('import_outdated');
    const importService = get('importService');
    // Из двух одновременных подтверждений запишет только первое; второе (и повтор после записи) — «устарела»
    const session = importService.takeSession(ctx.userId, id);
    if (!session) throw http.badRequest('import_outdated');
    let result;
    try {
      result = await importService.confirm(ctx.userId, id, session, ctx.currency);
    } catch (error) {
      logger.error('Statement import failed', { userId: ctx.userId, error: error.message, app: true });
      throw new http.HttpError(500, 'import_failed');
    }
    let achievement = '';
    if (result.importId) {
      const achievementService = get('achievementService');
      if (achievementService) achievement = plain(await achievementService.track(ctx.userId, 'import_done', { lang: ctx.lang }));
    }
    res.json({ importId: result.importId, expenses: result.expenses, incomes: result.incomes, skipped: result.skipped, achievement: achievement || null });
  }));

  router.delete('/import/preview/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const importService = get('importService');
    // Уже записывается (null) — не трогаем: запись сама её забудет
    if (ID_PATTERN.test(String(req.params.id)) && importService.getSession(ctx.userId, req.params.id)) {
      importService.deleteSession(ctx.userId, req.params.id);
    }
    res.json({ ok: true });
  }));

  router.delete('/import/:id', http.wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) throw http.notFound('import_undone');
    const ctx = await req.ctx();
    const result = await get('importService').undo(ctx.userId, id);
    if (!result) throw http.notFound('import_undone');
    res.json(result);
  }));
};
