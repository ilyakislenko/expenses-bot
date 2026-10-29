const crypto = require('crypto');
const logger = require('../utils/logger');
const { GROUP_LIMITS, GROUP_PASS } = require('../utils/constants');
const { SUPPORTED_CURRENCIES } = require('../config/currencies');
const { LANGUAGE_CURRENCY } = require('../utils/onboarding');
const split = require('../utils/groupSplit');

const TOKEN_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const HISTORY_PAGE = 10;

// Код для ссылок t.me/<бот>?start=split_<код> / gpass_<код>: 10 знаков из 31 (≈ 2^49 — не перебрать)
function newToken(length = 10) {
  const bytes = crypto.randomBytes(length);
  let token = '';
  for (let i = 0; i < length; i += 1) token += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  return token;
}

// Начало текущего месяца UTC: лимиты группы — на календарный месяц (у группы нет своего пояса)
function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function nextMonthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

// Имя участника в списках: имя и первая буква фамилии
function displayName(from) {
  const first = String(from.first_name || '').trim();
  const last = String(from.last_name || '').trim();
  const name = [first, last ? `${last[0]}.` : ''].filter(Boolean).join(' ') || (from.username ? `@${from.username}` : String(from.id));
  return name.slice(0, 64);
}

// Общие расходы группы (Splitwise-подобно): участники по кнопке, траты поровну / по выбранным / точными суммами,
// балансы с упрощением долгов, «рассчитались», делёж чека по позициям, месячные лимиты и «🎫 Пропуск для группы».
// Деньги считаются в копейках (utils/groupSplit.js); доли хранятся в валюте группы.
class GroupService {
  constructor({ groupRepository, userService, premiumService, currencyUtils, expenseService }) {
    this.groupRepository = groupRepository;
    this.userService = userService;
    this.premiumService = premiumService;
    this.currencyUtils = currencyUtils;
    this.expenseService = expenseService;
  }

  // ---------- Учёт и участники ----------

  async ledgerForChat(chatId) {
    return this.groupRepository.getByChat(chatId);
  }

  async getLedger(groupId) {
    return this.groupRepository.getById(groupId);
  }

  async ledgerByToken(token) {
    return this.groupRepository.getByToken(token);
  }

  // Валюта нового учёта: основная валюта того, кто включил (если он пользуется ботом), иначе по языку
  async defaultCurrency(userId, lang) {
    const user = await this.userService.getUserById(userId).catch(() => null);
    if (user && user.currency && SUPPORTED_CURRENCIES.includes(user.currency)) return user.currency;
    return LANGUAGE_CURRENCY[lang] || 'USD';
  }

  // «➕ Вести общие расходы в этом чате»: учёт чата (или прежний, если бота вернули) и включивший — первый участник
  async enable(chat, from, lang) {
    const currency = await this.defaultCurrency(from.id, lang);
    const ledger = await this.groupRepository.createForChat({
      chatId: chat.id, token: newToken(), title: String(chat.title || '').slice(0, 128), currency, lang, createdBy: from.id
    });
    await this.join(ledger.id, from, { lang });
    if (ledger.created) logger.info('Group ledger enabled', { groupId: ledger.id, chatId: chat.id, userId: from.id });
    return ledger;
  }

  async join(groupId, from, { lang = null, viaLink = false } = {}) {
    return this.groupRepository.addMember(groupId, {
      userId: from.id, name: displayName(from), username: from.username || null, lang, viaLink
    });
  }

  async member(groupId, userId) {
    return this.groupRepository.getMember(groupId, userId);
  }

  async members(groupId, options) {
    return this.groupRepository.getMembers(groupId, options);
  }

  // Выйти из учёта можно только с нулевым балансом. → 'left' | 'not_member' | 'has_balance'
  async leave(ledger, userId) {
    const { balances } = await this.balances(ledger);
    if (balances.get(Number(userId))) return 'has_balance';
    return (await this.groupRepository.leave(ledger.id, userId)) ? 'left' : 'not_member';
  }

  async setActive(chatId, active) {
    await this.groupRepository.setActive(chatId, active);
  }

  async setTitle(chatId, title) {
    if (title) await this.groupRepository.setTitle(chatId, String(title).slice(0, 128));
  }

  async migrateChat(fromChatId, toChatId) {
    await this.groupRepository.migrateChat(fromChatId, toChatId);
  }

  // Группы пользователя для «👥 Разделить с друзьями» из лички
  async userChatLedgers(userId) {
    return this.groupRepository.listUserChatLedgers(userId);
  }

  // Счёт «по ссылке»: чеки из лички без группы — один на пользователя, долги друзей копятся в нём
  async linkLedger(from, lang, title) {
    const currency = await this.defaultCurrency(from.id, lang);
    const ledger = await this.groupRepository.getOrCreateLinkLedger({ userId: from.id, token: newToken(), title, currency, lang });
    await this.join(ledger.id, from, { lang });
    return ledger;
  }

  // ---------- Лимиты ----------

  // { unlimited, reason: 'pass' | 'premium' | null, passUntil, used: { expenses, splits }, caps, resetsAt }
  async limits(ledger, now = new Date()) {
    const passUntil = ledger.pass_until ? new Date(ledger.pass_until) : null;
    const caps = { expenses: GROUP_LIMITS.FREE_EXPENSES_PER_MONTH, splits: GROUP_LIMITS.FREE_SPLITS_PER_MONTH };
    const used = await this.groupRepository.monthUsage(ledger.id, monthStart(now));
    let reason = null;
    if (passUntil && passUntil > now) reason = 'pass';
    else if (await this.premiumService.isPremiumUser(Number(ledger.created_by))) reason = 'premium';
    return { unlimited: Boolean(reason), reason, passUntil: reason === 'pass' ? passUntil : null, used, caps, resetsAt: nextMonthStart(now) };
  }

  // Можно ли ещё (kind: 'expenses' | 'splits'). → { ok, limits }
  async allow(ledger, kind) {
    const limits = await this.limits(ledger);
    return { ok: limits.unlimited || limits.used[kind] < limits.caps[kind], limits };
  }

  // ---------- Траты ----------

  async toGroupCents(amount, currency, groupCurrency) {
    if (currency === groupCurrency) return split.toCents(amount);
    return split.toCents(await this.currencyUtils.convert(Number(amount), currency, groupCurrency));
  }

  // Участники «поровну на всех»: все в учёте, кроме пришедших по ссылке на чек; плательщик — всегда
  defaultParticipants(members, payerId) {
    const ids = members.filter(member => !member.via_link).map(member => Number(member.user_id));
    return ids.includes(Number(payerId)) ? ids : [Number(payerId), ...ids];
  }

  sharesFrom(map) {
    return [...map.entries()].filter(([, cents]) => cents > 0).map(([userId, cents]) => ({ userId, share: split.fromCents(cents) }));
  }

  // Трата: платит отправитель, поровну на всех участников учёта. → id траты
  async recordExpense(ledger, { payerId, createdBy = payerId, amount, currency, description }) {
    const cents = await this.toGroupCents(amount, currency, ledger.currency);
    if (cents <= 0) throw new Error('Group expense amount rounds to zero');
    const members = await this.members(ledger.id);
    const participants = this.defaultParticipants(members, payerId);
    const shares = this.sharesFrom(split.splitEqual(cents, participants, payerId));
    return this.groupRepository.addExpense({
      groupId: ledger.id, payerId, createdBy, amount, currency, amountGroup: split.fromCents(cents), description, shares
    });
  }

  async setExpenseMessage(expenseId, messageId) {
    await this.groupRepository.setExpenseMessage(expenseId, messageId);
  }

  async getExpense(expenseId) {
    return this.groupRepository.getExpense(expenseId);
  }

  // Поровну на выбранных (хотя бы один). false — трата отменена
  async setParticipants(expense, userIds) {
    const ids = [...new Set(userIds.map(Number))];
    if (!ids.length) return false;
    const shares = this.sharesFrom(split.splitEqual(split.toCents(expense.amount_group), ids, expense.payer_id));
    return this.groupRepository.replaceShares(expense.id, 'equal', shares);
  }

  // Точные суммы участникам (в валюте траты, по порядку userIds). Сумма должна совпасть с тратой до копейки;
  // в валюту группы — по тем же пропорциям. → 'ok' | 'sum_mismatch' | 'deleted'
  async setExactShares(expense, userIds, cents) {
    const total = cents.reduce((acc, value) => acc + value, 0);
    if (total !== split.toCents(expense.amount)) return 'sum_mismatch';
    const exact = new Map(userIds.map((id, index) => [Number(id), cents[index]]));
    const shares = this.sharesFrom(split.rescale(split.toCents(expense.amount_group), exact, expense.payer_id));
    return (await this.groupRepository.replaceShares(expense.id, 'exact', shares)) ? 'ok' : 'deleted';
  }

  async undo(expenseId, userId) {
    return this.groupRepository.deleteExpense(expenseId, userId);
  }

  async lastOwnRecord(ledger, userId) {
    return this.groupRepository.lastOwnRecord(ledger.id, userId);
  }

  // ---------- Балансы и «рассчитались» ----------

  // { balances: Map userId → копейки, transfers: [{ from, to, cents }], members (с вышедшими) }
  async balances(ledger) {
    const [records, members] = await Promise.all([
      this.groupRepository.records(ledger.id),
      this.members(ledger.id, { includeLeft: true })
    ]);
    const balances = split.balancesOf(records);
    const order = members.map(member => Number(member.user_id));
    return { balances, transfers: split.simplifyDebts(balances, order), members };
  }

  // «✅ Рассчитались»: from отдал to столько, сколько сейчас по упрощённым долгам. Нажать может любой из двоих.
  // → { status: 'ok', expenseId, cents } | { status: 'nothing' | 'forbidden' }
  async settle(ledger, fromId, toId, byUserId) {
    if (![Number(fromId), Number(toId)].includes(Number(byUserId))) return { status: 'forbidden' };
    const { transfers } = await this.balances(ledger);
    const transfer = transfers.find(item => item.from === Number(fromId) && item.to === Number(toId));
    if (!transfer) return { status: 'nothing' };
    const amount = split.fromCents(transfer.cents);
    const expenseId = await this.groupRepository.addExpense({
      groupId: ledger.id, kind: 'settle', payerId: Number(fromId), createdBy: Number(byUserId), amount, currency: ledger.currency,
      amountGroup: amount, splitMode: 'settle', shares: [{ userId: Number(toId), share: amount }]
    });
    return { status: 'ok', expenseId, cents: transfer.cents };
  }

  // История страницами по HISTORY_PAGE: { rows, page, pages }
  async history(ledger, page = 0) {
    const safePage = Math.max(0, page);
    const rows = await this.groupRepository.history(ledger.id, HISTORY_PAGE, safePage * HISTORY_PAGE);
    const total = rows.length ? Number(rows[0].total_count) : 0;
    return { rows, page: safePage, pages: Math.max(1, Math.ceil(total / HISTORY_PAGE)) };
  }

  // Другая валюта группы: все суммы и доли пересчитываются по текущему курсу (пропорции долей сохраняются)
  async setCurrency(ledger, currency) {
    if (!SUPPORTED_CURRENCIES.includes(currency) || currency === ledger.currency) return false;
    const records = await this.groupRepository.records(ledger.id);
    const rows = [];
    for (const record of records) {
      const cents = await this.toGroupCents(record.amount, ledger.currency, currency);
      const shares = split.rescale(cents, new Map(record.shares.map(share => [Number(share.user_id), split.toCents(share.share)])), record.payer_id);
      rows.push({ id: record.id, amountGroup: split.fromCents(cents), shares: [...shares].map(([userId, value]) => ({ userId, share: split.fromCents(value) })) });
    }
    await this.groupRepository.setCurrency(ledger.id, currency, rows);
    logger.info('Group currency changed', { groupId: ledger.id, from: ledger.currency, to: currency, records: rows.length });
    return true;
  }

  // «📥 Моя доля → в личные»: личная трата на долю (валюта группы), категория — запомненная по описанию, иначе
  // «Другое». Один раз на трату. → { status: 'ok', amount, currency, description } | 'not_registered' | 'no_share' | 'already' | 'deleted'
  async copyShare(expenseId, userId, { label }) {
    const expense = await this.getExpense(expenseId);
    if (!expense || expense.deleted_at) return { status: 'deleted' };
    const share = expense.shares.find(item => Number(item.user_id) === Number(userId));
    if (!share) return { status: 'no_share' };
    if (share.copied_expense_id) return { status: 'already' };
    const user = await this.userService.getUserById(userId);
    if (!user) return { status: 'not_registered' };
    const ledger = await this.getLedger(expense.group_id);
    const description = `${label}${expense.description ? `: ${expense.description}` : ''}`.slice(0, 80);
    const categories = await this.expenseService.getCategories(userId);
    const remembered = expense.description ? await this.expenseService.getRememberedCategory(userId, description, categories) : null;
    const category = remembered || await this.expenseService.getDefaultCategory();
    const personal = await this.expenseService.addExpense(userId, { amount: Number(share.share), currency: ledger.currency, description, categoryId: category.id });
    const marked = await this.groupRepository.markCopied(expenseId, userId, personal.id);
    if (!marked) {
      // Двойное нажатие: вторая копия не нужна
      await this.expenseService.deleteExpenseById(userId, personal.id).catch(() => {});
      return { status: 'already' };
    }
    return { status: 'ok', amount: Number(share.share), currency: ledger.currency, description };
  }

  // ---------- Делёж чека ----------

  // Делёж распознанного чека (receipt — как из ReceiptService: items, total, merchant, currency). → split
  async createSplit(ledger, { payerId, receipt, sourceReceiptId = null, warn = false, extraLabel }) {
    const items = split.itemsFromReceipt(receipt, { extraLabel });
    if (!items.length) return null;
    return this.groupRepository.createSplit({
      groupId: ledger.id, token: newToken(), payerId, merchant: receipt.merchant ? String(receipt.merchant).slice(0, 128) : null,
      currency: receipt.currency || ledger.currency, items, warn, sourceReceiptId
    });
  }

  async getSplit(splitId) {
    return this.groupRepository.getSplit(splitId);
  }

  async splitByToken(token) {
    return this.groupRepository.getSplitByToken(token);
  }

  async setSplitMessage(splitId, chatId, messageId) {
    await this.groupRepository.setSplitMessage(splitId, chatId, messageId);
  }

  async setSplitPage(splitId, page) {
    await this.groupRepository.setSplitPage(splitId, page);
  }

  async toggleClaim(splitId, itemId, userId) {
    return this.groupRepository.toggleClaim(splitId, itemId, userId);
  }

  async claims(splitId) {
    return this.groupRepository.getClaims(splitId);
  }

  async setDirty(splitId, dirty) {
    await this.groupRepository.setDirty(splitId, dirty);
  }

  async dirtySplits() {
    return this.groupRepository.listDirtySplits();
  }

  // Текущие итоги дележа: позиции, отметки, доли по людям (в валюте чека)
  summarize(splitRow, claims) {
    const items = splitRow.items || [];
    return { items, claims, ...split.itemize(items, claims, splitRow.payer_id) };
  }

  // «Закрыть»: только плательщик; доли по отметкам на момент закрытия → трата группы на плательщика.
  // → { status, split, expenseId, totals } (см. GroupRepository.closeSplit)
  async closeSplit(splitId, userId) {
    let totals = null;
    const result = await this.groupRepository.closeSplit(splitId, userId, async (row, claims) => {
      const ledger = await this.getLedger(row.group_id);
      const summary = this.summarize(row, claims);
      totals = summary.totals;
      const groupCents = await this.toGroupCents(split.fromCents(summary.totalCents), row.currency, ledger.currency);
      const shares = row.currency === ledger.currency ? summary.totals : split.rescale(groupCents, summary.totals, row.payer_id);
      return {
        amount: split.fromCents(summary.totalCents),
        amountGroup: split.fromCents(groupCents),
        description: row.merchant || null,
        shares: this.sharesFrom(shares)
      };
    });
    if (result.status === 'closed') logger.info('Receipt split closed', { splitId, groupId: result.split.group_id, expenseId: result.expenseId });
    return { ...result, totals };
  }

  async cancelSplit(splitId, userId) {
    return this.groupRepository.cancelSplit(splitId, userId);
  }

  // ---------- Вопросы бота в чате ----------

  async addPrompt(chatId, messageId, userId, kind, refId = null) {
    await this.groupRepository.addPrompt(chatId, messageId, userId, kind, refId);
  }

  async getPrompt(chatId, messageId) {
    return this.groupRepository.getPrompt(chatId, messageId);
  }

  async deletePrompt(chatId, messageId) {
    await this.groupRepository.deletePrompt(chatId, messageId);
  }

  // ---------- «🎫 Пропуск для группы» ----------

  get pass() {
    return GROUP_PASS;
  }

  // Оплата пропуска (successful_payment). → { status: 'completed' | 'duplicate' | 'missing', ledger, passUntil }
  async grantPass({ groupId, userId, stars, days, chargeId }) {
    const ledger = await this.getLedger(groupId);
    if (!ledger) return { status: 'missing' };
    const result = await this.groupRepository.addPass({ groupId, userId, stars, days, chargeId });
    if (result.duplicate) return { status: 'duplicate', ledger };
    logger.info('Group pass purchased', { groupId, userId, stars, days, passUntil: result.passUntil });
    return { status: 'completed', ledger, passUntil: result.passUntil };
  }

  async findPass(chargeId) {
    return this.groupRepository.getPassByChargeId(chargeId);
  }

  // Возврат пропуска: null — это не пропуск
  async revokePass(chargeId) {
    const result = await this.groupRepository.refundPass(chargeId);
    if (!result) return null;
    if (result.alreadyRefunded) return { status: 'already_refunded' };
    logger.info('Group pass refunded', { groupId: result.pass.group_id, chargeId, passUntil: result.passUntil });
    return { status: 'refunded', type: 'group_pass', userId: Number(result.pass.user_id), groupId: result.pass.group_id, passUntil: result.passUntil };
  }
}

module.exports = GroupService;
module.exports.displayName = displayName;
module.exports.newToken = newToken;
module.exports.monthStart = monthStart;
