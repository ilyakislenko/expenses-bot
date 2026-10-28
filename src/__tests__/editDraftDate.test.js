// Правка черновика чека (чистые функции) и смена даты записи: разбор даты, время суток в поясе, транзакция чека,
// карточки трат и доходов, сброс ввода
const { sumCheck, editLine, setLineCategory, removeLine, addLine, setDraftDate, withLineIds, lineIndex, MAX_ITEMS } = require('../services/receipt/draftEdit');
const { parseRecordDate, checkRecordDate, moveToDate, localDateOf, datePickerKeyboard, packDate, unpackDate, MAX_RECORD_AGE_DAYS } = require('../utils/recordDate');
const { resolveReceiptTime } = require('../services/receipt/normalize');
const { addDays, localToday } = require('../utils/period');
const ReceiptRepository = require('../repositories/ReceiptRepository');
const ExpenseService = require('../services/ExpenseService');
const IncomeService = require('../services/IncomeService');
const ExpenseHandlers = require('../handlers/ExpenseHandlers');
const IncomeHandlers = require('../handlers/IncomeHandlers');
const LocalizationService = require('../services/LocalizationService');
const StateService = require('../services/StateService');
const Formatter = require('../utils/formatter');
const stateCleanupMiddleware = require('../middleware/stateCleanupMiddleware');

const localization = new LocalizationService();
const t = (key, params) => localization.getText('ru', key, params);

describe('receipt draft edits', () => {
  const draft = () => ({
    merchant: 'Ярче', date: '2026-10-27', time: '11:47', currency: 'RUB', total: 200, itemsTotal: 180, mismatch: true, lowConfidence: true,
    items: [
      { id: 1, name: 'Хлеб', amount: 45, quantity: 1, price: 45, categoryId: 1 },
      { id: 2, name: 'Молоко', amount: 90, quantity: 2, price: 45, categoryId: 1, lineMismatch: true },
      { id: 3, name: 'Сыр', amount: 45, quantity: 0.5, price: 90, categoryId: 1 }
    ],
    nextLineId: 4
  });

  it('every change recomputes the sum of lines and the check against the printed total', () => {
    expect(sumCheck(draft())).toMatchObject({ itemsTotal: 180, total: 200, diff: -20, matches: false, exact: false });
    const edited = editLine(draft(), 2, { amount: 110, name: undefined });
    expect(edited.items[1]).toMatchObject({ name: 'Молоко', amount: 110, quantity: 2, price: 55, lineMismatch: false });
    expect(edited).toMatchObject({ itemsTotal: 200, mismatch: false, edited: true });
    expect(sumCheck(edited)).toMatchObject({ exact: true, matches: true, diff: 0 });
    // В пределах 3% — «почти сходится»
    expect(sumCheck(editLine(draft(), 2, { amount: 105 }))).toMatchObject({ itemsTotal: 195, matches: true, exact: false, diff: -5 });
    expect(editLine(draft(), 3, { name: 'Сыр российский' }).items[2]).toMatchObject({ name: 'Сыр российский', amount: 45, price: 90 });
    expect(setLineCategory(draft(), 1, 7).items[0].categoryId).toBe(7);
    const removed = removeLine(draft(), 3);
    expect(removed.items.map(item => item.name)).toEqual(['Хлеб', 'Молоко']);
    expect(removed.itemsTotal).toBe(135);
    const added = addLine(draft(), { amount: 20, name: 'пакет', categoryId: 6 });
    expect(added.items[3]).toMatchObject({ id: 4, name: 'пакет', amount: 20, quantity: 1, price: 20, categoryId: 6 });
    expect(added).toMatchObject({ itemsTotal: 200, mismatch: false, nextLineId: 5 });
    // Исходный черновик не меняется
    expect(draft().items).toHaveLength(3);
  });

  it('missing lines and the line limit change nothing; the last line can be removed', () => {
    expect(editLine(draft(), 5, { amount: 1 })).toBeNull();
    expect(setLineCategory(draft(), -1, 1)).toBeNull();
    expect(removeLine(draft(), 4)).toBeNull();
    const full = { ...draft(), items: Array.from({ length: MAX_ITEMS }, (_, i) => ({ id: i + 1, name: 'x', amount: 1, quantity: 1, price: 1, categoryId: 1 })) };
    expect(addLine(full, { amount: 1, name: 'y', categoryId: 1 })).toBeNull();
    let empty = draft();
    for (let id = 1; id <= 3; id += 1) empty = removeLine(empty, id);
    expect(empty.items).toEqual([]);
    expect(empty.itemsTotal).toBe(0);
    expect(sumCheck({ ...draft(), total: null })).toMatchObject({ itemsTotal: 180, total: null, matches: null });
  });

  it('lines are addressed by a stable id: a double «remove» removes one line, a stale button never hits a shifted line', () => {
    const once = removeLine(draft(), 1);
    // Второе нажатие той же кнопки (тот же id) — строки уже нет, ничего не меняется
    expect(removeLine(once, 1)).toBeNull();
    expect(once.items.map(item => item.name)).toEqual(['Молоко', 'Сыр']);
    // Кнопка «Молоко» со старого экрана правит «Молоко», хотя строка сдвинулась на первое место
    expect(editLine(once, 2, { amount: 100 }).items[0]).toMatchObject({ name: 'Молоко', amount: 100 });
    // id убранных строк не переиспользуются
    expect(addLine(once, { amount: 5, name: 'пакет', categoryId: 1 }).items[2].id).toBe(4);
    // Черновик, сохранённый до появления id, получает их по порядку
    const legacy = withLineIds({ ...draft(), items: draft().items.map(({ id, ...item }) => item), nextLineId: undefined });
    expect(legacy.items.map(item => item.id)).toEqual([1, 2, 3]);
    expect(legacy.nextLineId).toBe(4);
    expect(lineIndex(legacy, 3)).toBe(2);
    expect(lineIndex(legacy, null)).toBe(-1);
  });

  it('an edited amount never overflows the unit price column (tiny weight quantity)', () => {
    const tiny = { ...draft(), items: [{ id: 1, name: 'Шафран', amount: 900, quantity: 0.001, price: 900000, categoryId: 1 }] };
    expect(editLine(tiny, 1, { amount: 999999 }).items[0]).toMatchObject({ quantity: 0.001, price: null, amount: 999999 });
    const huge = { ...draft(), items: [{ id: 1, name: 'x', amount: 100, quantity: 4600000000000, price: 100, categoryId: 1 }] };
    expect(editLine(huge, 1, { amount: 200 }).items[0]).toMatchObject({ quantity: 1, price: 200 });
  });

  it('the draft date keeps the printed time unless it has not come yet today; a manual date is recorded up to a year back', () => {
    expect(setDraftDate(draft(), '2026-10-20', { date: '2026-10-28', time: '10:00' })).toMatchObject({ date: '2026-10-20', time: '11:47', dateManual: true, edited: true });
    expect(setDraftDate(draft(), '2026-10-28', { date: '2026-10-28', time: '10:00' })).toMatchObject({ date: '2026-10-28', time: null });
    expect(setDraftDate(draft(), '2026-10-28', { date: '2026-10-28', time: '12:00' }).time).toBe('11:47');
    const now = new Date('2026-10-28T09:00:00Z');
    // Распознанная дата старше 60 дней — «сейчас», выбранная вручную — своя дата
    expect(resolveReceiptTime('2026-07-01', '11:47', 'Europe/Moscow', now)).toBeNull();
    expect(resolveReceiptTime('2026-07-01', '11:47', 'Europe/Moscow', now, MAX_RECORD_AGE_DAYS)).toBe('2026-07-01 11:47:00');
  });
});

describe('record date: parsing, limits, picker', () => {
  const today = '2026-10-28';

  it('accepts 25.10, 25.10.2026 and 25.10.26; rejects the future, older than a year and impossible dates', () => {
    expect(parseRecordDate('25.10', today)).toEqual({ date: '2026-10-25' });
    expect(parseRecordDate('25.10.2026', today)).toEqual({ date: '2026-10-25' });
    expect(parseRecordDate(' 25.10.26 ', today)).toEqual({ date: '2026-10-25' });
    expect(parseRecordDate('5/10', today)).toEqual({ date: '2026-10-05' });
    expect(parseRecordDate('28.10', today)).toEqual({ date: '2026-10-28' });
    expect(parseRecordDate('29.10', today)).toEqual({ error: 'future' });
    expect(parseRecordDate('01.11.2026', today)).toEqual({ error: 'future' });
    // Более поздний месяц без года — прошлый год (в январе «25.12» — декабрь)
    expect(parseRecordDate('15.11', today)).toEqual({ date: '2025-11-15' });
    expect(parseRecordDate('25.12', '2027-01-05')).toEqual({ date: '2026-12-25' });
    expect(parseRecordDate('28.10.2025', today)).toEqual({ date: '2025-10-28' });
    expect(parseRecordDate('27.10.2025', today)).toEqual({ error: 'too_old' });
    expect(parseRecordDate('30.02.2026', today)).toEqual({ error: 'format' });
    expect(parseRecordDate('30.02', '2026-03-10')).toEqual({ error: 'format' });
    expect(parseRecordDate('29.02.2024', '2024-03-10')).toEqual({ date: '2024-02-29' });
    expect(parseRecordDate('32.01', today)).toEqual({ error: 'format' });
    expect(parseRecordDate('вчера', today)).toEqual({ error: 'format' });
    expect(checkRecordDate(addDays(today, -MAX_RECORD_AGE_DAYS), today)).toBeNull();
    expect(unpackDate('20260230')).toBeNull();
    expect(unpackDate(packDate('2026-10-25'))).toBe('2026-10-25');
  });

  it('picker: today, yesterday, the day before, a week of short days, other date and back', () => {
    const keyboard = datePickerKeyboard((key) => t(key), { today, current: '2026-10-21', pick: (date) => `x|${packDate(date)}`, other: 'o', back: 'b' });
    expect(keyboard.map(row => row.map(b => b.text))).toEqual([
      ['Сегодня', 'Вчера', 'Позавчера'],
      ['Вс 25', 'Сб 24', 'Пт 23', 'Чт 22'],
      ['• Ср 21', 'Вт 20', 'Пн 19'],
      [t('button_date_other')],
      [t('button_back')]
    ]);
    expect(keyboard[0].map(b => b.callback_data)).toEqual(['x|20261028', 'x|20261027', 'x|20261026']);
  });

  it('keeps the local time of day when the date changes (Asia/Tomsk, UTC, DST); never later than now', () => {
    const now = new Date('2026-10-28T12:00:00Z');
    // 23:30 по Томску (UTC+7) 27.10 → 23:30 по Томску 20.10
    const tomsk = moveToDate('2026-10-27T16:30:15.250Z', '2026-10-20', 'Asia/Tomsk', now);
    expect(tomsk.toISOString()).toBe('2026-10-20T16:30:15.250Z');
    expect(localDateOf(tomsk, 'Asia/Tomsk')).toBe('2026-10-20');
    // Та же трата в поясе UTC — другой местный день и время
    expect(moveToDate('2026-10-27T16:30:15.250Z', '2026-10-20', 'UTC', now).toISOString()).toBe('2026-10-20T16:30:15.250Z');
    expect(moveToDate('2026-10-27T01:00:00Z', '2026-10-25', 'Asia/Tomsk', now).toISOString()).toBe('2026-10-25T01:00:00.000Z');
    // Переход через смену летнего времени: 09:00 по Берлину и летом, и зимой
    const winter = moveToDate('2026-11-02T08:00:00Z', '2026-10-20', 'Europe/Berlin', now);
    expect(winter.toISOString()).toBe('2026-10-20T07:00:00.000Z');
    // Вчерашняя запись в 23:00, перенесённая на сегодня (ещё 19:00 по Томску), — не в будущем
    expect(moveToDate('2026-10-27T16:00:00Z', '2026-10-28', 'Asia/Tomsk', now).toISOString()).toBe(now.toISOString());
  });
});

describe('receipt date in one transaction', () => {
  it('moves purchased_date and every remaining expense keeping each local time; an undone receipt is not touched', async () => {
    const repository = new ReceiptRepository();
    const calls = [];
    const client = {
      query: jest.fn(async (sql, params) => {
        calls.push({ sql, params });
        if (/UPDATE receipts/.test(sql)) return { rowCount: 1, rows: [{ id: 5 }] };
        if (/SELECT id, created_at_utc/.test(sql)) {
          return { rowCount: 2, rows: [{ id: 11, created_at_utc: new Date('2026-10-27T05:10:00Z') }, { id: 12, created_at_utc: new Date('2026-10-27T05:47:30Z') }] };
        }
        return { rowCount: 2, rows: [] };
      })
    };
    repository.transaction = jest.fn(async (callback) => callback(client));
    repository.query = jest.fn(async () => { throw new Error('outside the transaction'); });
    const result = await repository.setDate(7, 5, '2026-10-20', 'Asia/Tomsk', new Date('2026-10-28T12:00:00Z'));
    expect(result).toEqual({ expenses: 2 });
    expect(repository.transaction).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(3);
    expect(calls[0].params).toEqual([5, 7, '2026-10-20']);
    expect(calls[1].sql).toMatch(/FOR UPDATE/);
    expect(calls[2].params[1]).toEqual([11, 12]);
    expect(calls[2].params[2].map(date => date.toISOString())).toEqual(['2026-10-20T05:10:00.000Z', '2026-10-20T05:47:30.000Z']);
    client.query.mockReset();
    client.query.mockImplementation(async () => ({ rowCount: 0, rows: [] }));
    expect(await repository.setDate(7, 5, '2026-10-20', 'Asia/Tomsk')).toBeNull();
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('updateDraft locks the row, refuses a draft being recorded and saves the mutated draft', async () => {
    const repository = new ReceiptRepository();
    let row = { receipt: { items: [{ amount: 1 }] }, frame: null, timezone: 'UTC', busy: false };
    const client = { query: jest.fn(async (sql) => (/SELECT/.test(sql) ? { rows: row ? [row] : [] } : { rowCount: 1 })) };
    repository.transaction = jest.fn(async (callback) => callback(client));
    const ok = await repository.updateDraft(7, 101, 300, (receipt) => ({ ...receipt, edited: true }));
    expect(ok).toMatchObject({ status: 'ok', receipt: { edited: true } });
    expect(client.query.mock.calls[0][0]).toMatch(/FOR UPDATE/);
    expect(JSON.parse(client.query.mock.calls[1][1][2])).toEqual({ items: [{ amount: 1 }], edited: true });
    expect(await repository.updateDraft(7, 101, 300, () => null)).toMatchObject({ status: 'unchanged' });
    row = { ...row, busy: true };
    const mutate = jest.fn();
    expect(await repository.updateDraft(7, 101, 300, mutate)).toEqual({ status: 'busy' });
    expect(mutate).not.toHaveBeenCalled();
    row = null;
    expect(await repository.updateDraft(7, 101, 300, mutate)).toEqual({ status: 'missing' });
  });
});

describe('expense and income date', () => {
  const tomorrow = (timezone) => addDays(localToday(timezone), 1);

  it('services move only the owner\'s record keeping the local time', async () => {
    const expenseRepository = {
      getExpenseById: jest.fn(async (userId, id) => ({ id, user_id: id === 2 ? 99 : userId, created_at_utc: new Date('2026-10-27T16:30:00Z') })),
      setExpenseCreatedAt: jest.fn(async (userId, id, createdAt) => ({ id, created_at_utc: createdAt }))
    };
    const service = new ExpenseService(expenseRepository, {}, {}, {}, {});
    const moved = await service.setExpenseDate(7, 1, '2026-10-20', 'Asia/Tomsk');
    expect(moved.created_at_utc.toISOString()).toBe('2026-10-20T16:30:00.000Z');
    expect(await service.setExpenseDate(7, 2, '2026-10-20', 'Asia/Tomsk')).toBeNull();
    expect(expenseRepository.setExpenseCreatedAt).toHaveBeenCalledTimes(1);

    const incomeRepository = {
      getIncomeById: jest.fn(async (userId, id) => (id === 1 ? { id, created_at_utc: new Date('2026-10-27T09:15:00Z') } : undefined)),
      setIncomeCreatedAt: jest.fn(async (userId, id, createdAt) => ({ id, created_at_utc: createdAt }))
    };
    const incomes = new IncomeService(incomeRepository, {});
    expect((await incomes.setIncomeDate(7, 1, '2026-10-25', 'UTC')).created_at_utc.toISOString()).toBe('2026-10-25T09:15:00.000Z');
    expect(await incomes.setIncomeDate(7, 2, '2026-10-25', 'UTC')).toBeNull();
  });

  function expenseSetup(expense) {
    const stateService = new StateService();
    const expenseService = {
      getExpenseById: jest.fn(async () => expense),
      setExpenseDate: jest.fn(async (userId, id, date) => ({ ...expense, created_at_utc: `${date}T10:00:00Z` }))
    };
    const handlers = new ExpenseHandlers({
      expenseService, incomeService: {}, recurringExpenseService: {}, familyService: { getUserFamily: async () => null },
      premiumService: { isPremiumUser: async () => false }, userService: { getUserLanguage: async () => 'ru', getUserTimezone: async () => 'Asia/Tomsk' },
      localizationService: localization, formatter: new Formatter({ convert: async (amount) => amount }), stateService, validator: {}, budgetService: {}, reportService: {}
    });
    let messageId = 500;
    const ctx = (data, match) => ({
      from: { id: 7 }, chat: { id: 7 }, match, callbackQuery: { data, message: { message_id: 400 } },
      answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true), reply: jest.fn(async () => ({ message_id: ++messageId })),
      telegram: { editMessageReplyMarkup: jest.fn(async () => true) }
    });
    return { handlers, expenseService, stateService, ctx };
  }

  it('the expense card has «📅 Дата» for the owner; picker → day → card; typed date; future and stale rejected', async () => {
    const expense = { id: 42, user_id: 7, amount: '250', currency: 'RUB', description: 'кофе', category_name: 'Еда', category_icon: '🍕', created_at_utc: '2026-10-27T03:00:00Z', receipt_id: 9 };
    const { handlers, expenseService, stateService, ctx } = expenseSetup(expense);
    const card = ctx('ex|42|r.9.0', ['', '42', 'r.9.0']);
    await handlers.showCard(card, 42, 'r.9.0');
    const buttons = card.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard.flat();
    expect(buttons.map(b => b.callback_data)).toContain('xt|42|r.9.0');
    expect(buttons.find(b => b.callback_data === 'xt|42|r.9.0').text).toBe(t('button_record_date'));

    const picker = ctx('xt|42|r.9.0', ['', '42', 'r.9.0']);
    await handlers.handleDatePicker(picker);
    const [pickerText, pickerExtra] = picker.editMessageText.mock.calls[0];
    expect(pickerText).toContain(t('date_picker_title', { current: new Formatter({}).formatDate(expense.created_at_utc, 'Asia/Tomsk') }));
    const data = pickerExtra.reply_markup.inline_keyboard.flat().map(b => b.callback_data);
    const yesterday = addDays(localToday('Asia/Tomsk'), -1);
    expect(data).toContain(`xtd|42|${packDate(yesterday)}|r.9.0`);
    expect(data.slice(-2)).toEqual(['xto|42|r.9.0', 'ex|42|r.9.0']);
    for (const item of data) expect(Buffer.byteLength(item)).toBeLessThanOrEqual(64);

    const pick = ctx('', ['', '42', packDate(yesterday), 'r.9.0']);
    await handlers.handleSetDate(pick);
    expect(expenseService.setExpenseDate).toHaveBeenCalledWith(7, 42, yesterday, 'Asia/Tomsk');
    expect(pick.answerCbQuery).toHaveBeenCalledWith(t('date_changed', { date: yesterday.split('-').reverse().join('.') }));
    expect(pick.editMessageText).toHaveBeenCalled();

    const future = ctx('', ['', '42', packDate(tomorrow('Asia/Tomsk')), 'r.9.0']);
    await handlers.handleSetDate(future);
    expect(future.answerCbQuery).toHaveBeenCalledWith(t('date_error_future'), { show_alert: true });
    expect(expenseService.setExpenseDate).toHaveBeenCalledTimes(1);

    const other = ctx('xto|42|r.9.0', ['', '42', 'r.9.0']);
    await handlers.handleOtherDate(other);
    const state = stateService.getUserState(7);
    expect(state).toBe('dt_in:x:42:400:r.9.0');
    const typed = ctx(null, null);
    delete typed.callbackQuery;
    const [ty, tm, td] = addDays(localToday('Asia/Tomsk'), -3).split('-');
    await handlers.handleDateInput(typed, `${td}.${tm}`, 'ru', state);
    expect(expenseService.setExpenseDate).toHaveBeenLastCalledWith(7, 42, `${ty}-${tm}-${td}`, 'Asia/Tomsk');
    expect(typed.reply).toHaveBeenLastCalledWith(expect.stringContaining(t('date_changed', { date: `${td}.${tm}.${ty}` })), expect.anything());
    expect(typed.telegram.editMessageReplyMarkup).toHaveBeenCalledWith(7, 400, undefined, { inline_keyboard: [] });
    expect(stateService.getUserState(7)).toBeUndefined();

    expenseService.setExpenseDate.mockResolvedValueOnce(null);
    const stale = ctx('', ['', '42', packDate(yesterday), 'n']);
    await handlers.handleSetDate(stale);
    expect(stale.answerCbQuery).toHaveBeenCalledWith(t('expense_not_found'), { show_alert: true });
  });

  it('someone else\'s family expense has no «📅 Дата» and its picker is refused', async () => {
    const expense = { id: 43, user_id: 99, family_id: 3, amount: '100', currency: 'RUB', description: 'хлеб', category_name: 'Еда', created_at_utc: '2026-10-27T03:00:00Z' };
    const { handlers, ctx } = expenseSetup(expense);
    const card = ctx('ex|43|f.0', ['', '43', 'f.0']);
    await handlers.showCard(card, 43, 'f.0');
    expect(card.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard.flat().map(b => b.callback_data)).not.toContain('xt|43|f.0');
    const picker = ctx('xt|43|f.0', ['', '43', 'f.0']);
    await handlers.handleDatePicker(picker);
    expect(picker.answerCbQuery).toHaveBeenCalledWith(t('expense_not_found'), { show_alert: true });
    expect(picker.editMessageText).not.toHaveBeenCalled();
  });

  it('the income card gets «📅 Дата» with the same picker and typed date', async () => {
    const stateService = new StateService();
    const income = { id: 5, amount: '50000', currency: 'RUB', description: 'зарплата', created_at_utc: '2026-10-27T09:15:00Z' };
    const incomeService = {
      getIncome: jest.fn(async () => income),
      setIncomeDate: jest.fn(async (userId, id, date) => ({ ...income, created_at_utc: `${date}T09:15:00Z` }))
    };
    const handlers = new IncomeHandlers({
      incomeService, expenseService: {}, userService: { getUserLanguage: async () => 'ru', getUserTimezone: async () => 'UTC' },
      premiumService: {}, localizationService: localization, formatter: new Formatter({ convert: async (amount) => amount }), stateService, validator: {}
    });
    const card = await handlers.buildCard(7, 'ru', income);
    expect(card.keyboard.flat().map(b => b.callback_data)).toEqual(['ie|5', 'it|5', 'income_delete|5', 'income_menu']);
    const ctx = (match) => ({
      from: { id: 7 }, chat: { id: 7 }, match, callbackQuery: { message: { message_id: 600 } },
      answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true), reply: jest.fn(async () => ({})),
      telegram: { editMessageReplyMarkup: jest.fn(async () => true) }
    });
    const picker = ctx(['', '5']);
    await handlers.showDatePicker(picker);
    const data = picker.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard.flat().map(b => b.callback_data);
    expect(data[0]).toBe(`itd|5|${packDate(localToday('UTC'))}`);
    expect(data.slice(-2)).toEqual(['ito|5', 'in|5']);
    const pick = ctx(['', '5', packDate(addDays(localToday('UTC'), -2))]);
    await handlers.setDate(pick);
    expect(incomeService.setIncomeDate).toHaveBeenCalledWith(7, 5, addDays(localToday('UTC'), -2), 'UTC');
    const old = ctx(['', '5', packDate(addDays(localToday('UTC'), -400))]);
    await handlers.setDate(old);
    expect(old.answerCbQuery).toHaveBeenCalledWith(t('date_error_too_old'), { show_alert: true });
    await handlers.startDateInput(ctx(['', '5']));
    expect(stateService.getUserState(7)).toBe('dt_in:i:5:600');
    const typed = ctx(null);
    delete typed.callbackQuery;
    await handlers.handleDateInput(typed, 'abc', 'ru', 'dt_in:i:5:600');
    expect(typed.reply).toHaveBeenLastCalledWith(t('date_error_format'), { parse_mode: 'Markdown' });
    expect(stateService.getUserState(7)).toBe('dt_in:i:5:600');
  });

  it('text input states for drafts and dates reset on any button', async () => {
    const stateService = new StateService();
    const middleware = stateCleanupMiddleware({ stateService });
    for (const state of ['rd_in:101:e:0', 'dt_in:x:42:400:n', 'dt_in:r:9:400']) {
      stateService.setUserState(7, state);
      await middleware({ from: { id: 7 }, updateType: 'message' }, async () => {});
      expect(stateService.getUserState(7)).toBe(state);
      await middleware({ from: { id: 7 }, updateType: 'callback_query', callbackQuery: { data: 'rdp|0' } }, async () => {});
      expect(stateService.getUserState(7)).toBeUndefined();
    }
  });
});

describe('new locale keys', () => {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '..', 'locales');
  const ru = require('../locales/ru');
  const start = Object.keys(ru).indexOf('help_assistant') + 1;
  const keys = Object.keys(ru).slice(start, Object.keys(ru).indexOf('button_record_date') + 38);

  it('all 13 locales have the keys right after help_assistant, without {placeholders} left and with balanced Markdown', () => {
    expect(keys[0]).toBe('button_record_date');
    expect(keys[keys.length - 1]).toBe('help_edit');
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.js'));
    expect(files).toHaveLength(13);
    for (const file of files) {
      const lang = file.replace('.js', '');
      const locale = require(path.join(dir, file));
      const names = Object.keys(locale);
      expect(names.slice(names.indexOf('help_assistant') + 1, names.indexOf('help_assistant') + 1 + keys.length)).toEqual(keys);
      for (const key of keys) {
        const sample = localization.getText(lang, key, { current: '27.10.2026, 11:47', date: '20.10.2026', count: 3, items: '200 ₽', total: '200 ₽', diff: '5 ₽', n: 2, quantity: '2', price: '45 ₽', max: 100 });
        expect([lang, key, /\{\w+\}/.test(sample)]).toEqual([lang, key, false]);
        const stripped = locale[key].replace(/\{\w+\}/g, '');
        for (const mark of ['*', '_', '`']) expect([lang, key, mark, stripped.split(mark).length % 2]).toEqual([lang, key, mark, 1]);
      }
      expect(locale.date_weekdays_short.split(',')).toHaveLength(7);
    }
  });
});
