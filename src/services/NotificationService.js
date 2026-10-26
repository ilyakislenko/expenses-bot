const logger = require('../utils/logger');

class NotificationService {
  constructor(localizationService, userService, formatter) {
    this.bot = null;
    this.localizationService = localizationService;
    this.userService = userService;
    this.formatter = formatter;
  }

  setBot(bot) {
    this.bot = bot;
  }

  async sendFamilyInvitation(inviteeId, familyName, inviterName, inviteCode) {
    try {
      
      if (!this.bot) {
        logger.warn('Bot not available for sending notification', {
          inviteeId,
          familyName,
          inviterName,
          inviteCode
        });
        return;
      }

      // Получаем язык пользователя (по умолчанию русский)
      let userLanguage = await this.userService.getUserLanguage(inviteeId) || 'ru';
      
      // Имя семьи и username из пользовательского ввода: без экранирования Telegram отклонит Markdown
      const message = this.localizationService.getText(userLanguage, 'family_invitation_received', {
        familyName: this.formatter.escapeMarkdown(familyName),
        inviterName: this.formatter.escapeMarkdown(inviterName),
        inviteCode
      });

      const acceptText = this.localizationService.getText(userLanguage, 'accept_invitation');
      const rejectText = this.localizationService.getText(userLanguage, 'reject_invitation');

      await this.bot.telegram.sendMessage(inviteeId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: acceptText, callback_data: `accept_invitation|${inviteCode}` },
              { text: rejectText, callback_data: `reject_invitation|${inviteCode}` }
            ]
          ]
        }
      });

      logger.info('Family invitation notification sent', {
        inviteeId,
        familyName,
        inviterName,
        inviteCode
      });
    } catch (error) {
      logger.error('Failed to send family invitation notification', {
        inviteeId,
        familyName,
        inviterName,
        inviteCode,
        error: error.message
      });
      // Не бросаем ошибку, чтобы не прерывать основной процесс
    }
  }

  async sendFamilyMemberRemoved(userId, familyName) {
    try {
      let userLanguage = await this.userService.getUserLanguage(userId) || 'ru';
      
      const message = this.localizationService.getText(userLanguage, 'family_member_removed_notification', {
        familyName: this.formatter.escapeMarkdown(familyName)
      });

      await this.bot.telegram.sendMessage(userId, message, {
        parse_mode: 'Markdown'
      });

      logger.info('Family member removed notification sent', {
        userId,
        familyName
      });
    } catch (error) {
      logger.error('Failed to send family member removed notification', {
        userId,
        familyName,
        error: error.message
      });
    }
  }

  async sendInvitationCancelled(inviteeId, familyName, cancelledBy) {
    try {
      let userLanguage = await this.userService.getUserLanguage(inviteeId) || 'ru';
      
      const message = this.localizationService.getText(userLanguage, 'invitation_cancelled_notification', {
        familyName: this.formatter.escapeMarkdown(familyName),
        cancelledBy: this.formatter.escapeMarkdown(cancelledBy)
      });

      await this.bot.telegram.sendMessage(inviteeId, message, {
        parse_mode: 'Markdown'
      });

      logger.info('Invitation cancelled notification sent', {
        inviteeId,
        familyName,
        cancelledBy
      });
    } catch (error) {
      logger.error('Failed to send invitation cancelled notification', {
        inviteeId,
        familyName,
        cancelledBy,
        error: error.message
      });
    }
  }

  // Универсальный метод для отправки сообщений
  async sendMessage(userId, text, options = {}) {
    try {
      if (!this.bot) {
        logger.warn('Bot not available for sending message', { userId });
        throw new Error('Bot not available');
      }

      await this.bot.telegram.sendMessage(userId, text, options);
      
      logger.info('Message sent successfully', { userId, textLength: text.length });
    } catch (error) {
      logger.error('Failed to send message', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = NotificationService; 