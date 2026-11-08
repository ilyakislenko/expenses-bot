const { PREMIUM_TARIFFS, FAMILY_TARIFFS, FAMILY_PREMIUM, USER_LIMITS, tariffDiscount, findTariff } = require('../../utils/constants');
const { localToday, lastDaysPeriod } = require('../../utils/period');
const ReferralService = require('../../services/ReferralService');
const { botUsername, iso, priceConverter } = require('./profileHelpers');

const SUBSCRIPTION_DAYS = 30;
const HISTORY_LIMIT = 50;
const stripHtml = (text) => String(text || '').replace(/<[^>]+>/g, '');
// Ограничения на экране «что даёт премиум»: бесплатно → с премиумом (USER_LIMITS)
const LIMIT_KEYS = ['MAX_DESCRIPTION_LENGTH', 'MAX_CUSTOM_CATEGORIES', 'MAX_SAVINGS_GOALS', 'MAX_RECEIPTS_PER_MONTH', 'MAX_VOICE_PER_DAY',
  'PLANNING_SUBSCRIPTIONS', 'PLANNING_INFLATION_ITEMS', 'STREAK_FREEZES_PER_WEEK', 'MAX_ACTIVE_CHALLENGES', 'MAX_ASSISTANT_QUESTIONS_PER_DAY'];
const pickLimits = (limits) => Object.fromEntries(LIMIT_KEYS.map(key => [key, Number.isFinite(limits[key]) ? limits[key] : null]));

// Вид записи в истории покупок по payload транзакции
function transactionKind(transaction) {
  let type = null;
  try {
    type = JSON.parse(transaction.invoice_payload || '{}').type || null;
  } catch (error) {
    type = null;
  }
  if (type === 'family_premium') return 'family';
  if (type === 'premium_subscription') return 'paid';
  if (type === 'admin_grant') return 'granted';
  if (type === 'referral') return 'referral';
  if (transaction.transaction_type === 'trial') return 'trial';
  return 'bonus';
}

// «⭐️ Премиум» (/limits, экран подписки бота): статус и источник, срок, подписка с автопродлением, что даёт премиум,
// тарифы Stars (счёт — тот же payload, что у бота: оплату проверяет и засчитывает бот), история, пожертвование,
// «Пригласить друга» (/invite)
module.exports = (router, { get, http }) => {
  router.get('/premium', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const referralService = get('referralService');
    const userService = get('userService');
    const [info, subscription, source, recent, referralStats, owner] = await Promise.all([
      get('premiumService').getLimitsInfo(req.userId),
      userService.getActiveRecurringSubscription(req.userId),
      referralService.getPremiumSource(req.userId).catch(() => null),
      get('expenseService').getTotals(req.userId, ctx.timezone, lastDaysPeriod(localToday(ctx.timezone), 30)).catch(() => ({ count: 0 })),
      referralService.getStats(req.userId).catch(() => null),
      get('familyPremiumService').getOwnerStatus(req.userId)
    ]);
    await get('funnelService').track(req.userId, 'paywall_viewed');
    // Как CommandHandlers.premiumPitch: премиум только от семьи — как оплаченный (без пробного и «пригласи друга»)
    const familyOnly = !!info.familyPremium && !info.personalActive;
    const onTrial = !!info.isPremium && source === 'trial' && !familyOnly;
    const paidOrGranted = !!info.isPremium && !onTrial;
    let status = null;
    if (info.isPremium) status = familyOnly ? 'family' : (source === 'trial' ? 'trial' : (source === 'paid' ? 'paid' : 'granted'));

    const receiptService = get('receiptService');
    const voiceService = get('voiceService');
    res.json({
      active: !!info.isPremium,
      status,
      // Свой срок (у премиума от семьи — отдельной строкой family)
      expiresAt: info.personalActive ? iso(info.premiumExpiresAt) : null,
      daysRemaining: info.personalActive ? info.daysRemaining : 0,
      family: info.familyPremium ? { payerName: info.familyPremium.payerName, expiresAt: iso(info.familyPremium.expiresAt) } : null,
      ownerPlan: owner.isOwner && owner.planActive ? { expiresAt: iso(owner.planExpiresAt), members: owner.members, max: FAMILY_PREMIUM.MAX_MEMBERS } : null,
      subscription: subscription ? { expiresAt: iso(subscription.subscription_expires_at) } : null,
      // Личная строка «Записей за 30 дней» — без премиума или на пробном
      recentCount: !paidOrGranted ? recent.count || 0 : 0,
      referral: !paidOrGranted && referralStats && !referralStats.capped ? { days: referralService.rewardDays } : null,
      limits: { free: pickLimits(USER_LIMITS.regular), premium: pickLimits(USER_LIMITS.premium) },
      receipts: !!(receiptService && receiptService.configured),
      voice: !!(voiceService && voiceService.configured),
      familyMonthStars: FAMILY_TARIFFS.MONTH_1.stars,
      familyMax: FAMILY_PREMIUM.MAX_MEMBERS
    });
  }));

  // Тарифы (как «⭐️ Тарифы» бота): звёзды, цена в основной валюте, скидка к помесячной оплате; месячный — подписка
  // с автопродлением, при действующей подписке не предлагается
  router.get('/premium/tariffs', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    await get('funnelService').track(req.userId, 'tariffs_viewed');
    const subscription = await get('userService').getActiveRecurringSubscription(req.userId);
    const { currency, price } = await priceConverter(get, ctx.currency, PREMIUM_TARIFFS.MONTH_1.usd);
    res.json({
      currency,
      subscription: subscription ? { expiresAt: iso(subscription.subscription_expires_at) } : null,
      tariffs: Object.values(PREMIUM_TARIFFS).map(tariff => {
        const discount = tariffDiscount(tariff);
        return {
          duration: tariff.duration,
          months: tariff.months,
          stars: tariff.stars,
          fullStars: discount.percent > 0 ? discount.fullStars : null,
          percent: discount.percent,
          price: price(tariff.usd),
          perMonthStars: tariff.months > 1 ? Math.round(tariff.stars / tariff.months * 10) / 10 : null,
          perMonthPrice: tariff.months > 1 ? price(tariff.usd / tariff.months) : null,
          subscription: tariff.duration === SUBSCRIPTION_DAYS,
          available: !(tariff.duration === SUBSCRIPTION_DAYS && subscription)
        };
      }),
      family: { stars: FAMILY_TARIFFS.MONTH_1.stars, max: FAMILY_PREMIUM.MAX_MEMBERS }
    });
  }));

  // Счёт Stars на личный тариф: PaymentService.createInvoiceLink — тот же payload и суммы, что у кнопок бота
  router.post('/premium/invoice', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const tariff = findTariff(http.int(req.body.duration, { min: 1, code: 'bad_tariff' }));
    if (!tariff) throw http.badRequest('bad_tariff');
    if (tariff.duration === SUBSCRIPTION_DAYS && await get('userService').getActiveRecurringSubscription(req.userId)) {
      throw http.badRequest('subscription_active');
    }
    get('bot'); // бот задаёт себя платёжному сервису (в проде уже запущен)
    const url = await get('paymentService').createInvoiceLink(req.userId, tariff, ctx.lang);
    res.json({ url });
  }));

  // Покупки и пожертвования (как «🧾 Мои покупки»): свежие сверху
  router.get('/premium/history', http.wrap(async (req, res) => {
    const [transactions, donations] = await Promise.all([
      get('userService').getUserTransactions(req.userId, HISTORY_LIMIT, 0),
      get('donationRepository').getUserDonations(req.userId, HISTORY_LIMIT, 0)
    ]);
    const items = [
      ...(transactions || []).map(t => ({
        id: `t${t.id}`,
        kind: transactionKind(t),
        days: Number(t.tariff_duration) || null,
        stars: Number(t.stars_amount) || 0,
        status: t.status || 'completed',
        recurring: !!t.is_recurring,
        at: iso(t.created_at)
      })),
      ...(donations || []).map(d => ({
        id: `d${d.id}`, kind: 'donation', days: null, stars: Number(d.stars) || 0, status: d.status || 'completed', recurring: false, at: iso(d.created_at)
      }))
    ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    res.json({ items });
  }));

  // «💎 Поддержать проект»: 1–2500 ⭐ и письмо (PaymentService.createDonation), затем счёт Stars
  router.post('/premium/donate', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const stars = http.int(req.body.stars, { min: 1, max: 2500, code: 'donate_invalid' });
    const message = typeof req.body.message === 'string' ? req.body.message : '';
    const paymentService = get('paymentService');
    const donation = await paymentService.createDonation(req.userId, stars, message);
    if (!donation) throw http.badRequest('donate_invalid');
    get('bot');
    const url = await paymentService.createDonationInvoiceLink(req.userId, stars, ctx.lang, donation.id);
    res.json({ url });
  }));

  // «👀 Почему сервис платный?» — текст бота
  router.get('/premium/why', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    res.json({ title: stripHtml(ctx.t('premium_why_paid_title')), text: stripHtml(ctx.t('premium_why_paid_text')) });
  }));

  // «🎁 Пригласить друга» (/invite): личная ссылка, текст для пересылки, статистика (ReferralService)
  router.get('/invite', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const referralService = get('referralService');
    const [code, stats] = await Promise.all([referralService.getOrCreateCode(req.userId), referralService.getStats(req.userId)]);
    const link = ReferralService.inviteLink(botUsername(get), code);
    const shareText = ctx.t('referral_share_text', { days: referralService.rewardDays });
    res.json({
      link,
      shareText,
      shareUrl: ReferralService.shareUrl(link, shareText),
      days: referralService.rewardDays,
      expenses: referralService.config.ACTIVATION_EXPENSES,
      activeDays: referralService.config.ACTIVATION_DAYS,
      stats: { invited: stats.invited, activated: stats.activated, days: stats.days, maxDays: stats.maxDays, capped: !!stats.capped }
    });
  }));
};
