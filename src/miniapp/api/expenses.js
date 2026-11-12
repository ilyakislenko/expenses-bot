const crypto = require('crypto');
const { upload } = require('../upload');
const { SUPPORTED_CURRENCIES } = require('../../config/currencies');
const { addDays } = require('../../utils/period');
const { checkRecordDate, moveToDate } = require('../../utils/recordDate');
const { parseEntries, MAX_ENTRIES } = require('../../utils/multiEntry');
const { normalizeSpokenText } = require('../../utils/numberWords');
const serialize = require('../serialize');

// Расходы в Mini App: день («Сегодня»), форма траты, несколько записей строкой и голосом, карточка записи, свои категории.
// Правила — как в боте (ExpenseHandlers, MultiEntryHandlers, CategoryService): те же сервисы, лимиты и премиум-условия.

const MAX_INCOME_AMOUNT = 9999999999; // как IncomeHandlers.MAX_INCOME_AMOUNT (incomes.amount DECIMAL(12,2))
const NEW_USER_DAYS = 14; // подсказку «добавь доход или бюджет» видят только новые (PlanningService.allowanceLine)
const UNDO_TTL_MS = 10 * 60 * 1000; // «Вернуть» удалённую запись
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // минута opus/aac — меньше 1 МБ; больше — не запись голоса
const AUDIO_TYPES = ['audio/*', 'video/webm', 'video/mp4', 'application/octet-stream'];
const MAX_VOICE_SECONDS = 60; // как MultiEntryHandlers.MAX_VOICE_SECONDS
const CATEGORY_NAME_MAX = 30; // как ввод своей категории в боте (messages.handleAddCustomCategory)
const PICTOGRAPH = /^\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*$/u;

// Markdown бота (*жирный*, _курсив_, `код`, экранирование) → простой текст для тоста
function plain(text) {
  return String(text || '').replace(/\\([_*`[\]])/g, '$1').replace(/[*_`]/g, '').trim();
}

function groupByCurrency(rows) {
  const totals = new Map();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) || 0) + Number(row.amount));
  return [...totals.entries()].map(([currency, total]) => ({ currency, total }));
}

// Сигнатура аудиоконтейнера записи: ogg (голосовые Telegram, Firefox), webm/matroska (Android, Chrome), mp4/m4a (iOS),
// wav, mp3 (ID3 или кадр MPEG) и ADTS AAC. Остальное (манифесты, картинки, текст) до распознавания не доходит
function isAudioSignature(buffer) {
  if (buffer.length < 12) return false;
  const ascii = (start, end) => buffer.toString('latin1', start, end);
  if (ascii(0, 4) === 'OggS') return true;
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return true;
  if (ascii(4, 8) === 'ftyp') return true;
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return true;
  if (ascii(0, 3) === 'ID3') return true;
  return buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0; // кадр MPEG audio / ADTS
}

// Строка ExpenseRepository.getExpenseById (автор — user_username / user_first_name) → единая форма записи
function serializeCard(row, ctx, get) {
  return serialize.expense({ ...row, username: row.username || row.user_username, first_name: row.first_name || row.user_first_name }, ctx, get);
}

// Семья, видимая пользователю: премиум и участник семьи (ExpenseHandlers.viewerFamily)
async function viewerFamily(get, ctx) {
  return ctx.isPremium ? get('familyService').getUserFamily(ctx.userId) : null;
}

// Семья, куда по умолчанию идут траты («все траты в семью» у премиума с семьёй) — как в боте
async function familyModeTarget(get, userId) {
  return get('expenseHandlers').familyModeTarget(userId);
}

// Предупреждения бюджетов (80% и превышение) после записи — каждое один раз, как ExpenseHandlers.sendBudgetWarnings
async function budgetWarnings(get, ctx, categoryNames) {
  const budgetService = get('budgetService');
  const seen = new Set();
  const lines = [];
  for (const name of [...new Set(categoryNames.filter(Boolean))]) {
    for (const warning of await budgetService.checkAfterExpense(ctx.userId, name)) {
      const key = `${warning.id}:${warning.level}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(plain(budgetService.warningText(ctx.lang, warning)));
    }
  }
  return lines;
}

// Строка достижений (монеты, серия, значки) и злого режима — как к подтверждению записи в боте.
// event — событие AchievementService, expenses — записанные траты (с category_name), source — для злого режима
async function recordNotes(get, ctx, { event, categoryNames = [], expenses = [], source = 'text' }) {
  const broken = [];
  const achievementService = get('achievementService');
  const achievements = achievementService
    ? await achievementService.track(ctx.userId, event, { lang: ctx.lang, categoryNames, broken })
    : '';
  const roastService = get('roastService');
  // Злой режим проверяет, что это личный чат пользователя: Mini App открывается только им самим
  const roast = roastService && expenses.length
    ? await roastService.afterExpenses({ chat: { type: 'private' }, from: { id: ctx.userId } }, { userId: ctx.userId, lang: ctx.lang, expenses, broken, source })
    : '';
  return [achievements, roast].filter(Boolean).map(plain);
}

// Разбор строки «кофе 250, такси 400, +50000 зарплата» (голос — числа словами и без разделителей) → записи с валютой и
// категорией, как их запишет бот. { entries, error: null | 'too_many' | 'amount' }
async function previewEntries(get, ctx, text, { voice = false } = {}) {
  const parsed = voice ? parseEntries(normalizeSpokenText(text), { runs: true }) : parseEntries(text);
  if (!parsed) return { entries: [], error: null };
  if (parsed.length > MAX_ENTRIES) return { entries: [], error: 'too_many', max: MAX_ENTRIES };
  const validator = get('enhancedValidator');
  const maxAmount = { expense: validator.limits.maxAmount, income: MAX_INCOME_AMOUNT };
  const invalid = parsed.some(entry => !(entry.amount >= validator.limits.minAmount && entry.amount <= maxAmount[entry.kind]));
  const expenseService = get('expenseService');
  const hasExpenses = parsed.some(entry => entry.kind === 'expense');
  const [limits, categories, fallback, incomeCurrency] = await Promise.all([
    get('premiumService').getUserLimits(ctx.userId),
    hasExpenses ? expenseService.getCategories(ctx.userId) : [],
    hasExpenses ? expenseService.getDefaultCategory() : null,
    parsed.some(entry => entry.kind === 'income') ? get('incomeService').getIncomeCurrency(ctx.userId) : null
  ]);
  const entries = [];
  for (const entry of parsed) {
    const description = entry.description ? validator.sanitizeText(entry.description, limits.MAX_DESCRIPTION_LENGTH) || null : null;
    const item = { kind: entry.kind, amount: entry.amount, currency: entry.currency || (entry.kind === 'income' ? incomeCurrency : ctx.currency), description };
    if (entry.kind === 'expense') {
      const remembered = await expenseService.getRememberedCategory(ctx.userId, description, categories);
      const category = remembered || fallback;
      item.category = { id: category.id, name: category.name, label: serialize.categoryLabel(category.name, ctx, get), icon: category.icon || '📦' };
      item.guessed = !remembered;
    }
    entries.push(item);
  }
  return { entries, error: invalid ? 'amount' : null };
}

// Категории для формы: частые за 90 дней — первыми, дальше как у бота; свои (премиум) помечены
async function formCategories(get, ctx) {
  const expenseService = get('expenseService');
  const [categories, usage] = await Promise.all([
    expenseService.getCategories(ctx.userId),
    expenseService.getCategoryUsage(ctx.userId)
  ]);
  const rank = new Map(usage.map((item, i) => [item.categoryId, i]));
  return categories
    .map((category, i) => ({ category, i, rank: rank.has(category.id) ? rank.get(category.id) : Infinity }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map(({ category, rank: r }) => ({
      id: category.id,
      name: category.name,
      label: serialize.categoryLabel(category.name, ctx, get),
      icon: category.icon || '📦',
      custom: Number(category.user_id) !== 0,
      used: r !== Infinity
    }));
}

// Своя запись или ошибка: чужой (не семейной) — 404, семейной другого участника — 403 (только просмотр, как в боте)
async function ownExpense(get, ctx, http, id) {
  const row = await get('expenseService').getExpenseById(ctx.userId, id);
  if (!row) throw http.notFound();
  if (Number(row.user_id) !== ctx.userId) throw http.forbidden('ex_not_owner');
  return row;
}

function descriptionOf(get, http, value, max) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const raw = String(value).trim();
  if (raw.length > max) throw http.badRequest('ex_description_too_long', { max });
  return get('enhancedValidator').sanitizeText(raw, max) || null;
}

function currencyOf(http, value, def) {
  if (value === undefined || value === null || value === '') return def;
  const code = String(value).toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(code)) throw http.badRequest('ex_bad_currency');
  return code;
}

// Дата записи: не в будущем и не старше года (utils/recordDate)
function recordDateOf(http, value, today) {
  const date = http.ymd(value, { def: today });
  const error = checkRecordDate(date, today);
  if (error) throw http.badRequest(error === 'future' ? 'ex_date_future' : 'ex_date_too_old');
  return date;
}

// Эмодзи своей категории: одна пиктограмма, иначе 📦 (как ввод в боте)
function categoryIconOf(http, value, def = '📦') {
  if (value === undefined || value === null || value === '') return def;
  const icon = String(value).trim();
  if (icon.length > 16 || !PICTOGRAPH.test(icon)) throw http.badRequest('ex_bad_icon');
  return icon;
}

function categoryNameOf(http, value) {
  const name = String(value === undefined || value === null ? '' : value).trim();
  if (name.length < 1 || name.length > CATEGORY_NAME_MAX) throw http.badRequest('ex_category_name', { max: CATEGORY_NAME_MAX });
  return name;
}

function categoryError(http, error) {
  if (error.code === 'PREMIUM_REQUIRED') return http.premiumRequired('categories');
  if (error.code === 'LIMIT_REACHED') return http.badRequest('ex_category_limit', { max: error.max });
  if (error.code === 'ALREADY_EXISTS') return http.badRequest('ex_category_exists');
  return error;
}

function register(router, { get, http }) {
  const deleted = new Map(); // token → { userId, row, expires } — «Вернуть» удалённую запись
  const voiceBusy = new Set(); // одно голосовое за раз на пользователя (как в боте)

  // ---------- День ----------

  // GET /api/expenses/day?date=&scope=mine|family — записи за день в контуре пользователя или выбранном, итог,
  // «Можно сегодня» (на экране контура пользователя, сегодня), семейный — с автором
  router.get('/expenses/day', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const date = http.ymd(req.query.date, { def: ctx.today });
    if (date > ctx.today) throw http.badRequest('ex_date_future');
    const family = await viewerFamily(get, ctx);
    const homeScope = family && typeof (await get('budgetService').scopeFor(ctx.userId)) === 'object' ? 'family' : 'mine';
    const scope = req.query.scope === 'family' || req.query.scope === 'mine' ? req.query.scope : homeScope;
    if (scope === 'family' && !family) {
      if (!ctx.isPremium) throw http.premiumRequired('family');
      throw http.badRequest('ex_not_family_member');
    }
    const expenseService = get('expenseService');
    const period = { start: date, end: addDays(date, 1) };
    const rows = await expenseService.getExpenses(scope === 'family' ? { familyId: family.id } : ctx.userId, ctx.timezone, period);
    const total = rows.length ? await get('formatter').sumInCurrency(groupByCurrency(rows), ctx.currency) : 0;

    let allowance = null;
    const planningService = get('planningService');
    if (scope === homeScope && date === ctx.today && planningService) {
      try {
        const value = await planningService.getAllowance(ctx.userId);
        if (value.mode !== 'none') {
          allowance = { mode: value.mode, daily: Math.round(value.daily), spentToday: Math.round(value.spentToday), deficit: Math.round(value.deficit || 0), pace: value.pace, currency: value.currency };
        } else {
          const user = await get('userService').getUserById(ctx.userId);
          const ageDays = user && user.created_at ? (Date.now() - new Date(user.created_at).getTime()) / 86400000 : Infinity;
          if (ageDays < NEW_USER_DAYS) allowance = { mode: 'none' };
        }
      } catch (error) {
        allowance = null; // как allowanceLine: ошибка расчёта не ломает экран
      }
    }
    res.json({
      date,
      today: ctx.today,
      scope,
      homeScope,
      canSwitch: !!family,
      currency: ctx.currency,
      total,
      count: rows.length,
      expenses: rows.slice().reverse().map(row => serialize.expense(row, ctx, get)),
      allowance
    });
  }));

  // ---------- Форма траты ----------

  // GET /api/expenses/form — категории (частые первыми), семья по умолчанию, предел описания, чеки и голос
  router.get('/expenses/form', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const [categories, family, target, limits, fallback] = await Promise.all([
      formCategories(get, ctx),
      viewerFamily(get, ctx),
      familyModeTarget(get, ctx.userId),
      get('premiumService').getUserLimits(ctx.userId),
      get('expenseService').getDefaultCategory()
    ]);
    const voiceService = get('voiceService');
    const receiptService = get('receiptService');
    res.json({
      categories,
      defaultCategoryId: fallback.id,
      canFamily: !!family,
      familyDefault: !!target,
      maxDescription: limits.MAX_DESCRIPTION_LENGTH,
      voice: !!(voiceService && voiceService.configured),
      receipts: !!(receiptService && receiptService.configured)
    });
  }));

  // GET /api/expenses/suggest?description= — категория, запомненная по описанию (теги не в счёт), или null
  router.get('/expenses/suggest', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const description = http.str(req.query.description, { def: '', max: 500 });
    if (!description) return res.json({ categoryId: null });
    const expenseService = get('expenseService');
    const categories = await expenseService.getCategories(ctx.userId);
    const remembered = await expenseService.getRememberedCategory(ctx.userId, description, categories);
    res.json({ categoryId: remembered ? remembered.id : null });
  }));

  // POST /api/expenses { amount, currency, description, categoryId, date, family, voice } — одна трата, как выбор
  // категории в боте: та же запись, достижения и злой режим, предупреждения бюджета
  router.post('/expenses', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const validator = get('enhancedValidator');
    const expenseService = get('expenseService');
    const amount = http.money(body.amount, { max: validator.limits.maxAmount, code: 'ex_amount' });
    const currency = currencyOf(http, body.currency, ctx.currency);
    const limits = await get('premiumService').getUserLimits(ctx.userId);
    const description = descriptionOf(get, http, body.description, limits.MAX_DESCRIPTION_LENGTH);
    const categoryId = http.int(body.categoryId, { min: 1, code: 'ex_bad_category' });
    const category = (await expenseService.getCategories(ctx.userId)).find(c => c.id === categoryId);
    if (!category) throw http.badRequest('ex_bad_category');
    const date = recordDateOf(http, body.date, ctx.today);

    let familyId;
    if (body.family === undefined || body.family === null) {
      familyId = await familyModeTarget(get, ctx.userId);
    } else if (body.family) {
      if (!ctx.isPremium) throw http.premiumRequired('family');
      const family = await get('familyService').getUserFamily(ctx.userId);
      if (!family) throw http.badRequest('ex_not_family_member');
      familyId = family.id;
    } else {
      familyId = null;
    }

    const createdAt = date === ctx.today ? null : moveToDate(new Date(), date, ctx.timezone);
    const created = await expenseService.addExpense(ctx.userId, { amount, currency, description, categoryId, familyId, createdAt });
    const notes = await recordNotes(get, ctx, { event: 'expense_added', categoryNames: [category.name], expenses: [{ ...created, category_name: category.name }] });
    if (body.voice) notes.push(...await recordNotes(get, ctx, { event: 'voice_used' }));
    notes.push(...await budgetWarnings(get, ctx, [category.name]));
    const row = await expenseService.getExpenseById(ctx.userId, created.id);
    res.status(201).json({ expense: serializeCard(row || { ...created, category_name: category.name, category_icon: category.icon }, ctx, get), notes });
  }));

  // ---------- Несколько записей строкой и голосом ----------

  // POST /api/expenses/parse { text, voice } — предпросмотр: какие записи получатся, их валюта и категория
  router.post('/expenses/parse', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const text = http.str((req.body || {}).text, { def: '', max: 4000 });
    res.json(await previewEntries(get, ctx, text, { voice: !!(req.body || {}).voice }));
  }));

  // POST /api/expenses/batch { text, voice } — записать: один доход — как «+50000 зарплата» в боте (сервис доходов),
  // иначе все записи одной партией (EntryBatchService), семья — по режиму «все траты в семью»
  router.post('/expenses/batch', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const voice = !!body.voice;
    const text = http.str(body.text, { max: 4000, code: 'ex_no_entries' });
    const preview = await previewEntries(get, ctx, text, { voice });
    if (preview.error === 'too_many') throw http.badRequest('ex_too_many_entries', { max: MAX_ENTRIES });
    if (preview.error === 'amount') throw http.badRequest('ex_amount');
    if (!preview.entries.length) throw http.badRequest('ex_no_entries');

    if (preview.entries.length === 1 && preview.entries[0].kind === 'income') {
      const [entry] = preview.entries;
      const income = await get('incomeService').addIncome(ctx.userId, entry.amount, entry.currency, entry.description);
      const notes = await recordNotes(get, ctx, { event: voice ? 'voice_used' : 'income_added' });
      return res.status(201).json({
        batchId: null,
        expenses: [],
        incomes: [{ id: Number(income.id), amount: Number(income.amount), currency: income.currency, description: income.description || null }],
        notes
      });
    }

    const familyId = await familyModeTarget(get, ctx.userId);
    const entryBatchService = get('entryBatchService');
    const entries = preview.entries.map(({ kind, amount, currency, description }) => ({ kind, amount, currency, description }));
    const { batchId, defaulted } = await entryBatchService.record(ctx.userId, entries, { source: voice ? 'voice' : 'text', familyId });
    const { expenses, incomes } = await entryBatchService.getItems(ctx.userId, batchId);
    const categoryNames = [...new Set(expenses.map(expense => expense.category_name).filter(Boolean))];
    const notes = await recordNotes(get, ctx, {
      event: voice ? 'voice_used' : (expenses.length ? 'expense_added' : 'income_added'),
      categoryNames,
      expenses,
      source: 'batch'
    });
    notes.push(...await budgetWarnings(get, ctx, categoryNames));
    res.status(201).json({
      batchId,
      defaulted,
      expenses: expenses.map(row => serialize.expense(row, ctx, get)),
      incomes: incomes.map(income => ({ id: Number(income.id), amount: Number(income.amount), currency: income.currency, description: income.description || null })),
      notes
    });
  }));

  // POST /api/expenses/batch/:id/undo — «Отменить всё»: удаляет оставшиеся записи партии
  router.post('/expenses/batch/:id/undo', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const result = await get('entryBatchService').undo(ctx.userId, http.int(req.params.id, { min: 1 }));
    if (!result) throw http.notFound('ex_batch_undone');
    res.json({ removed: result.expenses + result.incomes });
  }));

  // POST /api/expenses/voice?duration=<с> (тело — запись голоса) — расшифровка тем же распознаванием, что у голосовых в
  // боте (дневной лимит, одно за раз, rateLimiter 'voice' — общий счётчик с ботом), и предпросмотр записей. Ничего не
  // записывает. Все проверки, кроме самой записи, — до чтения тела (upload.js)
  const voiceUpload = upload({
    limit: MAX_AUDIO_BYTES,
    type: AUDIO_TYPES,
    before: async (req, ctx) => {
      const voiceService = get('voiceService');
      if (!voiceService || !voiceService.configured) throw http.badRequest('voice_not_configured');
      const durationSec = Math.max(0, Math.round(Number(req.query.duration) || 0));
      if (durationSec > MAX_VOICE_SECONDS) throw http.badRequest('voice_too_long', { max: MAX_VOICE_SECONDS });
      if (voiceBusy.has(ctx.userId)) throw new http.HttpError(409, 'voice_busy');
      voiceBusy.add(ctx.userId);
      try {
        http.rateLimit(get, ctx.userId, 'voice', 'voice_rate');
        const limit = await voiceService.checkLimit(ctx.userId, ctx.timezone);
        if (!limit.remaining) throw http.badRequest('voice_limit', { used: limit.used, limit: limit.limit, premium: voiceService.premiumLimit, isPremium: limit.isPremium });
      } catch (error) {
        voiceBusy.delete(ctx.userId);
        throw error;
      }
      return () => voiceBusy.delete(ctx.userId);
    }
  });
  router.post('/expenses/voice', voiceUpload, http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const release = req.upload.take();
    try {
      const audio = Buffer.isBuffer(req.body) ? req.body : null;
      if (!audio || !audio.length) throw http.badRequest('voice_empty');
      if (!isAudioSignature(audio)) throw http.badRequest('voice_format');
      const durationSec = Math.max(0, Math.round(Number(req.query.duration) || 0));
      const transcript = await get('voiceService').transcribe(ctx.userId, audio, {
        lang: ctx.lang, timezone: ctx.timezone, durationSec, usable: text => Boolean(parseEntries(normalizeSpokenText(text), { runs: true }))
      });
      const preview = transcript ? await previewEntries(get, ctx, transcript, { voice: true }) : { entries: [], error: null };
      res.json({ transcript: transcript || '', ...preview });
    } finally {
      release();
    }
  }));

  // ---------- Карточка записи ----------

  // GET /api/expenses/:id — своя запись или семейная участника семьи (просмотр), права — как карточка в боте
  router.get('/expenses/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const row = await get('expenseService').getExpenseById(ctx.userId, http.int(req.params.id, { min: 1 }));
    if (!row) throw http.notFound();
    const isOwner = Number(row.user_id) === ctx.userId;
    const family = isOwner ? await viewerFamily(get, ctx) : null;
    let familyAction = null;
    if (isOwner && ctx.isPremium && family && !row.family_id) familyAction = 'add';
    if (isOwner && ctx.isPremium && row.family_id) familyAction = 'remove';
    res.json({
      expense: serializeCard(row, ctx, get),
      canEdit: isOwner,
      familyAction,
      bank: row.batch_source === 'bank',
      quantity: row.quantity !== null && row.quantity !== undefined ? Number(row.quantity) : null,
      unitPrice: row.unit_price !== null && row.unit_price !== undefined ? Number(row.unit_price) : null,
      recurringId: isOwner && row.recurring_expense_id ? Number(row.recurring_expense_id) : null,
      maxDescription: isOwner ? (await get('premiumService').getUserLimits(ctx.userId)).MAX_DESCRIPTION_LENGTH : null
    });
  }));

  // PATCH /api/expenses/:id { amount, currency, description, categoryId, date } — правка своей записи на месте
  // (как ✏️, 🏷 и 📅 в боте), затем предупреждения бюджета
  router.patch('/expenses/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const id = http.int(req.params.id, { min: 1 });
    const expenseService = get('expenseService');
    const row = await ownExpense(get, ctx, http, id);
    let categoryName = row.category_name;

    const touchesText = ['amount', 'currency', 'description'].some(key => body[key] !== undefined);
    if (touchesText) {
      const validator = get('enhancedValidator');
      const limits = await get('premiumService').getUserLimits(ctx.userId);
      const amount = body.amount !== undefined ? http.money(body.amount, { max: validator.limits.maxAmount, code: 'ex_amount' }) : Number(row.amount);
      const currency = currencyOf(http, body.currency, row.currency);
      const description = body.description !== undefined ? descriptionOf(get, http, body.description, limits.MAX_DESCRIPTION_LENGTH) : row.description;
      const updated = await expenseService.updateExpenseById(ctx.userId, id, { amount, currency, description });
      if (!updated) throw http.notFound();
    }
    if (body.categoryId !== undefined) {
      const categoryId = http.int(body.categoryId, { min: 1, code: 'ex_bad_category' });
      const category = (await expenseService.getCategories(ctx.userId)).find(c => c.id === categoryId);
      if (!category) throw http.badRequest('ex_bad_category');
      if (!(await expenseService.updateExpenseCategory(ctx.userId, id, categoryId))) throw http.notFound();
      categoryName = category.name;
    }
    if (body.date !== undefined) {
      const date = recordDateOf(http, body.date, ctx.today);
      if (!(await expenseService.setExpenseDate(ctx.userId, id, date, ctx.timezone))) throw http.notFound();
    }
    const notes = categoryName ? await budgetWarnings(get, ctx, [categoryName]) : [];
    res.json({ expense: serializeCard(await expenseService.getExpenseById(ctx.userId, id), ctx, get), notes });
  }));

  // POST /api/expenses/:id/family { family: true|false } — в семейный бюджет / из него (премиум, только своя)
  router.post('/expenses/:id/family', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const id = http.int(req.params.id, { min: 1 });
    if (!ctx.isPremium) throw http.premiumRequired('family');
    const row = await ownExpense(get, ctx, http, id);
    const expenseService = get('expenseService');
    if ((req.body || {}).family) {
      const family = await get('familyService').getUserFamily(ctx.userId);
      if (!family) throw http.badRequest('ex_not_family_member');
      if (row.family_id) throw http.badRequest('ex_already_family');
      await expenseService.convertToFamilyExpense(ctx.userId, id, family.id);
    } else {
      if (!row.family_id) throw http.badRequest('ex_not_family_expense');
      await expenseService.removeFromFamilyExpense(ctx.userId, id);
    }
    res.json({ expense: serializeCard(await expenseService.getExpenseById(ctx.userId, id), ctx, get) });
  }));

  // DELETE /api/expenses/:id — удалить свою запись; token — для «Вернуть» в течение 10 минут
  router.delete('/expenses/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const id = http.int(req.params.id, { min: 1 });
    await ownExpense(get, ctx, http, id);
    const row = await get('expenseService').deleteExpenseById(ctx.userId, id);
    if (!row) throw http.notFound();
    const now = Date.now();
    for (const [key, entry] of deleted) if (entry.expires <= now) deleted.delete(key);
    const token = crypto.randomBytes(12).toString('hex');
    deleted.set(token, { userId: ctx.userId, row, expires: now + UNDO_TTL_MS });
    res.json({ token });
  }));

  // POST /api/expenses/restore { token } — «Вернуть» удалённую запись
  router.post('/expenses/restore', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const token = http.str((req.body || {}).token, { max: 64, code: 'ex_undo_expired' });
    const entry = deleted.get(token);
    if (!entry || entry.userId !== ctx.userId || entry.expires <= Date.now()) throw http.notFound('ex_undo_expired');
    deleted.delete(token);
    const restored = await get('expenseService').restoreExpense(ctx.userId, entry.row);
    res.json({ expense: serializeCard(await get('expenseService').getExpenseById(ctx.userId, restored.id), ctx, get) });
  }));

  // ---------- Свои категории (премиум, как «Свои категории» в боте) ----------

  router.get('/categories', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    if (!ctx.isPremium) throw http.premiumRequired('categories');
    const [categories, limits] = await Promise.all([
      get('categoryService').getUserCategories(ctx.userId),
      get('premiumService').getUserLimits(ctx.userId)
    ]);
    res.json({
      categories: categories.map(c => ({ id: Number(c.id), name: c.name, icon: c.icon || '📦' })),
      max: limits.MAX_CUSTOM_CATEGORIES || 0,
      nameMax: CATEGORY_NAME_MAX
    });
  }));

  router.post('/categories', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const name = categoryNameOf(http, body.name);
    const icon = categoryIconOf(http, body.icon);
    try {
      const created = await get('categoryService').createUserCategory(ctx.userId, name, icon);
      res.status(201).json({ category: { id: Number(created.id), name: created.name, icon: created.icon } });
    } catch (error) {
      throw categoryError(http, error);
    }
  }));

  router.patch('/categories/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const id = http.int(req.params.id, { min: 1 });
    const body = req.body || {};
    if (!ctx.isPremium) throw http.premiumRequired('categories');
    const current = (await get('categoryService').getUserCategories(ctx.userId)).find(c => Number(c.id) === id);
    if (!current) throw http.notFound();
    const name = body.name !== undefined ? categoryNameOf(http, body.name) : current.name;
    const icon = categoryIconOf(http, body.icon, current.icon || '📦');
    try {
      const updated = await get('categoryService').updateUserCategory(ctx.userId, id, name, icon);
      if (!updated) throw http.notFound();
      res.json({ category: { id: Number(updated.id), name: updated.name, icon: updated.icon } });
    } catch (error) {
      throw categoryError(http, error);
    }
  }));

  // DELETE /api/categories/:id — траты категории переходят в «Другое», её бюджет удаляется (CategoryService)
  router.delete('/categories/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const id = http.int(req.params.id, { min: 1 });
    let removed;
    try {
      removed = await get('categoryService').deleteUserCategory(ctx.userId, id);
    } catch (error) {
      throw categoryError(http, error);
    }
    if (!removed) throw http.notFound();
    res.json({ ok: true });
  }));
}

module.exports = register;
module.exports.helpers = { plain, budgetWarnings, recordNotes, familyModeTarget, recordDateOf, descriptionOf };
