const crypto = require('crypto');
const logger = require('../utils/logger');
const { mapBankCategory } = require('../utils/statement');

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS_PER_USER = 5;
const TOP_CATEGORIES = 3;

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

// Отпечаток операции для дедупликации: дата, сумма, валюта, описание, вид + номер среди одинаковых операций
// в файле (две одинаковые покупки за день — обе записываются, а повторный импорт того же файла даёт те же отпечатки)
function importHash(op, occurrence = 0) {
  const key = [op.kind, op.date, op.amount.toFixed(2), op.currency, normalizeText(op.description), occurrence].join('|');
  return crypto.createHash('sha256').update(key).digest('hex');
}

function assignHashes(operations) {
  const seen = new Map();
  for (const op of operations) {
    const key = importHash(op, 0);
    const occurrence = seen.get(key) || 0;
    seen.set(key, occurrence + 1);
    op.hash = occurrence ? importHash(op, occurrence) : key;
  }
  return operations;
}

// Операции, совпавшие с записями не из импорта (та же сумма и валюта в тот же локальный день), помечаются 'manual'.
// Каждая запись закрывает одну операцию. recorded: [{ kind, day, amount, currency }]
function markRecorded(operations, recorded) {
  const pool = new Map();
  const keyOf = (kind, day, amount, currency) => `${kind}|${day}|${Number(amount).toFixed(2)}|${currency}`;
  for (const row of recorded) {
    const key = keyOf(row.kind, row.day, row.amount, row.currency);
    pool.set(key, (pool.get(key) || 0) + 1);
  }
  for (const op of operations) {
    if (op.status !== 'new') continue;
    const day = op.date.slice(0, 10);
    const candidates = [[op.amount, op.currency]];
    if (op.altAmount && op.altCurrency) candidates.push([op.altAmount, op.altCurrency]);
    for (const [amount, currency] of candidates) {
      const key = keyOf(op.kind, day, amount, currency);
      if (pool.get(key) > 0) {
        pool.set(key, pool.get(key) - 1);
        op.status = 'manual';
        break;
      }
    }
  }
  return operations;
}

function totalsByCurrency(operations) {
  const totals = new Map();
  for (const op of operations) totals.set(op.currency, Math.round(((totals.get(op.currency) || 0) + op.amount) * 100) / 100);
  return [...totals.entries()].map(([currency, total]) => ({ currency, total }));
}

// Импорт банковских выписок: разобранные операции ждут подтверждения в памяти (по сообщению с превью),
// затем записываются одной транзакцией с партией импорта для отмены.
class ImportService {
  constructor({ importRepository, expenseService, userService, currencyUtils }) {
    this.importRepository = importRepository;
    this.expenseService = expenseService;
    this.userService = userService;
    this.currencyUtils = currencyUtils;
    this.sessions = new Map(); // userId → Map(messageId превью → данные импорта | null — уже записывается)
  }

  // ---------- Ожидающие подтверждения выписки ----------

  saveSession(userId, messageId, session) {
    let sessions = this.sessions.get(userId);
    if (!sessions) {
      sessions = new Map();
      this.sessions.set(userId, sessions);
    }
    const now = Date.now();
    for (const [id, stored] of sessions) {
      if (stored && stored.expiresAt <= now) sessions.delete(id);
    }
    sessions.set(messageId, { ...session, expiresAt: now + SESSION_TTL_MS });
    while (sessions.size > MAX_SESSIONS_PER_USER) sessions.delete(sessions.keys().next().value);
  }

  // undefined — нет или устарела, null — уже записывается
  getSession(userId, messageId) {
    const sessions = this.sessions.get(userId);
    if (!sessions || !sessions.has(messageId)) return undefined;
    const session = sessions.get(messageId);
    if (session && session.expiresAt <= Date.now()) {
      this.deleteSession(userId, messageId);
      return undefined;
    }
    return session;
  }

  // Синхронно забирает выписку для записи: из двух одновременных нажатий её получит только первое
  takeSession(userId, messageId) {
    const session = this.getSession(userId, messageId);
    if (session) this.sessions.get(userId).set(messageId, null);
    return session;
  }

  deleteSession(userId, messageId) {
    const sessions = this.sessions.get(userId);
    if (!sessions) return;
    sessions.delete(messageId);
    if (!sessions.size) this.sessions.delete(userId);
  }

  // ---------- Подготовка превью ----------

  // parsed — результат parseStatement. Помечает дубликаты прошлых импортов и записи, сделанные вручную,
  // подбирает категории тратам. Ничего не записывает.
  async prepare(userId, parsed) {
    const timezone = await this.userService.getUserTimezone(userId);
    const operations = assignHashes(parsed.operations.map(op => ({ ...op })));
    const existing = await this.importRepository.findExistingHashes(userId, operations.map(op => op.hash));
    for (const op of operations) op.status = existing.has(op.hash) ? 'duplicate' : 'new';

    const fresh = operations.filter(op => op.status === 'new');
    if (fresh.length) {
      const days = fresh.map(op => op.date.slice(0, 10)).sort();
      const recorded = await this.importRepository.getRecordedAmounts(userId, timezone, days[0], days[days.length - 1]);
      markRecorded(fresh, recorded);
    }
    await this.assignCategories(userId, operations.filter(op => op.kind === 'expense' && op.status === 'new'));
    return { source: parsed.source, operations, skipped: parsed.skipped, timezone, includeTransfers: null };
  }

  // Категория траты: (1) последняя категория трат с таким описанием, если доступна пользователю,
  // (2) категория бота по категории банка / MCC / описанию, (3) категория по умолчанию
  async assignCategories(userId, expenses) {
    if (!expenses.length) return;
    const categories = await this.expenseService.getCategories(userId);
    const byId = new Map(categories.map(category => [category.id, category]));
    const systemByName = new Map(categories.filter(category => Number(category.user_id) === 0).map(category => [category.name, category]));
    const fallback = await this.expenseService.getDefaultCategory();
    const descriptions = [...new Set(expenses.map(op => op.description).filter(Boolean))];
    const remembered = await this.importRepository.getLastCategoriesForDescriptions(userId, descriptions);
    for (const op of expenses) {
      let category = byId.get(remembered.get(op.description)) || null;
      if (!category) {
        const name = mapBankCategory(op);
        category = name ? systemByName.get(name) || null : null;
      }
      if (!category) category = fallback;
      op.categoryId = category.id;
      op.categoryName = category.name;
      op.categoryIcon = category.icon;
    }
  }

  // Что будет записано при выборе по переводам (null — ещё не выбран, переводы не считаются)
  async summarize(session, userCurrency) {
    const include = session.includeTransfers === true;
    const fresh = session.operations.filter(op => op.status === 'new');
    const regular = fresh.filter(op => !op.isTransfer);
    const transfers = fresh.filter(op => op.isTransfer);
    const toWrite = fresh.filter(op => !op.isTransfer || include);
    const dates = session.operations.map(op => op.date.slice(0, 10));

    const byCategory = new Map();
    for (const op of toWrite.filter(item => item.kind === 'expense')) {
      const entry = byCategory.get(op.categoryId) || { name: op.categoryName, icon: op.categoryIcon, operations: [] };
      entry.operations.push(op);
      byCategory.set(op.categoryId, entry);
    }
    const topCategories = [];
    for (const entry of byCategory.values()) {
      let total = 0;
      for (const { currency, total: sum } of totalsByCurrency(entry.operations)) {
        total += await this.currencyUtils.convert(sum, currency, userCurrency);
      }
      topCategories.push({ name: entry.name, icon: entry.icon, total });
    }
    topCategories.sort((a, b) => b.total - a.total);

    const expenses = regular.filter(op => op.kind === 'expense');
    const incomes = regular.filter(op => op.kind === 'income');
    return {
      period: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
      expenses: { count: expenses.length, byCurrency: totalsByCurrency(expenses) },
      incomes: { count: incomes.length, byCurrency: totalsByCurrency(incomes) },
      transfers: {
        count: transfers.length,
        out: totalsByCurrency(transfers.filter(op => op.kind === 'expense')),
        in: totalsByCurrency(transfers.filter(op => op.kind === 'income'))
      },
      toWriteCount: toWrite.length,
      topCategories: topCategories.slice(0, TOP_CATEGORIES),
      skipped: {
        duplicates: session.operations.filter(op => op.status === 'duplicate').length,
        manual: session.operations.filter(op => op.status === 'manual').length,
        failed: session.skipped.failed,
        currency: session.skipped.currency,
        invalid: session.skipped.invalid,
        transfers: session.includeTransfers === false ? transfers.length : 0
      }
    };
  }

  // ---------- Запись и отмена ----------

  // Записывает новые операции (переводы — если выбрано). Бюджеты не проверяются, запомненные категории не меняются.
  async commit(userId, session) {
    const include = session.includeTransfers === true;
    const toWrite = session.operations.filter(op => op.status === 'new' && (!op.isTransfer || include));
    const expenses = toWrite.filter(op => op.kind === 'expense');
    const incomes = toWrite.filter(op => op.kind === 'income');
    const result = await this.importRepository.createImport(userId, session.source, session.timezone, expenses, incomes);
    // Записанные параллельно (тот же файл в двух превью) отсекает ON CONFLICT — считаем их дубликатами
    const raced = toWrite.length - result.expenses - result.incomes;
    logger.info('Statement imported', { userId, source: session.source, importId: result.importId, expenses: result.expenses, incomes: result.incomes, raced });
    return { ...result, raced };
  }

  async undo(userId, importId) {
    const result = await this.importRepository.deleteImport(userId, importId);
    if (result) logger.info('Statement import undone', { userId, importId, ...result });
    return result;
  }
}

ImportService.importHash = importHash;
ImportService.assignHashes = assignHashes;
ImportService.markRecorded = markRecorded;

module.exports = ImportService;
