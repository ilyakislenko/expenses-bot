// Уведомления банка → записи. Без Telegram: принимает тексты (и ключ пересылки), возвращает, что записано и что нет, —
// тот же вызов подойдёт HTTP-приёмнику уведомлений с телефона.
//
// Каждое уведомление: шаблоны (utils/bankNotification) → если не подошли — нейросеть (дневной лимит) → вид операции:
// трата/поступление записываются одной партией (entry_batches.source = 'bank') с датой и временем из текста (или
// пересылки), категория — запомненная по продавцу, иначе известный магазин, иначе по умолчанию; возврат, перевод
// между своими, наличные, отказ, чужая валюта — не записываются (ответ объясняет). Повторы не записываются: то же
// пересланное сообщение, тот же текст (12 часов; с датой/временем в тексте — 62 дня), та же сумма в пределах 2 минут.
const crypto = require('crypto');
const logger = require('../utils/logger');
const { USER_LIMITS } = require('../utils/constants');
const { parse, fingerprint } = require('../utils/bankNotification');
const { buildMessages, normalizeModelAnswer } = require('./bank/model');
const { mapBankCategory } = require('../utils/statement/categories');
const { localNow, resolveReceiptTime } = require('./receipt/normalize');
const { MAX_INCOME_AMOUNT } = require('../handlers/IncomeHandlers');

const MAX_AGE_DAYS = 60; // дата из уведомления старше — запись на сегодня (как у чеков)
const TEXT_WINDOW_HOURS = 12;
const TIMED_TEXT_WINDOW_HOURS = 62 * 24;
const MODEL_DEADLINE_MS = 45000;
const MAX_ITEMS = 30;
const RECORDED = new Set(['expense', 'income']);
// Не записанные, но учтённые (строка в bank_notifications)
const SKIPPED_STORED = new Set(['refund', 'transfer', 'cash', 'declined', 'unsupported', 'unparsed']);

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function shiftDate(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function formatOriginal(original) {
  const amount = Number.isInteger(original.amount) ? String(original.amount) : original.amount.toFixed(2);
  return `${amount} ${original.currency}`;
}

// Местное время операции: дата и время из текста; только время — день пересланного сообщения (вставленного — сегодня),
// а если это время в тот день ещё не наступило — накануне (SMS после полуночи); ничего — время пересланного сообщения.
// Будущее или старше 60 дней — сейчас (localAt null).
function operationTime(parsed, forwardDate, timezone, now) {
  const reference = localNow(timezone, forwardDate && forwardDate < now ? forwardDate : now);
  let { date, time } = parsed;
  if (!date && time) date = time <= reference.time ? reference.date : shiftDate(reference.date, -1);
  if (!date && !time && forwardDate) ({ date, time } = localNow(timezone, forwardDate));
  const localAt = resolveReceiptTime(date, time, timezone, now, MAX_AGE_DAYS);
  return { localAt, hasTime: Boolean(localAt && time), fromText: Boolean(parsed.date || parsed.time) };
}

class BankNotificationService {
  constructor({ bankNotificationRepository, entryBatchService, userService, premiumService, validator, provider = null, modelDeadlineMs = MODEL_DEADLINE_MS }) {
    this.repository = bankNotificationRepository;
    this.entryBatchService = entryBatchService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.validator = validator;
    this.provider = provider;
    this.modelDeadlineMs = modelDeadlineMs;
  }

  get modelAvailable() {
    return Boolean(this.provider && this.provider.configured);
  }

  modelLimit(isPremium) {
    return (isPremium ? USER_LIMITS.premium : USER_LIMITS.regular).MAX_BANK_MODEL_PER_DAY;
  }

  // Ключи повтора: отпечаток текста и источник пересылки (с id пользователя — одинаковые SMS разных людей не связаны)
  keys(userId, item) {
    return {
      textHash: sha256(`${userId}|${fingerprint(item.text)}`),
      forwardKey: item.forwardKey ? sha256(`${userId}|${item.forwardKey}`) : null
    };
  }

  // items: [{ text, forwardKey?, forwardDate? }] (forwardKey — строка источника пересылки, forwardDate — Date).
  // onModel() — перед первым обращением к нейросети (показать «читаю…»).
  // Возвращает { batchId, defaulted, results: [{ index, status, parsed, expenseId, incomeId, existing, refundTargetId,
  // localAt, limit }] }. status: recorded | duplicate | refund | transfer | cash | declined | unsupported | unparsed |
  // model_limit | model_busy
  async ingest(userId, items, { familyId = null, onModel = null, now = new Date() } = {}) {
    const [timezone, isPremium, limits] = await Promise.all([
      this.userService.getUserTimezone(userId),
      this.premiumService.isPremiumUser(userId),
      this.premiumService.getUserLimits(userId)
    ]);
    const today = localNow(timezone, now).date;
    const year = Number(today.slice(0, 4));
    const modelLimit = this.modelLimit(isPremium);
    let modelUsed = null;
    let modelAnnounced = false;

    const results = [];
    for (const [index, item] of items.slice(0, MAX_ITEMS).entries()) {
      const keys = this.keys(userId, item);
      let parsed = parse(item.text, { year });
      let parser = 'template';
      if (!parsed.ok) {
        parser = 'model';
        if (!this.modelAvailable) {
          results.push({ index, status: 'unparsed', parser: 'none', keys, parsed });
          continue;
        }
        if (modelUsed === null) modelUsed = await this.repository.countModelParsed(userId, today);
        if (modelUsed >= modelLimit) {
          results.push({ index, status: 'model_limit', keys, parsed, limit: modelLimit, isPremium });
          continue;
        }
        if (onModel && !modelAnnounced) {
          modelAnnounced = true;
          await onModel();
        }
        const asked = await this.askModel(userId, item.text, year);
        if (asked.busy) {
          results.push({ index, status: 'model_busy', keys, parsed });
          continue;
        }
        modelUsed++;
        parsed = asked.parsed;
      }
      results.push({ index, ...this.classify(parsed, item, keys, parser, limits, timezone, now) });
    }

    // Повторы: внутри пачки (одно уведомление дважды) и уже записанные раньше
    const seen = new Map();
    for (const result of results) {
      if (result.status !== 'recorded') continue;
      const key = [result.keys.textHash, result.keys.forwardKey].filter(Boolean);
      const earlier = key.map(k => seen.get(k)).find(Boolean);
      if (earlier) {
        result.status = 'duplicate';
        result.sameAs = earlier;
        continue;
      }
      key.forEach(k => seen.set(k, result));
      const existing = await this.repository.findDuplicate(userId, {
        ...result.keys,
        kind: result.parsed.kind,
        amount: result.parsed.amount,
        currency: result.parsed.currency,
        localAt: result.localAt,
        hasTime: result.hasTime,
        timezone,
        textWindowHours: result.fromText ? TIMED_TEXT_WINDOW_HOURS : TEXT_WINDOW_HOURS
      });
      if (existing) {
        result.status = 'duplicate';
        result.existing = { expenseId: existing.expense_id, incomeId: existing.income_id };
      }
    }

    for (const result of results) {
      if (result.status === 'refund') {
        result.refundTargetId = await this.repository.findRefundTarget(userId, {
          amount: result.parsed.amount, currency: result.parsed.currency, merchant: result.parsed.merchant
        });
      }
    }

    const toRecord = results.filter(r => r.status === 'recorded');
    const recorded = await this.record(userId, toRecord, { familyId, timezone, today });
    await this.repository.insertMany(userId, results.filter(r => SKIPPED_STORED.has(r.status)).map(r => ({
      ...r.keys,
      outcome: r.status,
      parser: r.parser,
      bank: r.parsed && r.parsed.bank,
      amount: r.parsed && r.parsed.ok ? r.parsed.amount : null,
      currency: r.parsed && r.parsed.ok ? r.parsed.currency : null,
      localAt: r.localAt,
      hasTime: r.hasTime
    })), { timezone, localDay: today });
    for (const duplicate of results.filter(r => r.status === 'duplicate' && r.sameAs)) {
      duplicate.existing = { expenseId: duplicate.sameAs.expenseId || null, incomeId: duplicate.sameAs.incomeId || null };
    }

    logger.info('Bank notifications processed', {
      userId,
      items: items.length,
      statuses: results.map(r => `${r.status}:${r.parser || '-'}:${(r.parsed && r.parsed.bank) || '-'}`)
    });
    return { ...recorded, results };
  }

  // Вид операции и проверки суммы → статус (recorded — ещё не записано, кандидат)
  classify(parsed, item, keys, parser, limits, timezone, now) {
    if (!parsed.ok) return { status: 'unparsed', parser, keys, parsed };
    const when = operationTime(parsed, item.forwardDate || null, timezone, now);
    const base = { parser, keys, parsed, ...when };
    if (!parsed.supported) return { status: 'unsupported', ...base };
    if (!RECORDED.has(parsed.kind)) return { status: parsed.kind, ...base };
    const max = parsed.kind === 'income' ? MAX_INCOME_AMOUNT : this.validator.limits.maxAmount;
    if (!(parsed.amount >= this.validator.limits.minAmount && parsed.amount <= max)) return { status: 'unparsed', ...base };
    return { status: 'recorded', kind: parsed.kind, entry: this.entryOf(parsed, parsed.kind, when.localAt, limits), ...base };
  }

  entryOf(parsed, kind, localAt, limits) {
    const merchant = parsed.merchant ? this.validator.sanitizeText(parsed.merchant, limits.MAX_DESCRIPTION_LENGTH) || null : null;
    let description = merchant;
    if (parsed.original) {
      const suffix = `(${formatOriginal(parsed.original)})`;
      description = this.validator.sanitizeText(merchant ? `${merchant} ${suffix}` : suffix, limits.MAX_DESCRIPTION_LENGTH) || merchant;
    }
    return {
      kind,
      amount: parsed.amount,
      currency: parsed.currency,
      description,
      localAt,
      categoryHint: kind === 'expense' && merchant ? mapBankCategory({ description: merchant }) : null
    };
  }

  // Запись партии и строк уведомлений одной транзакцией; результатам проставляются expenseId / incomeId
  async record(userId, results, { familyId, timezone, today }) {
    if (!results.length) return { batchId: null, defaulted: 0 };
    const entries = results.map(r => r.entry);
    const { batchId, defaulted } = await this.entryBatchService.record(userId, entries, {
      source: 'bank',
      familyId,
      timezone,
      onCreated: async (client, { expenseIds, incomeIds }) => {
        const expenses = results.filter(r => r.entry.kind === 'expense');
        const incomes = results.filter(r => r.entry.kind === 'income');
        expenses.forEach((r, i) => { r.expenseId = expenseIds[i]; });
        incomes.forEach((r, i) => { r.incomeId = incomeIds[i]; });
        await this.repository.insertMany(userId, results.map(r => ({
          ...r.keys,
          outcome: r.entry.kind,
          parser: r.parser,
          bank: r.parsed.bank,
          amount: r.parsed.amount,
          currency: r.parsed.currency,
          localAt: r.localAt,
          hasTime: r.hasTime,
          expenseId: r.expenseId,
          incomeId: r.incomeId
        })), { timezone, localDay: today }, client);
      }
    });
    return { batchId, defaulted };
  }

  // «Всё равно записать» / «Записать как трату»: повтор, перевод между своими, наличные — без проверки повторов.
  // results — из ingest (в памяти обработчика); перевод и наличные с поступлением на счёт — доход
  async recordAnyway(userId, results, { familyId = null, now = new Date() } = {}) {
    const [timezone, limits] = await Promise.all([this.userService.getUserTimezone(userId), this.premiumService.getUserLimits(userId)]);
    const today = localNow(timezone, now).date;
    const forced = results.map((r) => {
      const kind = r.parsed.kind === 'transfer' || r.parsed.kind === 'cash' ? (r.parsed.direction === 'in' ? 'income' : 'expense') : r.parsed.kind;
      return { ...r, status: 'recorded', entry: this.entryOf(r.parsed, kind, r.localAt, limits) };
    });
    const recorded = await this.record(userId, forced, { familyId, timezone, today });
    logger.info('Bank notifications recorded anyway', { userId, items: forced.length });
    return { ...recorded, results: forced };
  }

  // Нейросеть: { parsed } (может быть { ok: false } — не разобрала или это не операция) или { busy: true } — занята,
  // не ответила вовремя или недоступна (в лимит не идёт)
  async askModel(userId, text, year) {
    let cancelled = false;
    let timer = null;
    const deadline = new Promise((resolve) => {
      timer = setTimeout(() => { cancelled = true; resolve({ timeout: true }); }, this.modelDeadlineMs);
    });
    const started = Date.now();
    try {
      const request = this.provider.complete({ messages: buildMessages(text), owner: userId, isCancelled: () => cancelled })
        .then(raw => ({ raw }));
      request.catch(() => {});
      const outcome = await Promise.race([request, deadline]);
      if (outcome.timeout) {
        logger.warn('Bank notification model timeout', { userId, ms: Date.now() - started });
        return { busy: true };
      }
      const parsed = normalizeModelAnswer(outcome.raw, text, { year });
      logger.info('Bank notification parsed by model', { userId, ok: parsed.ok, reason: parsed.reason, kind: parsed.kind, ms: Date.now() - started });
      return { parsed };
    } catch (error) {
      logger.warn('Bank notification model failed', { userId, code: error.code, error: error.message, ms: Date.now() - started });
      if (error.code === 'unreadable') return { parsed: { ok: false, reason: 'invalid' } };
      return { busy: true };
    } finally {
      clearTimeout(timer);
    }
  }
}

BankNotificationService.operationTime = operationTime;
BankNotificationService.MAX_ITEMS = MAX_ITEMS;

module.exports = BankNotificationService;
