const { FAMILY_TARIFFS, FAMILY_PREMIUM, PREMIUM_TARIFFS, familyTariffDiscount, familyTariffSaving, findTariff } = require('../../utils/constants');
const logger = require('../../utils/logger');
const { refreshChatKeyboard, iso, priceConverter } = require('./profileHelpers');

const NAME_MIN = 3;
const NAME_MAX = 50;
const SUBSCRIPTION_DAYS = 30;

// Ошибки FamilyService (текст исключения) → код ответа API, как их различают обработчики бота
const FAMILY_ERRORS = [
  [/Invalid invitation code|Invitation not found/, 404, 'invitation_not_found'],
  [/not pending/, 409, 'invitation_not_pending'],
  [/expired/, 409, 'invitation_expired'],
  [/already a member of your family/, 409, 'user_already_in_your_family'],
  [/already (owns|a member)/, 409, 'family_already_member'],
  // «Нет такого», «нет премиума», «в другой семье» — один ответ (FamilyService), чтобы по нему не узнавали чужой статус
  [/Invitation unavailable/, 409, 'invite_unavailable'],
  [/Invitation limit reached/, 429, 'invite_limit'],
  [/already has a pending invitation/, 409, 'user_already_has_invitation'],
  [/Cannot remove yourself/, 400, 'cannot_remove_self'],
  [/not a member of this family|Not authorized to cancel|Only family owner or invitation creator/, 404, 'not_found'],
  [/owner cannot leave/, 409, 'owner_cannot_leave'],
  [/not a member of any family/, 404, 'not_family_member']
];

// «Семья» целиком, как в боте (CommandHandlers.family, CallbackHandlers.handleFamily*, FamilyPremiumHandlers): управление —
// с премиумом (свой или семейный тариф), создание семьи для семейного тарифа и его оплата — без; выход и ответ на
// приглашение — тоже без (кнопки бота этого не проверяют). Уведомления людям — через FamilyService, как в боте.
module.exports = (router, { get, http }) => {
  function familyError(error) {
    const match = FAMILY_ERRORS.find(([pattern]) => pattern.test(error.message));
    if (!match) return error;
    return new http.HttpError(match[1], match[2]);
  }
  const call = async (fn) => {
    try {
      return await fn();
    } catch (error) {
      throw familyError(error);
    }
  };

  const memberName = (m) => m.first_name || m.username || '';

  // Семья с правами владельца: премиум и владелец, иначе 402 / 404 / 403 (как ответы кнопок меню семьи)
  async function ownedFamily(req) {
    const ctx = await req.ctx();
    if (!ctx.isPremium) throw http.premiumRequired('family');
    const family = await get('familyService').getUserFamily(req.userId);
    if (!family) throw http.notFound('not_family_member');
    if (Number(family.owner_id) !== req.userId) throw http.forbidden('not_family_owner');
    return family;
  }

  router.get('/family', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const familyService = get('familyService');
    const familyPremium = get('familyPremiumService');
    const family = await familyService.getUserFamily(req.userId);
    if (!family) {
      const pending = await familyService.getPendingInvitations(req.userId);
      return res.json({
        premium: ctx.isPremium,
        family: null,
        pending: pending.map(inv => ({
          code: inv.invite_code,
          familyName: inv.family_name,
          inviterName: inv.inviter_first_name || inv.inviter_username || '',
          expiresAt: iso(inv.expires_at_utc)
        }))
      });
    }
    const isOwner = Number(family.owner_id) === req.userId;
    const [members, user, inherited, owner, dependsOnFamily] = await Promise.all([
      get('familyRepository').getFamilyMembers(family.id),
      get('userService').getUserById(req.userId),
      familyPremium.inheritedPlan(req.userId),
      isOwner ? familyPremium.getOwnerStatus(req.userId) : null,
      isOwner ? false : familyPremium.dependsOnFamily(req.userId)
    ]);
    const invitations = isOwner && ctx.isPremium ? await familyService.getActiveInvitations(family.id) : [];
    res.json({
      premium: ctx.isPremium,
      family: {
        id: family.id,
        name: family.name,
        ownerName: family.owner_first_name || family.owner_username || '',
        isOwner,
        mode: !!(user && user.family_mode),
        members: members.map(m => ({ id: m.id, name: memberName(m), username: m.username || null, role: m.role, joinedAt: iso(m.joined_at_utc) })),
        invitations: invitations.map(inv => ({
          code: inv.invite_code,
          name: inv.invitee_username ? `@${inv.invitee_username}` : (inv.invitee_first_name || ''),
          expiresAt: iso(inv.expires_at_utc)
        })),
        // Семейный тариф: премиум от чужого тарифа — кто платит; у владельца — до какого числа и сколько мест
        plan: inherited
          ? { payerName: inherited.payerName, expiresAt: iso(inherited.expiresAt) }
          : (owner && owner.planActive ? { own: true, expiresAt: iso(owner.planExpiresAt), members: owner.members, max: FAMILY_PREMIUM.MAX_MEMBERS } : null),
        // Выход заберёт премиум (он только от этой семьи) — предупреждение на подтверждении выхода
        leaveLosesPremium: !!dependsOnFamily
      }
    });
  }));

  // Создать семью: с премиумом — как «Создать семью», без — только для семейного тарифа (plan: true, как pfam_create)
  router.post('/family', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const name = http.str(req.body.name, { max: NAME_MAX, code: 'family_name_too_long' });
    if (name.length < NAME_MIN) throw http.badRequest('family_name_too_short');
    if (!ctx.isPremium && req.body.plan !== true) throw http.premiumRequired('family');
    const family = await call(() => get('familyService').createFamily(req.userId, name));
    res.status(201).json({ id: family.id, name: family.name });
  }));

  // Пригласить по username: приглашённому бот присылает приглашение с кнопками, код живёт 24 часа. Не больше 10
  // приглашений в сутки и пауза сутки перед повторным приглашением того же человека (FamilyService)
  router.post('/family/invitations', http.wrap(async (req, res) => {
    await ownedFamily(req);
    const username = String(req.body.username || '').trim().replace(/^@/, '');
    if (username.length < 3 || username.length > 64) throw new http.HttpError(409, 'invite_unavailable');
    const result = await call(() => get('familyService').createInvitation(req.userId, username));
    res.status(201).json({
      code: result.invitation.invite_code,
      username: result.invitee.username,
      expiresAt: iso(result.invitation.expires_at_utc)
    });
  }));

  router.delete('/family/invitations/:code', http.wrap(async (req, res) => {
    await ownedFamily(req);
    const code = http.str(req.params.code, { max: 16, code: 'not_found' });
    await call(() => get('familyService').cancelInvitation(req.userId, code));
    res.json({ ok: true });
  }));

  // Принять приглашение (только адресованное себе); семейный тариф владельца теперь даёт премиум и мне
  router.post('/family/invitations/:code/accept', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const code = http.str(req.params.code, { max: 16, code: 'not_found' }).toUpperCase();
    const result = await call(() => get('familyService').acceptInvitation(req.userId, code));
    try {
      await get('achievementService').track(req.userId, 'family_joined', { lang: ctx.lang });
    } catch (error) {
      logger.warn('Mini app: family_joined achievement not tracked', { userId: req.userId, error: error.message });
    }
    res.json({
      family: { id: result.family.id, name: result.family.name },
      familyPremium: result.familyPremium ? { payerName: result.familyPremium.payerName, expiresAt: iso(result.familyPremium.expiresAt) } : null
    });
  }));

  router.post('/family/invitations/:code/reject', http.wrap(async (req, res) => {
    const code = http.str(req.params.code, { max: 16, code: 'not_found' }).toUpperCase();
    await call(() => get('familyService').rejectInvitation(req.userId, code));
    res.json({ ok: true });
  }));

  // Исключить участника: его траты в семье становятся личными, ему приходит уведомление
  router.delete('/family/members/:id', http.wrap(async (req, res) => {
    await ownedFamily(req);
    const memberId = http.int(req.params.id, { min: 1, code: 'not_found' });
    const familyService = get('familyService');
    const member = await call(() => familyService.getRemovableMember(req.userId, memberId));
    await call(() => familyService.removeMemberFromFamily(req.userId, member.id));
    res.json({ ok: true });
  }));

  // Выйти (участник): траты в этой семье становятся личными
  router.post('/family/leave', http.wrap(async (req, res) => {
    const left = await call(() => get('familyService').leaveFamily(req.userId));
    res.json({ name: left.name, lostFamilyPremium: !!left.lostFamilyPremium });
  }));

  // Удалить семью (владелец): семейные траты становятся личными у авторов, участников без своего премиума предупредят
  router.delete('/family', http.wrap(async (req, res) => {
    await ownedFamily(req);
    const deleted = await call(() => get('familyService').deleteFamily(req.userId));
    res.json({ name: deleted.name });
  }));

  // «📤 Экспорт семьи» (как CommandHandlers.familyExport): все траты семьи CSV-файлом в чат с ботом (в WebView
  // скачивание ненадёжно), тот же формат и имя файла. Нет трат — 404 no_family_expenses. Лимит — общий с выгрузками
  // бота и Mini App (rateLimiter 'export': 5 файлов за 5 минут)
  router.post('/family/export', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    if (!ctx.isPremium) throw http.premiumRequired('family');
    http.rateLimit(get, req.userId, 'export', 'export_rate');
    const family = await get('familyService').getUserFamily(req.userId);
    if (!family) throw http.notFound('not_family_member');
    const expenses = await get('familyService').getAllFamilyExpenses(family.id);
    if (!expenses.length) throw http.notFound('no_family_expenses');
    const csv = await get('formatter').formatCSV(expenses, ctx.currency, ctx.timezone, get('localizationService'), ctx.lang);
    const slug = String(family.name || '').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'family';
    const filename = `family_expenses_${slug}_${new Date().toISOString().split('T')[0]}.csv`;
    await get('bot').telegram.sendDocument(req.userId, { source: Buffer.from(csv, 'utf-8'), filename }, {
      caption: `${ctx.t('export_success')}\n${ctx.t('records_count', { count: expenses.length })}`
    });
    res.json({ sent: true, count: expenses.length });
  }));

  // «Все траты в семью» (как CommandHandlers.toggleFamilyMode): включение переносит личные бюджеты в семью, если у
  // неё таких нет; чат получает reply-клавиатуру с новой кнопкой-исключением (сообщение в чат — лимит 'settings')
  router.put('/family/mode', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    if (typeof req.body.enabled !== 'boolean') throw http.badRequest('bad_bool');
    if (!ctx.isPremium) throw http.premiumRequired('family');
    http.rateLimit(get, req.userId, 'settings');
    const family = await get('familyService').getUserFamily(req.userId);
    if (!family) throw http.notFound('not_family_member');
    const enabled = req.body.enabled;
    await get('userService').setFamilyMode(req.userId, enabled);
    if (enabled) await get('budgetService').moveToFamily(req.userId, family.id);
    const notice = enabled
      ? ctx.t('family_mode_enabled', { personalButton: ctx.t('button_personal_expense'), removeButton: ctx.t('button_remove_from_family') })
      : ctx.t('family_mode_disabled', { familyButton: ctx.t('family_add_expense'), addButton: ctx.t('button_mark_as_family') });
    await refreshChatKeyboard(get, req.userId, ctx.lang, notice);
    res.json({ mode: enabled });
  }));

  // «👨‍👩‍👧 Семейный тариф» (FamilyPremiumHandlers.showTariffs): цены (скидка — к помесячной оплате семейного), честная
  // выгода по числу людей в семье, кто может оплатить и что делать дальше
  router.get('/family/plan', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const userService = get('userService');
    const [status, user, subscription] = await Promise.all([
      get('familyPremiumService').getOwnerStatus(req.userId),
      userService.getUserById(req.userId),
      userService.getActiveRecurringSubscription(req.userId)
    ]);
    const { currency, price } = await priceConverter(get, ctx.currency, FAMILY_TARIFFS.MONTH_1.usd);
    const max = FAMILY_PREMIUM.MAX_MEMBERS;
    const people = status.family ? status.members : 1;
    const month = FAMILY_TARIFFS.MONTH_1;
    const saving = people >= 2 ? familyTariffSaving(month, Math.min(people, max)) : null;
    const personalUntil = user && user.premium_expires_at && new Date(user.premium_expires_at) > new Date() ? user.premium_expires_at : null;
    let state = 'pay';
    if (!status.family) state = 'no_family';
    else if (!status.isOwner) state = 'not_owner';
    else if (status.members > max) state = 'too_big';
    res.json({
      state,
      max,
      family: status.family ? {
        name: status.family.name,
        ownerName: status.family.owner_first_name || status.family.owner_username || '',
        members: status.members,
        pending: status.pending
      } : null,
      planActive: status.planActive,
      planExpiresAt: iso(status.planExpiresAt),
      personalUntil: iso(personalUntil),
      canInvite: state === 'pay' && status.planActive && status.members + status.pending < max,
      currency,
      // Одному семейный дороже личного — честно: выгоден от двух
      saving: saving
        ? { people: saving.people, family: month.stars, personal: saving.personalStars, percent: saving.percent, perPerson: saving.perPerson }
        : { people: 1, family: month.stars, personal: PREMIUM_TARIFFS.MONTH_1.stars, two: PREMIUM_TARIFFS.MONTH_1.stars * 2, perPersonMax: familyTariffSaving(month, max).perPerson },
      tariffs: Object.values(FAMILY_TARIFFS).map(tariff => {
        const discount = familyTariffDiscount(tariff);
        return {
          duration: tariff.duration,
          months: tariff.months,
          stars: tariff.stars,
          fullStars: discount.percent > 0 ? discount.fullStars : null,
          percent: discount.percent,
          price: price(tariff.usd),
          perMonthStars: tariff.months > 1 ? Math.round(tariff.stars / tariff.months) : null,
          subscription: tariff.duration === SUBSCRIPTION_DAYS,
          // Месячный — подписка Stars; при действующей подписке (личной или семейной) не предлагается
          available: !(tariff.duration === SUBSCRIPTION_DAYS && subscription)
        };
      })
    });
  }));

  // Счёт Stars на семейный тариф — тот же payload, что у бота (PaymentService.createInvoiceLink с familyId): оплату
  // проверяет и засчитывает бот (pre_checkout_query, successful_payment), повтор платежа не засчитывается дважды.
  // Каждый вызов — запрос к Telegram: лимит 'invoice' (10 в минуту), общий с личными счетами и пожертвованиями
  router.post('/family/plan/invoice', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    http.rateLimit(get, req.userId, 'invoice');
    const duration = http.int(req.body.duration, { min: 1, code: 'bad_tariff' });
    const tariff = findTariff(duration, true);
    if (!tariff) throw http.badRequest('bad_tariff');
    const status = await get('familyPremiumService').getOwnerStatus(req.userId);
    if (!status.family) throw http.notFound('not_family_member');
    if (!status.isOwner) throw http.forbidden('not_family_owner');
    if (status.members > FAMILY_PREMIUM.MAX_MEMBERS) throw http.badRequest('family_too_big');
    if (tariff.duration === SUBSCRIPTION_DAYS && await get('userService').getActiveRecurringSubscription(req.userId)) {
      throw http.badRequest('subscription_active');
    }
    get('bot'); // бот задаёт себя платёжному сервису (в проде уже запущен)
    const url = await get('paymentService').createInvoiceLink(req.userId, tariff, ctx.lang, { familyId: status.family.id });
    res.json({ url });
  }));
};
