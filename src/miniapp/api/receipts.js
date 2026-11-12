const { upload } = require('../upload');
const logger = require('../../utils/logger');
const { MAX_RECORD_AGE_DAYS } = require('../../utils/recordDate');
const { receiptDate, localNow } = require('../../services/receipt/normalize');
const { sumCheck, editLine, setLineCategory, removeLine, addLine, setDraftDate, withLineIds } = require('../../services/receipt/draftEdit');
const { runImageTask } = require('../../services/receipt/imageWorker');
const { pickBetter } = require('../../services/ReceiptService');
const serialize = require('../serialize');
const { helpers } = require('./expenses');

// Чеки в Mini App: фото → тот же конвейер, что у фото в боте (ReceiptService.recognizePhoto: подготовка, QR, цепочка
// нейросетей, повтор с поворотом), месячный лимит, один чек за раз, уверенный чек записывается сразу, неуверенный или
// похожий на уже записанный — черновик с правкой строк и даты до записи. Распознавание идёт минутами, поэтому — задачей:
// POST /receipts отвечает сразу { jobId }, клиент спрашивает GET /receipts/jobs/:id.
// Черновик лежит в receipt_drafts, как у бота; ключ сообщения — отрицательный номер задачи (у сообщений Telegram
// номера положительные, пересечься нельзя), им же засчитывается попытка в лимит.

const MAX_JPEG_BYTES = 20 * 1024 * 1024; // как ReceiptHandlers.MAX_FILE_BYTES
const MAX_RAW_IMAGE_BYTES = 1.5 * 1024 * 1024; // png/webp уходят модели как есть — только небольшие
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const JOB_TTL_MS = 30 * 60 * 1000; // задача и подготовленный кадр для «Повернуть» — 30 минут, как кадр в боте
const SERVICE_ERRORS = new Set(['unavailable', 'quota', 'busy', 'not_configured', 'auth', 'network']);

function register(router, { get, http }) {
  const jobs = new Map(); // `${userId}:${jobId}` → задача
  const busy = new Set(); // у кого сейчас распознаётся чек
  let lastJobId = 0;

  const keyOf = (jobId) => -jobId; // message_id попытки и черновика
  const jobKey = (userId, jobId) => `${userId}:${jobId}`;

  function sweep(now = Date.now()) {
    for (const [key, job] of jobs) if (job.status !== 'working' && job.updatedAt + JOB_TTL_MS < now) jobs.delete(key);
  }

  function publicJob(job) {
    const { userId, frame, updatedAt, ...rest } = job;
    return { ...rest, canRotate: !!frame && (rest.status === 'draft' || (rest.status === 'error' && rest.code === 'unreadable')) };
  }

  // Записать чек и собрать строки после записи: достижения, злой режим, бюджеты (один раз на чек)
  async function recordReceipt(ctx, receipt, timezone, messageId) {
    const receiptService = get('receiptService');
    const familyId = await helpers.familyModeTarget(get, ctx.userId);
    const receiptId = await receiptService.record(ctx.userId, receipt, { timezone, familyId, messageId });
    const expenses = await receiptService.getExpenses(ctx.userId, receiptId);
    const categoryNames = [...new Set(expenses.map(e => e.category_name).filter(Boolean))];
    const notes = await helpers.recordNotes(get, ctx, { event: 'receipt_recorded', expenses, source: 'receipt' });
    notes.push(...await helpers.budgetWarnings(get, ctx, categoryNames));
    const dateUnknown = receiptDate(receipt, timezone, new Date(), MAX_RECORD_AGE_DAYS).unknown;
    return { receiptId, notes, dateUnknown };
  }

  // Ответ распознавания → запись, черновик или ошибка (как ReceiptHandlers.recognizeAndRecord).
  // previous — черновик до поворота: если новый ответ не лучше, не разобран или сервис недоступен, он остаётся
  async function settle(ctx, job, result, { previous = null } = {}) {
    const receiptService = get('receiptService');
    const messageId = keyOf(job.id);
    if (result.image && result.mimeType === 'image/jpeg') job.frame = { image: result.image, small: result.small, lowResolution: result.lowResolution };
    if (result.error) logger.warn('Mini app receipt not recognized', { userId: ctx.userId, code: result.error.code, attempts: result.attempts });

    if (previous) {
      const keep = result.error
        ? (SERVICE_ERRORS.has(result.error.code) ? 'rotate_unavailable' : 'rotate_kept')
        : (pickBetter({ receipt: previous }, result).receipt === previous ? 'rotate_kept' : null);
      if (keep) return Object.assign(job, { status: 'draft', draftId: job.id, note: keep });
    }
    if (result.error) {
      const code = result.error.code;
      if (code === 'unreadable') {
        await receiptService.addAttempt(ctx.userId, messageId, 'unreadable');
        return Object.assign(job, { status: 'error', code, lowResolution: !!result.lowResolution, note: job.rotated ? 'rotate_kept' : null });
      }
      // «Не чек» — тоже попытка в месячном лимите (как в боте): запрос к нейросети был
      if (code === 'not_receipt') {
        await receiptService.addAttempt(ctx.userId, messageId, 'not_receipt');
        return Object.assign(job, { status: 'error', code, note: null });
      }
      return Object.assign(job, { status: 'error', code: SERVICE_ERRORS.has(code) ? 'unavailable' : code, currency: (result.error.params || {}).currency || null, note: null });
    }
    const duplicate = await receiptService.findDuplicate(ctx.userId, result.receipt);
    if (result.receipt.lowConfidence || duplicate) {
      const receipt = {
        ...result.receipt,
        attemptId: await receiptService.addAttempt(ctx.userId, messageId, 'draft'),
        ...(duplicate ? { duplicateOf: { id: duplicate.id, createdAt: duplicate.created_at } } : {})
      };
      await receiptService.saveDraft(ctx.userId, messageId, { receipt, timezone: ctx.timezone, frame: null });
      return Object.assign(job, { status: 'draft', draftId: job.id, lowResolution: !!result.lowResolution, note: null });
    }
    const recorded = await recordReceipt(ctx, result.receipt, ctx.timezone, messageId);
    if (previous) await receiptService.deleteDraft(ctx.userId, messageId);
    job.frame = null;
    return Object.assign(job, { status: 'recorded', ...recorded, note: null });
  }

  // Фоновая часть задачи: распознать (или повернуть и распознать заново) и разложить ответ
  function run(ctx, job, options, previous) {
    const receiptService = get('receiptService');
    const onStatus = ({ position, local }) => {
      if (position) Object.assign(job, { stage: 'queued', position });
      else if (job.stage !== 'retrying') Object.assign(job, { stage: local ? 'slow' : 'recognizing', position: 0 });
    };
    const onRetry = () => Object.assign(job, { stage: 'retrying', position: 0 });
    return receiptService.recognizePhoto(ctx.userId, { lang: ctx.lang, currency: ctx.currency, timezone: ctx.timezone, onStatus, onRetry, ...options })
      .then(result => settle(ctx, job, result, { previous }))
      .catch((error) => {
        logger.error('Mini app receipt failed', { userId: ctx.userId, error: error.message, stack: error.stack });
        if (previous) Object.assign(job, { status: 'draft', draftId: job.id, note: 'rotate_unavailable' });
        else Object.assign(job, { status: 'error', code: 'unavailable' });
      })
      .finally(() => {
        job.updatedAt = Date.now();
        busy.delete(ctx.userId);
      });
  }

  // Месячный лимит: 400 receipt_limit с цифрами (бесплатным клиент предлагает премиум)
  async function ensureLimit(ctx) {
    const receiptService = get('receiptService');
    const limit = await receiptService.checkLimit(ctx.userId, ctx.timezone);
    if (!limit.remaining) throw http.badRequest('receipt_limit', { used: limit.used, limit: limit.limit, premium: receiptService.premiumLimit, isPremium: limit.isPremium });
  }

  const mimeOf = (req) => String(req.get('content-type') || '').split(';')[0].trim().toLowerCase().replace('image/jpg', 'image/jpeg');

  // Всё, кроме самого фото, — до чтения тела (upload.js): настроено ли, формат и размер по заголовкам, один чек за раз,
  // rateLimiter 'receipt' (общий счётчик с ботом: 20 фото за 10 минут), месячный лимит
  const receiptUpload = upload({
    limit: MAX_JPEG_BYTES,
    type: ['image/*'],
    before: async (req, ctx) => {
      if (!get('receiptService').configured) throw http.badRequest('receipt_not_configured');
      const mimeType = mimeOf(req);
      if (!IMAGE_TYPES.has(mimeType)) throw http.badRequest('receipt_format');
      if (mimeType !== 'image/jpeg' && Number(req.get('content-length')) > MAX_RAW_IMAGE_BYTES) throw http.badRequest('receipt_format');
      if (busy.has(ctx.userId)) throw new http.HttpError(409, 'receipt_busy');
      busy.add(ctx.userId);
      try {
        http.rateLimit(get, ctx.userId, 'receipt', 'receipt_rate');
        await ensureLimit(ctx);
      } catch (error) {
        busy.delete(ctx.userId);
        throw error;
      }
      return () => busy.delete(ctx.userId);
    }
  });

  // POST /api/receipts (тело — фото) → 202 { jobId }
  router.post('/receipts', receiptUpload, http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const mimeType = mimeOf(req);
    const image = Buffer.isBuffer(req.body) ? req.body : null;
    if (!image || !image.length) throw http.badRequest('receipt_format');
    if (mimeType !== 'image/jpeg' && image.length > MAX_RAW_IMAGE_BYTES) throw http.badRequest('receipt_format');
    sweep();
    const id = Math.max(Date.now(), lastJobId + 1);
    lastJobId = id;
    const job = { id, userId: ctx.userId, status: 'working', stage: 'recognizing', position: 0, updatedAt: Date.now() };
    jobs.set(jobKey(ctx.userId, id), job);
    // Занятость теперь снимает задача (run → finally)
    req.upload.take();
    run(ctx, job, { image, mimeType });
    res.status(202).json({ jobId: id });
  }));

  function findJob(ctx, idValue) {
    const job = jobs.get(jobKey(ctx.userId, http.int(idValue, { min: 1 })));
    if (!job) throw http.notFound('job_not_found');
    return job;
  }

  // GET /api/receipts/jobs/:id — { status: working (stage, position) | recorded (receiptId, notes) | draft (draftId) | error (code) }
  router.get('/receipts/jobs/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    res.json(publicJob(findJob(ctx, req.params.id)));
  }));

  // POST /api/receipts/jobs/:id/rotate — «Повернуть на 90° и попробовать»: тот же кадр, ещё одна попытка без повтора,
  // попытка в лимите не добавляется (то же фото). Исправленный вручную черновик не поворачивается — правки пропали бы.
  // Новый запрос к нейросети — в rateLimiter 'receipt', как «🔄 Повернуть» в боте
  router.post('/receipts/jobs/:id/rotate', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const job = findJob(ctx, req.params.id);
    const canRotate = job.frame && (job.status === 'draft' || (job.status === 'error' && job.code === 'unreadable'));
    if (!canRotate) throw http.badRequest('rotate_unavailable');
    const receiptService = get('receiptService');
    let previous = null;
    if (job.status === 'draft') {
      const draft = await receiptService.getDraft(ctx.userId, keyOf(job.id));
      if (draft.status !== 'ok') throw http.badRequest('rotate_unavailable');
      if (draft.receipt.edited) throw http.badRequest('rotate_edited');
      previous = draft.receipt;
    }
    if (busy.has(ctx.userId)) throw new http.HttpError(409, 'receipt_busy');
    http.rateLimit(get, ctx.userId, 'receipt', 'receipt_rate');
    busy.add(ctx.userId);
    let started = false;
    try {
      const { image, small, lowResolution } = job.frame;
      const rotated = (await runImageTask('rotate', image, { degrees: 90 })).image;
      job.frame = { image: rotated, small, lowResolution };
      Object.assign(job, { status: 'working', stage: 'retrying', position: 0, rotated: true, updatedAt: Date.now() });
      run(ctx, job, { image: rotated, mimeType: 'image/jpeg', prepared: true, retry: false, small, lowResolution }, previous);
      started = true;
      res.status(202).json({ jobId: job.id });
    } finally {
      if (!started) busy.delete(ctx.userId);
    }
  }));

  // ---------- Черновик ----------

  async function categoryMap(ctx) {
    return get('receiptService').categoriesById(ctx.userId);
  }

  function categoryOf(categories, id, ctx) {
    const category = categories.get(id);
    return category ? { id: category.id, name: category.name, label: serialize.categoryLabel(category.name, ctx, get), icon: category.icon || '📦' } : null;
  }

  // Черновик для экрана: заголовок (продавец, день, на который запишутся траты), сверка с итогом, причины сомнений, строки
  async function draftView(ctx, draftId, draft) {
    const receipt = withLineIds(draft.receipt);
    const categories = await categoryMap(ctx);
    const check = sumCheck(receipt);
    const when = receiptDate(receipt, draft.timezone || ctx.timezone, new Date(), MAX_RECORD_AGE_DAYS);
    const checks = receipt.checks || {};
    let doubt = null;
    // Одна причина — один текст (как черновик в боте); уверенный чек, только похожий на записанный, — без сомнений
    if (!receipt.edited && !(receipt.duplicateOf && receipt.lowConfidence === false)) {
      if (checks.suspicious && checks.numbersOk === true && !checks.smallImage) doubt = 'suspicious';
      else doubt = check.matches === false ? 'mismatch' : 'unsure';
    }
    const job = jobs.get(jobKey(ctx.userId, draftId));
    return {
      id: draftId,
      merchant: receipt.merchant || null,
      currency: receipt.currency,
      date: when.date,
      time: when.time,
      dateUnknown: when.unknown,
      total: check.total,
      itemsTotal: check.itemsTotal,
      check: { matches: check.matches, exact: check.exact, diff: check.diff },
      duplicateOf: receipt.duplicateOf ? { id: Number(receipt.duplicateOf.id), createdAt: receipt.duplicateOf.createdAt } : null,
      edited: !!receipt.edited,
      doubt,
      suspicious: !!checks.suspicious && !receipt.edited,
      lowResolution: !!(job && job.frame && job.frame.lowResolution),
      canRotate: !!(job && job.frame) && !receipt.edited,
      jobId: job ? job.id : null,
      items: receipt.items.map(item => ({
        id: item.id,
        name: item.name || null,
        amount: Number(item.amount),
        quantity: item.quantity !== null && item.quantity !== undefined ? Number(item.quantity) : null,
        price: item.price !== null && item.price !== undefined ? Number(item.price) : null,
        category: categoryOf(categories, item.categoryId, ctx)
      }))
    };
  }

  function draftOrError(draft) {
    if (draft.status === 'missing') throw http.notFound('draft_outdated');
    if (draft.status === 'busy') throw new http.HttpError(409, 'draft_busy');
    return draft;
  }

  // GET /api/receipts/drafts/:id
  router.get('/receipts/drafts/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const draftId = http.int(req.params.id, { min: 1 });
    const draft = draftOrError(await get('receiptService').getDraft(ctx.userId, keyOf(draftId)));
    res.json(await draftView(ctx, draftId, draft));
  }));

  // Правка черновика функцией из draftEdit (null — менять нечего) → черновик для экрана
  async function changeDraft(req, res, change) {
    const ctx = await req.ctx();
    const draftId = http.int(req.params.id, { min: 1 });
    const draft = draftOrError(await get('receiptService').updateDraft(ctx.userId, keyOf(draftId), change));
    res.json(await draftView(ctx, draftId, draft));
  }

  async function lineInput(ctx, body, { requireAmount = false } = {}) {
    const validator = get('enhancedValidator');
    const changes = {};
    if (body.amount !== undefined || requireAmount) changes.amount = http.money(body.amount, { max: validator.limits.maxAmount, code: 'ex_amount' });
    if (body.name !== undefined) {
      const limits = await get('premiumService').getUserLimits(ctx.userId);
      changes.name = helpers.descriptionOf(get, http, body.name, limits.MAX_DESCRIPTION_LENGTH) || '';
    }
    return changes;
  }

  // PATCH /api/receipts/drafts/:id { date } — дата покупки (тот же выбор дня, что у записи)
  router.patch('/receipts/drafts/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const date = helpers.recordDateOf(http, (req.body || {}).date, ctx.today);
    await changeDraft(req, res, receipt => setDraftDate(receipt, date, localNow(ctx.timezone)));
  }));

  // POST /api/receipts/drafts/:id/lines { amount, name } — новая строка; категория — запомненная по названию, иначе «Другое»
  router.post('/receipts/drafts/:id/lines', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const { amount, name = '' } = await lineInput(ctx, req.body || {}, { requireAmount: true });
    const expenseService = get('expenseService');
    const categories = await expenseService.getCategories(ctx.userId);
    const category = (name && await expenseService.getRememberedCategory(ctx.userId, name, categories)) || await expenseService.getDefaultCategory();
    await changeDraft(req, res, receipt => addLine(receipt, { amount, name, categoryId: category.id }));
  }));

  // PATCH /api/receipts/drafts/:id/lines/:line { amount, name, categoryId }
  router.patch('/receipts/drafts/:id/lines/:line', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const lineId = http.int(req.params.line, { min: 1 });
    const changes = await lineInput(ctx, body);
    let categoryId;
    if (body.categoryId !== undefined) {
      categoryId = http.int(body.categoryId, { min: 1, code: 'ex_bad_category' });
      if (!(await categoryMap(ctx)).has(categoryId)) throw http.badRequest('ex_bad_category');
    }
    await changeDraft(req, res, (receipt) => {
      let next = receipt;
      if (changes.amount !== undefined || changes.name !== undefined) next = editLine(next, lineId, changes);
      if (next && categoryId !== undefined) next = setLineCategory(next, lineId, categoryId);
      return next;
    });
  }));

  // DELETE /api/receipts/drafts/:id/lines/:line — убрать строку (последнюю тоже — тогда записывать нечего)
  router.delete('/receipts/drafts/:id/lines/:line', http.wrap(async (req, res) => {
    const lineId = http.int(req.params.line, { min: 1 });
    await changeDraft(req, res, receipt => removeLine(receipt, lineId));
  }));

  // POST /api/receipts/drafts/:id/record — «Записать»: повторное нажатие во время записи ничего не делает, сбой — черновик снова доступен
  router.post('/receipts/drafts/:id/record', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const draftId = http.int(req.params.id, { min: 1 });
    const receiptService = get('receiptService');
    const messageId = keyOf(draftId);
    const taken = draftOrError(await receiptService.takeDraft(ctx.userId, messageId));
    if (!taken.receipt.items.length) {
      await receiptService.releaseDraft(ctx.userId, messageId);
      throw http.badRequest('draft_empty');
    }
    try {
      // Черновик без попытки в лимите — новый чек: сверх лимита не записывается
      if (!taken.receipt.attemptId) await ensureLimit(ctx);
      const recorded = await recordReceipt(ctx, taken.receipt, taken.timezone || ctx.timezone, null);
      await receiptService.deleteDraft(ctx.userId, messageId);
      const job = jobs.get(jobKey(ctx.userId, draftId));
      if (job) Object.assign(job, { status: 'recorded', receiptId: recorded.receiptId, frame: null, updatedAt: Date.now() });
      res.status(201).json(recorded);
    } catch (error) {
      await receiptService.releaseDraft(ctx.userId, messageId).catch(() => {});
      throw error;
    }
  }));

  // DELETE /api/receipts/drafts/:id — отменить черновик
  router.delete('/receipts/drafts/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const draftId = http.int(req.params.id, { min: 1 });
    await get('receiptService').deleteDraft(ctx.userId, keyOf(draftId));
    jobs.delete(jobKey(ctx.userId, draftId));
    res.json({ ok: true });
  }));

  // ---------- Записанный чек ----------

  // GET /api/receipts/:id — позиции по текущим данным (после правок и удалений), сверка с итогом, день трат
  router.get('/receipts/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const receiptId = http.int(req.params.id, { min: 1 });
    const receiptService = get('receiptService');
    const receipt = await receiptService.getReceipt(ctx.userId, receiptId);
    if (!receipt) throw http.notFound('receipt_not_found');
    if (receipt.status === 'undone') return res.json({ id: receiptId, status: 'undone', merchant: receipt.merchant || null, expenses: [] });
    const rows = await receiptService.getExpenses(ctx.userId, receiptId);
    const expenses = rows.map(row => serialize.expense(row, ctx, get));
    const totals = new Map();
    for (const e of expenses) totals.set(e.currency, (totals.get(e.currency) || 0) + e.amount);
    const printed = receipt.printed_total !== null && receipt.printed_total !== undefined ? Number(receipt.printed_total) : null;
    const itemsTotal = Number(receipt.items_total);
    res.json({
      id: receiptId,
      status: receipt.status,
      merchant: receipt.merchant || null,
      purchasedDate: receipt.purchased_day || null,
      purchasedTime: receipt.purchased_hm || null,
      createdAt: new Date(receipt.created_at).toISOString(),
      currency: receipt.currency,
      printedTotal: printed,
      itemsTotal,
      mismatch: printed !== null && Math.abs(printed - itemsTotal) > 0.01,
      family: rows.some(row => row.family_id),
      day: expenses.length ? expenses[0].date : null,
      totals: [...totals.entries()].map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 })),
      expenses
    });
  }));

  // POST /api/receipts/:id/confirm — «Всё верно»
  router.post('/receipts/:id/confirm', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const updated = await get('receiptService').confirm(ctx.userId, http.int(req.params.id, { min: 1 }));
    if (!updated) throw http.notFound('receipt_not_found');
    res.json({ ok: true });
  }));

  // POST /api/receipts/:id/undo — отменить чек: удаляются все оставшиеся траты чека
  router.post('/receipts/:id/undo', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const result = await get('receiptService').undo(ctx.userId, http.int(req.params.id, { min: 1 }));
    if (!result) throw http.notFound('receipt_not_found');
    res.json({ removed: result.expenses });
  }));

  // PATCH /api/receipts/:id { date } — дата чека: день всех его трат (время каждой остаётся)
  router.patch('/receipts/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const day = helpers.recordDateOf(http, (req.body || {}).date, ctx.today);
    const result = await get('receiptService').setDate(ctx.userId, http.int(req.params.id, { min: 1 }), day, ctx.timezone);
    if (!result) throw http.notFound('receipt_not_found');
    res.json({ moved: result.expenses });
  }));
}

module.exports = register;
