// Групповой режим: арифметика дележа (копейки, остатки, общие позиции, чаевые), упрощение долгов, лимиты группы и
// пропуск, права (не участник, анонимный админ, автор записи, плательщик чека), личное никогда не попадает в группу.
// Без БД: учёт группы — в памяти (FakeGroupRepository повторяет контракт GroupRepository).
const { Telegraf, Telegram } = require('telegraf');
const split = require('../utils/groupSplit');
const EditThrottle = require('../utils/editThrottle');
const GroupService = require('../services/GroupService');
const GroupHandlers = require('../handlers/GroupHandlers');
const PaymentService = require('../services/PaymentService');
const LocalizationService = require('../services/LocalizationService');
const EnhancedValidator = require('../utils/enhancedValidator');
const Formatter = require('../utils/formatter');
const privateChatOnly = require('../middleware/privateChatOnly');
const { GROUP_LIMITS, GROUP_PASS } = require('../utils/constants');

const localizationService = new LocalizationService();
const sum = (map) => [...map.values()].reduce((acc, value) => acc + value, 0);

describe('split math in cents', () => {
  test('equal split gives the remainder cent to the payer first, then in order', () => {
    expect([...split.splitEqual(10000, [1, 2, 3], 2)]).toEqual([[2, 3334], [1, 3333], [3, 3333]]);
    expect([...split.splitEqual(10001, [1, 2, 3], 9)]).toEqual([[1, 3334], [2, 3334], [3, 3333]]);
    expect(sum(split.splitEqual(99999999, [1, 2, 3, 4, 5, 6, 7], 1))).toBe(99999999);
  });

  test('allocate keeps the exact total with the largest remainder method', () => {
    const parts = split.allocate(1000, new Map([[1, 1], [2, 1], [3, 1]]), [1, 2, 3]);
    expect([...parts]).toEqual([[1, 334], [2, 333], [3, 333]]);
    expect(sum(split.allocate(12345, new Map([[1, 3], [2, 7], [3, 11]])))).toBe(12345);
    // Те же копейки, что веса, — без сдвигов из-за плавающей точки
    expect([...split.allocate(9999999900, new Map([[1, 3333333300], [2, 6666666600]]))]).toEqual([[1, 3333333300], [2, 6666666600]]);
  });

  test('itemize: personal items, shared items among those who tapped, unclaimed among everyone, tip proportionally', () => {
    const items = [
      { id: 1, amount: 650, extra: false }, // пицца — Аня и Боря
      { id: 2, amount: 200, extra: false }, // лимонад — Боря
      { id: 3, amount: 100.01, extra: false }, // хлеб — никто не отметил
      { id: 4, amount: 95, extra: true } // чаевые
    ];
    const claims = [{ itemId: 1, userId: 2 }, { itemId: 1, userId: 3 }, { itemId: 2, userId: 3 }];
    const result = split.itemize(items, claims, 1);
    expect(result.participants).toEqual([1, 2, 3]);
    expect(result.unclaimed).toEqual([3]);
    expect(result.totalCents).toBe(104501);
    expect(sum(result.totals)).toBe(104501);
    // Позиции: 1 → 3334 (хлеб), 2 → 32500 + 3334, 3 → 32500 + 20000 + 3333; чаевые 9500 — пропорционально
    expect([...result.totals]).toEqual([[1, 3668], [2, 39417], [3, 61416]]);
  });

  test('a shared item split three ways rounds to the cent and the payer takes the extra cent', () => {
    const result = split.itemize([{ id: 1, amount: 10, extra: false }], [1, 2, 3].map(userId => ({ itemId: 1, userId })), 2);
    expect(result.totals.get(2)).toBe(334);
    expect(result.totals.get(1)).toBe(333);
    expect(result.totals.get(3)).toBe(333);
  });

  test('untouched receipt: everything is on the payer alone', () => {
    const result = split.itemize([{ id: 1, amount: 12.5, extra: false }, { id: 2, amount: 1, extra: true }], [], 7);
    expect([...result.totals]).toEqual([[7, 1350]]);
  });

  test('rescale converts shares to another currency without losing a cent', () => {
    const shares = new Map([[1, 3334], [2, 3333], [3, 3333]]);
    const converted = split.rescale(91234, shares, 1);
    expect(sum(converted)).toBe(91234);
    expect(converted.get(1)).toBeGreaterThanOrEqual(converted.get(2));
  });

  test('tip/service/tax lines are recognized as shared, ordinary words are not', () => {
    expect(split.isExtraLine('Чаевые 10%')).toBe(true);
    expect(split.isExtraLine('Service charge')).toBe(true);
    expect(split.isExtraLine('Сервисный сбор')).toBe(true);
    expect(split.isExtraLine('Sales tax')).toBe(true);
    expect(split.isExtraLine('Taxi')).toBe(false);
    expect(split.isExtraLine('Сборная солянка')).toBe(false);
  });

  test('receipt items: total above the lines becomes one shared line (up to 25%)', () => {
    const items = split.itemsFromReceipt({ items: [{ name: 'A', amount: 100 }, { name: 'B', amount: 0 }], total: 110 }, { extraLabel: 'Tax' });
    expect(items).toEqual([
      { id: 1, name: 'A', amount: 100, extra: false },
      { id: 2, name: 'Tax', amount: 10, extra: true, implied: true }
    ]);
    expect(split.itemsFromReceipt({ items: [{ name: 'A', amount: 100 }], total: 200 })).toHaveLength(1);
  });

  test('exact amounts parse in order; wrong count or garbage → null', () => {
    expect(split.parseExactAmounts('500 300,50 400', 3)).toEqual([50000, 30050, 40000]);
    expect(split.parseExactAmounts('500, 300, 400', 3)).toEqual([50000, 30000, 40000]);
    expect(split.parseExactAmounts('500 300', 3)).toBeNull();
    expect(split.parseExactAmounts('500 abc 1', 3)).toBeNull();
  });
});

describe('debt simplification', () => {
  test('one creditor: everyone pays them directly', () => {
    expect(split.simplifyDebts(new Map([[1, 800], [2, -400], [3, -400]]), [1, 2, 3])).toEqual([
      { from: 2, to: 1, cents: 400 }, { from: 3, to: 1, cents: 400 }
    ]);
  });

  test('a chain A→B→C collapses to A→C', () => {
    // A должен B 100, B должен C 100 → балансы A −100, B 0, C +100
    expect(split.simplifyDebts(new Map([[1, -100], [2, 0], [3, 100]]))).toEqual([{ from: 1, to: 3, cents: 100 }]);
  });

  test('random balances: at most n−1 transfers and everyone ends at zero', () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let round = 0; round < 200; round += 1) {
      const n = 2 + Math.floor(random() * 7);
      const balances = new Map();
      let total = 0;
      for (let id = 1; id < n; id += 1) {
        const cents = Math.floor(random() * 200000) - 100000;
        balances.set(id, cents);
        total += cents;
      }
      balances.set(n, -total);
      const transfers = split.simplifyDebts(balances);
      expect(transfers.length).toBeLessThanOrEqual(n - 1);
      const after = new Map(balances);
      for (const transfer of transfers) {
        expect(transfer.cents).toBeGreaterThan(0);
        after.set(transfer.from, after.get(transfer.from) + transfer.cents);
        after.set(transfer.to, after.get(transfer.to) - transfer.cents);
      }
      for (const value of after.values()) expect(value).toBe(0);
    }
  });

  test('balances from records: paid minus own shares', () => {
    const balances = split.balancesOf([
      { payer_id: '1', amount: '1200.00', shares: [{ user_id: 1, share: '400' }, { user_id: 2, share: '400' }, { user_id: 3, share: '400' }] },
      { payer_id: 2, amount: 400, shares: [{ user_id: 1, share: 400 }] } // «рассчитались»: 2 отдал 1
    ]);
    expect([...balances]).toEqual([[1, 40000], [2, 0], [3, -40000]]);
  });
});

describe('edit throttle', () => {
  test('first edit at once, a burst collapses into one latest edit', async () => {
    const throttle = new EditThrottle({ intervalMs: 60 });
    const runs = [];
    for (let i = 0; i < 5; i += 1) throttle.schedule('m', async () => { runs.push(i); });
    await throttle.idle();
    expect(runs).toEqual([4]);
    throttle.schedule('m', async () => { runs.push('a'); });
    throttle.schedule('m', async () => { runs.push('b'); });
    const started = Date.now();
    await throttle.idle();
    expect(runs).toEqual([4, 'b']);
    expect(Date.now() - started).toBeGreaterThanOrEqual(40);
  });
});

// ---------- Учёт группы в памяти ----------

class FakeGroupRepository {
  constructor() {
    this.ledgers = [];
    this.members = [];
    this.expenses = [];
    this.shares = [];
    this.splits = [];
    this.claims = [];
    this.prompts = new Map();
    this.passes = [];
    this.seq = 1;
  }

  async getByChat(chatId) { return this.ledgers.find(l => String(l.chat_id) === String(chatId)) || null; }
  async getById(id) { return this.ledgers.find(l => l.id === Number(id)) || null; }
  async getByToken(token) { return this.ledgers.find(l => l.token === token) || null; }
  async createForChat({ chatId, token, title, currency, lang, createdBy }) {
    const existing = await this.getByChat(chatId);
    if (existing) return { ...Object.assign(existing, { active: true }), created: false };
    const ledger = { id: this.seq++, chat_id: String(chatId), token, title, currency, lang, created_by: String(createdBy), active: true, pass_until: null, created_at: new Date() };
    this.ledgers.push(ledger);
    return { ...ledger, created: true };
  }
  async getOrCreateLinkLedger({ userId, token, title, currency, lang }) {
    const existing = this.ledgers.find(l => l.chat_id === null && Number(l.created_by) === Number(userId));
    if (existing) return existing;
    const ledger = { id: this.seq++, chat_id: null, token, title, currency, lang, created_by: String(userId), active: true, pass_until: null };
    this.ledgers.push(ledger);
    return ledger;
  }
  async setActive(chatId, active) { const l = await this.getByChat(chatId); if (l) l.active = active; }
  async addMember(groupId, { userId, name, username, lang, viaLink }) {
    let member = this.members.find(m => m.group_id === groupId && Number(m.user_id) === Number(userId));
    if (member) Object.assign(member, { left_at: null, name, via_link: member.via_link && viaLink });
    else {
      member = { group_id: groupId, user_id: String(userId), name, username, lang, via_link: viaLink, joined_at: this.seq++, left_at: null };
      this.members.push(member);
    }
    return member;
  }
  async getMember(groupId, userId) { return this.members.find(m => m.group_id === groupId && Number(m.user_id) === Number(userId) && !m.left_at) || null; }
  async getMembers(groupId, { includeLeft = false } = {}) { return this.members.filter(m => m.group_id === groupId && (includeLeft || !m.left_at)); }
  async leave(groupId, userId) { const m = await this.getMember(groupId, userId); if (m) m.left_at = new Date(); return m; }
  async addExpense({ groupId, kind = 'expense', payerId, createdBy, amount, currency, amountGroup, description = null, splitMode = 'equal', splitId = null, shares }) {
    const id = this.seq++;
    this.expenses.push({ id, group_id: groupId, kind, payer_id: String(payerId), created_by: String(createdBy), amount: String(amount), currency, amount_group: String(amountGroup), description, split_mode: splitMode, split_id: splitId, message_id: null, created_at: new Date(), deleted_at: null });
    for (const share of shares) this.shares.push({ expense_id: id, user_id: String(share.userId), share: String(share.share), copied_expense_id: null });
    return id;
  }
  async setExpenseMessage(id, messageId) { this.expenses.find(e => e.id === id).message_id = messageId; }
  async getExpense(id) {
    const expense = this.expenses.find(e => e.id === Number(id));
    return expense ? { ...expense, shares: this.shares.filter(s => s.expense_id === expense.id) } : null;
  }
  async replaceShares(id, mode, shares) {
    const expense = this.expenses.find(e => e.id === id && !e.deleted_at);
    if (!expense) return false;
    this.shares = this.shares.filter(s => s.expense_id !== id);
    for (const share of shares) this.shares.push({ expense_id: id, user_id: String(share.userId), share: String(share.share), copied_expense_id: null });
    expense.split_mode = mode;
    return true;
  }
  async deleteExpense(id, userId) {
    const expense = this.expenses.find(e => e.id === id && Number(e.created_by) === Number(userId) && !e.deleted_at);
    if (!expense) return null;
    expense.deleted_at = new Date();
    return expense;
  }
  async lastOwnRecord(groupId, userId) {
    const own = this.expenses.filter(e => e.group_id === groupId && Number(e.created_by) === Number(userId) && !e.deleted_at);
    return own.length ? this.getExpense(own[own.length - 1].id) : null;
  }
  async records(groupId) {
    return this.expenses.filter(e => e.group_id === groupId && !e.deleted_at).map(e => ({
      id: e.id, payer_id: e.payer_id, amount: e.amount_group,
      shares: this.shares.filter(s => s.expense_id === e.id).map(s => ({ user_id: Number(s.user_id), share: s.share }))
    }));
  }
  async monthUsage(groupId) {
    return {
      expenses: this.expenses.filter(e => e.group_id === groupId && e.kind === 'expense' && ['equal', 'exact'].includes(e.split_mode) && !e.deleted_at).length,
      splits: this.splits.filter(s => s.group_id === groupId && s.status !== 'canceled').length
    };
  }
  async markCopied() { return null; }
  async createSplit({ groupId, token, payerId, merchant, currency, items, warn, sourceReceiptId }) {
    const row = { id: this.seq++, group_id: groupId, token, payer_id: String(payerId), merchant, currency, items, warn, status: 'open', chat_id: null, message_id: null, page: 0, dirty: false, source_receipt_id: sourceReceiptId, expense_id: null };
    this.splits.push(row);
    return { ...row };
  }
  async getSplit(id) { const row = this.splits.find(s => s.id === Number(id)); return row ? { ...row } : null; }
  async getSplitByToken(token) { const row = this.splits.find(s => s.token === token); return row ? { ...row } : null; }
  async setSplitMessage(id, chatId, messageId) { Object.assign(this.splits.find(s => s.id === id), { chat_id: String(chatId), message_id: String(messageId) }); }
  async setSplitPage(id, page) { this.splits.find(s => s.id === id).page = page; }
  async getClaims(splitId) { return this.claims.filter(c => c.splitId === splitId).map(({ itemId, userId }) => ({ itemId, userId })); }
  async toggleClaim(splitId, itemId, userId) {
    const row = this.splits.find(s => s.id === splitId);
    if (!row) return { status: 'missing' };
    if (row.status !== 'open') return { status: row.status };
    const index = this.claims.findIndex(c => c.splitId === splitId && c.itemId === itemId && c.userId === Number(userId));
    row.dirty = true;
    if (index >= 0) {
      this.claims.splice(index, 1);
      return { status: 'unclaimed' };
    }
    this.claims.push({ splitId, itemId, userId: Number(userId) });
    return { status: 'claimed' };
  }
  async setDirty(id, dirty) { this.splits.find(s => s.id === id).dirty = dirty; }
  async listDirtySplits() { return this.splits.filter(s => s.dirty && s.message_id); }
  async closeSplit(splitId, userId, build) {
    const row = this.splits.find(s => s.id === splitId);
    if (!row) return { status: 'missing' };
    if (row.status === 'closed') return { status: 'closed_already', split: { ...row } };
    if (row.status === 'canceled') return { status: 'canceled', split: { ...row } };
    if (Number(row.payer_id) !== Number(userId)) return { status: 'forbidden', split: { ...row } };
    const data = await build({ ...row }, await this.getClaims(splitId));
    const expenseId = await this.addExpense({ groupId: row.group_id, payerId: row.payer_id, createdBy: row.payer_id, amount: data.amount, currency: row.currency, amountGroup: data.amountGroup, description: data.description, splitMode: 'receipt', splitId, shares: data.shares });
    Object.assign(row, { status: 'closed', expense_id: expenseId, dirty: false });
    return { status: 'closed', split: { ...row }, expenseId };
  }
  async cancelSplit(splitId, userId) {
    const row = this.splits.find(s => s.id === splitId && Number(s.payer_id) === Number(userId) && s.status === 'open');
    if (!row) return null;
    row.status = 'canceled';
    return { ...row };
  }
  async addPrompt(chatId, messageId, userId, kind, refId) { this.prompts.set(`${chatId}:${messageId}`, { chat_id: chatId, message_id: messageId, user_id: String(userId), kind, ref_id: refId }); }
  async getPrompt(chatId, messageId) { return this.prompts.get(`${chatId}:${messageId}`) || null; }
  async deletePrompt(chatId, messageId) { this.prompts.delete(`${chatId}:${messageId}`); }
  async addPass({ groupId, userId, stars, days, chargeId }) {
    if (this.passes.some(p => p.telegram_payment_id === chargeId)) return { duplicate: true };
    this.passes.push({ id: this.seq++, group_id: groupId, user_id: String(userId), stars, days, telegram_payment_id: chargeId, status: 'paid' });
    const ledger = await this.getById(groupId);
    const base = ledger.pass_until && ledger.pass_until > new Date() ? ledger.pass_until : new Date();
    ledger.pass_until = new Date(base.getTime() + days * 86400000);
    return { duplicate: false, passUntil: ledger.pass_until };
  }
  async getPassByChargeId(chargeId) { return this.passes.find(p => p.telegram_payment_id === chargeId) || null; }
  async refundPass(chargeId) {
    const pass = await this.getPassByChargeId(chargeId);
    if (!pass) return null;
    if (pass.status === 'refunded') return { alreadyRefunded: true, pass };
    pass.status = 'refunded';
    const ledger = await this.getById(pass.group_id);
    ledger.pass_until = new Date(ledger.pass_until.getTime() - pass.days * 86400000);
    return { alreadyRefunded: false, pass, passUntil: ledger.pass_until };
  }
}

function makeService({ premiumUsers = [], registered = [] } = {}) {
  const repository = new FakeGroupRepository();
  const users = new Map(registered.map(id => [id, { id, language: 'ru', currency: 'RUB', timezone: 'UTC' }]));
  const service = new GroupService({
    groupRepository: repository,
    userService: { getUserById: async (id) => users.get(Number(id)) || null },
    premiumService: { isPremiumUser: async (id) => premiumUsers.includes(Number(id)) },
    currencyUtils: { convert: async (amount, from, to) => (from === 'USD' && to === 'RUB' ? amount * 90 : amount) },
    expenseService: {}
  });
  return { service, repository, users };
}

const from = (id, first = `U${id}`) => ({ id, is_bot: false, first_name: first, language_code: 'ru' });

describe('group limits and the group pass', () => {
  test('free cap: 30 expenses a month per group, settle-ups and receipt totals do not count', async () => {
    const { service } = makeService();
    const ledger = await service.enable({ id: -1, title: 'Trip' }, from(1), 'ru');
    await service.join(ledger.id, from(2));
    for (let i = 0; i < GROUP_LIMITS.FREE_EXPENSES_PER_MONTH - 1; i += 1) {
      await service.recordExpense(ledger, { payerId: 1, amount: 100, currency: 'RUB', description: `#${i}` });
    }
    expect((await service.allow(ledger, 'expenses')).ok).toBe(true);
    await service.recordExpense(ledger, { payerId: 1, amount: 100, currency: 'RUB', description: 'last' });
    const blocked = await service.allow(ledger, 'expenses');
    expect(blocked.ok).toBe(false);
    expect(blocked.limits.used.expenses).toBe(GROUP_LIMITS.FREE_EXPENSES_PER_MONTH);
    // «Рассчитались» всегда можно и в лимит не идёт
    expect((await service.settle(ledger, 2, 1, 2)).status).toBe('ok');
    expect((await service.allow(ledger, 'expenses')).limits.used.expenses).toBe(GROUP_LIMITS.FREE_EXPENSES_PER_MONTH);
  });

  test('3 receipt splits a month; canceled splits are not counted', async () => {
    const { service } = makeService();
    const ledger = await service.enable({ id: -2, title: 'Flat' }, from(1), 'ru');
    const receipt = { merchant: 'Cafe', currency: 'RUB', total: 100, items: [{ name: 'Tea', amount: 100 }] };
    const first = await service.createSplit(ledger, { payerId: 1, receipt });
    await service.cancelSplit(first.id, 1);
    for (let i = 0; i < GROUP_LIMITS.FREE_SPLITS_PER_MONTH; i += 1) await service.createSplit(ledger, { payerId: 1, receipt });
    expect((await service.allow(ledger, 'splits')).ok).toBe(false);
  });

  test('an active pass or the creator\'s personal premium lifts the caps', async () => {
    const { service, repository } = makeService({ premiumUsers: [7] });
    const ledger = await service.enable({ id: -3, title: 'A' }, from(1), 'ru');
    for (let i = 0; i < GROUP_LIMITS.FREE_EXPENSES_PER_MONTH; i += 1) await service.recordExpense(ledger, { payerId: 1, amount: 1, currency: 'RUB' });
    expect((await service.allow(ledger, 'expenses')).ok).toBe(false);
    const granted = await service.grantPass({ groupId: ledger.id, userId: 1, stars: GROUP_PASS.stars, days: GROUP_PASS.days, chargeId: 'c1' });
    expect(granted.status).toBe('completed');
    const fresh = await repository.getById(ledger.id);
    const allowed = await service.allow(fresh, 'expenses');
    expect(allowed).toMatchObject({ ok: true, limits: { unlimited: true, reason: 'pass' } });
    // Повторная доставка того же платежа срок не продлевает
    expect((await service.grantPass({ groupId: ledger.id, userId: 1, stars: 99, days: 30, chargeId: 'c1' })).status).toBe('duplicate');
    expect(repository.passes).toHaveLength(1);
    // Возврат вычитает срок
    expect((await service.revokePass('c1')).status).toBe('refunded');
    expect((await service.allow(await repository.getById(ledger.id), 'expenses')).ok).toBe(false);
    expect((await service.revokePass('c1')).status).toBe('already_refunded');

    const premiumLedger = await service.enable({ id: -4, title: 'B' }, from(7), 'ru');
    for (let i = 0; i < GROUP_LIMITS.FREE_EXPENSES_PER_MONTH + 5; i += 1) await service.recordExpense(premiumLedger, { payerId: 7, amount: 1, currency: 'RUB' });
    expect(await service.allow(premiumLedger, 'expenses')).toMatchObject({ ok: true, limits: { reason: 'premium' } });
  });

  test('pre_checkout: group pass needs the current price and a member of an existing group', async () => {
    const { service } = makeService();
    const ledger = await service.enable({ id: -5, title: 'C' }, from(1), 'ru');
    const payments = new PaymentService(null, localizationService, null, { getActiveRecurringSubscription: async () => null, getTransactionByTelegramPaymentId: async () => null }, null);
    payments.setGroupService(service);
    const query = (userId, stars, groupId = ledger.id) => ({
      currency: 'XTR', total_amount: stars, invoice_payload: JSON.stringify({ type: 'group_pass', group_id: groupId, days: GROUP_PASS.days, user_id: userId })
    });
    expect(await payments.checkPreCheckout(query(1, GROUP_PASS.stars), 1)).toEqual({ ok: true });
    expect(await payments.checkPreCheckout(query(1, GROUP_PASS.stars - 1), 1)).toMatchObject({ ok: false, reason: 'price_changed' });
    expect(await payments.checkPreCheckout(query(1, GROUP_PASS.stars), 2)).toMatchObject({ ok: false, reason: 'foreign_payer' });
    expect(await payments.checkPreCheckout(query(5, GROUP_PASS.stars), 5)).toMatchObject({ ok: false, reason: 'group_outdated' });
    expect(await payments.checkPreCheckout(query(1, GROUP_PASS.stars, 999), 1)).toMatchObject({ ok: false, reason: 'group_outdated' });

    const paid = await payments.handleSuccessfulPayment({
      invoice_payload: JSON.stringify({ type: 'group_pass', group_id: ledger.id, days: GROUP_PASS.days, user_id: 1 }),
      total_amount: GROUP_PASS.stars, telegram_payment_charge_id: 'ch-1'
    }, {});
    expect(paid).toMatchObject({ type: 'group_pass', status: 'completed' });
    expect(await payments.findPaymentByChargeId('ch-1')).toMatchObject({ kind: 'group_pass', userId: 1, stars: GROUP_PASS.stars });
    expect(await payments.revokeRefundedPayment('ch-1')).toMatchObject({ status: 'refunded', type: 'group_pass' });
    expect(await payments.revokeRefundedPayment('ch-1')).toMatchObject({ status: 'already_refunded' });
  });

  test('group expenses: equal split among in-chat members, foreign currency converted, exact shares must add up', async () => {
    const { service } = makeService();
    const ledger = await service.enable({ id: -6, title: 'D' }, from(1), 'ru');
    await service.join(ledger.id, from(2));
    await service.join(ledger.id, from(3));
    await service.join(ledger.id, from(9), { viaLink: true }); // по ссылке на чек — не в «поровну на всех»
    const id = await service.recordExpense(ledger, { payerId: 2, amount: 100, currency: 'RUB', description: 'pizza' });
    const expense = await service.getExpense(id);
    expect(expense.shares.map(s => [Number(s.user_id), Number(s.share)])).toEqual([[2, 33.34], [1, 33.33], [3, 33.33]]);
    expect(await service.setExactShares(expense, [1, 2, 3], [5000, 3000, 1000])).toBe('sum_mismatch');
    expect(await service.setExactShares(expense, [1, 2, 3], [5000, 3000, 2000])).toBe('ok');
    const usd = await service.getExpense(await service.recordExpense(ledger, { payerId: 1, amount: 10, currency: 'USD' }));
    expect(Number(usd.amount_group)).toBe(900);
    const { transfers, balances } = await service.balances(ledger);
    expect(sum(balances)).toBe(0);
    expect(transfers.every(t => t.cents > 0)).toBe(true);
  });
});

// ---------- Апдейты Telegram: права и личное в группе ----------

describe('group chat permissions and privacy', () => {
  let bot;
  let calls;
  let personal;
  let handlers;
  let repository;
  let updateId = 0;
  const BOT = { id: 999, is_bot: true, username: 'ExpBot', first_name: 'Bot' };
  const group = { id: -100777, type: 'supergroup', title: 'Trip' };

  beforeEach(() => {
    calls = [];
    let messageId = 1000;
    jest.spyOn(Telegram.prototype, 'callApi').mockImplementation(async (method, payload) => {
      calls.push({ method, payload });
      if (method === 'sendMessage') return { message_id: ++messageId, chat: { id: payload.chat_id }, text: payload.text };
      return true;
    });
    const made = makeService({ registered: [1, 2, 3] });
    repository = made.repository;
    handlers = new GroupHandlers({
      groupService: made.service,
      userService: { getUserById: async (id) => made.users.get(Number(id)) || null },
      localizationService,
      formatter: new Formatter({ convert: async (amount) => amount }),
      validator: new EnhancedValidator(),
      receiptService: { configured: true },
      receiptHandlers: { busyUsers: new Set() },
      paymentService: {},
      throttle: new EditThrottle({ intervalMs: 0 })
    });
    bot = new Telegraf('123:TEST');
    bot.botInfo = BOT;
    personal = [];
    bot.use(privateChatOnly());
    bot.use(handlers.middleware());
    bot.use((ctx, next) => (ctx.state.groupChat ? undefined : next()));
    bot.use((ctx) => { personal.push(ctx.updateType); });
  });

  afterEach(() => jest.restoreAllMocks());

  const command = (user, text, chat = group, extra = {}) => ({
    update_id: ++updateId,
    message: { message_id: ++updateId, date: 1, chat, from: user, text, entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }], ...extra }
  });
  const press = (user, data, messageId = 1) => ({
    update_id: ++updateId,
    callback_query: { id: `cb${++updateId}`, from: user, chat_instance: 'x', data, message: { message_id: messageId, date: 1, chat: group, from: BOT, text: 'm' } }
  });
  const sent = () => calls.filter(c => c.method === 'sendMessage');
  const alerts = () => calls.filter(c => c.method === 'answerCallbackQuery').map(c => c.payload.text);

  async function enableWithMembers(...ids) {
    await bot.handleUpdate(press(from(ids[0]), 'gon'));
    for (const id of ids.slice(1)) await bot.handleUpdate(press(from(id), 'gj'));
  }

  test('being added to a group posts an intro with the enable button and never leaves', async () => {
    await bot.handleUpdate({
      update_id: ++updateId,
      my_chat_member: { chat: group, from: from(1), date: 1, old_chat_member: { status: 'left', user: BOT }, new_chat_member: { status: 'member', user: BOT } }
    });
    expect(calls.map(c => c.method)).toEqual(['sendMessage']);
    expect(sent()[0].payload.reply_markup.inline_keyboard[0][0].callback_data).toBe('gon');
    expect(personal).toEqual([]);
  });

  test('personal commands in a group: one hint with a deep link, personal handlers never run', async () => {
    await enableWithMembers(1);
    calls.length = 0;
    for (const text of ['/stats', '/history', '/savings', '/invite', '/stats@ExpBot']) await bot.handleUpdate(command(from(1), text));
    await bot.handleUpdate(command(from(2), '/history'));
    expect(personal).toEqual([]);
    expect(sent()).toHaveLength(2); // по разу каждому: дальше — тишина
    expect(sent()[0].payload.text).toContain('https://t.me/ExpBot');
    expect(calls.some(c => c.method === 'leaveChat')).toBe(false);
  });

  test('a personal button under a message in a group only shows an alert', async () => {
    await bot.handleUpdate(press(from(1), 'ov|0'));
    expect(personal).toEqual([]);
    expect(calls.map(c => c.method)).toEqual(['answerCallbackQuery']);
    expect(calls[0].payload.show_alert).toBe(true);
  });

  test('anonymous admins, Telegram and channel-signed messages are ignored', async () => {
    await enableWithMembers(1);
    calls.length = 0;
    await bot.handleUpdate(command({ id: 1087968824, is_bot: true, first_name: 'Group' }, '/spent 100 x', group, { sender_chat: group }));
    await bot.handleUpdate(command({ id: 1087968824, is_bot: true, first_name: 'Group' }, '/spent 100 x'));
    await bot.handleUpdate(command({ id: 777000, is_bot: false, first_name: 'Telegram' }, '/spent 100 x'));
    expect(calls).toEqual([]);
    expect(personal).toEqual([]);
    expect(repository.expenses).toHaveLength(0);
    expect(repository.members.map(m => Number(m.user_id))).toEqual([1]);
  });

  test('/spent records for members; a non-member is asked to join and nothing is recorded', async () => {
    await enableWithMembers(1, 2);
    calls.length = 0;
    await bot.handleUpdate(command(from(5), '/spent 1200 пицца'));
    expect(repository.expenses).toHaveLength(0);
    expect(sent()[0].payload.reply_markup.inline_keyboard[0][0].callback_data).toBe('gj');
    await bot.handleUpdate(command(from(2), '/s@ExpBot 1200 пицца'));
    expect(repository.expenses).toHaveLength(1);
    expect(repository.expenses[0]).toMatchObject({ payer_id: '2', amount_group: '1200', description: 'пицца' });
    expect(sent().pop().payload.text).toContain('U2');
  });

  test('only the author can change participants or undo; a non-member cannot claim receipt items', async () => {
    await enableWithMembers(1, 2, 3);
    await bot.handleUpdate(command(from(2), '/spent 300 такси'));
    const expenseId = repository.expenses[0].id;
    calls.length = 0;
    await bot.handleUpdate(press(from(3), `gex|${expenseId}`));
    await bot.handleUpdate(press(from(3), `gep|${expenseId}`));
    expect(repository.expenses[0].deleted_at).toBeNull();
    expect(alerts().filter(Boolean)).toHaveLength(2);
    await bot.handleUpdate(press(from(2), `get|${expenseId}|3`));
    expect(repository.shares.filter(s => s.expense_id === expenseId).map(s => s.user_id).sort()).toEqual(['1', '2']);
    await bot.handleUpdate(press(from(2), `gex|${expenseId}`));
    expect(repository.expenses[0].deleted_at).not.toBeNull();

    const ledger = repository.ledgers[0];
    const created = await repository.createSplit({ groupId: ledger.id, token: 'tok123456', payerId: 1, merchant: 'Cafe', currency: 'RUB', items: [{ id: 1, name: 'Tea', amount: 100, extra: false }] });
    await repository.setSplitMessage(created.id, group.id, 50);
    await bot.handleUpdate(press(from(8), `gsi|${created.id}|1`, 50));
    expect(repository.claims).toHaveLength(0);
    await bot.handleUpdate(press(from(2), `gsi|${created.id}|1`, 50));
    expect(repository.claims).toHaveLength(1);
    // Закрыть может только плательщик; после закрытия кнопки устарели
    await bot.handleUpdate(press(from(2), `gsc|${created.id}`, 50));
    expect((await repository.getSplit(created.id)).status).toBe('open');
    await bot.handleUpdate(press(from(1), `gsc|${created.id}`, 50));
    expect((await repository.getSplit(created.id)).status).toBe('closed');
    calls.length = 0;
    await bot.handleUpdate(press(from(3), `gsi|${created.id}|1`, 50));
    expect(repository.claims).toHaveLength(1);
    expect(alerts()[0]).toBe(localizationService.getText('ru', 'grp_split_already_closed'));
    const receiptExpense = repository.expenses.find(e => e.split_mode === 'receipt');
    // Чай отметил только второй — вся сумма на нём, у плательщика доли нет
    expect(repository.shares.filter(s => s.expense_id === receiptExpense.id).map(s => [s.user_id, s.share])).toEqual([['2', '100']]);
    await handlers.idle();
  });

  test('settle-up: only one of the two can mark it, and it records the simplified debt', async () => {
    await enableWithMembers(1, 2, 3);
    await bot.handleUpdate(command(from(1), '/spent 900 ужин'));
    const ledger = repository.ledgers[0];
    await bot.handleUpdate(press(from(3), `gsu|${ledger.id}|2|1`));
    expect(repository.expenses.filter(e => e.kind === 'settle')).toHaveLength(0);
    await bot.handleUpdate(press(from(2), `gsu|${ledger.id}|2|1`));
    const settle = repository.expenses.find(e => e.kind === 'settle');
    expect(settle).toMatchObject({ payer_id: '2', amount_group: '300' });
    // Тот же долг второй раз — «уже закрыт»
    await bot.handleUpdate(press(from(1), `gsu|${ledger.id}|2|1`));
    expect(repository.expenses.filter(e => e.kind === 'settle')).toHaveLength(1);
  });
});

describe('the middleware keeps personal data out of groups', () => {
  let bot;
  let seen;
  beforeEach(() => {
    bot = new Telegraf('123:TEST');
    bot.botInfo = { id: 999, is_bot: true, username: 'ExpBot' };
    seen = [];
    jest.spyOn(Telegram.prototype, 'callApi').mockImplementation(async () => true);
    bot.use(privateChatOnly());
    bot.use((ctx) => { seen.push({ type: ctx.updateType, group: Boolean(ctx.state.groupChat) }); });
  });
  afterEach(() => jest.restoreAllMocks());

  test('group updates are marked for the group mode, payment messages are not lost', async () => {
    const group = { id: -1, type: 'group', title: 'g' };
    await bot.handleUpdate({ update_id: 1, message: { message_id: 1, date: 1, chat: group, from: from(5), text: 'hi' } });
    await bot.handleUpdate({ update_id: 2, message: { message_id: 2, date: 1, chat: group, from: from(5), successful_payment: { currency: 'XTR', total_amount: 1, invoice_payload: '{}', telegram_payment_charge_id: 'x', provider_payment_charge_id: '' } } });
    await bot.handleUpdate({ update_id: 3, my_chat_member: { chat: group, from: { id: 1087968824, is_bot: true, first_name: 'Group' }, date: 1, old_chat_member: { status: 'left', user: bot.botInfo }, new_chat_member: { status: 'member', user: bot.botInfo } } });
    expect(seen).toEqual([{ type: 'message', group: true }, { type: 'message', group: false }, { type: 'my_chat_member', group: true }]);
  });
});

describe('real routes: personal handlers never see group updates', () => {
  test('/stats, /history, personal buttons and text in a group do not reach personal handlers; in private they do', async () => {
    const registerBotRoutes = require('../botRoutes');
    const StateService = require('../services/StateService');
    jest.spyOn(Telegram.prototype, 'callApi').mockImplementation(async (method) => (method === 'sendMessage' ? { message_id: 1 } : true));
    const any = () => {
      const fns = {};
      return new Proxy({}, { get: (target, name) => (fns[name] = fns[name] || jest.fn().mockResolvedValue(undefined)) });
    };
    const made = makeService();
    const groupHandlers = new GroupHandlers({
      groupService: made.service, userService: { getUserById: async () => null }, localizationService,
      formatter: new Formatter({ convert: async (amount) => amount }), validator: new EnhancedValidator(),
      receiptService: { configured: true }, receiptHandlers: { busyUsers: new Set() }, paymentService: {}, throttle: new EditThrottle({ intervalMs: 0 })
    });
    const handlers = {
      errorHandler: (fn) => fn,
      commandHandlers: any(), messageHandlers: any(), callbackHandlers: any(), expenseHandlers: any(), onboardingHandlers: any(),
      receiptHandlers: any(), referralHandlers: any(), savingsHandlers: any(), groupHandlers,
      stateService: new StateService(), localizationService,
      userService: { getUserLanguage: jest.fn().mockResolvedValue('en'), userRepository: { refreshProfile: jest.fn() } },
      enhancedValidator: new EnhancedValidator()
    };
    const bot = new Telegraf('123:TEST');
    bot.botInfo = { id: 999, is_bot: true, username: 'ExpBot', first_name: 'Bot' };
    bot.use(privateChatOnly());
    registerBotRoutes(bot, handlers);
    const group = { id: -42, type: 'supergroup', title: 'G' };
    let id = 0;
    const cmd = (chat, text) => bot.handleUpdate({ update_id: ++id, message: { message_id: id, date: 1, chat, from: from(5), text, entities: text.startsWith('/') ? [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] : undefined } });
    for (const text of ['/stats', '/history', '/savings', '/start', '/help', '250 кофе']) await cmd(group, text);
    await bot.handleUpdate({ update_id: ++id, callback_query: { id: 'q1', from: from(5), chat_instance: 'x', data: 'sv', message: { message_id: 1, date: 1, chat: group, from: bot.botInfo, text: 'x' } } });
    expect(handlers.expenseHandlers.showOverview).not.toHaveBeenCalled();
    expect(handlers.expenseHandlers.showDay).not.toHaveBeenCalled();
    expect(handlers.savingsHandlers.showMenu).not.toHaveBeenCalled();
    expect(handlers.onboardingHandlers.start).not.toHaveBeenCalled();
    expect(handlers.commandHandlers.help).not.toHaveBeenCalled();
    expect(handlers.messageHandlers.handleExpense).not.toHaveBeenCalled();
    const privateChat = { id: 5, type: 'private', first_name: 'U5' };
    await cmd(privateChat, '/stats');
    await cmd(privateChat, '250 кофе');
    expect(handlers.expenseHandlers.showOverview).toHaveBeenCalledTimes(1);
    expect(handlers.messageHandlers.handleExpense).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });
});
