const logger = require('../utils/logger');

// Шаги воронки (первое наступление для пользователя). onboarding_started / onboarding_skipped — опрос
// «🧭 Настроим бота под тебя»: начат и пропущен целиком («Пропустить всё»); onboarding_completed — пройден до конца.
// trial_started — выдан пробный премиум при регистрации; nudge_sent — отправлено единственное напоминание
// «запиши первую трату» тому, кто за сутки ничего не записал (botCron.sendFirstExpenseNudges, защита от повтора).
// paywall_viewed — экран премиума у того, кто ещё не платит (без премиума или на пробном); invoice_created — получил
// ссылку на счёт премиума (экран подписки или тарифов, семейный тариф, тариф в Mini App); trial_ended — закончился
// пробный премиум без оплаты (PremiumLifecycleService, сообщение об окончании)
const FUNNEL_EVENTS = ['registered', 'trial_started', 'onboarding_started', 'onboarding_completed', 'onboarding_skipped', 'first_expense', 'nudge_sent', 'paywall_viewed', 'tariffs_viewed', 'invoice_created', 'trial_ended', 'paid'];

// Код источника из /start: латиница, цифры, "_" и "-", до 64 символов (ограничение Telegram для start-параметра)
const SOURCE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

class FunnelService {
  constructor(funnelRepository) {
    this.funnelRepository = funnelRepository;
  }

  // Ошибка учёта не должна ломать пользовательский сценарий
  async track(userId, event) {
    if (!FUNNEL_EVENTS.includes(event)) throw new Error(`Unknown funnel event: ${event}`);
    try {
      await this.funnelRepository.track(userId, event);
    } catch (error) {
      logger.error('Failed to track funnel event', { userId, event, error: error.message });
    }
  }

  // Шаг воронки уже был (например, first_expense — пользователь уже что-то записал); ошибка — «нет»
  async hasEvent(userId, event) {
    try {
      return await this.funnelRepository.hasEvent(userId, event);
    } catch (error) {
      logger.error('Failed to read funnel event', { userId, event, error: error.message });
      return false;
    }
  }

  // "/start ads_tg1" → "ads_tg1"; некорректный код игнорируется
  static parseStartSource(messageText) {
    const payload = String(messageText || '').trim().split(/\s+/)[1];
    return payload && SOURCE_PATTERN.test(payload) ? payload : null;
  }

  async registerSource(userId, source) {
    if (!source) return;
    try {
      await this.funnelRepository.setSourceIfEmpty(userId, source);
    } catch (error) {
      logger.error('Failed to save user source', { userId, source, error: error.message });
    }
  }

  async getReport(days) {
    return this.funnelRepository.getReport(days);
  }
}

module.exports = FunnelService;
