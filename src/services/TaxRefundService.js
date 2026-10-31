const logger = require('../utils/logger');
const { localToday } = require('../utils/period');
const { localMoment } = require('./WeeklyInsightService');
const {
  KINDS, CLAIM_YEARS, DEPOSIT_TAX_FREE_RATE, DEPOSIT_NEAR_RATIO,
  isTaxRefundAvailable, classifyExpense, estimateRefund, depositExemption, depositTax
} = require('../utils/taxRefund');

const PAGE_SIZE = 8;
const SEARCH_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;
const KIND_ICONS = { medical: '💊', education: '🎓', sport: '🏋️', insurance: '🛡' };
// Напоминание за прошлый год: январь с 10-го числа (после праздников), днём по местному времени, раз в год, премиум,
// только если вернуть можно хотя бы MIN_REMINDER_REFUND
const REMINDER_KIND = 'tax_refund';
const REMINDER_FROM_DAY = 10;
const REMINDER_FROM_HOUR = 12;
const REMINDER_TO_HOUR = 21;
const MIN_REMINDER_REFUND = 500;

function normalizeSearch(text) {
  return String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

// Строка траты с видом вычета: auto — угадан по описанию и категории, kind — с учётом правки пользователя
// (null — не идёт в расчёт), listed — показывается в списке (угадана или отмечена вручную)
function withKind(row) {
  const auto = classifyExpense(row);
  const kind = row.mark === 'none' ? null : (row.mark || auto);
  return { ...row, amount: Number(row.amount), auto, kind, listed: Boolean(kind || auto) };
}

// «💡 Верни 13%» (только русский язык и рубли): траты года, за которые положен социальный вычет, сколько можно
// вернуть с учётом лимита, налог с процентов по вкладам, правка списка и январское напоминание. Тексты — только ru.
class TaxRefundService {
  constructor({ taxRefundRepository, savingsRepository, userService, premiumService, userNotificationRepository, notificationService, localizationService, formatter }) {
    this.taxRefundRepository = taxRefundRepository;
    this.savingsRepository = savingsRepository;
    this.userService = userService;
    this.premiumService = premiumService;
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
  }

  t(key, params) {
    return this.localizationService.getText('ru', key, params);
  }

  money(amount) {
    return this.formatter.formatAmount(Math.round(Number(amount) * 100) / 100, 'RUB');
  }

  // { lang, currency, timezone, today, currentYear, available }
  async context(userId) {
    const [lang, currency, timezone] = await Promise.all([
      this.userService.getUserLanguage(userId),
      this.userService.getUserCurrency(userId),
      this.userService.getUserTimezone(userId)
    ]);
    const today = localToday(timezone);
    return { lang, currency, timezone, today, currentYear: Number(today.slice(0, 4)), available: isTaxRefundAvailable(lang, currency) };
  }

  // Год, за который можно смотреть: текущий и три прошлых (за них ещё можно заявить вычет)
  isValidYear(year, currentYear) {
    return Number.isInteger(year) && year >= currentYear - CLAIM_YEARS && year <= currentYear;
  }

  clampYear(year, currentYear) {
    return Math.min(currentYear, Math.max(currentYear - CLAIM_YEARS, year));
  }

  range(year) {
    return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
  }

  async rows(userId, year, timezone) {
    const { start, end } = this.range(year);
    return (await this.taxRefundRepository.getExpenses(userId, timezone, start, end)).map(withKind);
  }

  // Итог года: { year, currentYear, kinds: [{ kind, total, count }], count, excluded, sum, base, limit, childEducation,
  // capped, refund, interest } — interest только за текущий год и только если есть вклады со ставкой
  async summary(userId, year, { timezone, currentYear }) {
    const rows = await this.rows(userId, year, timezone);
    const totals = Object.fromEntries(KINDS.map(kind => [kind, 0]));
    const counts = Object.fromEntries(KINDS.map(kind => [kind, 0]));
    let excluded = 0;
    for (const row of rows) {
      if (row.kind) {
        totals[row.kind] += row.amount;
        counts[row.kind]++;
      } else if (row.listed) {
        excluded++;
      }
    }
    const kinds = KINDS.filter(kind => counts[kind]).map(kind => ({ kind, total: totals[kind], count: counts[kind] }));
    return {
      year,
      currentYear,
      kinds,
      count: kinds.reduce((sum, item) => sum + item.count, 0),
      excluded,
      ...estimateRefund(totals, year),
      interest: year === currentYear ? await this.interest(userId, year) : null
    };
  }

  // Проценты по вкладам за год при нынешних остатках и ставках: рублёвые счета со своей ставкой выше 1% годовых.
  // null — нет таких счетов или необлагаемая сумма за год ещё не в таблице
  async interest(userId, year) {
    const exemption = depositExemption(year);
    if (!exemption) return null;
    const pots = await this.savingsRepository.getPots(userId);
    const accounts = pots.filter(pot => (pot.kind === 'general' || pot.kind === 'account') && pot.currency === 'RUB'
      && pot.yield_rate !== null && pot.yield_rate !== undefined && Number(pot.yield_rate) > DEPOSIT_TAX_FREE_RATE
      && Number(pot.balance) > 0);
    if (!accounts.length) return null;
    const amount = Math.round(accounts.reduce((sum, pot) => sum + Number(pot.balance) * Number(pot.yield_rate) / 100, 0));
    return {
      amount,
      exempt: exemption.amount,
      provisional: Boolean(exemption.provisional),
      tax: depositTax(amount, exemption.amount),
      near: amount >= exemption.amount * DEPOSIT_NEAR_RATIO
    };
  }

  kindLabel(kind) {
    return `${KIND_ICONS[kind]} ${this.t(`tax_kind_${kind}`)}`;
  }

  // Строки итога (Markdown) — для экрана, ответа «Спроси бота» и напоминания
  summaryLines(summary) {
    const lines = [];
    if (!summary.count) {
      lines.push(this.t('tax_empty', { year: summary.year }));
    } else {
      lines.push(this.t('tax_found'));
      for (const item of summary.kinds) {
        lines.push(this.t('tax_kind_line', { kind: this.kindLabel(item.kind), amount: this.money(item.total), count: item.count }));
      }
      lines.push('', this.t('tax_total', { amount: this.money(summary.sum) }));
      if (summary.capped) lines.push(this.t('tax_capped', { limit: this.money(summary.limit) }));
      lines.push(this.t('tax_refund', { amount: this.money(summary.refund) }));
    }
    if (summary.interest) lines.push('', ...this.interestLines(summary.interest, summary.year));
    lines.push('', this.t('tax_disclaimer'));
    return lines;
  }

  interestLines(interest, year) {
    const exempt = this.money(interest.exempt) + (interest.provisional ? this.t('tax_interest_provisional') : '');
    const lines = [this.t('tax_interest', { amount: this.money(interest.amount) })];
    if (interest.tax > 0) lines.push(this.t('tax_interest_over', { exempt, tax: this.money(interest.tax), payYear: year + 1 }));
    else if (interest.near) lines.push(this.t('tax_interest_near', { exempt }));
    else lines.push(this.t('tax_interest_ok', { exempt }));
    return lines;
  }

  // «📄 Как вернуть» за год: справки, куда подать, лимиты и до какого года можно заявить
  howText(year) {
    const rules = estimateRefund({}, year);
    return this.t('tax_how', {
      year,
      nextYear: year + 1,
      lastYear: year + CLAIM_YEARS,
      limit: this.money(rules.limit),
      childLimit: this.money(rules.childEducation)
    });
  }

  // Страница списка: { items, page, pages, counted, countedTotal, excluded }
  async listPage(userId, year, page, { timezone }) {
    const listed = (await this.rows(userId, year, timezone)).filter(row => row.listed);
    const pages = Math.max(1, Math.ceil(listed.length / PAGE_SIZE));
    const current = Math.min(Math.max(0, page), pages - 1);
    const counted = listed.filter(row => row.kind);
    return {
      items: listed.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE),
      page: current,
      pages,
      counted: counted.length,
      countedTotal: counted.reduce((sum, row) => sum + row.amount, 0),
      excluded: listed.length - counted.length
    };
  }

  async expense(userId, year, expenseId, timezone) {
    const { start, end } = this.range(year);
    const row = await this.taxRefundRepository.getExpense(userId, expenseId, timezone, start, end);
    return row ? withKind(row) : null;
  }

  // Убрать трату из расчёта или вернуть её. false — такой траты (своей, рублёвой, за этот год) нет
  async toggle(userId, year, expenseId, { timezone }) {
    const row = await this.expense(userId, year, expenseId, timezone);
    if (!row || !row.listed) return false;
    if (row.kind) {
      // угаданную — «не для вычета»; добавленную вручную — просто убрать отметку
      if (row.auto) await this.taxRefundRepository.setMark(userId, expenseId, 'none');
      else await this.taxRefundRepository.deleteMark(userId, expenseId);
    } else {
      await this.taxRefundRepository.deleteMark(userId, expenseId);
    }
    return true;
  }

  // Траты года, которых нет в расчёте, по слову из описания (новые сначала). null — слишком короткий запрос
  async search(userId, year, query, { timezone }) {
    const needle = normalizeSearch(query);
    if (needle.length < MIN_QUERY_LENGTH) return null;
    const rows = await this.rows(userId, year, timezone);
    return rows.filter(row => !row.kind && normalizeSearch(row.description).includes(needle)).slice(0, SEARCH_LIMIT);
  }

  // Добавить трату в расчёт как kind. false — такой траты нет
  async addToKind(userId, year, expenseId, kind, { timezone }) {
    if (!KINDS.includes(kind)) return false;
    const row = await this.expense(userId, year, expenseId, timezone);
    if (!row) return false;
    if (row.auto === kind) await this.taxRefundRepository.deleteMark(userId, expenseId);
    else await this.taxRefundRepository.setMark(userId, expenseId, kind);
    return true;
  }

  // Cron (каждый час): в январе — сколько можно вернуть за прошлый год. Раз в год (user_notifications), премиум
  async processDue(now = new Date()) {
    const candidates = await this.taxRefundRepository.getReminderCandidates();
    let sent = 0;
    for (const candidate of candidates) {
      try {
        const local = localMoment(now, candidate.timezone);
        const [currentYear, month, day] = local.date.split('-').map(Number);
        if (month !== 1 || day < REMINDER_FROM_DAY || local.hour < REMINDER_FROM_HOUR || local.hour >= REMINDER_TO_HOUR) continue;
        const year = currentYear - 1;
        const refKey = String(year);
        if (await this.userNotificationRepository.isSent(candidate.id, REMINDER_KIND, refKey)) continue;
        if (!(await this.premiumService.isPremiumUser(candidate.id))) continue;
        const summary = await this.summary(candidate.id, year, { timezone: candidate.timezone, currentYear });
        // Разбор за год сделан — второй раз не считаем, даже если возвращать нечего
        if (!(await this.userNotificationRepository.markSent(candidate.id, REMINDER_KIND, refKey))) continue;
        if (summary.refund < MIN_REMINDER_REFUND) continue;
        await this.notificationService.sendMessage(candidate.id, this.reminderText(summary), {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: this.t('tax_button_how'), callback_data: `taxh|${year}` },
              { text: this.t('tax_button_open'), callback_data: `tax|${year}` }
            ]]
          }
        });
        sent++;
      } catch (error) {
        logger.warn('Tax refund reminder not delivered', { userId: candidate.id, error: error.message });
      }
    }
    return sent;
  }

  reminderText(summary) {
    return [this.t('tax_reminder_title', { year: summary.year }), '', ...this.summaryLines(summary).slice(0, -1), this.t('tax_reminder_how'), '', this.t('tax_disclaimer')].join('\n');
  }
}

Object.assign(TaxRefundService, {
  PAGE_SIZE,
  KIND_ICONS,
  MIN_REMINDER_REFUND,
  REMINDER_KIND,
  withKind,
  normalizeSearch
});

module.exports = TaxRefundService;
