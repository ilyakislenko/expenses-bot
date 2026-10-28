const logger = require('../utils/logger');

const MAX_PENDING_EXPENSES = 20;
const HOUR_MS = 60 * 60 * 1000;

// Сколько живёт ожидаемый ввод и черновик. Всё хранится в памяти (чтения синхронные) и сразу пишется в
// user_input_states, при старте бота загружается обратно (hydrate) — перезапуск не теряет ввод.
const TTL_MS = {
  state: 24 * HOUR_MS, // ожидаемый текст: доход, дата, бюджет, семья, личная/семейная трата, строка чека…
  edit: 24 * HOUR_MS, // «✏️ Изменить» запись: новая сумма/описание
  expense: 7 * 24 * HOUR_MS, // черновик траты на карточке выбора категории (по сообщению)
  recurring: 24 * HOUR_MS, // черновик регулярной траты до выбора категории
  export: 7 * 24 * HOUR_MS, // фильтр экспорта по категориям
  question: 24 * HOUR_MS // текст, который бот предложил задать вопросом (кнопка «🤖 Спросить бота»)
};
// Истёкший ожидаемый ввод помним столько, чтобы на следующий текст сказать «ввод устарел», а не записать его тратой
const EXPIRED_NOTICE_MS = 7 * 24 * HOUR_MS;
const NOTICE_KINDS = new Set(['state', 'edit']);

class StateService {
  // repository — UserInputStateRepository; без него (тесты) всё живёт только в памяти
  constructor(repository = null) {
    this.repository = repository;
    this.userEditState = new Map();
    this.pendingExpenses = new Map(); // userId → Map(messageId карточки выбора категории → черновик траты)
    this.userStates = new Map(); // ожидаемый текстовый ввод (строка вида 'adding_income', 'dt_in:x:…' или объект)
    this.pendingRecurring = new Map(); // черновик регулярной траты до выбора категории (привязан к карточке)
    this.exportState = new Map(); // фильтр экспорта: { categoryIds } (null — все категории)
    this.pendingQuestions = new Map(); // userId → { messageId, text }: «🤖 Спросить бота» под «Не понял»
    this.expiresAt = new Map(); // `${kind}|${userId}|${slot}` → мс
    this.expiredInputs = new Set(); // у кого ожидаемый ввод истёк, а пользователь ещё не узнал об этом
    this.writes = new Map(); // userId → цепочка записей в БД (порядок изменений одного пользователя сохраняется)
    this.ready = Promise.resolve();
  }

  // ---------- Хранение ----------

  key(kind, userId, slot = '') {
    return `${kind}|${userId}|${slot}`;
  }

  // Новое значение: срок жизни заново и запись в БД
  touch(kind, userId, slot, value) {
    const expiresAt = Date.now() + TTL_MS[kind];
    this.expiresAt.set(this.key(kind, userId, slot), expiresAt);
    this.persist(userId, repository => repository.upsert(userId, kind, slot, value, new Date(expiresAt)));
  }

  forget(kind, userId, slot = '') {
    this.expiresAt.delete(this.key(kind, userId, slot));
    this.persist(userId, repository => repository.remove(userId, kind, slot));
  }

  isExpired(kind, userId, slot = '') {
    const expiresAt = this.expiresAt.get(this.key(kind, userId, slot));
    return expiresAt !== undefined && expiresAt <= Date.now();
  }

  persist(userId, operation) {
    if (!this.repository) return;
    const previous = this.writes.get(userId) || Promise.resolve();
    const next = previous
      .then(() => operation(this.repository))
      .catch(error => logger.error('Failed to save input state', { userId, error: error.message }));
    this.writes.set(userId, next);
    next.then(() => {
      if (this.writes.get(userId) === next) this.writes.delete(userId);
    });
  }

  // Все изменения записаны в БД (остановка бота, тесты)
  async flush() {
    while (this.writes.size) await Promise.all([...this.writes.values()]);
  }

  // Загрузка при старте: живое — в память, недавно истёкший ожидаемый ввод — пометка «ввод устарел».
  // Обработка апдейтов ждёт this.ready (stateCleanupMiddleware)
  hydrate() {
    if (!this.repository) return this.ready;
    this.ready = (async () => {
      try {
        const now = Date.now();
        const rows = await this.repository.loadSince(new Date(now - EXPIRED_NOTICE_MS));
        for (const row of rows) this.restore(row, now);
        await this.repository.purgeBefore(new Date(now));
        logger.info('Input states restored', { count: rows.length });
      } catch (error) {
        logger.error('Failed to restore input states', { error: error.message });
      }
    })();
    return this.ready;
  }

  restore(row, now) {
    const userId = Number(row.user_id);
    const expiresAt = new Date(row.expires_at).getTime();
    if (expiresAt <= now) {
      if (NOTICE_KINDS.has(row.kind)) this.expiredInputs.add(userId);
      return;
    }
    this.expiresAt.set(this.key(row.kind, userId, row.slot), expiresAt);
    switch (row.kind) {
      case 'state': this.userStates.set(userId, row.value); break;
      case 'edit': this.userEditState.set(userId, row.value); break;
      case 'expense': {
        if (!this.pendingExpenses.has(userId)) this.pendingExpenses.set(userId, new Map());
        this.pendingExpenses.get(userId).set(Number(row.slot), row.value);
        break;
      }
      case 'recurring': this.pendingRecurring.set(userId, row.value); break;
      case 'export': this.exportState.set(userId, row.value); break;
      case 'question': this.pendingQuestions.set(userId, row.value); break;
      default: this.expiresAt.delete(this.key(row.kind, userId, row.slot));
    }
  }

  // Ожидаемый ввод (state/edit) истёк: убираем и помечаем, чтобы следующий текст получил «ввод устарел»
  expireInput(kind, userId) {
    if (!this.isExpired(kind, userId)) return;
    (kind === 'state' ? this.userStates : this.userEditState).delete(userId);
    this.forget(kind, userId);
    this.expiredInputs.add(userId);
  }

  // true один раз: пользователь ждал ввода, но срок вышел (в том числе пока бот был выключен)
  takeExpiredInput(userId) {
    this.expireInput('state', userId);
    this.expireInput('edit', userId);
    return this.expiredInputs.delete(userId);
  }

  // ---------- Правка записи (✏️) ----------

  setUserEditState(userId, expenseId) {
    this.userEditState.set(userId, expenseId);
    this.expiredInputs.delete(userId);
    this.touch('edit', userId, '', expenseId);
  }

  getUserEditState(userId) {
    this.expireInput('edit', userId);
    return this.userEditState.get(userId);
  }

  hasUserEditState(userId) {
    this.expireInput('edit', userId);
    return this.userEditState.has(userId);
  }

  deleteUserEditState(userId) {
    const deleted = this.userEditState.delete(userId);
    if (deleted) this.forget('edit', userId);
    return deleted;
  }

  // ---------- Черновики трат ----------
  // Черновик привязан к сообщению с выбором категории, кнопки другого сообщения его не видят.
  // Значение null — черновик уже записан (метка нужна, чтобы повторное нажатие не просило прислать трату заново).
  setPendingExpense(userId, messageId, expenseData) {
    let drafts = this.pendingExpenses.get(userId);
    if (!drafts) {
      drafts = new Map();
      this.pendingExpenses.set(userId, drafts);
    }
    drafts.set(messageId, expenseData);
    this.touch('expense', userId, messageId, expenseData);
    // Брошенные карточки не копим: храним только последние MAX_PENDING_EXPENSES черновиков
    if (drafts.size > MAX_PENDING_EXPENSES) {
      const oldest = drafts.keys().next().value;
      drafts.delete(oldest);
      this.forget('expense', userId, oldest);
    }
  }

  // Достаёт черновик и сразу помечает его записанным (синхронно, поэтому из двух одновременных нажатий
  // черновик получит только первое). Возвращает черновик, null — уже взят, undefined — черновика нет.
  takePendingExpense(userId, messageId) {
    const drafts = this.pendingExpenses.get(userId);
    const draft = drafts?.get(messageId);
    if (draft !== undefined && this.isExpired('expense', userId, messageId)) {
      this.deletePendingExpense(userId, messageId);
      return undefined;
    }
    if (draft) {
      drafts.set(messageId, null);
      this.touch('expense', userId, messageId, null);
    }
    return draft;
  }

  hasPendingExpense(userId) {
    const drafts = this.pendingExpenses.get(userId);
    return !!drafts && [...drafts.entries()].some(([messageId, draft]) => draft !== null && !this.isExpired('expense', userId, messageId));
  }

  deletePendingExpense(userId, messageId) {
    const drafts = this.pendingExpenses.get(userId);
    if (!drafts) return false;
    const deleted = drafts.delete(messageId);
    if (deleted) this.forget('expense', userId, messageId);
    if (!drafts.size) this.pendingExpenses.delete(userId);
    return deleted;
  }

  deleteAllPendingExpenses(userId) {
    const drafts = this.pendingExpenses.get(userId);
    if (!drafts) return false;
    for (const messageId of drafts.keys()) this.expiresAt.delete(this.key('expense', userId, messageId));
    this.pendingExpenses.delete(userId);
    this.persist(userId, repository => repository.removeKinds(userId, ['expense']));
    return true;
  }

  // ---------- Черновик регулярной траты ----------
  // { amount, currency, description, dayOfMonth?, cardMessageId? } — cardMessageId: карточка выбора категории;
  // { takenCard } — черновик этой карточки уже взят (повторное нажатие ничего не делает)
  setPendingRecurring(userId, data) {
    this.pendingRecurring.set(userId, data);
    this.touch('recurring', userId, '', data);
  }

  getPendingRecurring(userId) {
    if (this.isExpired('recurring', userId)) this.deletePendingRecurring(userId);
    return this.pendingRecurring.get(userId);
  }

  hasPendingRecurring(userId) {
    const draft = this.getPendingRecurring(userId);
    return !!draft && !draft.takenCard;
  }

  // Черновик карточки messageId: забирается синхронно, один раз. Черновик, null — уже взят этой карточкой,
  // undefined — у карточки черновика нет (устарела, отменена, начата новая регулярная)
  takePendingRecurring(userId, messageId) {
    const draft = this.getPendingRecurring(userId);
    if (!draft) return undefined;
    if (draft.takenCard === messageId) return null;
    if (draft.cardMessageId !== messageId || !draft.dayOfMonth) return undefined;
    this.setPendingRecurring(userId, { takenCard: messageId });
    return draft;
  }

  deletePendingRecurring(userId) {
    const deleted = this.pendingRecurring.delete(userId);
    if (deleted) this.forget('recurring', userId);
    return deleted;
  }

  // ---------- Фильтр экспорта ----------

  setExportState(userId, data) {
    this.exportState.set(userId, data);
    this.touch('export', userId, '', data);
  }

  getExportState(userId) {
    if (this.isExpired('export', userId)) this.deleteExportState(userId);
    return this.exportState.get(userId);
  }

  deleteExportState(userId) {
    const deleted = this.exportState.delete(userId);
    if (deleted) this.forget('export', userId);
    return deleted;
  }

  // ---------- Текст, который можно задать вопросом боту ----------

  setPendingQuestion(userId, messageId, text) {
    const value = { messageId, text };
    this.pendingQuestions.set(userId, value);
    this.touch('question', userId, '', value);
  }

  // Текст для кнопки сообщения messageId (один раз); undefined — кнопка устарела
  takePendingQuestion(userId, messageId) {
    const value = this.pendingQuestions.get(userId);
    if (!value || value.messageId !== messageId) return undefined;
    this.pendingQuestions.delete(userId);
    const expired = this.isExpired('question', userId);
    this.forget('question', userId);
    return expired ? undefined : value.text;
  }

  // ---------- Ожидаемый текстовый ввод ----------

  setUserState(userId, state) {
    this.userStates.set(userId, state);
    this.expiredInputs.delete(userId);
    this.touch('state', userId, '', state);
  }

  getUserState(userId) {
    this.expireInput('state', userId);
    return this.userStates.get(userId);
  }

  hasUserState(userId) {
    this.expireInput('state', userId);
    return this.userStates.has(userId);
  }

  deleteUserState(userId) {
    const deleted = this.userStates.delete(userId);
    if (deleted) this.forget('state', userId);
    return deleted;
  }

  // ---------- Сброс ----------

  // Уход из ожидаемого ввода (команда, нижняя кнопка): ожидаемый текст и правка записи. Черновики на карточках
  // категорий остаются — их кнопки продолжают работать
  clearInputs(userId) {
    this.deleteUserState(userId);
    this.deleteUserEditState(userId);
    this.expiredInputs.delete(userId);
  }

  // /cancel: всё, включая черновики
  clearUserState(userId) {
    this.clearInputs(userId);
    this.deleteAllPendingExpenses(userId);
    this.deletePendingRecurring(userId);
    this.deleteExportState(userId);
    if (this.pendingQuestions.delete(userId)) this.forget('question', userId);
  }

  // Только память (тесты: «перезапуск» без БД)
  clearAll() {
    this.userEditState.clear();
    this.pendingExpenses.clear();
    this.pendingRecurring.clear();
    this.exportState.clear();
    this.userStates.clear();
    this.pendingQuestions.clear();
    this.expiresAt.clear();
    this.expiredInputs.clear();
  }
}

StateService.TTL_MS = TTL_MS;
StateService.EXPIRED_NOTICE_MS = EXPIRED_NOTICE_MS;

module.exports = StateService;
