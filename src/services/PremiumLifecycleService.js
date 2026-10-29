const logger = require('../utils/logger');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Свой и семейный сроки плательщика считаем совпадающими, если они ближе суток (FamilyPremiumService.SAME_EXPIRY)
const FAMILY_SAME_EXPIRY = DAY;

// Окна относительно окончания премиума и тексты по источнику премиума
// (trial — только пробный период, granted — выдан админом без оплат, paid — были оплаты)
const STAGES = [
  { kind: 'premium_expiring', from: -2 * DAY, to: 0, text: { trial: 'premium_expiring_trial', granted: 'premium_expiring_paid', paid: 'premium_expiring_paid' } },
  { kind: 'premium_expired', from: 0, to: DAY, text: { trial: 'premium_expired_trial', granted: 'premium_expired_granted', paid: 'premium_expired_paid' } },
  { kind: 'premium_winback', from: 7 * DAY, to: 8 * DAY, text: { trial: 'premium_winback', granted: 'premium_winback', paid: 'premium_winback' } }
];

// Не пишем ночью: только с 10:00 до 20:59 по местному времени пользователя
const SEND_FROM_HOUR = 10;
const SEND_TO_HOUR = 20;

function localHour(timezone, now) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', hour: '2-digit', hour12: false }).format(now)) % 24;
}

// Стадия уведомления для момента now (или null). Подписка с автопродлением не тревожит пользователя.
// Возврат денег незадолго до окончания или снявший премиум — тоже: не пишем «закончился» и «вернись»
// тому, кто только что попросил деньги назад.
function stageFor(candidate, now) {
  if (candidate.has_active_subscription) return null;
  const expiresAt = new Date(candidate.premium_expires_at).getTime();
  if (candidate.last_refund_at && new Date(candidate.last_refund_at).getTime() >= expiresAt + STAGES[0].from) return null;
  const sinceExpiry = now.getTime() - expiresAt;
  return STAGES.find(stage => sinceExpiry >= stage.from && sinceExpiry < stage.to) || null;
}

// Купил семейный тариф без своего премиума: свой и семейный сроки совпадают — предупреждение говорит о семейном
function textKeyFor(stage, candidate) {
  if (stage.kind === 'premium_expiring' && candidate.family_premium_expires_at
    && Math.abs(new Date(candidate.family_premium_expires_at) - new Date(candidate.premium_expires_at)) < FAMILY_SAME_EXPIRY) {
    return 'premium_expiring_family';
  }
  return stage.text[candidate.premium_source] || stage.text.paid;
}

// Премиум не кончается со своим сроком: его дальше даёт чужой семейный тариф
function coveredByFamily(candidate, plan) {
  return !!plan && plan.expiresAt > new Date(candidate.premium_expires_at);
}

class PremiumLifecycleService {
  constructor(userNotificationRepository, notificationService, localizationService, formatter, familyPremiumService = null) {
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.familyPremiumService = familyPremiumService;
  }

  // Cron: предупреждение за 2 дня, сообщение об окончании и напоминание через неделю — по одному разу на срок;
  // затем уведомления семейного тарифа (FamilyPremiumService.processDue)
  async processDue(now = new Date()) {
    const candidates = await this.userNotificationRepository.getPremiumLifecycleCandidates(now);
    let sent = 0;
    for (const candidate of candidates) {
      const stage = stageFor(candidate, now);
      if (!stage) continue;
      // Ошибка у одного пользователя (невалидный пояс, заблокированный бот) не прерывает рассылку остальным
      try {
        const hour = localHour(candidate.timezone, now);
        if (hour < SEND_FROM_HOUR || hour > SEND_TO_HOUR) continue;
        if (this.familyPremiumService && coveredByFamily(candidate, await this.familyPremiumService.inheritedPlan(candidate.id))) continue;

        const refKey = String(new Date(candidate.premium_expires_at).getTime());
        if (!(await this.userNotificationRepository.markSent(candidate.id, stage.kind, refKey))) continue;

        const lang = candidate.language || 'en';
        const date = this.formatter.formatDate(candidate.premium_expires_at, candidate.timezone || 'UTC');
        const text = this.localizationService.getText(lang, textKeyFor(stage, candidate), { date });
        // После markSent повторно не шлём, даже если пользователь заблокировал бота
        await this.notificationService.sendMessage(candidate.id, text, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: this.localizationService.getText(lang, 'button_view_tariffs'), callback_data: 'premium_tariffs' }]] }
        });
        sent++;
      } catch (error) {
        logger.warn('Premium lifecycle notification not delivered', { userId: candidate.id, kind: stage.kind, error: error.message });
      }
    }
    if (this.familyPremiumService) {
      try {
        sent += await this.familyPremiumService.processDue(now);
      } catch (error) {
        logger.warn('Family premium notifications failed', { error: error.message });
      }
    }
    return sent;
  }
}

PremiumLifecycleService.stageFor = stageFor;
PremiumLifecycleService.textKeyFor = textKeyFor;
PremiumLifecycleService.coveredByFamily = coveredByFamily;

module.exports = PremiumLifecycleService;
