const respond = require('../utils/respond');
const { FAMILY_TARIFFS, FAMILY_PREMIUM, PREMIUM_TARIFFS, familyTariffDiscount, familyTariffSaving } = require('../utils/constants');

const DURATION_KEYS = { 30: 'tariff_item_30', 90: 'tariff_item_90', 180: 'tariff_item_180', 365: 'tariff_item_365' };
const BUTTON_KEYS = { 30: 'tariff_button_30', 90: 'tariff_button_90', 180: 'tariff_button_180', 365: 'tariff_button_365' };
const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// «👨‍👩‍👧 Семейный тариф» (`pfam`): цены, честная выгода для своей семьи, правила, оплата — только владельцу семьи.
// Без семьи — «Создать семью» (`pfam_create`, можно и без своего премиума: оплатить тариф может любой владелец).
class FamilyPremiumHandlers {
  constructor({ familyPremiumService, paymentService, userService, stateService, localizationService, formatter }) {
    this.familyPremiumService = familyPremiumService;
    this.paymentService = paymentService;
    this.userService = userService;
    this.stateService = stateService;
    this.localizationService = localizationService;
    this.formatter = formatter;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // Цена в основной валюте пользователя по курсу USD (как на экране личных тарифов), без курса — USD
  async priceFormatter(currency) {
    let rate = 1;
    let priceCurrency = 'USD';
    try {
      const month = FAMILY_TARIFFS.MONTH_1;
      rate = (await this.formatter.currencyUtils.convert(month.usd, 'USD', currency || 'RUB')) / month.usd;
      priceCurrency = currency || 'RUB';
    } catch (error) {
      // нет курсов — USD
    }
    return (usd) => this.formatter.formatAmount(usd * rate, priceCurrency);
  }

  tariffLines(lang, formatPrice) {
    const perMonth = this.t(lang, 'per_month');
    return Object.values(FAMILY_TARIFFS).map((tariff) => {
      let line = `- ${this.t(lang, DURATION_KEYS[tariff.duration])} — `;
      const discount = familyTariffDiscount(tariff);
      if (discount.percent > 0) {
        line += `<s>${discount.fullStars}</s> ${tariff.stars} ⭐ / ${formatPrice(tariff.usd)} (${this.t(lang, 'discount_save', { percent: discount.percent })})`;
        line += `\n  <i>≈ ${Math.round(tariff.stars / tariff.months)} ⭐ ${perMonth}</i>`;
      } else {
        line += `${tariff.stars} ⭐ / ${formatPrice(tariff.usd)}`;
      }
      return line;
    }).join('\n');
  }

  // Выгода — по реальному числу людей в семье; один человек — честно: семейный дороже личного
  savingLine(lang, people) {
    const month = FAMILY_TARIFFS.MONTH_1;
    const personal = PREMIUM_TARIFFS.MONTH_1;
    const max = FAMILY_PREMIUM.MAX_MEMBERS;
    if (people >= 2) {
      const saving = familyTariffSaving(month, Math.min(people, max));
      return this.t(lang, 'family_tariffs_saving_now', {
        people: saving.people, family: month.stars, personal: saving.personalStars, percent: saving.percent, perPerson: saving.perPerson
      });
    }
    return this.t(lang, 'family_tariffs_saving_alone', {
      family: month.stars, personal: personal.stars, two: personal.stars * 2, max, perPersonMax: familyTariffSaving(month, max).perPerson
    });
  }

  // callback pfam; после создания семьи — новым сообщением
  async showTariffs(ctx) {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const userId = ctx.from.id;
    const user = await this.userService.getUserById(userId);
    const lang = (user && user.language) || 'en';
    const timezone = (user && user.timezone) || 'UTC';
    const max = FAMILY_PREMIUM.MAX_MEMBERS;
    const status = await this.familyPremiumService.getOwnerStatus(userId);
    const formatPrice = await this.priceFormatter(user && user.currency);

    const blocks = [
      this.t(lang, 'family_tariffs_title'),
      this.t(lang, 'family_tariffs_intro', { max, others: max - 1 }),
      this.tariffLines(lang, formatPrice),
      this.savingLine(lang, status.family ? status.members : 1),
      this.t(lang, 'family_tariffs_rules', { max })
    ];
    const personalUntil = user && user.premium_expires_at && new Date(user.premium_expires_at) > new Date() ? user.premium_expires_at : null;
    blocks.push(this.t(lang, 'family_tariffs_days_rule'));
    if (personalUntil) {
      blocks.push(this.t(lang, 'family_tariffs_days_yours', { date: this.formatter.formatDate(personalUntil, timezone) }));
    }

    const keyboard = [];
    if (!status.family) {
      blocks.push(this.t(lang, 'family_tariffs_no_family'));
      keyboard.push([{ text: this.t(lang, 'button_family_create_for_plan'), callback_data: 'pfam_create' }]);
    } else if (!status.isOwner) {
      blocks.push(this.t(lang, 'family_tariffs_not_owner', {
        family: escapeHtml(status.family.name),
        owner: escapeHtml(status.family.owner_first_name || status.family.owner_username || '')
      }));
    } else if (status.members > max) {
      blocks.push(this.t(lang, 'family_tariffs_too_big', { members: status.members, max }));
      keyboard.push([{ text: this.t(lang, 'family_members'), callback_data: 'family_members' }]);
    } else {
      blocks.push(status.planActive
        ? this.t(lang, 'family_tariffs_active', { date: this.formatter.formatDate(status.planExpiresAt, timezone), members: status.members, max })
        : this.t(lang, 'family_tariffs_seats', { family: escapeHtml(status.family.name), members: status.members, max }));
      // Месячный — подписка с автопродлением (🔁); при действующей подписке (личной или семейной) не предлагаем
      const subscription = await this.userService.getActiveRecurringSubscription(userId);
      const buttons = [];
      for (const tariff of Object.values(FAMILY_TARIFFS)) {
        const isSubscription = tariff.duration === 30;
        if (isSubscription && subscription) continue;
        const url = await this.paymentService.createInvoiceLink(userId, tariff, lang, { familyId: status.family.id });
        buttons.push({ text: `${isSubscription ? '🔁 ' : ''}${this.t(lang, BUTTON_KEYS[tariff.duration])} - ${tariff.stars} ⭐️`, url });
      }
      for (let i = 0; i < buttons.length; i += 2) keyboard.push(buttons.slice(i, i + 2));
      if (status.planActive && status.members + status.pending < max) {
        keyboard.push([{ text: this.t(lang, 'invite_member'), callback_data: 'family_invite' }]);
      }
    }
    keyboard.push([{ text: this.t(lang, 'premium_back_button'), callback_data: 'premium_tariffs' }]);

    await respond(ctx, blocks.join('\n\n'), { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  }

  // callback pfam_create: название семьи следующим сообщением (состояние creating_family_plan), затем — снова тариф
  async startCreateFamily(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const status = await this.familyPremiumService.getOwnerStatus(userId);
    if (status.family) return this.showTariffs(ctx);
    await ctx.answerCbQuery().catch(() => {});
    this.stateService.setUserState(userId, 'creating_family_plan');
    await respond(ctx, this.t(lang, 'enter_family_name'), {
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'family_cancel'), callback_data: 'pfam' }]] }
    });
  }
}

FamilyPremiumHandlers.escapeHtml = escapeHtml;

module.exports = FamilyPremiumHandlers;
