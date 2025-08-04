const BaseRepository = require('./BaseRepository');
const logger = require('../utils/logger');

class FamilyInvitationRepository extends BaseRepository {
  generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createInvitation(familyId, inviterId, inviteeId) {
    const inviteCode = this.generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Приглашение истекает через 24 часа

    const query = `
      INSERT INTO family_invitations (family_id, inviter_id, invitee_id, invite_code, expires_at_utc) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    const result = await this.query(query, [familyId, inviterId, inviteeId, inviteCode, expiresAt]);
    
    logger.info('Family invitation created', {
      invitationId: result.rows[0].id,
      familyId,
      inviterId,
      inviteeId,
      inviteCode,
      expiresAt
    });
    
    return result.rows[0];
  }

  async getInvitationByCode(inviteCode) {
    const query = `
      SELECT fi.*, f.name as family_name, u.username as inviter_username, u.first_name as inviter_first_name
      FROM family_invitations fi
      JOIN families f ON fi.family_id = f.id
      JOIN users u ON fi.inviter_id = u.id
      WHERE fi.invite_code = $1
    `;
    const result = await this.query(query, [inviteCode]);
    return result.rows[0];
  }

  async getPendingInvitationsByInvitee(inviteeId) {
    const query = `
      SELECT fi.*, f.name as family_name, u.username as inviter_username, u.first_name as inviter_first_name
      FROM family_invitations fi
      JOIN families f ON fi.family_id = f.id
      JOIN users u ON fi.inviter_id = u.id
      WHERE fi.invitee_id = $1 AND fi.status = 'pending' AND fi.expires_at_utc > NOW()
      ORDER BY fi.created_at_utc DESC
    `;
    const result = await this.query(query, [inviteeId]);
    return result.rows;
  }

  async updateInvitationStatus(invitationId, status) {
    let updateFields = 'status = $2';
    let params = [invitationId, status];

    if (status === 'accepted') {
      updateFields += ', accepted_at_utc = NOW()';
    } else if (status === 'rejected') {
      updateFields += ', rejected_at_utc = NOW()';
    }

    const query = `
      UPDATE family_invitations 
      SET ${updateFields}
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.query(query, params);
    
    if (result.rows[0]) {
      logger.info('Family invitation status updated', {
        invitationId,
        status,
        familyId: result.rows[0].family_id,
        inviteeId: result.rows[0].invitee_id
      });
    }
    
    return result.rows[0];
  }

  async expireOldInvitations() {
    const query = `
      UPDATE family_invitations 
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at_utc <= NOW()
      RETURNING id
    `;
    const result = await this.query(query);
    
    if (result.rows.length > 0) {
      logger.info('Expired invitations updated', {
        expiredCount: result.rows.length
      });
    }
    
    return result.rows;
  }

  async deleteInvitation(invitationId) {
    const query = `
      DELETE FROM family_invitations 
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.query(query, [invitationId]);
    
    if (result.rows[0]) {
      logger.info('Family invitation deleted', {
        invitationId,
        familyId: result.rows[0].family_id,
        inviteeId: result.rows[0].invitee_id
      });
    }
    
    return result.rows[0];
  }

  async getInvitationsByFamily(familyId) {
    const query = `
      SELECT fi.*, u.username as invitee_username, u.first_name as invitee_first_name
      FROM family_invitations fi
      JOIN users u ON fi.invitee_id = u.id
      WHERE fi.family_id = $1
      ORDER BY fi.created_at_utc DESC
    `;
    const result = await this.query(query, [familyId]);
    return result.rows;
  }

  async hasPendingInvitation(inviteeId, familyId) {
    const query = `
      SELECT COUNT(*) as count
      FROM family_invitations
      WHERE invitee_id = $1 AND family_id = $2 AND status = 'pending' AND expires_at_utc > NOW()
    `;
    const result = await this.query(query, [inviteeId, familyId]);
    return result.rows[0].count > 0;
  }

  async getActiveInvitationsByFamily(familyId) {
    const query = `
      SELECT fi.*, u.username as invitee_username, u.first_name as invitee_first_name
      FROM family_invitations fi
      JOIN users u ON fi.invitee_id = u.id
      WHERE fi.family_id = $1 AND fi.status = 'pending' AND fi.expires_at_utc > NOW()
      ORDER BY fi.created_at_utc DESC
    `;
    const result = await this.query(query, [familyId]);
    return result.rows;
  }

  async updateInvitationStatusByCode(inviteCode, status) {
    let updateFields = 'status = $2';
    let params = [inviteCode, status];

    if (status === 'accepted') {
      updateFields += ', accepted_at_utc = NOW()';
    } else if (status === 'rejected') {
      updateFields += ', rejected_at_utc = NOW()';
    }

    const query = `
      UPDATE family_invitations 
      SET ${updateFields}
      WHERE invite_code = $1
      RETURNING *
    `;
    const result = await this.query(query, params);
    
    if (result.rows[0]) {
      logger.info('Family invitation status updated by code', {
        inviteCode,
        status,
        familyId: result.rows[0].family_id,
        inviteeId: result.rows[0].invitee_id
      });
    }
    
    return result.rows[0];
  }
}

module.exports = FamilyInvitationRepository; 