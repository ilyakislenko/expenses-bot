const { SUPPORTED_CURRENCIES } = require('../../config/currencies');
const { currencySymbol, commaDecimal } = require('../../utils/savingsView');
const { strings } = require('../i18n');

const INTL_LOCALES = { jp: 'ja', kz: 'kk' };

// GET /api/me — всё для старта приложения: пользователь, язык и строки, валюта, пояс, сегодня, начало периода,
// премиум, семья (участники, режим «все траты в семью»), контур главных экранов (homeScope), админ.
// Приложение открыли до /start (кнопка меню, ссылка): пользователь регистрируется тем же путём, что и в боте —
// пробный премиум, язык из initData (language_code) и пояс по нему, источник «miniapp» — и сразу может записывать траты
module.exports = (router, { get, http }) => {
  router.get('/me', http.wrap(async (req, res) => {
    const userService = get('userService');
    const localization = get('localizationService');
    let user = await userService.getUserById(req.userId);
    if (!user) {
      const tg = req.telegramUser || {};
      user = await userService.registerUser(req.userId, tg.username || null, tg.first_name || null, {
        language: localization.resolveTelegramLanguage(tg.language_code),
        source: 'miniapp'
      });
    }
    // Контекст (язык, валюта, пояс) — после регистрации: у нового пользователя он уже из его строки
    const ctx = await req.ctx();
    const [premium, isAdmin, family] = await Promise.all([
      userService.getPremiumStatus(req.userId),
      userService.isUserAdmin(req.userId),
      get('familyService').getUserFamily(req.userId)
    ]);
    const scope = await get('budgetService').scopeFor(req.userId);
    let familyInfo = null;
    if (family) {
      const members = await get('familyRepository').getFamilyMembers(family.id);
      familyInfo = {
        id: family.id,
        name: family.name || null,
        ownerId: Number(family.owner_id),
        isOwner: Number(family.owner_id) === req.userId,
        mode: !!(user && user.family_mode),
        members: members.map(m => ({ id: Number(m.id), name: m.first_name || m.username || '', username: m.username || null, role: m.role }))
      };
    }
    res.json({
      user: { id: req.userId, firstName: user ? user.first_name : null, username: user ? user.username : null },
      lang: ctx.lang,
      locale: INTL_LOCALES[ctx.lang] || ctx.lang,
      currency: ctx.currency,
      timezone: ctx.timezone,
      today: ctx.today,
      startDay: ctx.startDay,
      premium: { active: !!premium.isPremium, expiresAt: premium.expiresAt || null, daysRemaining: premium.daysRemaining || 0 },
      isAdmin: !!isAdmin,
      family: familyInfo,
      // Чьи деньги на главных экранах: 'family' — «все траты в семью» у премиума-участника семьи (BudgetService.scopeFor)
      homeScope: typeof scope === 'object' ? 'family' : 'mine',
      currencies: SUPPORTED_CURRENCIES,
      units: {
        thousand: localization.getText(ctx.lang, 'savings_compact_thousand'),
        million: localization.getText(ctx.lang, 'savings_compact_million'),
        comma: commaDecimal(ctx.lang),
        symbol: currencySymbol(ctx.currency)
      },
      strings: strings(ctx.lang, localization)
    });
  }));
};
