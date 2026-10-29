const logger = require('../utils/logger');
const { SUPPORTED_CURRENCIES } = require('../config/currencies');
const { USER_LIMITS } = require('../utils/constants');
const { buildPrompt, SYSTEM_CATEGORY_HINTS } = require('./receipt/prompt');
const { normalizeReceipt, receiptDate, localMonthStart, localNow } = require('./receipt/normalize');
const { withLineIds } = require('./receipt/draftEdit');
const { runImageTask } = require('./receipt/imageWorker');
const { ReceiptError } = require('./receipt/errors');
const { MAX_RECORD_AGE_DAYS } = require('../utils/recordDate');

const DRAFT_TTL_DAYS = 7; // черновик чека и кадр для «повернуть» (receipt_drafts)
const DRAFT_TAKE_STALE_SECONDS = 300; // захват черновика под запись, после которого его можно взять снова (сбой записи)

// QR кассового чека (receipt/qr.js) точнее модели: итог, дата и время — из него, валюта — рубли (QR есть только на
// российских чеках). Модель не прочитала фото, а QR прочитан, — одна строка на итог (qrOnly: черновик — название и
// категорию поправит пользователь)
function withQr(raw, qr, itemName) {
  const fromQr = { is_receipt: true, total: qr.total, date: qr.date, time: qr.time, currency: 'RUB' };
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(raw.items) && raw.items.length) {
    return { raw: { ...raw, ...fromQr }, qrOnly: false };
  }
  const merchant = raw && typeof raw === 'object' && typeof raw.merchant === 'string' ? raw.merchant : null;
  return {
    raw: { ...fromQr, merchant, discount: null, items: [{ name: itemName, quantity: 1, price: qr.total, amount: qr.total, category: null }] },
    qrOnly: true
  };
}
// Повторять с поворотом: ответ не разобран (в том числе битый JSON) или цифрам нельзя верить. Не повторяем, если чек с
// текстом-«командой» (поворот его не исправит, а локальная модель занята минуты) или прочитан явно правильно ориентированным:
// три строки и больше, а сумма строк в пределах 3% от итога — сомнения только в отдельных строках, поворот их не улучшит,
// а перевёрнутый кадр маленькая модель читает выдумкой
const ORIENTED_LINES = 3;
const ORIENTED_DEVIATION = 0.03;
function readUpright(receipt) {
  const deviation = receipt.checks.sumDeviation;
  return receipt.items.length >= ORIENTED_LINES && deviation !== null && deviation <= ORIENTED_DEVIATION;
}

function needsRetry(result) {
  if (result.error) return result.error.code === 'unreadable';
  return result.receipt.lowConfidence && !result.receipt.checks.suspicious && !readUpright(result.receipt);
}

// Строки, где сумма = round(количество × цена)
function exactLines(receipt) {
  return receipt.items.filter(item => item.price !== null && Math.abs(Math.round(item.quantity * item.price * 100) / 100 - item.amount) < 0.005).length;
}

// Лучший из двух ответов: распознанный лучше ошибки; ответ из многих строк лучше ответа из одной-двух (одна строка на весь
// итог — типичная выдумка на перевёрнутом кадре, даже если «сходится»); уверенный лучше черновика, дальше — больше строк,
// где сумма = количество × цена, затем сумма ближе к итогу. При равенстве — первый
function pickBetter(first, second) {
  if (!first.receipt || !second.receipt) return first.receipt ? first : second.receipt ? second : first;
  const a = first.receipt;
  const b = second.receipt;
  const linesA = a.items.length;
  const linesB = b.items.length;
  if (linesA >= ORIENTED_LINES && linesB <= SPARSE_ITEMS) return first;
  if (linesB >= ORIENTED_LINES && linesA <= SPARSE_ITEMS) return second;
  if (a.lowConfidence !== b.lowConfidence) return a.lowConfidence ? second : first;
  const exactA = exactLines(a);
  const exactB = exactLines(b);
  if (exactA !== exactB) return exactB > exactA ? second : first;
  const deviation = (receipt) => (receipt.checks.sumDeviation === null ? 0 : receipt.checks.sumDeviation);
  return deviation(b) < deviation(a) ? second : first;
}

// Мелкий чек в кадре и одна-две позиции — типичная выдумка маленькой модели (например, одна строка на весь итог,
// которую нечем проверить): не записываем сами, показываем черновик
const SPARSE_ITEMS = 2;
function distrustSparse(result, small) {
  if (!small || !result.receipt || result.receipt.items.length > SPARSE_ITEMS) return result;
  const receipt = result.receipt;
  return { ...result, receipt: { ...receipt, lowConfidence: true, checks: { ...receipt.checks, smallImage: true } } };
}

// Фото чека → траты по позициям. Распознаёт провайдер (receipt/providers.js), ответ проверяет normalize.js,
// записываются все позиции сразу одной транзакцией.
class ReceiptService {
  constructor({ receiptRepository, provider, expenseService, premiumService, localizationService, funnelService, referralService = null }) {
    this.receiptRepository = receiptRepository;
    this.provider = provider;
    this.expenseService = expenseService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.funnelService = funnelService;
    this.referralService = referralService;
  }

  get configured() {
    return !!(this.provider && this.provider.configured);
  }

  // Сколько чеков в месяц даёт премиум (для подсказки при исчерпанном бесплатном лимите)
  get premiumLimit() {
    return USER_LIMITS.premium.MAX_RECEIPTS_PER_MONTH;
  }

  // Месячный лимит распознаваний (локальный календарный месяц): записанные чеки и фото без записи — показанный
  // черновик или «не получилось распознать» (addAttempt, одна попытка на фото, повороты её не добавляют). Сбои
  // сервиса, «не чек» и «валюта не поддерживается» не считаются
  async checkLimit(userId, timezone) {
    const isPremium = await this.premiumService.isPremiumUser(userId);
    const limit = (isPremium ? USER_LIMITS.premium : USER_LIMITS.regular).MAX_RECEIPTS_PER_MONTH;
    const used = await this.receiptRepository.countSince(userId, localMonthStart(timezone), timezone);
    return { isPremium, limit, used, remaining: Math.max(0, limit - used) };
  }

  // Фото сообщения messageId показано без записи ('draft' | 'unreadable'): засчитывается в лимит один раз (повторный
  // вызов для того же сообщения — та же попытка), id — в черновик
  async addAttempt(userId, messageId, outcome) {
    return this.receiptRepository.addAttempt(userId, messageId, outcome);
  }

  // Фото этого сообщения уже засчитано — его поворот лимит не тратит
  async hasAttempt(userId, messageId) {
    return this.receiptRepository.hasAttempt(userId, messageId);
  }

  // Категории пользователя для подсказки модели и обратного сопоставления (по названию на его языке и в БД)
  async categoryChoices(userId, lang) {
    const [categories, fallback] = await Promise.all([
      this.expenseService.getCategories(userId),
      this.expenseService.getDefaultCategory()
    ]);
    const label = (name) => this.expenseService.translateCategoryName(name, this.localizationService, lang);
    return {
      labels: categories.map(category => ({
        name: label(category.name),
        hint: Number(category.user_id) === 0 ? SYSTEM_CATEGORY_HINTS[category.name] : undefined
      })),
      fallbackLabel: label(fallback.name),
      fallbackCategoryId: fallback.id,
      choices: categories.map(category => ({ id: category.id, names: [label(category.name), category.name] }))
    };
  }

  // Распознаёт фото. Ошибки — ReceiptError (receipt/errors.js). onStatus({ position, local }) — очередь и начало работы слота.
  // qr — данные QR кассового чека с этого фото (receipt/qr.js) или null
  async recognize(userId, { image, mimeType, lang, currency, timezone, onStatus, qr = null }) {
    const { labels, fallbackLabel, fallbackCategoryId, choices } = await this.categoryChoices(userId, lang);
    const today = localNow(timezone).date;
    const prompt = buildPrompt({ categories: labels, fallbackCategory: fallbackLabel, defaultCurrency: currency, today });
    const started = Date.now();
    let raw = null;
    try {
      raw = await this.provider.recognize({ image, mimeType, prompt, onStatus, owner: userId });
    } catch (error) {
      // Модель фото не разобрала (или в кадре только QR), а QR прочитан — чек из одного QR, иначе ошибка как раньше
      if (!qr || !(error instanceof ReceiptError) || !['unreadable', 'not_receipt'].includes(error.code)) throw error;
    }
    const qrItem = qr ? this.localizationService.getText(lang, 'receipt_qr_item') : null;
    const normalize = (value) => normalizeReceipt(value, { categories: choices, fallbackCategoryId, defaultCurrency: currency, supportedCurrencies: SUPPORTED_CURRENCIES });
    let qrOnly = false;
    if (qr) ({ raw, qrOnly } = withQr(raw, qr, qrItem));
    let receipt;
    try {
      receipt = normalize(raw);
    } catch (error) {
      // Строки модели негодны (нет сумм, пересказ примера), а QR прочитан — чек из одного QR
      if (!qr || qrOnly || !(error instanceof ReceiptError) || !['unreadable', 'not_receipt'].includes(error.code)) throw error;
      ({ raw, qrOnly } = withQr(null, qr, qrItem));
      receipt = normalize(raw);
    }
    if (qr) receipt = { ...receipt, lowConfidence: receipt.lowConfidence || qrOnly, checks: { ...receipt.checks, qr: true, ...(qrOnly ? { qrOnly: true } : {}) } };
    // «1 января этого года» — то, что модель пишет вместо непрочитанной даты (знает из запроса только год): дата не прочитана
    else if (receipt.date === `${today.slice(0, 4)}-01-01`) receipt = { ...receipt, date: null, time: null, checks: { ...receipt.checks, guessedDate: true } };
    logger.info('Receipt recognized', {
      userId, items: receipt.items.length, mismatch: receipt.mismatch, lowConfidence: receipt.lowConfidence, checks: receipt.checks, ms: Date.now() - started
    });
    return receipt;
  }

  // Одна попытка: { receipt } или { error } (ReceiptError)
  async attempt(userId, options) {
    try {
      return { receipt: await this.recognize(userId, options) };
    } catch (error) {
      return { error: error instanceof ReceiptError ? error : new ReceiptError('unavailable', error.message) };
    }
  }

  // Фото → подготовка (EXIF, поиск чека, поворот строк, размер) → распознавание; если ответ не читается или ему
  // нельзя верить — ещё одна попытка с кадром, повёрнутым на 180°, и выбор лучшего ответа.
  // prepared — image уже подготовлен (повтор по кнопке «повернуть»; small/lowResolution — из первой подготовки),
  // retry — разрешена вторая попытка. onRetry() — перед второй попыткой.
  // Возвращает { receipt | error, image, mimeType, turn, attempts, small, lowResolution } — image/mimeType кадра, давшего ответ
  // (его поворачивает кнопка «повернуть на 90°»), turn — на сколько градусов он повёрнут относительно подготовленного
  // (0 или 180); small — чек мелкий в кадре, lowResolution — к тому же сжатое фото
  async recognizePhoto(userId, { image, mimeType, lang, currency, timezone, onStatus, onRetry, prepared = false, retry = true, small = false, lowResolution = false }) {
    // QR ищется в том же кадре параллельно с подготовкой (в подготовленном кадре чек обрезан и QR может пропасть)
    const qrTask = runImageTask('qr', image).then(result => result.qr || null).catch(() => null);
    let prep = { image, mimeType, info: { prepared: true, reused: true, small, lowResolution } };
    if (!prepared) {
      prep = await runImageTask('prepare', image, { mimeType });
      logger.info('Receipt image prepared', { userId, ...prep.info });
    }
    const isSmall = Boolean(prep.info.small);
    const qr = await qrTask;
    const options = { lang, currency, timezone, onStatus, qr };
    const run = async (frame, frameType, turn) => ({ ...distrustSparse(await this.attempt(userId, { ...options, image: frame, mimeType: frameType }), isSmall), image: frame, mimeType: frameType, turn });
    let best = await run(prep.image, prep.mimeType, 0);
    let attempts = 1;
    if (retry && needsRetry(best) && prep.mimeType === 'image/jpeg' && prep.info.prepared) {
      if (onRetry) await onRetry();
      const rotated = (await runImageTask('rotate', prep.image, { degrees: 180 })).image;
      best = pickBetter(best, await run(rotated, 'image/jpeg', 180));
      attempts = 2;
    }
    logger.info('Receipt recognition result', {
      userId, attempts, error: best.error ? best.error.code : null,
      lowConfidence: best.receipt ? best.receipt.lowConfidence : null, checks: best.receipt ? best.receipt.checks : null
    });
    return { ...best, attempts, small: isSmall, lowResolution: Boolean(prep.info.lowResolution) };
  }

  // ---------- Черновик неуверенно распознанного чека и кадр для «повернуть» ----------
  // Хранятся в БД (receipt_drafts) DRAFT_TTL_DAYS дней: кнопки работают и после перезапуска бота.
  // Сам кадр не хранится — только file_id фото в Telegram и поворот (frame.turn), по ним кадр готовится заново.

  async saveDraft(userId, messageId, { receipt = null, timezone = null, frame = null }) {
    await this.receiptRepository.saveDraft(userId, messageId, { receipt, timezone, frame }, DRAFT_TTL_DAYS);
  }

  // { status: 'ok', receipt, timezone } | { status: 'busy' } | { status: 'missing' }
  async takeDraft(userId, messageId) {
    return this.receiptRepository.takeDraft(userId, messageId, DRAFT_TAKE_STALE_SECONDS);
  }

  async releaseDraft(userId, messageId) {
    await this.receiptRepository.releaseDraft(userId, messageId);
  }

  async deleteDraft(userId, messageId) {
    await this.receiptRepository.deleteDraft(userId, messageId);
  }

  // Черновик для показа: { status: 'ok', receipt, frame, timezone } | { status: 'busy' } | { status: 'missing' }.
  // У строк всегда есть id (старые черновики получают их по порядку)
  async getDraft(userId, messageId) {
    const draft = await this.receiptRepository.getDraft(userId, messageId, DRAFT_TAKE_STALE_SECONDS);
    return draft.receipt ? { ...draft, receipt: withLineIds(draft.receipt) } : draft;
  }

  // Правка черновика: change(receipt) — функция из receipt/draftEdit.js (новый черновик или null — менять нечего).
  // Записывающийся черновик не правится. { status: 'ok' | 'unchanged', receipt, frame, timezone } | busy | missing
  async updateDraft(userId, messageId, change) {
    const draft = await this.receiptRepository.updateDraft(userId, messageId, DRAFT_TAKE_STALE_SECONDS, (receipt) => change(withLineIds(receipt)));
    return draft.receipt ? { ...draft, receipt: withLineIds(draft.receipt) } : draft;
  }

  // Черновик переехал на новое сообщение (прислан заново после ввода текстом). false — уже не переедет
  async moveDraft(userId, fromMessageId, toMessageId) {
    return this.receiptRepository.moveDraft(userId, fromMessageId, toMessageId);
  }

  // Кадр для «повернуть»: { frame, receipt (прежний черновик или null), timezone }; черновик остаётся в БД с отметкой
  // «поворачивается», пока новое распознавание не закончится. null — нет, устарел или уже поворачивается
  async takeFrame(userId, messageId) {
    return this.receiptRepository.takeFrame(userId, messageId, DRAFT_TAKE_STALE_SECONDS);
  }

  // Поворот прервался перезапуском: черновик и кадр снова доступны ({ frame, receipt, timezone } или null)
  async releaseFrame(userId, messageId) {
    return this.receiptRepository.releaseFrame(userId, messageId);
  }

  // Категории пользователя по id (для черновика чека до записи)
  async categoriesById(userId) {
    const categories = await this.expenseService.getCategories(userId);
    return new Map(categories.map(category => [category.id, category]));
  }

  // Записывает позиции тратами (описание — название позиции в пределах лимита описания пользователя).
  // Дата трат — дата чека, если она не в будущем и не старше 60 дней (выбранная в черновике вручную — года), иначе
  // сегодня (receiptDate); её же получает чек (заголовок показывает день, где лежат траты). Чек заменяет в лимите
  // попытку своего фото (receipt.attemptId черновика или messageId сообщения фото). Возвращает id чека.
  async record(userId, receipt, { timezone, familyId = null, messageId = null }) {
    const limits = await this.premiumService.getUserLimits(userId);
    const items = receipt.items.map(item => ({
      amount: item.amount,
      categoryId: item.categoryId,
      description: item.name ? item.name.slice(0, limits.MAX_DESCRIPTION_LENGTH).trim() : null,
      quantity: item.quantity,
      unitPrice: item.price
    }));
    const when = receiptDate(receipt, timezone, new Date(), MAX_RECORD_AGE_DAYS);
    const receiptId = await this.receiptRepository.create(userId, {
      merchant: receipt.merchant,
      date: when.date,
      time: when.time,
      currency: receipt.currency,
      total: receipt.total,
      itemsTotal: receipt.itemsTotal,
      localAt: when.localAt,
      timezone,
      familyId,
      items,
      attemptId: receipt.attemptId || null,
      messageId
    });
    await this.funnelService.track(userId, 'first_expense');
    // Позиции чека — тоже траты: награда за приглашение в фоне (сервис сам ловит ошибки)
    if (this.referralService) this.referralService.onExpenseRecorded(userId);
    return receiptId;
  }

  async getReceipt(userId, receiptId) {
    return this.receiptRepository.getById(userId, receiptId);
  }

  // Другой день чека: purchased_date и все его оставшиеся траты одной транзакцией (время каждой остаётся).
  // null — чек не найден или отменён, иначе { expenses: перенесено трат }
  async setDate(userId, receiptId, date, timezone) {
    const result = await this.receiptRepository.setDate(userId, receiptId, date, timezone);
    if (result) logger.info('Receipt date changed', { userId, receiptId, date, ...result });
    return result;
  }

  async getExpenses(userId, receiptId) {
    return this.receiptRepository.getExpenses(userId, receiptId);
  }

  async confirm(userId, receiptId) {
    return this.receiptRepository.setStatus(userId, receiptId, 'confirmed');
  }

  async undo(userId, receiptId) {
    const result = await this.receiptRepository.undo(userId, receiptId);
    if (result) logger.info('Receipt undone', { userId, receiptId, ...result });
    return result;
  }
}

module.exports = ReceiptService;

ReceiptService.pickBetter = pickBetter;
ReceiptService.needsRetry = needsRetry;
ReceiptService.distrustSparse = distrustSparse;
