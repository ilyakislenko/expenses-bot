const logger = require('../utils/logger');

// Функция для экранирования символов Markdown
function escapeMarkdown(text) {
  if (!text) return text;
  return text.toString().replace(/[*_`[\]()~>#+-=|{}.!]/g, '\\$&');
}

class AdminHandlers {
  constructor(adminService, userService, localizationService, formatter, stateService) {
    this.adminService = adminService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
  }

  // Проверка прав администратора
  async checkAdminAccess(ctx) {
    const userId = ctx.from.id;
    const isAdmin = await this.adminService.isUserAdmin(userId);
    
    if (!isAdmin) {
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

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    
    const keyboard = [
      [
        { text: '📊 Статистика', callback_data: 'panel_stats' },
        { text: '👥 Пользователи', callback_data: 'panel_users' }
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
        { text: '🔍 Поиск', callback_data: 'panel_search' },
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

      const statsText = this.localizationService.getText(userLanguage, 'admin_stats_text', {
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

  // Управление пользователями
  async showUsers(ctx, page = 1) {
    if (!(await this.checkAdminAccess(ctx))) return;

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
        const firstName = escapeMarkdown(user.first_name || 'N/A');
        const username = escapeMarkdown(user.username || 'N/A');
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

  // Показать баг-репорты
  async showBugReports(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const bugReportStats = await this.adminService.getBugReportStats();
      
      let reportsText = this.localizationService.getText(userLanguage, 'admin_bug_reports_title');
      
      // Статистика по статусам
      reportsText += '\n\n📊 **Статистика:**\n';
      bugReportStats.stats.forEach(stat => {
        const statusText = this.localizationService.getText(userLanguage, `bug_report_status_${stat.status}`) || stat.status;
        reportsText += `${statusText}: ${stat.count}\n`;
      });

      // Последние репорты
      if (bugReportStats.recentReports.length > 0) {
        reportsText += '\n📝 **Новые репорты:**\n';
        bugReportStats.recentReports.slice(0, 5).forEach((report, index) => {
          const reportText = report.report_text.length > 50 
            ? report.report_text.substring(0, 47) + '...' 
            : report.report_text;
          reportsText += `${index + 1}. ID:${report.id} - ${reportText}\n`;
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

  // Показать статистику премиума
  async showPremiumStats(ctx) {
    if (!(await this.checkAdminAccess(ctx))) return;

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const premiumStats = await this.adminService.getPremiumStats();
      
      const premiumText = this.localizationService.getText(userLanguage, 'admin_premium_stats', {
        totalPremiumUsers: premiumStats.totalPremiumUsers,
        activePremiumUsers: premiumStats.activePremiumUsers,
        totalTransactions: premiumStats.totalTransactions,
        totalRevenue: premiumStats.totalRevenue
      });

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

    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    try {
      const admins = await this.adminService.getAllAdmins();
      
      let adminsText = this.localizationService.getText(userLanguage, 'admin_admins_title', {
        count: admins.length
      });

      admins.forEach((admin, index) => {
        const firstName = escapeMarkdown(admin.first_name || 'N/A');
        const username = escapeMarkdown(admin.username || 'N/A');
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
        query: searchQuery,
        count: users.length
      });

      users.forEach((user, index) => {
        const adminFlag = user.is_admin ? '👑' : '';
        const premiumFlag = user.premium ? '⭐' : '';
        const firstName = escapeMarkdown(user.first_name || 'N/A');
        const username = escapeMarkdown(user.username || 'N/A');
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
        firstName: escapeMarkdown(user.first_name || 'N/A'),
        username: escapeMarkdown(user.username || 'N/A'),
        userId: user.id,
        language: user.language,
        currency: user.currency,
        timezone: user.timezone,
        createdAt: user.created_at ? user.created_at.toLocaleDateString() : 'N/A',
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

      // Подтверждение отправки
      const confirmText = this.localizationService.getText(userLanguage, 'admin_broadcast_confirm', {
        message: messageText.length > 200 ? messageText.substring(0, 200) + '...' : messageText,
        length: messageText.length
      });

      const keyboard = [
        [
          { text: '✅ Отправить всем', callback_data: 'panel_broadcast_confirm' },
          { text: '❌ Отмена', callback_data: 'panel_main' }
        ]
      ];

      await ctx.reply(confirmText, {
        parse_mode: 'Markdown',
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
