const logger = require('../utils/logger');
const { FAMILY_PREMIUM } = require('../utils/constants');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Не пишем ночью: как у уведомлений о личном премиуме, 10:00–20:59 по местному времени
const SEND_FROM_HOUR = 10;
const SEND_TO_HOUR = 20;
// Окончание объявляем не сразу: продление подписки Stars может прийти с небольшой задержкой
const ENDED_GRACE = HOUR;
// Свой и семейный сроки совпадают (купил семейный без своего премиума) — о скором окончании говорит обычное
// уведомление о премиуме в семейном варианте, отдельного семейного нет
const SAME_EXPIRY = DAY;

function localHour(timezone, now) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', hour: '2-digit', hour12: false }).format(now)) % 24;
}

const inSendWindow = (timezone, now) => {
  const hour = localHour(timezone, now);
  return hour >= SEND_FROM_HOUR && hour <= SEND_TO_HOUR;
};

// Семейный тариф: покупка и возврат (сроки плательщика), места в семье, уведомления участникам и плательщику.
// Право на премиум считает PremiumService (getFamilyPremium / isPremiumUser).
//
// Правило сроков: покупка продлевает и личный премиум плательщика на те же дни (как личный тариф — к действующему
// сроку, истёкший — от сейчас), и семейный срок (к действующему семейному или от сейчас). Поэтому личные дни
// плательщика не сгорают, а участники со своим премиумом его сохраняют. Возврат вычитает дни из обоих сроков.
class FamilyPremiumService {
  constructor({ familyPremiumRepository, familyRepository, userService, premiumService, userNotificationRepository, notificationService, localizationService, formatter }) {
    this.familyPremiumRepository = familyPremiumRepository;
    this.familyRepository = familyRepository;
    this.userService = userService;
    this.premiumService = premiumService;
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
  }

  get maxMembers() {
    return FAMILY_PREMIUM.MAX_MEMBERS;
  }

  planChanged() {
    if (this.premiumService) this.premiumService.invalidateFamilyPremium();
  }

  // Перед оплатой: платит владелец той семьи, для которой создана ссылка, и семья помещается в тариф
  async checkPurchase(payerId, familyId) {
    const family = await this.familyRepository.getUserFamily(payerId);
    if (!family || Number(family.owner_id) !== Number(payerId) || Number(family.id) !== Number(familyId)) {
      return { ok: false, reason: 'family_not_owner' };
    }
    const seats = await this.familyPremiumRepository.countSeats(family.id);
    if (seats.members > this.maxMembers) return { ok: false, reason: 'family_too_big' };
    return { ok: true };
  }

  // Экран семейного тарифа: семья пользователя, владелец ли он, сколько мест занято и его оплаченный семейный срок
  async getOwnerStatus(userId, now = new Date()) {
    const [family, planExpiry] = await Promise.all([
      this.familyRepository.getUserFamily(userId),
      this.familyPremiumRepository.getPlanExpiry(userId)
    ]);
    const seats = family ? await this.familyPremiumRepository.countSeats(family.id) : { members: 0, pending: 0 };
    const planExpiresAt = planExpiry ? new Date(planExpiry) : null;
    return {
      family: family || null,
      isOwner: !!family && Number(family.owner_id) === Number(userId),
      members: seats.members,
      pending: seats.pending,
      planExpiresAt,
      planActive: !!planExpiresAt && planExpiresAt > now
    };
  }

  // Приглашение без своего премиума: у владельца действует семейный тариф и в семье есть место
  // (участники и ожидающие приглашения вместе — до MAX_MEMBERS)
  async hasFreeSeat(ownerId, familyId) {
    const plan = await this.premiumService.getFamilyPremium(ownerId);
    if (!plan || !plan.active || plan.payerId !== Number(ownerId)) return false;
    const seats = await this.familyPremiumRepository.countSeats(familyId);
    return seats.members + seats.pending < this.maxMembers;
  }

  // Премиум у пользователя только от чужого семейного тарифа (своего нет) — выход из семьи его заберёт
  async dependsOnFamily(userId) {
    const plan = await this.premiumService.getFamilyPremium(userId);
    if (!plan || !plan.active || plan.payerId === Number(userId)) return false;
    return !(await this.userService.isPremiumActive(userId));
  }

  // Семейный тариф, который даёт премиум этому пользователю кто-то другой (действующий), или null
  async inheritedPlan(userId) {
    const plan = await this.premiumService.getFamilyPremium(userId);
    return plan && plan.active && plan.payerId !== Number(userId) ? plan : null;
  }

  // Участники, у которых премиум только от семьи владельца — до удаления семьи (после удаления их уже не найти)
  async membersDependingOnPlan(ownerId, now = new Date()) {
    const expiry = await this.familyPremiumRepository.getPlanExpiry(ownerId);
    if (!expiry || new Date(expiry) <= now) return [];
    const members = await this.familyPremiumRepository.getCoveredMembers(ownerId, this.maxMembers);
    return members.filter(member => !(member.premium_expires_at && new Date(member.premium_expires_at) > now));
  }

  async notifyLost(members, familyName) {
    for (const member of members) {
      try {
        const lang = member.language || 'en';
        await this.notificationService.sendMessage(member.id, this.t(lang, 'family_premium_lost', {
          family: this.formatter.escapeMarkdown(familyName || '')
        }), { parse_mode: 'Markdown' });
      } catch (error) {
        logger.warn('Family premium lost notice not delivered', { userId: member.id, error: error.message });
      }
    }
  }

  /**
   * Оплата семейного тарифа (повтор того же платежа отсекает вызывающий).
   * @returns {{ isNewActivation, newExpiryDate, daysAdded, familyExpiresAt, familyStarted, coveredMembers }}
   */
  async applyPurchase(payerId, days, transactionData, now = new Date()) {
    const personal = await this.userService.activatePremium(payerId, days, transactionData);
    const plan = await this.familyPremiumRepository.extendPlan(payerId, days, now);
    this.planChanged();
    const familyStarted = !plan.previous || new Date(plan.previous) <= now;
    const members = await this.familyPremiumRepository.getCoveredMembers(payerId, this.maxMembers);
    if (familyStarted && members.length) await this.notifyStarted(payerId, members, plan.expires);
    logger.info('Family premium paid', { payerId, days, familyExpiresAt: plan.expires, familyStarted, coveredMembers: members.length });
    return { ...personal, familyExpiresAt: plan.expires, familyStarted, coveredMembers: members.length };
  }

  // Возврат семейного платежа: дни снимаются с семейного срока; закончился — участники теряют премиум сразу
  async revokePurchase(payerId, days, now = new Date()) {
    const plan = await this.familyPremiumRepository.shortenPlan(payerId, days, now);
    this.planChanged();
    if (!plan) return { familyExpiresAt: null };
    const ended = new Date(plan.expires) <= now;
    if (ended) {
      const members = await this.familyPremiumRepository.getCoveredMembers(payerId, this.maxMembers);
      await this.notifyEnded(payerId, members, plan.expires, now, { anyHour: true });
    }
    logger.info('Family premium refunded', { payerId, days, familyExpiresAt: ended ? null : plan.expires });
    return { familyExpiresAt: ended ? null : plan.expires };
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  async payerName(payerId) {
    const payer = await this.userService.getUserById(payerId);
    return (payer && (payer.first_name || payer.username)) || '';
  }

  async notifyStarted(payerId, members, expiresAt) {
    const [name, family] = await Promise.all([this.payerName(payerId), this.familyRepository.getFamilyByOwnerId(payerId)]);
    for (const member of members) {
      try {
        const lang = member.language || 'en';
        await this.notificationService.sendMessage(member.id, this.t(lang, 'family_premium_started', {
          payer: this.formatter.escapeMarkdown(name),
          family: this.formatter.escapeMarkdown(family ? family.name : ''),
          date: this.formatter.formatDate(expiresAt, member.timezone || 'UTC')
        }), { parse_mode: 'Markdown' });
      } catch (error) {
        logger.warn('Family premium start notice not delivered', { userId: member.id, error: error.message });
      }
    }
  }

  // Одно сообщение участнику на окончание срока (user_notifications), только тем, у кого нет своего премиума
  async notifyEnded(payerId, members, expiresAt, now, { anyHour = false } = {}) {
    const refKey = `${payerId}:${new Date(expiresAt).getTime()}`;
    let sent = 0;
    for (const member of members) {
      if (member.premium_expires_at && new Date(member.premium_expires_at) > now) continue;
      try {
        if (!anyHour && !inSendWindow(member.timezone, now)) continue;
        if (!(await this.userNotificationRepository.markSent(member.id, 'family_premium_end', refKey))) continue;
        const lang = member.language || 'en';
        await this.notificationService.sendMessage(member.id, this.t(lang, 'family_premium_ended'), {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_view_tariffs'), callback_data: 'premium_tariffs' }]] }
        });
        sent++;
      } catch (error) {
        logger.warn('Family premium end notice not delivered', { userId: member.id, error: error.message });
      }
    }
    return sent;
  }

  /**
   * Cron (вместе с уведомлениями о личном премиуме): плательщику — за 2 дня до конца семейного срока, если его
   * личный срок заканчивается позже (иначе о том же скажет уведомление о премиуме); участникам — когда срок кончился.
   * Подписка Stars с автопродлением не тревожит ни тех, ни других.
   */
  async processDue(now = new Date()) {
    let sent = 0;
    const ending = await this.familyPremiumRepository.getPlansEndingBetween(now, new Date(now.getTime() + 2 * DAY));
    for (const plan of ending) {
      if (plan.has_active_subscription) continue;
      const familyExpiry = new Date(plan.family_premium_expires_at);
      const personalExpiry = plan.premium_expires_at ? new Date(plan.premium_expires_at) : null;
      if (personalExpiry && Math.abs(personalExpiry - familyExpiry) < SAME_EXPIRY) continue;
      try {
        if (!inSendWindow(plan.timezone, now)) continue;
        const members = await this.familyPremiumRepository.getCoveredMembers(plan.id, this.maxMembers);
        if (!members.length) continue;
        if (!(await this.userNotificationRepository.markSent(plan.id, 'family_premium_expiring', String(familyExpiry.getTime())))) continue;
        const lang = plan.language || 'en';
        await this.notificationService.sendMessage(plan.id, this.t(lang, 'family_premium_expiring_owner', {
          date: this.formatter.formatDate(familyExpiry, plan.timezone || 'UTC'),
          count: members.length
        }), {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_family_tariffs'), callback_data: 'pfam' }]] }
        });
        sent++;
      } catch (error) {
        logger.warn('Family premium expiring notice not delivered', { userId: plan.id, error: error.message });
      }
    }

    const ended = await this.familyPremiumRepository.getPlansEndingBetween(new Date(now.getTime() - DAY), new Date(now.getTime() - ENDED_GRACE));
    for (const plan of ended) {
      if (plan.has_active_subscription) continue;
      try {
        const members = await this.familyPremiumRepository.getCoveredMembers(plan.id, this.maxMembers);
        sent += await this.notifyEnded(plan.id, members, plan.family_premium_expires_at, now);
      } catch (error) {
        logger.warn('Family premium end notices failed', { payerId: plan.id, error: error.message });
      }
    }
    return sent;
  }

  async getStats(now = new Date()) {
    return this.familyPremiumRepository.getStats(now, this.maxMembers);
  }
}

FamilyPremiumService.SAME_EXPIRY = SAME_EXPIRY;

module.exports = FamilyPremiumService;
