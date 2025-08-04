const logger = require('../utils/logger');

class FamilyService {
  constructor(familyRepository, familyInvitationRepository, userRepository, expenseRepository, notificationService) {
    this.familyRepository = familyRepository;
    this.familyInvitationRepository = familyInvitationRepository;
    this.userRepository = userRepository;
    this.expenseRepository = expenseRepository;
    this.notificationService = notificationService;
  }

  async createFamily(ownerId, name) {
    try {
      // Проверяем, не является ли пользователь уже владельцем семьи
      const existingFamily = await this.familyRepository.getFamilyByOwnerId(ownerId);
      if (existingFamily) {
        throw new Error('User already owns a family');
      }

      // Проверяем, не является ли пользователь уже членом другой семьи
      const userFamily = await this.familyRepository.getUserFamily(ownerId);
      if (userFamily) {
        throw new Error('User is already a member of a family');
      }

      const family = await this.familyRepository.createFamily(ownerId, name);
      
      logger.info('Family service: family created', {
        familyId: family.id,
        name: family.name,
        ownerId: family.owner_id
      });

      return family;
    } catch (error) {
      logger.error('Family service: failed to create family', {
        ownerId,
        name,
        error: error.message
      });
      throw error;
    }
  }

  async getUserFamily(userId) {
    try {
      const family = await this.familyRepository.getUserFamily(userId);
      
      if (family) {
        logger.debug('Family service: user family found', {
          userId,
          familyId: family.id,
          familyName: family.name,
          isOwner: family.owner_id === userId
        });
      }
      
      return family;
    } catch (error) {
      logger.error('Family service: failed to get user family', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  async leaveFamily(userId) {
    try {
      const userFamily = await this.familyRepository.getUserFamily(userId);
      if (!userFamily) {
        throw new Error('User is not a member of any family');
      }

      // Проверяем, не является ли пользователь владельцем семьи
      if (userFamily.owner_id === userId) {
        throw new Error('Family owner cannot leave family. Use delete family instead.');
      }

      await this.familyRepository.removeMemberFromFamily(userFamily.id, userId);
      
      logger.info('Family service: user left family', {
        userId,
        familyId: userFamily.id,
        familyName: userFamily.name
      });

      return userFamily;
    } catch (error) {
      logger.error('Family service: failed to leave family', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  async deleteFamily(userId) {
    try {
      const userFamily = await this.familyRepository.getUserFamily(userId);
      if (!userFamily) {
        throw new Error('User is not a member of any family');
      }

      // Проверяем, является ли пользователь владельцем семьи
      if (userFamily.owner_id !== userId) {
        throw new Error('Only family owner can delete family');
      }

      // Конвертируем семейные траты в личные
      await this.familyRepository.convertFamilyExpensesToPersonal(userFamily.id);
      
      // Удаляем семью
      await this.familyRepository.deleteFamily(userFamily.id);
      
      logger.info('Family service: family deleted', {
        userId,
        familyId: userFamily.id,
        familyName: userFamily.name
      });

      return userFamily;
    } catch (error) {
      logger.error('Family service: failed to delete family', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  async createInvitation(inviterId, inviteeUsername) {
    try {
      // Проверяем, что приглашающий является владельцем семьи
      const userFamily = await this.familyRepository.getUserFamily(inviterId);
      if (!userFamily) {
        throw new Error('User is not a member of any family');
      }

      if (userFamily.owner_id !== inviterId) {
        throw new Error('Only family owner can invite members');
      }

      // Находим пользователя по username
      const invitee = await this.userRepository.getUserByUsername(inviteeUsername);
      if (!invitee) {
        throw new Error('User not found');
      }

      // Проверяем премиум-статус приглашаемого
      const isPremium = await this.userRepository.getUserPremium(invitee.id);
      if (!isPremium) {
        throw new Error('User does not have premium status');
      }

      // Проверяем, не является ли приглашаемый уже членом семьи
      const inviteeFamily = await this.familyRepository.getUserFamily(invitee.id);
      if (inviteeFamily) {
        if (inviteeFamily.id === userFamily.id) {
          throw new Error('User is already a member of your family');
        } else {
          throw new Error('User is already a member of another family');
        }
      }

      // Проверяем, нет ли уже активного приглашения
      const hasPending = await this.familyInvitationRepository.hasPendingInvitation(invitee.id, userFamily.id);
      if (hasPending) {
        throw new Error('User already has a pending invitation');
      }

      const invitation = await this.familyInvitationRepository.createInvitation(
        userFamily.id,
        inviterId,
        invitee.id
      );

      // Отправляем уведомление приглашаемому
      const inviterName = await this.userRepository.getUserById(inviterId);
      const inviterDisplayName = inviterName.username || inviterName.first_name || 'Unknown';
      
      if (this.notificationService) {
        await this.notificationService.sendFamilyInvitation(
          invitee.id,
          userFamily.name,
          inviterDisplayName,
          invitation.invite_code
        );
      }

      logger.info('Family service: invitation created', {
        invitationId: invitation.id,
        familyId: userFamily.id,
        inviterId,
        inviteeId: invitee.id,
        inviteCode: invitation.invite_code
      });

      return {
        invitation,
        family: userFamily,
        invitee
      };
    } catch (error) {
      logger.error('Family service: failed to create invitation', {
        inviterId,
        inviteeUsername,
        error: error.message
      });
      throw error;
    }
  }

  async acceptInvitation(userId, inviteCode) {
    try {
      const invitation = await this.familyInvitationRepository.getInvitationByCode(inviteCode);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (Number(invitation.invitee_id) !== userId) {
        throw new Error('Invalid invitation code');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Invitation is not pending');
      }

      if (new Date() > new Date(invitation.expires_at_utc)) {
        throw new Error('Invitation has expired');
      }

      // Проверяем, не является ли пользователь уже членом семьи
      const userFamily = await this.familyRepository.getUserFamily(userId);
      if (userFamily) {
        throw new Error('User is already a member of a family');
      }

      // Добавляем пользователя в семью
      await this.familyRepository.addMemberToFamily(invitation.family_id, userId);
      
      // Обновляем статус приглашения
      await this.familyInvitationRepository.updateInvitationStatusByCode(inviteCode, 'accepted');

      const family = await this.familyRepository.getFamilyById(invitation.family_id);

      logger.info('Family service: invitation accepted', {
        invitationId: invitation.id,
        familyId: family.id,
        userId,
        familyName: family.name
      });

      return { family, invitation };
    } catch (error) {
      logger.error('Family service: failed to accept invitation', {
        userId,
        inviteCode,
        error: error.message
      });
      throw error;
    }
  }

  async rejectInvitation(userId, inviteCode) {
    try {
      const invitation = await this.familyInvitationRepository.getInvitationByCode(inviteCode);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (Number(invitation.invitee_id) !== userId) {
        throw new Error('Invalid invitation code');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Invitation is not pending');
      }

      await this.familyInvitationRepository.updateInvitationStatusByCode(inviteCode, 'rejected');

      logger.info('Family service: invitation rejected', {
        invitationId: invitation.id,
        familyId: invitation.family_id,
        userId
      });

      return invitation;
    } catch (error) {
      logger.error('Family service: failed to reject invitation', {
        userId,
        inviteCode,
        error: error.message
      });
      throw error;
    }
  }

  async removeMemberFromFamily(ownerId, memberId) {
    try {
      // Проверяем, что удаляющий является владельцем семьи
      const userFamily = await this.familyRepository.getUserFamily(ownerId);
      if (!userFamily) {
        throw new Error('User is not a member of any family');
      }

      if (userFamily.owner_id !== ownerId) {
        throw new Error('Only family owner can remove members');
      }

      // Проверяем, что удаляемый является членом семьи
      const isMember = await this.familyRepository.isUserInFamily(memberId, userFamily.id);
      if (!isMember) {
        throw new Error('User is not a member of this family');
      }

      // Нельзя удалить самого себя
      if (ownerId === memberId) {
        throw new Error('Cannot remove yourself from family');
      }

      await this.familyRepository.removeMemberFromFamily(userFamily.id, memberId);

      // Отправляем уведомление удаляемому участнику
      const ownerName = await this.userRepository.getUserById(ownerId);
      const ownerDisplayName = ownerName.username || ownerName.first_name || 'Unknown';
      
      if (this.notificationService) {
        await this.notificationService.sendFamilyMemberRemoved(
          memberId,
          userFamily.name,
          ownerDisplayName
        );
      }

      logger.info('Family service: member removed from family', {
        ownerId,
        memberId,
        familyId: userFamily.id,
        familyName: userFamily.name
      });

      return userFamily;
    } catch (error) {
      logger.error('Family service: failed to remove member', {
        ownerId,
        memberId,
        error: error.message
      });
      throw error;
    }
  }

  async getFamilyMembersForOwner(ownerId) {
    try {
      const userFamily = await this.familyRepository.getUserFamily(ownerId);
      if (!userFamily) {
        throw new Error('User is not a member of any family');
      }

      if (userFamily.owner_id !== ownerId) {
        throw new Error('Only family owner can view members');
      }

      const members = await this.familyRepository.getFamilyMembers(userFamily.id);

      logger.debug('Family service: family members retrieved', {
        ownerId,
        familyId: userFamily.id,
        membersCount: members.length
      });

      return members;
    } catch (error) {
      logger.error('Family service: failed to get family members', {
        ownerId,
        error: error.message
      });
      throw error;
    }
  }

  async getFamilyStats(familyId, period = 'month', userTimezone = 'UTC') {
    try {
      const total = await this.expenseRepository.getFamilyTotalExpenses(familyId, period, userTimezone);
      const byCategory = await this.expenseRepository.getFamilyExpensesByCategory(familyId, period, userTimezone);
      const expenses = await this.familyRepository.getFamilyExpenses(familyId, 50);

      logger.debug('Family service: family stats retrieved', {
        familyId,
        period,
        total,
        categoriesCount: byCategory.length,
        expensesCount: expenses.length
      });

      return { total, byCategory, expenses };
    } catch (error) {
      logger.error('Family service: failed to get family stats', {
        familyId,
        period,
        error: error.message
      });
      throw error;
    }
  }

  async getFamilyDailyStats(familyId, userTimezone = 'UTC') {
    try {
      const expenses = await this.expenseRepository.getFamilyDailyExpenses(familyId, userTimezone);
      const total = await this.expenseRepository.getFamilyTotalExpenses(familyId, 'day', userTimezone);

      logger.debug('Family service: family daily stats retrieved', {
        familyId,
        total,
        expensesCount: expenses.length
      });

      return { total, expenses };
    } catch (error) {
      logger.error('Family service: failed to get family daily stats', {
        familyId,
        error: error.message
      });
      throw error;
    }
  }

  async getActiveInvitations(familyId) {
    try {
      const invitations = await this.familyInvitationRepository.getActiveInvitationsByFamily(familyId);
      
      logger.debug('Family service: active invitations retrieved', {
        familyId,
        invitationsCount: invitations.length
      });
      
      return invitations;
    } catch (error) {
      logger.error('Family service: failed to get active invitations', {
        familyId,
        error: error.message
      });
      throw error;
    }
  }

  async getAllFamilyExpenses(familyId, limit = 1000) {
    try {
      const expenses = await this.expenseRepository.getFamilyExpenses(familyId, limit);
      
      logger.debug('Family service: all family expenses retrieved', {
        familyId,
        expensesCount: expenses.length
      });
      
      return expenses;
    } catch (error) {
      logger.error('Family service: failed to get all family expenses', {
        familyId,
        error: error.message
      });
      throw error;
    }
  }

  async cancelInvitation(inviterId, inviteCode) {
    try {
      const invitation = await this.familyInvitationRepository.getInvitationByCode(inviteCode);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Проверяем, что отменяет приглашение владелец семьи или тот, кто его создал
      const userFamily = await this.familyRepository.getUserFamily(inviterId);
      if (!userFamily || userFamily.id !== invitation.family_id) {
        throw new Error('Not authorized to cancel this invitation');
      }

      if (userFamily.owner_id !== inviterId && Number(invitation.inviter_id) !== inviterId) {
        throw new Error('Only family owner or invitation creator can cancel invitation');
      }

      await this.familyInvitationRepository.updateInvitationStatusByCode(inviteCode, 'expired');
      
      // Отправляем уведомление приглашаемому об отмене приглашения
      const family = await this.familyRepository.getFamilyById(invitation.family_id);
      const cancellerName = await this.userRepository.getUserById(inviterId);
      const cancellerDisplayName = cancellerName.username || cancellerName.first_name || 'Unknown';
      
      if (this.notificationService) {
        await this.notificationService.sendInvitationCancelled(
          invitation.invitee_id,
          family.name,
          cancellerDisplayName
        );
      }
      
      logger.info('Family service: invitation cancelled', {
        inviterId,
        inviteCode,
        familyId: invitation.family_id
      });

      return invitation;
    } catch (error) {
      logger.error('Family service: failed to cancel invitation', {
        inviterId,
        inviteCode,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = FamilyService; 