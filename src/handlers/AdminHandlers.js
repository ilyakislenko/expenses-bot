const logger = require('../utils/logger');
const respond = require('../utils/respond');
const { getTimezoneDisplayName } = require('../utils/timezoneCalculator');
const AdminService = require('../services/AdminService');

const ACTIVE_PAGE_SIZE = 20; // «🟢 Активные»: строк на странице
const ACTIVE_DAYS = [7, 30, 90]; // окна активности на кнопках
// Вид платежа в callback_data (panel_pay_<код>_<id>) и обратно
const KIND_CODE = { premium: 'p', group_pass: 'g', donation: 'd' };
const KIND_BY_CODE = { p: 'premium', g: 'group_pass', d: 'donation' };

class AdminHandlers {
  constructor(adminService, userService, localizationService, formatter, stateService, funnelService, paymentService, referralService = null) {
    this.adminService = adminService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.funnelService = funnelService;
    this.paymentService = paymentService;
    this.referralService = referralService;
  }

  // Семейный тариф отдельной строкой: покупки и звёзды (без возвратов), возвраты, действующие тарифы и сколько
  // участников (кроме плательщиков) получают премиум от семьи
  async familyPremiumStatsLine() {
    const stats = this.adminService.getFamilyPremiumStats ? await this.adminService.getFamilyPremiumStats().catch(() => null) : null;
    if (!stats) return '';
    return `👨‍👩‍👧 Семейный тариф: покупок ${stats.purchases} · ${stats.stars} ⭐ · возвратов ${stats.refunded} · действует у ${stats.active_plans} семей · участников с премиумом от семьи ${stats.covered_members}`;
  }

  // Проверка прав администратора
  async checkAdminAccess(ctx) {
    const userId = ctx.from.id;
    const isAdmin = await this.adminService.isUserAdmin(userId);
    
    if (!isAdmin) {
      if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
      const userLanguage = await this.userService.getUserLanguage(userId);
      const accessDeniedText = this.localizationService.getText(userLanguage, 'admin_access_denied');
      await ctx.reply(accessDeniedText);
      return false;
    }
    
    return true;
  }

  // Главное меню админки
  async showAdminPanel(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    
    const keyboard = [
      [
        { text: '📊 Статистика', callback_data: 'panel_stats' },
        { text: '📈 Воронка', callback_data: 'panel_funnel_30' }
      ],
      [
        { text: '👥 Пользователи', callback_data: 'panel_users' },
        { text: '🟢 Активные', callback_data: 'panel_active_30_1' }
      ],
      [
        { text: '🐛 Баг-репорты', callback_data: 'panel_bug_reports' },
        { text: '💰 Донаты', callback_data: 'panel_donations' }
      ],
      [
        { text: '⭐ Премиум', callback_data: 'panel_premium' },
        { text: '👑 Админы', callback_data: 'panel_managers' }
      ],
      [
        { text: '📢 Массовое уведомление', callback_data: 'panel_broadcast' }
      ],
      [
        { text: '🧾 Платежи', callback_data: 'panel_pays_0_1' },
        { text: '🔍 Поиск', callback_data: 'panel_search' }
      ],
      [
        { text: '🔙 Назад', callback_data: 'back_to_menu' }
      ]
    ];

    const adminPanelText = this.localizationService.getText(userLanguage, 'admin_panel_title');
    await ctx.reply(adminPanelText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Статистика
  async showStats(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const [userStats, expenseStats, bugReportStats, donationStats, premiumStats] = await Promise.all([
        this.adminService.getUserStats(),
        this.adminService.getExpenseStats(),
        this.adminService.getBugReportStats(),
        this.adminService.getDonationStats(),
        this.adminService.getPremiumTransactionStats()
      ]);

      let statsText = this.localizationService.getText(userLanguage, 'admin_stats_text', {
        totalUsers: userStats.totalUsers,
        activePremium: userStats.activePremiumUsers,
        newUsersWeek: userStats.newUsersLastWeek,
        newUsersMonth: userStats.newUsersLastMonth,
        totalExpenses: expenseStats.totalExpenses,
        expensesWeek: expenseStats.expensesLastWeek,
        activeUsers: expenseStats.activeUsers,
        totalBugReports: bugReportStats.stats.reduce((sum, stat) => sum + parseInt(stat.count, 10), 0),
        totalDonations: donationStats.totalDonations,
        totalStars: donationStats.totalStars,
        premiumTransactions: premiumStats.total_transactions || 0
      });
      // Заблокировали бота (users.blocked_at): рассылки им не уходят
      statsText += `\n\n🚫 Заблокировали бота: ${userStats.blockedUsers}`;
      // Приглашения друзей: всего, сколько записали 3 траты (награда выдана), бонусных дней обоим сторонам
      if (this.referralService) {
        const referrals = await this.referralService.getGlobalStats().catch(() => null);
        if (referrals) {
          statsText += `\n\n🎁 Приглашения: ${referrals.invited} · активировали ${referrals.activated} · пригласивших ${referrals.inviters} · выдано ${referrals.days} дн. премиума`;
        }
      }
      const familyLine = await this.familyPremiumStatsLine();
      if (familyLine) statsText += `\n\n${familyLine}`;

      const keyboard = [
        [{ text: '🔙 Назад', callback_data: 'panel_main' }]
      ];

      await ctx.reply(statsText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      logger.error('Error showing admin stats:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.reply(errorText);
    }
  }

  // Воронка по источникам (код из t.me/<bot>?start=<код>). days = 0 — за всё время
  async showFunnel(ctx, days) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const rows = await this.funnelService.getReport(days > 0 ? days : null);
    const pct = (value, total) => (total > 0 ? `${Math.round(value / total * 100)}%` : '0%');
    const block = (title, r) => [
      `${title} — ${r.registered} чел.`,
      `  пробный выдан ${r.trial_started} · онбординг ${r.onboarded} (${pct(r.onboarded, r.registered)}) · 1-я трата ${r.first_expense} (${pct(r.first_expense, r.registered)}) · вернулись через неделю ${r.returned_week2} (${pct(r.returned_week2, r.registered)})`,
      `  смотрели премиум ${r.paywall_viewed} · тарифы ${r.tariffs_viewed} · ссылка на счёт ${r.invoice_created} · пробный закончился ${r.trial_ended} · оплатили ${r.paid} (${pct(r.paid, r.registered)}) · ${r.stars} ⭐`
    ].join('\n');

    const total = rows.reduce((acc, r) => {
      for (const key of ['registered', 'trial_started', 'onboarded', 'first_expense', 'returned_week2', 'paywall_viewed', 'tariffs_viewed', 'invoice_created', 'trial_ended', 'paid', 'stars']) {
        acc[key] = (acc[key] || 0) + r[key];
      }
      return acc;
    }, {});

    const period = days > 0 ? `за ${days} дней` : 'за всё время';
    const lines = [`📈 Воронка — ${period} (по дате регистрации)`, ''];
    if (!rows.length) {
      lines.push('Регистраций за период нет.');
    } else {
      lines.push(block('Все источники', total));
      for (const r of rows.slice(0, 15)) {
        lines.push('', block(`▫️ ${r.source || 'без источника'}`, r));
      }
    }
    const botUsername = ctx.botInfo && ctx.botInfo.username ? ctx.botInfo.username : '<бот>';
    lines.push(
      '',
      `Ссылка для рекламы: https://t.me/${botUsername}?start=<код>`,
      'Код — латиница, цифры, _ и -, до 64 символов. Источник запоминается при первом /start.'
    );

    await respond(ctx, lines.join('\n'), {
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '30 дней', callback_data: 'panel_funnel_30' },
            { text: '90 дней', callback_data: 'panel_funnel_90' },
            { text: 'Всё время', callback_data: 'panel_funnel_0' }
          ],
          [{ text: '🔙 Назад', callback_data: 'panel_main' }]
        ]
      }
    });
  }

  // Управление пользователями
  async showUsers(ctx, page = 1) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const usersData = await this.adminService.getAllUsers(page, 10);
      
      let usersText = this.localizationService.getText(userLanguage, 'admin_users_title', {
        page: usersData.pagination.currentPage,
        totalPages: usersData.pagination.totalPages,
        totalUsers: usersData.pagination.totalUsers
      });

      usersData.users.forEach((user, index) => {
        const userNumber = (page - 1) * 10 + index + 1;
        const adminFlag = user.is_admin ? '👑' : '';
        const premiumFlag = user.premium ? '⭐' : '';
        const firstName = this.formatter.escapeMarkdown(user.first_name || 'N/A');
        const username = this.formatter.escapeMarkdown(user.username || 'N/A');
        usersText += `\n${userNumber}. ${adminFlag}${premiumFlag} ${firstName} (@${username}) - ID: ${user.id}`;
      });

      const keyboard = [];
      
      // Навигация по страницам
      if (usersData.pagination.totalPages > 1) {
        const navRow = [];
        if (page > 1) {
          navRow.push({ text: '⬅️', callback_data: `panel_users_page_${page - 1}` });
        }
        navRow.push({ text: `${page}/${usersData.pagination.totalPages}`, callback_data: 'noop' });
        if (page < usersData.pagination.totalPages) {
          navRow.push({ text: '➡️', callback_data: `panel_users_page_${page + 1}` });
        }
        keyboard.push(navRow);
      }

      keyboard.push([{ text: '🔙 Назад', callback_data: 'panel_main' }]);

      await ctx.reply(usersText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      logger.error('Error showing admin users:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.reply(errorText);
    }
  }

  // panel_active_<days>_<page> — кто сам делал записи (траты, доходы; без авто-записей регулярных и импорта выписок)
  // за 7 / 30 / 90 дней: свежие сверху, записей и разных дней, последняя запись; номер — карточка пользователя
  async showActiveUsers(ctx, days = 30, page = 1) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const data = await this.adminService.getActiveUsers(days, page, ACTIVE_PAGE_SIZE);
    const timezone = (await this.userService.getUserTimezone(ctx.from.id)) || 'UTC';
    const share = data.totalUsers ? Math.round(data.active / data.totalUsers * 100) : 0;
    const lines = [
      `🟢 *Активные за ${days} дн.:* ${data.active} из ${data.totalUsers} (${share}%)`,
      '_Сами делали записи: траты и доходы, без авто-записей регулярных и импорта выписок_',
      ''
    ];
    if (!data.users.length) lines.push('Никого.');
    const first = (data.page - 1) * ACTIVE_PAGE_SIZE;
    data.users.forEach((user, i) => {
      const flags = `${user.is_admin ? '👑' : ''}${user.premium ? '⭐' : ''}`;
      const name = this.formatter.escapeMarkdown(user.first_name || '—');
      const username = user.username ? ` @${this.formatter.escapeMarkdown(user.username)}` : '';
      const last = this.formatter.formatShortDateTime(user.last_at, timezone);
      lines.push(`${first + i + 1}. ${flags ? `${flags} ` : ''}${name}${username} — ${user.records} зап. · ${user.days} дн. · посл. ${last}`);
    });

    const keyboard = [];
    for (let i = 0; i < data.users.length; i += 5) {
      keyboard.push(data.users.slice(i, i + 5).map((user, j) => ({ text: String(first + i + j + 1), callback_data: `panel_user_${user.id}` })));
    }
    if (data.totalPages > 1) {
      keyboard.push([
        data.page > 1 ? { text: '⬅️', callback_data: `panel_active_${days}_${data.page - 1}` } : { text: ' ', callback_data: 'noop' },
        { text: `${data.page}/${data.totalPages}`, callback_data: 'noop' },
        data.page < data.totalPages ? { text: '➡️', callback_data: `panel_active_${days}_${data.page + 1}` } : { text: ' ', callback_data: 'noop' }
      ]);
    }
    keyboard.push(ACTIVE_DAYS.map(d => ({ text: d === days ? `• ${d} дн.` : `${d} дн.`, callback_data: `panel_active_${d}_1` })));
    keyboard.push([{ text: '🔙 Назад', callback_data: 'panel_main' }]);
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // Показать баг-репорты
  async showBugReports(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const bugReportStats = await this.adminService.getBugReportStats();
      
      let reportsText = this.localizationService.getText(userLanguage, 'admin_bug_reports_title');
      
      // Статистика по статусам
      reportsText += '\n\n📊 *Статистика:*\n';
      bugReportStats.stats.forEach(stat => {
        const statusText = this.localizationService.getText(userLanguage, `bug_report_status_${stat.status}`);
        reportsText += `${statusText}: ${stat.count}\n`;
      });

      // Последние репорты
      if (bugReportStats.recentReports.length > 0) {
        reportsText += '\n📝 *Новые репорты:*\n';
        bugReportStats.recentReports.slice(0, 5).forEach((report, index) => {
          const reportText = report.report_text.length > 50
            ? report.report_text.substring(0, 47) + '...'
            : report.report_text;
          // Текст репорта — пользовательский ввод: без экранирования Markdown сообщение не отправится
          reportsText += `${index + 1}. ID:${report.id} - ${this.formatter.escapeMarkdown(reportText)}\n`;
        });
      }

      const keyboard = [
        [
          { text: '📝 Все репорты', callback_data: 'panel_all_bug_reports' },
          { text: '🆕 Новые', callback_data: 'panel_new_bug_reports' }
        ],
        [{ text: '🔙 Назад', callback_data: 'panel_main' }]
      ];

      await ctx.reply(reportsText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      logger.error('Error showing bug reports:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.reply(errorText);
    }
  }

  // Список баг-репортов (status = 'new' — только новые). Простой текст: текст репорта — пользовательский ввод
  async showBugReportList(ctx, status = null) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const t = (key, params) => this.localizationService.getText(userLanguage, key, params);

    try {
      const limit = 10;
      const reports = await this.adminService.listBugReports(status, limit);
      const timezone = await this.userService.getUserTimezone(userId);

      let text = t(status === 'new' ? 'admin_bug_reports_new_title' : 'admin_bug_reports_all_title', { count: limit });
      if (reports.length === 0) {
        text += `\n\n${t('admin_bug_reports_empty')}`;
      }
      reports.forEach(report => {
        const author = report.username ? `@${report.username}` : (report.first_name || '');
        // До 300 символов на репорт: 10 репортов укладываются в лимит сообщения 4096
        const chars = Array.from(report.report_text);
        const body = chars.length > 300 ? `${chars.slice(0, 300).join('')}…` : report.report_text;
        text += `\n\n#${report.id} · ${t(`bug_report_status_${report.status}`)} · ${this.formatter.formatDate(report.created_at, timezone)} · ${author} (${report.user_id})\n${body}`;
      });

      const keyboard = [
        [
          { text: '📝 Все репорты', callback_data: 'panel_all_bug_reports' },
          { text: '🆕 Новые', callback_data: 'panel_new_bug_reports' }
        ],
        [{ text: '🔙 Назад', callback_data: 'panel_bug_reports' }]
      ];

      await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard } });
    } catch (error) {
      logger.error('Error showing bug report list:', error);
      await ctx.reply(t('admin_error'));
    }
  }

  // Показать статистику премиума
  async showPremiumStats(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const premiumStats = await this.adminService.getPremiumStats();
      
      let premiumText = this.localizationService.getText(userLanguage, 'admin_premium_stats', {
        totalPremiumUsers: premiumStats.totalPremiumUsers,
        activePremiumUsers: premiumStats.activePremiumUsers,
        totalTransactions: premiumStats.totalTransactions,
        totalRevenue: premiumStats.totalRevenue
      });
      const familyLine = await this.familyPremiumStatsLine();
      if (familyLine) premiumText += `\n\n${familyLine}`;

      const keyboard = [
        [{ text: '🔙 Назад', callback_data: 'panel_main' }]
      ];

      await ctx.reply(premiumText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      logger.error('Error showing premium stats:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.reply(errorText);
    }
  }

  // Показать донаты
  async showDonations(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const donationStats = await this.adminService.getDonationStats();
      
      const donationsText = this.localizationService.getText(userLanguage, 'admin_donations_text', {
        totalDonations: donationStats.totalDonations,
        completedDonations: donationStats.completedDonations,
        pendingDonations: donationStats.pendingDonations,
        totalStars: donationStats.totalStars,
        avgStars: donationStats.avgStars.toFixed(1)
      });

      const keyboard = [
        [{ text: '🔙 Назад', callback_data: 'panel_main' }]
      ];

      await ctx.reply(donationsText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      logger.error('Error showing donations:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.reply(errorText);
    }
  }

  // Показать админов
  async showAdmins(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const admins = await this.adminService.getAllAdmins();
      
      let adminsText = this.localizationService.getText(userLanguage, 'admin_admins_title', {
        count: admins.length
      });

      admins.forEach((admin, index) => {
        const firstName = this.formatter.escapeMarkdown(admin.first_name || 'N/A');
        const username = this.formatter.escapeMarkdown(admin.username || 'N/A');
        adminsText += `\n${index + 1}. ${firstName} (@${username}) - ID: ${admin.id}`;
      });

      const keyboard = [
        [{ text: '🔙 Назад', callback_data: 'panel_main' }]
      ];

      await ctx.reply(adminsText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      logger.error('Error showing admins:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.reply(errorText);
    }
  }

  // Поиск пользователя
  async initiateSearch(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    
    // Устанавливаем состояние поиска
    this.stateService.setUserState(userId, 'admin_search');
    
    const searchPromptText = this.localizationService.getText(userLanguage, 'admin_search_prompt');
    const keyboard = [
      [{ text: '🔙 Назад', callback_data: 'panel_main' }]
    ];

    await ctx.reply(searchPromptText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Код вида платежа из callback_data (p / g / d) → premium / group_pass / donation
  paymentKind(code) {
    return KIND_BY_CODE[code] || null;
  }

  // Подпись платежа: что куплено (премиум / семейный тариф N дн., автопродление; пропуск группы; пожертвование)
  paymentLabel(payment) {
    if (payment.kind === 'donation') return 'пожертвование';
    if (payment.kind === 'group_pass') return `пропуск группы ${payment.days} дн.`;
    return `${payment.family ? 'семейный тариф' : 'премиум'} ${payment.days} дн.${payment.recurring ? ', автопродление' : ''}`;
  }

  paymentWho(payment) {
    return payment.username ? `@${payment.username}` : (payment.firstName || String(payment.userId));
  }

  // Дата (и время) платежа в поясе админа
  async paymentDate(adminId, date, withTime = false) {
    const timeZone = await this.userService.getUserTimezone(adminId);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone, day: '2-digit', month: '2-digit', year: withTime ? 'numeric' : '2-digit', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
    }).format(new Date(date));
  }

  // «🧾 Платежи»: все платежи звёздами (или одного пользователя), новые сверху, по 10; кнопка платежа → карточка.
  // targetUserId 0 — все пользователи
  async showPayments(ctx, targetUserId = 0, page = 1) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    try {
      const list = await this.adminService.listPayments({ userId: targetUserId || null, page });
      await this.replyPaymentList(ctx, list, {
        title: targetUserId ? `🧾 Платежи пользователя ${targetUserId}: ${list.total}` : `🧾 Платежи звёздами: ${list.total}`,
        targetUserId,
        pageCallback: (p) => `panel_pays_${targetUserId}_${p}`
      });
    } catch (error) {
      logger.error('Error showing payments:', error);
      await ctx.reply(this.localizationService.getText(await this.userService.getUserLanguage(ctx.from.id), 'admin_error'));
    }
  }

  async replyPaymentList(ctx, list, { title, targetUserId, pageCallback = null }) {
    const adminId = ctx.from.id;
    const keyboard = [];
    for (const p of list.items) {
      const date = await this.paymentDate(adminId, p.at);
      const refunded = p.status === 'refunded' ? ' · ↩️' : '';
      keyboard.push([{ text: `${date} · ${this.paymentWho(p)} · ${p.stars}⭐ · ${this.paymentLabel(p)}${refunded}`, callback_data: `panel_pay_${KIND_CODE[p.kind]}_${p.id}` }]);
    }
    if (pageCallback && list.totalPages > 1) {
      const nav = [];
      if (list.page > 1) nav.push({ text: '◀️', callback_data: pageCallback(list.page - 1) });
      nav.push({ text: `${list.page} / ${list.totalPages}`, callback_data: pageCallback(list.page) });
      if (list.page < list.totalPages) nav.push({ text: '▶️', callback_data: pageCallback(list.page + 1) });
      keyboard.push(nav);
    }
    keyboard.push([{ text: '🔎 Найти по куску кода платежа', callback_data: `panel_pay_search_${targetUserId}` }]);
    keyboard.push([{ text: '🔙 Назад', callback_data: targetUserId ? `panel_user_${targetUserId}` : 'panel_main' }]);
    const text = list.items.length ? `${title}\n\nНажми на платёж — откроется код и возврат.` : `${title}\n\nПлатежей нет.`;
    await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard } });
  }

  // Карточка платежа: кто, когда, что, статус, полный код (моноширинный — копируется касанием) и «↩️ Вернуть»
  async showPayment(ctx, kind, id) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const payment = await this.adminService.getPayment(kind, id);
    if (!payment) {
      await ctx.reply('❌ Платёж не найден.');
      return;
    }
    const who = this.formatter.escapeMarkdown(`${payment.firstName || ''}${payment.username ? ` (@${payment.username})` : ''}`.trim() || String(payment.userId));
    const lines = [
      `🧾 *Платёж: ${payment.stars} ⭐*`,
      `Что: ${this.formatter.escapeMarkdown(this.paymentLabel(payment))}`,
      `Кто: ${who}, ID ${payment.userId}`,
      `Когда: ${await this.paymentDate(ctx.from.id, payment.at, true)}`,
      `Статус: ${payment.status === 'refunded' ? '↩️ возвращён' : '✅ оплачен'}`,
      '',
      `Код: \`${payment.chargeId}\``
    ];
    const keyboard = [];
    if (payment.status !== 'refunded') {
      keyboard.push([{ text: `↩️ Вернуть ${payment.stars} ⭐`, callback_data: `panel_payref_${KIND_CODE[kind]}_${id}` }]);
    }
    keyboard.push([{ text: '👤 Пользователь', callback_data: `panel_user_${payment.userId}` }, { text: '🧾 Его платежи', callback_data: `panel_pays_${payment.userId}_1` }]);
    keyboard.push([{ text: '🔙 Все платежи', callback_data: 'panel_pays_0_1' }]);
    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // Подтверждение возврата
  async askRefund(ctx, kind, id) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const payment = await this.adminService.getPayment(kind, id);
    if (!payment || payment.status === 'refunded') {
      await ctx.reply(payment ? '↩️ Этот платёж уже возвращён.' : '❌ Платёж не найден.');
      return;
    }
    const effect = payment.kind === 'donation' ? 'Пожертвование пометится возвращённым.'
      : payment.kind === 'group_pass' ? 'Срок пропуска группы уменьшится.'
        : `Премиум по этому платежу снимется${payment.recurring ? ', автопродление отменится' : ''}.`;
    await ctx.reply(`Вернуть ${payment.stars} ⭐ пользователю ${this.paymentWho(payment)} (${this.paymentLabel(payment)})?\n${effect}`, {
      reply_markup: { inline_keyboard: [
        [{ text: `✅ Да, вернуть ${payment.stars} ⭐`, callback_data: `panel_payrefx_${KIND_CODE[kind]}_${id}` }],
        [{ text: '🔙 Отмена', callback_data: `panel_pay_${KIND_CODE[kind]}_${id}` }]
      ] }
    });
  }

  // Звёзды возвращаются пользователю; премиум по этому платежу снимается, подписка (если платёж по ней) отменяется.
  // Telegram затем пришлёт refunded_payment — повторный revokeRefundedPayment ничего не изменит.
  async executeRefund(ctx, kind, id) {
    if (!(await this.checkAdminAccess(ctx))) return;
    const payment = await this.adminService.getPayment(kind, id);
    if (!payment || payment.status === 'refunded') {
      await ctx.answerCbQuery(payment ? 'Этот платёж уже возвращён' : 'Платёж не найден', { show_alert: true });
      return;
    }
    try {
      await this.paymentService.refundStarsPayment(payment.userId, payment.chargeId);
      const result = await this.paymentService.revokeRefundedPayment(payment.chargeId);
      const until = result.type === 'donation' ? 'пожертвование помечено возвращённым'
        : result.type === 'group_pass' ? 'срок пропуска группы уменьшен'
          : (result.premiumUntil ? `премиум до ${this.formatter.formatDate(result.premiumUntil)}` : 'премиум снят');
      await ctx.answerCbQuery(`✅ Возврат выполнен, ${until}`, { show_alert: true });
      await this.showPayment(ctx, kind, id);
    } catch (error) {
      logger.error('Admin refund failed', { userId: payment.userId, chargeId: payment.chargeId, error: error.message });
      await ctx.answerCbQuery(`❌ Ошибка возврата: ${error.message}`.slice(0, 190), { show_alert: true });
    }
  }

  // Поиск платежа по куску кода (telegram_payment_charge_id): у всех или у одного пользователя
  async initiatePaymentSearch(ctx, targetUserId = 0) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    this.stateService.setUserState(ctx.from.id, `admin_pay_search:${targetUserId}`);
    await ctx.reply(`🔎 Пришли кусок кода платежа — хотя бы ${AdminService.PAYMENT_FRAGMENT_MIN} символа, из начала, середины или конца:`, {
      reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: `panel_pays_${targetUserId}_1` }]] }
    });
  }

  async handlePaymentSearchInput(ctx, text) {
    if (!(await this.checkAdminAccess(ctx))) return;
    const adminId = ctx.from.id;
    const state = this.stateService.getUserState(adminId);
    if (typeof state !== 'string' || !state.startsWith('admin_pay_search:')) return;
    const targetUserId = parseInt(state.split(':')[1], 10) || 0;
    const fragment = String(text || '').trim();
    if (fragment.length < AdminService.PAYMENT_FRAGMENT_MIN) {
      await ctx.reply(`Нужно хотя бы ${AdminService.PAYMENT_FRAGMENT_MIN} символа — пришли кусок подлиннее.`);
      return;
    }
    this.stateService.deleteUserState(adminId);
    const list = await this.adminService.listPayments({ userId: targetUserId || null, fragment, pageSize: 20 });
    if (list.total === 1) {
      await this.showPayment(ctx, list.items[0].kind, list.items[0].id);
      return;
    }
    await this.replyPaymentList(ctx, list, { title: `🔎 Платежи с «${fragment}» в коде: ${list.total}${list.total > 20 ? ' (показаны 20 новых)' : ''}`, targetUserId });
  }

  // Обработка поискового запроса
  async handleSearch(ctx, searchQuery) {
    if (!(await this.checkAdminAccess(ctx))) return;

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const users = await this.adminService.searchUsers(searchQuery);
      
      if (users.length === 0) {
        const notFoundText = this.localizationService.getText(userLanguage, 'admin_search_not_found');
        await ctx.reply(notFoundText);
        return;
      }

      let resultsText = this.localizationService.getText(userLanguage, 'admin_search_results', {
        query: this.formatter.escapeMarkdown(searchQuery),
        count: users.length
      });

      users.forEach((user, index) => {
        const adminFlag = user.is_admin ? '👑' : '';
        const premiumFlag = user.premium ? '⭐' : '';
        const firstName = this.formatter.escapeMarkdown(user.first_name || 'N/A');
        const username = this.formatter.escapeMarkdown(user.username || 'N/A');
        resultsText += `\n${index + 1}. ${adminFlag}${premiumFlag} ${firstName} (@${username}) - ID: ${user.id}`;
      });

      const keyboard = users.map(user => [
        { text: `👤 ${user.first_name || user.username || user.id}`, callback_data: `panel_user_${user.id}` }
      ]);
      
      keyboard.push([{ text: '🔙 Назад', callback_data: 'panel_main' }]);

      await ctx.reply(resultsText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      logger.error('Error in admin search:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.reply(errorText);
    }
  }

  // Показать детали пользователя
  async showUserDetails(ctx, targetUserId) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const userDetails = await this.adminService.getUserDetails(targetUserId);
      
      if (!userDetails) {
        const notFoundText = this.localizationService.getText(userLanguage, 'admin_user_not_found');
        await ctx.reply(notFoundText);
        return;
      }

      const user = userDetails.user;
      const adminFlag = user.is_admin ? '👑' : '';
      const premiumFlag = user.premium ? '⭐' : '';
      
      const userDetailsText = this.localizationService.getText(userLanguage, 'admin_user_details', {
        adminFlag,
        premiumFlag,
        firstName: this.formatter.escapeMarkdown(user.first_name || 'N/A'),
        username: this.formatter.escapeMarkdown(user.username || 'N/A'),
        userId: user.id,
        language: user.language,
        currency: user.currency,
        timezone: this.formatter.escapeMarkdown(getTimezoneDisplayName(user.timezone)),
        createdAt: userDetails.registeredAt
          ? this.formatter.formatDate(userDetails.registeredAt, await this.userService.getUserTimezone(userId))
          : 'N/A',
        totalExpenses: userDetails.expenseStats.totalExpenses,
        totalAmount: this.formatter.formatAmount(userDetails.expenseStats.totalAmount),
        bugReportsCount: userDetails.recentBugReports.length,
        transactionsCount: userDetails.recentTransactions.length
      });

      const keyboard = [];
      
      // Действия с пользователем
      const actionsRow = [];
      if (!user.is_admin) {
        actionsRow.push({ text: '👑 Сделать админом', callback_data: `panel_promote_${targetUserId}` });
      } else if (user.id !== userId) {
        actionsRow.push({ text: '📉 Убрать админа', callback_data: `panel_demote_${targetUserId}` });
      }
      
      // Кнопка премиума
      if (user.premium) {
        actionsRow.push({ text: '❌ Убрать премиум', callback_data: `panel_revoke_premium_${targetUserId}` });
      } else {
        actionsRow.push({ text: '⭐ Дать премиум', callback_data: `panel_grant_premium_${targetUserId}` });
      }
      
      if (actionsRow.length > 0) {
        keyboard.push(actionsRow);
      }

      keyboard.push([{ text: '🧾 Платежи и возвраты', callback_data: `panel_pays_${targetUserId}_1` }]);

      keyboard.push([{ text: '🔙 Назад', callback_data: 'panel_main' }]);

      await ctx.reply(userDetailsText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      logger.error('Error showing user details:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.reply(errorText);
    }
  }

  // Назначить администратора
  async promoteUser(ctx, targetUserId) {
    if (!(await this.checkAdminAccess(ctx))) return;

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      await this.adminService.promoteToAdmin(targetUserId, userId);
      
      const successText = this.localizationService.getText(userLanguage, 'admin_promote_success', {
        userId: targetUserId
      });
      
      // Отправляем уведомление
      await ctx.answerCbQuery(successText);
      
      // Обновляем детали пользователя
      await this.showUserDetails(ctx, targetUserId);
      
    } catch (error) {
      logger.error('Error promoting user:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.answerCbQuery(errorText);
    }
  }

  // Убрать права администратора
  async demoteUser(ctx, targetUserId) {
    if (!(await this.checkAdminAccess(ctx))) return;

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      await this.adminService.demoteFromAdmin(targetUserId, userId);
      
      const successText = this.localizationService.getText(userLanguage, 'admin_demote_success', {
        userId: targetUserId
      });
      
      // Отправляем уведомление
      await ctx.answerCbQuery(successText);
      
      // Обновляем детали пользователя
      await this.showUserDetails(ctx, targetUserId);
      
    } catch (error) {
      if (error.message === 'Cannot remove admin rights from yourself') {
        const errorText = this.localizationService.getText(userLanguage, 'admin_cannot_demote_self');
        await ctx.answerCbQuery(errorText);
      } else {
        logger.error('Error demoting user:', error);
        const errorText = this.localizationService.getText(userLanguage, 'admin_error');
        await ctx.answerCbQuery(errorText);
      }
    }
  }

  // Показать варианты премиум периодов
  async showGrantPremiumOptions(ctx, targetUserId) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    const premiumOptionsText = this.localizationService.getText(userLanguage, 'admin_grant_premium_options', { userId: targetUserId });
    
    const keyboard = [
      [
        { text: '1 день', callback_data: `panel_grant_premium_days_${targetUserId}_1` },
        { text: '7 дней', callback_data: `panel_grant_premium_days_${targetUserId}_7` },
        { text: '14 дней', callback_data: `panel_grant_premium_days_${targetUserId}_14` }
      ],
      [
        { text: '30 дней', callback_data: `panel_grant_premium_days_${targetUserId}_30` },
        { text: '90 дней', callback_data: `panel_grant_premium_days_${targetUserId}_90` },
        { text: '180 дней', callback_data: `panel_grant_premium_days_${targetUserId}_180` }
      ],
      [
        { text: '1 год', callback_data: `panel_grant_premium_days_${targetUserId}_365` }
      ],
      [
        { text: '🔙 Назад', callback_data: `panel_user_${targetUserId}` }
      ]
    ];

    await ctx.editMessageText(premiumOptionsText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Выдать премиум на определенный период
  async grantPremium(ctx, targetUserId, days) {
    if (!(await this.checkAdminAccess(ctx))) return;

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      await this.adminService.grantPremium(targetUserId, days, userId);
      
      const successText = this.localizationService.getText(userLanguage, 'admin_grant_premium_success', {
        userId: targetUserId,
        days: days
      });
      
      // Отправляем уведомление
      await ctx.answerCbQuery(successText);
      
      // Обновляем детали пользователя
      await this.showUserDetails(ctx, targetUserId);
      
    } catch (error) {
      logger.error('Error granting premium:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.answerCbQuery(errorText);
    }
  }

  // Убрать премиум
  async revokePremium(ctx, targetUserId) {
    if (!(await this.checkAdminAccess(ctx))) return;

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      await this.adminService.revokePremium(targetUserId, userId);
      // Иначе следующее продление подписки Stars снова включит премиум
      await this.paymentService.cancelActiveSubscription(targetUserId);
      
      const successText = this.localizationService.getText(userLanguage, 'admin_revoke_premium_success', {
        userId: targetUserId
      });
      
      // Отправляем уведомление
      await ctx.answerCbQuery(successText);
      
      // Обновляем детали пользователя
      await this.showUserDetails(ctx, targetUserId);
      
    } catch (error) {
      logger.error('Error revoking premium:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.answerCbQuery(errorText);
    }
  }

  // Инициировать массовое уведомление
  async initiateBroadcast(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    // Устанавливаем состояние для ввода сообщения
    this.stateService.setUserState(userId, 'admin_broadcast');

    const broadcastPromptText = this.localizationService.getText(userLanguage, 'admin_broadcast_prompt');
    const keyboard = [
      [{ text: '🔙 Назад', callback_data: 'panel_main' }]
    ];

    await ctx.reply(broadcastPromptText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Обработка и отправка массового уведомления
  async handleBroadcast(ctx, messageText) {
    if (!(await this.checkAdminAccess(ctx))) return;

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      // Валидация длины сообщения
      if (messageText.length > 3600) {
        const errorText = this.localizationService.getText(userLanguage, 'admin_broadcast_too_long', {
          current: messageText.length,
          max: 3600,
          excess: messageText.length - 3600
        });
        await ctx.reply(errorText);
        return;
      }

      // Сохраняем сообщение в состоянии пользователя
      this.stateService.setUserState(userId, { 
        type: 'admin_broadcast_confirm', 
        data: { message: messageText } 
      });

      // Подтверждение отправки — простым текстом, как уйдёт и сама рассылка:
      // обрезка превью не может разорвать разметку, а «_» в тексте не ломает сообщение
      const chars = Array.from(messageText);
      const confirmText = this.localizationService.getText(userLanguage, 'admin_broadcast_confirm', {
        message: chars.length > 200 ? chars.slice(0, 200).join('') + '...' : messageText,
        length: messageText.length
      });

      const keyboard = [
        [
          { text: '✅ Отправить всем', callback_data: 'panel_broadcast_confirm' },
          { text: '❌ Отмена', callback_data: 'panel_main' }
        ]
      ];

      await ctx.reply(confirmText, {
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      logger.error('Error handling broadcast:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.reply(errorText);
    }
  }

  // Подтверждение и отправка массового уведомления
  async confirmBroadcast(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      // Получаем сообщение из состояния пользователя
      const userState = this.stateService.getUserState(userId);
      if (!userState || userState.type !== 'admin_broadcast_confirm' || !userState.data.message) {
        const errorText = this.localizationService.getText(userLanguage, 'admin_error');
        await ctx.answerCbQuery(errorText);
        return;
      }

      const messageText = userState.data.message;
      
      // Очищаем состояние
      this.stateService.deleteUserState(userId);

      // Отправляем уведомление о начале рассылки
      const startText = this.localizationService.getText(userLanguage, 'admin_broadcast_started');
      await ctx.answerCbQuery(startText);

      // Запускаем процесс рассылки
      const result = await this.adminService.sendBroadcastMessage(messageText, userId);

      // Отправляем результат
      const resultText = this.localizationService.getText(userLanguage, 'admin_broadcast_result', {
        total: result.total,
        sent: result.sent,
        failed: result.failed
      });

      await ctx.reply(resultText, { parse_mode: 'Markdown' });

    } catch (error) {
      logger.error('Error confirming broadcast:', error);
      const errorText = this.localizationService.getText(userLanguage, 'admin_error');
      await ctx.answerCbQuery(errorText);
    }
  }
}

module.exports = AdminHandlers;
