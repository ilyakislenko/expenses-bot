const logger = require('../utils/logger');

class AdminService {
  constructor(userService, expenseRepository, bugReportRepository, donationRepository, premiumTransactionRepository, notificationService, localizationService, familyPremiumService = null) {
    this.userService = userService;
    this.expenseRepository = expenseRepository;
    this.bugReportRepository = bugReportRepository;
    this.donationRepository = donationRepository;
    this.premiumTransactionRepository = premiumTransactionRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.familyPremiumService = familyPremiumService;
    this.bot = null; // Для прямого доступа к боту
  }

  setBot(bot) {
    this.bot = bot;
  }

  async isUserAdmin(userId) {
    return this.userService.isUserAdmin(userId);
  }

  // Статистика пользователей
  async getUserStats() {
    const totalUsers = await this.userService.getUsersCount();
    const admins = await this.userService.getAllAdmins();
    
    // Получаем статистику премиум пользователей (premium_expires_at — время Node без пояса, сравниваем с ним же)
    const query = `
      SELECT 
        COUNT(CASE WHEN premium = true AND premium_expires_at > $1 THEN 1 END) as active_premium,
        COUNT(CASE WHEN premium_activated_at IS NOT NULL THEN 1 END) as ever_had_premium,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_last_week,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_last_month
      FROM users
    `;
    
    const result = await this.userService.userRepository.query(query, [new Date()]);
    const stats = result.rows[0];
    
    return {
      totalUsers,
      activePremiumUsers: parseInt(stats.active_premium, 10),
      everHadPremiumUsers: parseInt(stats.ever_had_premium, 10),
      newUsersLastWeek: parseInt(stats.new_last_week, 10),
      newUsersLastMonth: parseInt(stats.new_last_month, 10),
      adminsCount: admins.length,
      admins
    };
  }

  // Статистика расходов
  async getExpenseStats() {
    const query = `
      SELECT 
        COUNT(*) as total_expenses,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN created_at_utc >= NOW() - INTERVAL '7 days' THEN 1 END) as expenses_last_week,
        COUNT(CASE WHEN created_at_utc >= NOW() - INTERVAL '30 days' THEN 1 END) as expenses_last_month,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(CASE WHEN family_id IS NOT NULL THEN 1 END) as family_expenses
      FROM expenses
    `;
    
    const result = await this.expenseRepository.query(query);
    const stats = result.rows[0];
    
    return {
      totalExpenses: parseInt(stats.total_expenses, 10),
      totalAmount: parseFloat(stats.total_amount || 0),
      expensesLastWeek: parseInt(stats.expenses_last_week, 10),
      expensesLastMonth: parseInt(stats.expenses_last_month, 10),
      activeUsers: parseInt(stats.active_users, 10),
      familyExpenses: parseInt(stats.family_expenses, 10)
    };
  }

  // Статистика баг-репортов
  async getBugReportStats() {
    const stats = await this.bugReportRepository.getBugReportStats();
    const recentReports = await this.bugReportRepository.getAllBugReports(10, 0, 'new');
    
    return {
      stats,
      recentReports
    };
  }

  // Последние баг-репорты: все или только новые (status = 'new')
  async listBugReports(status = null, limit = 10) {
    return this.bugReportRepository.getAllBugReports(limit, 0, status);
  }

  // Статистика донатов
  async getDonationStats() {
    const query = `
      SELECT 
        COUNT(*) as total_donations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_donations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_donations,
        SUM(CASE WHEN status = 'completed' THEN stars ELSE 0 END) as total_stars,
        AVG(CASE WHEN status = 'completed' THEN stars ELSE NULL END) as avg_stars
      FROM donations
    `;
    
    const result = await this.donationRepository.query(query);
    const stats = result.rows[0];
    
    return {
      totalDonations: parseInt(stats.total_donations, 10),
      completedDonations: parseInt(stats.completed_donations, 10),
      pendingDonations: parseInt(stats.pending_donations, 10),
      totalStars: parseInt(stats.total_stars || 0, 10),
      avgStars: parseFloat(stats.avg_stars || 0)
    };
  }

  // Статистика премиум транзакций
  async getPremiumTransactionStats() {
    return this.userService.getGlobalTransactionStats();
  }

  // Статистика премиума
  async getPremiumStats() {
    const query = `
      SELECT 
        COUNT(CASE WHEN premium = true THEN 1 END) as total_premium_users,
        COUNT(CASE WHEN premium = true AND premium_expires_at > $1 THEN 1 END) as active_premium_users
      FROM users
    `;
    
    const userStatsResult = await this.userService.userRepository.query(query, [new Date()]);
    const userStats = userStatsResult.rows[0];
    
    const transactionStats = await this.premiumTransactionRepository.getTransactionStats();
    
    return {
      totalPremiumUsers: parseInt(userStats.total_premium_users, 10),
      activePremiumUsers: parseInt(userStats.active_premium_users, 10),
      totalTransactions: transactionStats.total_transactions,
      totalRevenue: transactionStats.total_amount || 0
    };
  }

  // Получить всех админов
  async getAllAdmins() {
    return this.userService.getAllAdmins();
  }

  // Поиск пользователей
  async searchUsers(query) {
    const trimmedQuery = query.trim();
    
    // Если это число - поиск по ID
    if (!isNaN(trimmedQuery)) {
      const userId = parseInt(trimmedQuery, 10);
      const user = await this.userService.getUserById(userId);
      return user ? [user] : [];
    }
    
    // Поиск по username без учёта регистра (убираем @ если есть); показываем все совпадения
    const username = trimmedQuery.replace('@', '');
    return this.userService.userRepository.findUsersByUsername(username);
  }

  // Выдать премиум пользователю
  async grantPremium(targetUserId, days, adminUserId) {
    logger.info('Admin granting premium', { adminUserId, targetUserId, days });
    
    const transactionData = {
      stars: 0,
      usd: 0,
      rub: 0,
      telegram_payment_id: null,
      invoice_payload: JSON.stringify({
        user_id: targetUserId,
        tariff: days,
        stars: 0,
        type: 'admin_grant',
        granted_by: adminUserId
      })
    };
    
    await this.userService.activatePremium(targetUserId, days, transactionData);
    logger.info('Premium granted successfully', { adminUserId, targetUserId, days });
  }

  // Убрать премиум у пользователя
  async revokePremium(targetUserId, adminUserId) {
    logger.info('Admin revoking premium', { adminUserId, targetUserId });
    
    await this.userService.deactivatePremium(targetUserId);
    // Вместе с премиумом снят и оплаченный им семейный тариф — участники его семьи теряют премиум сразу
    if (this.familyPremiumService) this.familyPremiumService.planChanged();
    logger.info('Premium revoked successfully', { adminUserId, targetUserId });
  }

  // Семейный тариф в статистике — отдельно от личных покупок
  async getFamilyPremiumStats() {
    return this.familyPremiumService ? this.familyPremiumService.getStats() : null;
  }

  // Отправить массовое уведомление всем пользователям
  async sendBroadcastMessage(messageText, adminUserId) {
    logger.info('Admin initiating broadcast', { adminUserId, messageLength: messageText.length });
    
    // Получаем всех пользователей
    const allUsers = await this.userService.getAllUsersForBroadcast();
    const total = allUsers.length;
    let sent = 0;
    let failed = 0;

    logger.info('Broadcasting to users', { total, adminUserId });

    // Отправляем сообщения с задержкой для избежания лимитов Telegram
    for (const user of allUsers) {
      try {
        // Получаем язык пользователя для локализованного заголовка
        const userLanguage = await this.userService.getUserLanguage(user.id);
        const broadcastHeader = this.localizationService.getText(userLanguage, 'admin_broadcast_header');
        // Текст админа уходит как есть, без parse_mode: один «_» (например, в /daily_summary)
        // в Markdown не дал бы доставить сообщение никому
        const broadcastMessage = `${broadcastHeader}\n\n${messageText}`;

        // Пробуем разные способы отправки
        let messageSent = false;
        
        // Способ 1: NotificationService
        if (this.notificationService && this.notificationService.sendMessage) {
          try {
            await this.notificationService.sendMessage(user.id, broadcastMessage);
            messageSent = true;
          } catch (notificationError) {
            logger.warn('NotificationService failed, trying direct bot access', {
              userId: user.id,
              error: notificationError.message
            });
          }
        }
        
        // Способ 2: Прямой доступ к bot через AdminService
        if (!messageSent && this.bot) {
          try {
            await this.bot.telegram.sendMessage(user.id, broadcastMessage);
            messageSent = true;
          } catch (botError) {
            logger.warn('Direct bot access failed, trying userService bot', {
              userId: user.id,
              error: botError.message
            });
          }
        }
        
        // Способ 3: Fallback через userService (если есть)
        if (!messageSent && this.userService.bot) {
          await this.userService.bot.telegram.sendMessage(user.id, broadcastMessage);
          messageSent = true;
        }
        
        if (messageSent) {
          sent++;
          
          // Добавляем небольшую задержку для избежания rate limits
          if (sent % 30 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          throw new Error('No bot access available');
        }
        
      } catch (error) {
        failed++;
        logger.warn('Failed to send broadcast message to user', { 
          userId: user.id, 
          error: error.message,
          adminUserId 
        });
      }
    }

    logger.info('Broadcast completed', { 
      adminUserId, 
      total, 
      sent, 
      failed,
      messageLength: messageText.length 
    });

    return { total, sent, failed };
  }

  // Управление пользователями
  async getAllUsers(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const users = await this.userService.getAllUsers(limit, offset);
    const totalUsers = await this.userService.getUsersCount();
    const totalPages = Math.ceil(totalUsers / limit);
    
    return {
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit
      }
    };
  }

  // Управление админами
  async promoteToAdmin(targetUserId, adminUserId) {
    logger.info('Admin promotion attempt', {
      targetUserId,
      adminUserId,
      timestamp: new Date().toISOString()
    });

    await this.userService.setUserAdmin(targetUserId, true);
    
    logger.info('User promoted to admin', {
      targetUserId,
      promotedBy: adminUserId,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  async demoteFromAdmin(targetUserId, adminUserId) {
    // Нельзя удалить права администратора у самого себя
    if (targetUserId === adminUserId) {
      throw new Error('Cannot remove admin rights from yourself');
    }

    logger.info('Admin demotion attempt', {
      targetUserId,
      adminUserId,
      timestamp: new Date().toISOString()
    });

    await this.userService.setUserAdmin(targetUserId, false);
    
    logger.info('User demoted from admin', {
      targetUserId,
      demotedBy: adminUserId,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // Управление премиум статусом
  async grantPremium(targetUserId, days, adminUserId) {
    logger.info('Admin premium grant', {
      targetUserId,
      days,
      adminUserId,
      timestamp: new Date().toISOString()
    });

    const transactionData = {
      stars: 0,
      usd: 0,
      rub: 0,
      telegram_payment_id: null,
      invoice_payload: JSON.stringify({
        user_id: targetUserId,
        tariff: days,
        stars: 0,
        type: 'admin_grant',
        granted_by: adminUserId
      })
    };

    const result = await this.userService.activatePremium(targetUserId, days, transactionData);
    
    logger.info('Premium granted by admin', {
      targetUserId,
      days,
      grantedBy: adminUserId,
      newExpiryDate: result.newExpiryDate,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Обновление статуса баг-репорта
  async updateBugReportStatus(reportId, status, adminUserId) {
    logger.info('Bug report status update', {
      reportId,
      status,
      adminUserId,
      timestamp: new Date().toISOString()
    });

    return this.bugReportRepository.updateBugReportStatus(reportId, status);
  }

  // Получение детальной информации о пользователе
  async getUserDetails(userId) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      return null;
    }

    const premiumStatus = await this.userService.getPremiumStatus(userId);
    const transactions = await this.userService.getUserTransactions(userId, 10, 0);
    const bugReports = await this.bugReportRepository.getBugReportsByUserId(userId, 5, 0);
    
    // Статистика расходов пользователя.
    // users.created_at — TIMESTAMP без пояса, заполняется по часам сессии Postgres (UTC);
    // node-pg прочитал бы его как местное время сервера, поэтому переводим в момент времени здесь
    const expenseStatsQuery = `
      SELECT 
        COUNT(*) as total_expenses,
        SUM(amount) as total_amount,
        MIN(created_at_utc) as first_expense,
        MAX(created_at_utc) as last_expense,
        (SELECT created_at AT TIME ZONE 'UTC' FROM users WHERE id = $1) as registered_at
      FROM expenses 
      WHERE user_id = $1
    `;
    
    const expenseStatsResult = await this.expenseRepository.query(expenseStatsQuery, [userId]);
    const expenseStats = expenseStatsResult.rows[0];

    return {
      user,
      premiumStatus,
      registeredAt: expenseStats.registered_at,
      expenseStats: {
        totalExpenses: parseInt(expenseStats.total_expenses, 10),
        totalAmount: parseFloat(expenseStats.total_amount || 0),
        firstExpense: expenseStats.first_expense,
        lastExpense: expenseStats.last_expense
      },
      recentTransactions: transactions,
      recentBugReports: bugReports
    };
  }
}

module.exports = AdminService;
