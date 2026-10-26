const logger = require('../utils/logger');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Окна относительно окончания премиума и тексты (trial — пробный период без оплат)
const STAGES = [
  { kind: 'premium_expiring', from: -2 * DAY, to: 0, text: { trial: 'premium_expiring_trial', paid: 'premium_expiring_paid' } },
  { kind: 'premium_expired', from: 0, to: DAY, text: { trial: 'premium_expired_trial', paid: 'premium_expired_paid' } },
  { kind: 'premium_winback', from: 7 * DAY, to: 8 * DAY, text: { trial: 'premium_winback', paid: 'premium_winback' } }
];

// Не пишем ночью: только с 10:00 до 20:59 по местному времени пользователя
const SEND_FROM_HOUR = 10;
const SEND_TO_HOUR = 20;

function localHour(timezone, now) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', hour: '2-digit', hour12: false }).format(now)) % 24;
}

// Стадия уведомления для момента now (или null). Подписка с автопродлением не тревожит пользователя.
function stageFor(candidate, now) {
  if (candidate.has_active_subscription) return null;
  const sinceExpiry = now.getTime() - new Date(candidate.premium_expires_at).getTime();
  return STAGES.find(stage => sinceExpiry >= stage.from && sinceExpiry < stage.to) || null;
}

class PremiumLifecycleService {
  constructor(userNotificationRepository, notificationService, localizationService, formatter) {
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
  }

  // Cron: предупреждение за 2 дня, сообщение об окончании и напоминание через неделю — по одному разу на срок
  async processDue(now = new Date()) {
    const candidates = await this.userNotificationRepository.getPremiumLifecycleCandidates();
    let sent = 0;
    for (const candidate of candidates) {
      const stage = stageFor(candidate, now);
      if (!stage) continue;
      const hour = localHour(candidate.timezone, now);
      if (hour < SEND_FROM_HOUR || hour > SEND_TO_HOUR) continue;

      const refKey = String(new Date(candidate.premium_expires_at).getTime());
      if (!(await this.userNotificationRepository.markSent(candidate.id, stage.kind, refKey))) continue;

      const lang = candidate.language || 'en';
      const date = this.formatter.formatDate(candidate.premium_expires_at, candidate.timezone || 'UTC');
      const text = this.localizationService.getText(lang, stage.text[candidate.is_trial_only ? 'trial' : 'paid'], { date });
      try {
        await this.notificationService.sendMessage(candidate.id, text, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: this.localizationService.getText(lang, 'button_view_tariffs'), callback_data: 'premium_tariffs' }]] }
        });
        sent++;
      } catch (error) {
        // Пользователь мог заблокировать бота — повторно не шлём
        logger.warn('Premium lifecycle notification not delivered', { userId: candidate.id, kind: stage.kind, error: error.message });
      }
    }
    return sent;
  }
}

PremiumLifecycleService.stageFor = stageFor;

module.exports = PremiumLifecycleService;
