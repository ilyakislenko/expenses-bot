const logger = require('../../utils/logger');
const { getTimezoneDisplayName } = require('../../utils/timezoneCalculator');
const { iso, botUsername } = require('./profileHelpers');
const AdminService = require('../../services/AdminService');

const PAGE_SIZE = 20;
const ACTIVE_DAYS = [7, 30, 90];
const FUNNEL_DAYS = [30, 90, 0];
const GRANT_DAYS = [1, 7, 14, 30, 90, 180, 365];
const BUG_STATUSES = ['new', 'in_progress', 'resolved', 'closed'];
const BROADCAST_MAX = 3600;
const num = (value) => Number(value) || 0;

const userRow = (u) => ({
  id: Number(u.id),
  name: u.first_name || '',
  username: u.username || null,
  premium: !!u.premium,
  admin: !!u.is_admin
});

// Админка (/admin бота, AdminHandlers): статистика, воронка, пользователи и активные, поиск, карточка пользователя
// (премиум, админ), платежи звёздами (все или пользователя, поиск по куску кода, карточка с возвратом), админы,
// баг-репорты, донаты, массовое уведомление. Только админам
module.exports = (router, { get, http }) => {
  let broadcasting = false; // одна рассылка за раз

  async function requireAdmin(req) {
    if (!(await get('userService').isUserAdmin(req.userId))) throw http.forbidden();
  }
  const admin = (fn) => http.wrap(async (req, res) => {
    await requireAdmin(req);
    return fn(req, res);
  });

  router.get('/admin/stats', admin(async (req, res) => {
    const adminService = get('adminService');
    const [users, expenses, bugs, donations, transactions, premium, referrals, family] = await Promise.all([
      adminService.getUserStats(),
      adminService.getExpenseStats(),
      adminService.getBugReportStats(),
      adminService.getDonationStats(),
      adminService.getPremiumTransactionStats(),
      adminService.getPremiumStats(),
      get('referralService').getGlobalStats().catch(() => null),
      adminService.getFamilyPremiumStats().catch(() => null)
    ]);
    res.json({
      users: {
        total: users.totalUsers,
        activePremium: users.activePremiumUsers,
        everPremium: users.everHadPremiumUsers,
        newWeek: users.newUsersLastWeek,
        newMonth: users.newUsersLastMonth,
        admins: users.adminsCount
      },
      expenses: {
        total: expenses.totalExpenses,
        week: expenses.expensesLastWeek,
        month: expenses.expensesLastMonth,
        activeUsers: expenses.activeUsers,
        family: expenses.familyExpenses
      },
      bugReports: bugs.stats.reduce((sum, s) => sum + num(s.count), 0),
      donations: { total: donations.totalDonations, completed: donations.completedDonations, stars: donations.totalStars },
      premium: {
        transactions: num(transactions && transactions.total_transactions),
        stars: num(transactions && transactions.total_stars),
        flagged: premium.totalPremiumUsers,
        active: premium.activePremiumUsers
      },
      referrals: referrals ? { invited: num(referrals.invited), activated: num(referrals.activated), inviters: num(referrals.inviters), days: num(referrals.days) } : null,
      family: family ? {
        purchases: num(family.purchases), stars: num(family.stars), refunded: num(family.refunded),
        activePlans: num(family.active_plans), coveredMembers: num(family.covered_members)
      } : null
    });
  }));

  // Воронка по источникам (days = 0 — за всё время), по дате регистрации
  router.get('/admin/funnel', admin(async (req, res) => {
    const days = http.int(req.query.days, { def: 30, code: 'bad_days' });
    if (!FUNNEL_DAYS.includes(days)) throw http.badRequest('bad_days');
    const rows = await get('funnelService').getReport(days > 0 ? days : null);
    const keys = ['registered', 'onboarded', 'first_expense', 'returned_week2', 'paywall_viewed', 'tariffs_viewed', 'paid', 'stars'];
    const pick = (r) => Object.fromEntries(keys.map(key => [key, num(r[key])]));
    const total = rows.reduce((acc, r) => {
      for (const key of keys) acc[key] += num(r[key]);
      return acc;
    }, Object.fromEntries(keys.map(key => [key, 0])));
    res.json({
      days,
      total,
      sources: rows.slice(0, 15).map(r => ({ source: r.source || null, ...pick(r) })),
      link: `https://t.me/${botUsername(get)}?start=`
    });
  }));

  router.get('/admin/users', admin(async (req, res) => {
    const page = http.int(req.query.page, { def: 1, min: 1, code: 'bad_page' });
    const data = await get('adminService').getAllUsers(page, PAGE_SIZE);
    res.json({ users: data.users.map(userRow), page: data.pagination.currentPage, totalPages: Math.max(1, data.pagination.totalPages), total: data.pagination.totalUsers });
  }));

  // Кто сам делал записи за 7 / 30 / 90 дней (без авто-записей регулярных и импорта), свежие сверху
  router.get('/admin/active', admin(async (req, res) => {
    const days = http.int(req.query.days, { def: 30, code: 'bad_days' });
    if (!ACTIVE_DAYS.includes(days)) throw http.badRequest('bad_days');
    const page = http.int(req.query.page, { def: 1, min: 1, code: 'bad_page' });
    const data = await get('adminService').getActiveUsers(days, page, PAGE_SIZE);
    res.json({
      days,
      active: data.active,
      totalUsers: data.totalUsers,
      page: data.page,
      totalPages: data.totalPages,
      users: data.users.map(u => ({ ...userRow(u), records: num(u.records), days: num(u.days), lastAt: iso(u.last_at) }))
    });
  }));

  // Поиск по id или username (без учёта регистра, все совпадения)
  router.get('/admin/search', admin(async (req, res) => {
    const query = http.str(req.query.q, { max: 64, code: 'bad_query' });
    const users = await get('adminService').searchUsers(query);
    res.json({ users: users.map(userRow) });
  }));

  async function userCard(id, viewerId) {
    const details = await get('adminService').getUserDetails(id);
    if (!details) throw http.notFound();
    const u = details.user;
    return {
      ...userRow(u),
      self: Number(u.id) === viewerId,
      language: u.language || null,
      currency: u.currency || null,
      timezone: getTimezoneDisplayName(u.timezone),
      registeredAt: iso(details.registeredAt),
      premiumActive: !!details.premiumStatus.isPremium,
      premiumExpiresAt: iso(details.premiumStatus.expiresAt),
      expenses: { count: details.expenseStats.totalExpenses, amount: details.expenseStats.totalAmount, last: iso(details.expenseStats.lastExpense) },
      payments: (await get('adminService').listPayments({ userId: id, pageSize: 1 })).total,
      bugReports: details.recentBugReports.length
    };
  }

  router.get('/admin/users/:id', admin(async (req, res) => {
    const id = http.int(req.params.id, { min: 1, code: 'not_found' });
    res.json(await userCard(id, req.userId));
  }));

  // Выдать премиум на срок из списка (как кнопки бота)
  router.post('/admin/users/:id/premium', admin(async (req, res) => {
    const id = http.int(req.params.id, { min: 1, code: 'not_found' });
    const days = http.int(req.body.days, { code: 'bad_days' });
    if (!GRANT_DAYS.includes(days)) throw http.badRequest('bad_days');
    if (!(await get('userService').getUserById(id))) throw http.notFound();
    await get('adminService').grantPremium(id, days, req.userId);
    res.json(await userCard(id, req.userId));
  }));

  // Снять премиум: и семейный тариф, и подписку Stars (иначе продление включит его снова)
  router.delete('/admin/users/:id/premium', admin(async (req, res) => {
    const id = http.int(req.params.id, { min: 1, code: 'not_found' });
    if (!(await get('userService').getUserById(id))) throw http.notFound();
    await get('adminService').revokePremium(id, req.userId);
    await get('paymentService').cancelActiveSubscription(id);
    res.json(await userCard(id, req.userId));
  }));

  router.post('/admin/users/:id/admin', admin(async (req, res) => {
    const id = http.int(req.params.id, { min: 1, code: 'not_found' });
    if (!(await get('userService').getUserById(id))) throw http.notFound();
    await get('adminService').promoteToAdmin(id, req.userId);
    res.json(await userCard(id, req.userId));
  }));

  router.delete('/admin/users/:id/admin', admin(async (req, res) => {
    const id = http.int(req.params.id, { min: 1, code: 'not_found' });
    if (id === req.userId) throw http.badRequest('admin_cannot_demote_self');
    if (!(await get('userService').getUserById(id))) throw http.notFound();
    await get('adminService').demoteFromAdmin(id, req.userId);
    res.json(await userCard(id, req.userId));
  }));

  const paymentView = (p) => ({
    kind: p.kind, id: p.id, stars: p.stars, status: p.status, hash: p.chargeId, at: iso(p.at), days: p.days,
    recurring: p.recurring, family: p.family, user: { id: p.userId, name: p.firstName || '', username: p.username }
  });
  async function payment(req) {
    const kind = String(req.params.kind);
    const id = http.int(req.params.id, { min: 1, code: 'payment_not_found' });
    const found = await get('adminService').getPayment(kind, id);
    if (!found) throw http.notFound('payment_not_found');
    return found;
  }

  // Платежи звёздами, новые сверху: ?user= — одного пользователя, ?q= — кусок кода платежа (от 4 символов)
  router.get('/admin/payments', admin(async (req, res) => {
    const userId = req.query.user ? http.int(req.query.user, { min: 1, code: 'not_found' }) : null;
    const q = http.str(req.query.q, { max: 256, def: '', code: 'bad_query' }).trim();
    if (q && q.length < AdminService.PAYMENT_FRAGMENT_MIN) throw http.badRequest('payment_query_short');
    const page = http.int(req.query.page, { min: 1, max: 100000, def: 1, code: 'bad_page' });
    const list = await get('adminService').listPayments({ userId, fragment: q || null, page, pageSize: PAGE_SIZE });
    res.json({ items: list.items.map(paymentView), total: list.total, page: list.page, totalPages: list.totalPages });
  }));

  router.get('/admin/payments/:kind/:id', admin(async (req, res) => {
    res.json(paymentView(await payment(req)));
  }));

  // Возврат звёзд: премиум по платежу снимается, подписка отменяется, пожертвование помечается возвращённым,
  // пропуск группы укорачивается (PaymentService)
  router.post('/admin/payments/:kind/:id/refund', admin(async (req, res) => {
    const found = await payment(req);
    if (found.status === 'refunded') throw http.badRequest('payment_already_refunded');
    const paymentService = get('paymentService');
    get('bot'); // экземпляр бота ставит себя в paymentService — без него возврат не отправить
    await paymentService.refundStarsPayment(found.userId, found.chargeId);
    const result = await paymentService.revokeRefundedPayment(found.chargeId);
    res.json({ ...paymentView({ ...found, status: 'refunded' }), premiumUntil: iso(result.premiumUntil) });
  }));

  router.get('/admin/admins', admin(async (req, res) => {
    const admins = await get('adminService').getAllAdmins();
    res.json({ admins: admins.map(a => ({ ...userRow(a), admin: true })) });
  }));

  // Баг-репорты: число по статусам и последние 10 (все или только новые)
  router.get('/admin/bug-reports', admin(async (req, res) => {
    const status = req.query.status === 'new' ? 'new' : null;
    const adminService = get('adminService');
    const [stats, reports] = await Promise.all([adminService.getBugReportStats(), adminService.listBugReports(status, 10)]);
    const counts = Object.fromEntries(BUG_STATUSES.map(s => [s, 0]));
    for (const row of stats.stats) counts[row.status] = num(row.count);
    res.json({
      counts,
      reports: reports.map(r => ({
        id: r.id, status: r.status, text: r.report_text, at: iso(r.created_at),
        user: { id: Number(r.user_id), name: r.first_name || '', username: r.username || null }
      }))
    });
  }));

  router.get('/admin/donations', admin(async (req, res) => {
    const stats = await get('adminService').getDonationStats();
    res.json({ total: stats.totalDonations, completed: stats.completedDonations, pending: stats.pendingDonations, stars: stats.totalStars, average: Math.round(stats.avgStars * 10) / 10 });
  }));

  // Массовое уведомление — текст уходит как есть (без разметки), до 3600 символов. Подтверждение — на экране.
  // Рассылка идёт в фоне (с паузами под лимиты Telegram), итог бот присылает админу в чат, как в боте
  router.post('/admin/broadcast', admin(async (req, res) => {
    const ctx = await req.ctx();
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) throw http.badRequest('broadcast_empty');
    if (text.length > BROADCAST_MAX) throw http.badRequest('broadcast_too_long', { max: BROADCAST_MAX });
    if (broadcasting) throw http.badRequest('broadcast_running');
    broadcasting = true;
    get('bot');
    const adminId = req.userId;
    get('adminService').sendBroadcastMessage(text, adminId)
      .then((result) => get('notificationService').sendMessage(adminId, ctx.t('admin_broadcast_result', result), { parse_mode: 'Markdown' }))
      .catch((error) => logger.error('Mini app broadcast failed', { adminId, error: error.message }))
      .finally(() => { broadcasting = false; });
    res.status(202).json({ started: true });
  }));
};
