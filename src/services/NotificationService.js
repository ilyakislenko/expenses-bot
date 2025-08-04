const logger = require('../utils/logger');

class NotificationService {
  constructor(localizationService) {
    this.bot = null;
    this.localizationService = localizationService;
  }

  setBot(bot) {
    this.bot = bot;
  }

  async sendFamilyInvitation(inviteeId, familyName, inviterName, inviteCode) {
    try {
      console.log('NotificationService.sendFamilyInvitation called:', {
        inviteeId,
        familyName,
        inviterName,
        inviteCode,
        botAvailable: !!this.bot
      });
      
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
      let userLanguage = 'ru';
      
      const message = this.localizationService.getText(userLanguage, 'family_invitation_received', {
        familyName,
        inviterName,
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

  async sendFamilyMemberRemoved(userId, familyName, removedBy) {
    try {
      let userLanguage = 'ru';
      
      const message = this.localizationService.getText(userLanguage, 'family_member_removed_notification', {
        familyName,
        removedBy
      });

      await this.bot.telegram.sendMessage(userId, message, {
        parse_mode: 'Markdown'
      });

      logger.info('Family member removed notification sent', {
        userId,
        familyName,
        removedBy
      });
    } catch (error) {
      logger.error('Failed to send family member removed notification', {
        userId,
        familyName,
        removedBy,
        error: error.message
      });
    }
  }

  async sendInvitationCancelled(inviteeId, familyName, cancelledBy) {
    try {
      let userLanguage = 'ru';
      
      const message = this.localizationService.getText(userLanguage, 'invitation_cancelled_notification', {
        familyName,
        cancelledBy
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
}

module.exports = NotificationService; 