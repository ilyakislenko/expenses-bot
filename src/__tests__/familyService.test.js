const FamilyService = require('../services/FamilyService');
const { setupTestDatabase, cleanupTestDatabase } = require('./setup');

describe('FamilyService', () => {
  let familyService;
  let testUserId1;
  let testUserId2;
  let testUserId3;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Создаем тестовых пользователей
    const userRepo = require('../repositories/UserRepository');
    const userRepository = new userRepo();
    
    testUserId1 = 123456789;
    testUserId2 = 987654321;
    testUserId3 = 555666777;
    
    await userRepository.createUser(testUserId1, 'testuser1', 'Test User 1');
    await userRepository.createUser(testUserId2, 'testuser2', 'Test User 2');
    await userRepository.createUser(testUserId3, 'testuser3', 'Test User 3');
    
    // Делаем первого пользователя премиум
    await userRepository.setUserPremium(testUserId1, true);
    await userRepository.setUserPremium(testUserId2, true);
    await userRepository.setUserPremium(testUserId3, true);
    
    familyService = new FamilyService();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Очищаем данные перед каждым тестом
    const familyRepo = require('../repositories/FamilyRepository');
    const familyRepository = new familyRepo();
    await familyRepository.query('DELETE FROM family_invitations');
    await familyRepository.query('DELETE FROM family_user');
    await familyRepository.query('DELETE FROM families');
  });

  describe('createFamily', () => {
    it('should create family successfully for premium user', async () => {
      const familyName = 'Test Family';
      const family = await familyService.createFamily(testUserId1, familyName);
      
      expect(family).toBeDefined();
      expect(family.name).toBe(familyName);
      expect(family.owner_id).toBe(testUserId1);
    });

    it('should throw error for non-premium user', async () => {
      // Делаем пользователя не премиум
      const userRepo = require('../repositories/UserRepository');
      const userRepository = new userRepo();
      await userRepository.setUserPremium(testUserId2, false);
      
      await expect(familyService.createFamily(testUserId2, 'Test Family'))
        .rejects.toThrow('Only premium users can create families');
    });

    it('should throw error if user is already in a family', async () => {
      const familyName = 'Test Family';
      await familyService.createFamily(testUserId1, familyName);
      
      await expect(familyService.createFamily(testUserId1, 'Another Family'))
        .rejects.toThrow('User is already a member of a family');
    });
  });

  describe('getUserFamily', () => {
    it('should get user family when user is a member', async () => {
      const familyName = 'Test Family';
      const family = await familyService.createFamily(testUserId1, familyName);
      
      const userFamily = await familyService.getUserFamily(testUserId1);
      
      expect(userFamily).toBeDefined();
      expect(userFamily.name).toBe(familyName);
      expect(userFamily.owner_id).toBe(testUserId1);
    });

    it('should return null when user is not in any family', async () => {
      const userFamily = await familyService.getUserFamily(testUserId2);
      
      expect(userFamily).toBeUndefined();
    });
  });

  describe('leaveFamily', () => {
    it('should allow member to leave family', async () => {
      const familyName = 'Test Family';
      const family = await familyService.createFamily(testUserId1, familyName);
      await familyService.familyRepository.addUserToFamily(family.id, testUserId2);
      
      const result = await familyService.leaveFamily(testUserId2);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(familyName);
      
      const userFamily = await familyService.getUserFamily(testUserId2);
      expect(userFamily).toBeUndefined();
    });

    it('should throw error if owner tries to leave family', async () => {
      const familyName = 'Test Family';
      await familyService.createFamily(testUserId1, familyName);
      
      await expect(familyService.leaveFamily(testUserId1))
        .rejects.toThrow('Family owner cannot leave the family');
    });
  });

  describe('deleteFamily', () => {
    it('should allow owner to delete family', async () => {
      const familyName = 'Test Family';
      const family = await familyService.createFamily(testUserId1, familyName);
      
      const result = await familyService.deleteFamily(testUserId1);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(familyName);
      
      const userFamily = await familyService.getUserFamily(testUserId1);
      expect(userFamily).toBeUndefined();
    });

    it('should throw error if non-owner tries to delete family', async () => {
      const familyName = 'Test Family';
      await familyService.createFamily(testUserId1, familyName);
      
      await expect(familyService.deleteFamily(testUserId2))
        .rejects.toThrow('User is not a family owner');
    });
  });

  describe('createInvitation', () => {
    it('should create invitation successfully', async () => {
      const familyName = 'Test Family';
      const family = await familyService.createFamily(testUserId1, familyName);
      
      const invitation = await familyService.createInvitation(family.id, testUserId1, 'testuser2');
      
      expect(invitation).toBeDefined();
      expect(invitation.family_id).toBe(family.id);
      expect(invitation.inviter_id).toBe(testUserId1);
      expect(invitation.invitee_id).toBe(testUserId2);
      expect(invitation.code).toBeDefined();
    });

    it('should throw error if inviter is not family owner', async () => {
      const familyName = 'Test Family';
      const family = await familyService.createFamily(testUserId1, familyName);
      await familyService.familyRepository.addUserToFamily(family.id, testUserId2);
      
      await expect(familyService.createInvitation(family.id, testUserId2, 'testuser3'))
        .rejects.toThrow('Only family owner can create invitations');
    });

    it('should throw error if invitee is already in a family', async () => {
      const familyName = 'Test Family';
      const family = await familyService.createFamily(testUserId1, familyName);
      await familyService.familyRepository.addUserToFamily(family.id, testUserId2);
      
      await expect(familyService.createInvitation(family.id, testUserId1, 'testuser2'))
        .rejects.toThrow('User is already a member of a family');
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const familyName = 'Test Family';
      const family = await familyService.createFamily(testUserId1, familyName);
      const invitation = await familyService.createInvitation(family.id, testUserId1, 'testuser2');
      
      const result = await familyService.acceptInvitation(testUserId2, invitation.code);
      
      expect(result).toBeDefined();
      expect(result.family).toBeDefined();
      expect(result.family.name).toBe(familyName);
      
      const userFamily = await familyService.getUserFamily(testUserId2);
      expect(userFamily).toBeDefined();
      expect(userFamily.name).toBe(familyName);
    });

    it('should throw error for invalid invitation code', async () => {
      await expect(familyService.acceptInvitation(testUserId2, 'INVALID'))
        .rejects.toThrow('Invitation not found');
    });

    it('should throw error if user is already in a family', async () => {
      const familyName = 'Test Family';
      const family = await familyService.createFamily(testUserId1, familyName);
      const invitation = await familyService.createInvitation(family.id, testUserId1, 'testuser2');
      
      // Добавляем пользователя в другую семью
      await familyService.familyRepository.addUserToFamily(family.id, testUserId2);
      
      await expect(familyService.acceptInvitation(testUserId2, invitation.code))
        .rejects.toThrow('User is already a member of a family');
    });
  });

  describe('rejectInvitation', () => {
    it('should reject invitation successfully', async () => {
      const familyName = 'Test Family';
      const family = await familyService.createFamily(testUserId1, familyName);
      const invitation = await familyService.createInvitation(family.id, testUserId1, 'testuser2');
      
      const result = await familyService.rejectInvitation(testUserId2, invitation.code);
      
      expect(result).toBeDefined();
      expect(result.status).toBe('rejected');
    });

    it('should throw error for invalid invitation code', async () => {
      await expect(familyService.rejectInvitation(testUserId2, 'INVALID'))
        .rejects.toThrow('Invitation not found');
    });
  });
}); 