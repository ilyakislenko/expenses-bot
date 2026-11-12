const logger = require('../utils/logger');
const { PREMIUM_TARIFFS, TRIAL_PERIOD, tariffDiscount } = require('../utils/constants');
const { localToday, lastDaysPeriod } = require('../utils/period');
const { quickTariffRows, yearPerMonthStars } = require('../utils/premiumOffer');

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

// Сообщения о конце пробного периода — с личным итогом, ценой и тарифами
const TRIAL_END_KEYS = ['premium_expiring_trial', 'premium_expired_trial'];

class PremiumLifecycleService {
  constructor(userNotificationRepository, notificationService, localizationService, formatter, familyPremiumService = null, { expenseService = null, budgetService = null, paymentService = null, funnelService = null } = {}) {
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.familyPremiumService = familyPremiumService;
    this.expenseService = expenseService; // личный итог пробного периода
    this.budgetService = budgetService;
    this.paymentService = paymentService; // год и месяц — ссылками на счёт
    this.funnelService = funnelService; // шаг воронки trial_ended
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
        if (stage.kind === 'premium_expired' && candidate.premium_source === 'trial' && this.funnelService) {
          await this.funnelService.track(candidate.id, 'trial_ended');
        }

        const lang = candidate.language || 'en';
        const date = this.formatter.formatDate(candidate.premium_expires_at, candidate.timezone || 'UTC');
        const textKey = textKeyFor(stage, candidate);
        const message = TRIAL_END_KEYS.includes(textKey)
          ? await this.trialEndMessage(candidate, lang, textKey, date)
          : {
            text: this.localizationService.getText(lang, textKey, { date }),
            keyboard: [[{ text: this.localizationService.getText(lang, 'button_view_tariffs'), callback_data: 'premium_tariffs' }]]
          };
        // После markSent повторно не шлём, даже если пользователь заблокировал бота
        await this.notificationService.sendMessage(candidate.id, message.text, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: message.keyboard }
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

  // Конец пробного: текст стадии, личный итог (если что-то записано), цена и кнопки года и месяца со ссылкой на
  // счёт (созданы рассылкой — не шаг воронки «счёт»), ниже — все тарифы
  async trialEndMessage(candidate, lang, textKey, date) {
    const t = (key, params) => this.localizationService.getText(lang, key, params);
    const year = PREMIUM_TARIFFS.MONTH_12;
    const parts = [t(textKey, { date })];
    const summary = await this.trialSummary(candidate, lang);
    if (summary) parts.push(summary);
    parts.push(t('premium_trial_price', {
      month: PREMIUM_TARIFFS.MONTH_1.stars,
      year: year.stars,
      perMonth: yearPerMonthStars(),
      percent: tariffDiscount(year).percent
    }));
    const payRows = await quickTariffRows(this.paymentService, this.localizationService, candidate.id, lang, { track: false });
    return {
      text: parts.join('\n\n'),
      keyboard: [...payRows, [{ text: t('premium_tariff_button'), callback_data: 'premium_tariffs' }]]
    };
  }

  // Итог последних TRIAL_PERIOD.DAYS дней (Markdown): сколько записей, самая частая категория, сколько бюджетов.
  // Ничего не записано или данные не загрузились — без итога
  async trialSummary(candidate, lang) {
    if (!this.expenseService) return '';
    const t = (key, params) => this.localizationService.getText(lang, key, params);
    const timezone = candidate.timezone || 'UTC';
    try {
      const period = lastDaysPeriod(localToday(timezone), TRIAL_PERIOD.DAYS);
      const [rows, budgets] = await Promise.all([
        this.expenseService.getCategoryTotals(candidate.id, timezone, period),
        this.budgetService ? this.budgetService.list(candidate.id).catch(() => []) : []
      ]);
      // Строки категорий — по валютам: складываем число записей по названию
      const byName = new Map();
      for (const row of rows) {
        const entry = byName.get(row.name) || { name: row.name, icon: row.icon, count: 0 };
        entry.count += Number(row.count) || 0;
        byName.set(row.name, entry);
      }
      const categories = [...byName.values()];
      const total = categories.reduce((sum, c) => sum + c.count, 0);
      if (!total) return '';
      const top = categories.reduce((best, c) => (c.count > best.count ? c : best));
      const name = this.formatter.escapeMarkdown(this.formatter.translateCategoryName(top.name, this.localizationService, lang));
      const lines = [
        t('premium_trial_summary_title', { days: TRIAL_PERIOD.DAYS }),
        t('premium_trial_summary_records', { count: total }),
        t('premium_trial_summary_top', { category: `${top.icon || '📦'} ${name}` })
      ];
      if (budgets.length) lines.push(t('premium_trial_summary_budgets', { count: budgets.length }));
      return lines.join('\n');
    } catch (error) {
      logger.warn('Trial summary not built', { userId: candidate.id, error: error.message });
      return '';
    }
  }
}

PremiumLifecycleService.stageFor = stageFor;
PremiumLifecycleService.textKeyFor = textKeyFor;
PremiumLifecycleService.coveredByFamily = coveredByFamily;

module.exports = PremiumLifecycleService;
