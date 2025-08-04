const FamilyRepository = require('../repositories/FamilyRepository');
const { setupTestDatabase, cleanupTestDatabase } = require('./setup');

describe('FamilyRepository', () => {
  let familyRepository;
  let testUserId1;
  let testUserId2;
  let testFamilyId;

  beforeAll(async () => {
    await setupTestDatabase();
    familyRepository = new FamilyRepository();
    
    // Создаем тестовых пользователей
    const userRepo = require('../repositories/UserRepository');
    const userRepository = new userRepo();
    
    testUserId1 = 123456789;
    testUserId2 = 987654321;
    
    await userRepository.createUser(testUserId1, 'testuser1', 'Test User 1');
    await userRepository.createUser(testUserId2, 'testuser2', 'Test User 2');
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Очищаем данные перед каждым тестом
    await familyRepository.query('DELETE FROM family_user');
    await familyRepository.query('DELETE FROM families');
  });

  describe('createFamily', () => {
    it('should create a family successfully', async () => {
      const familyName = 'Test Family';
      const family = await familyRepository.createFamily(familyName, testUserId1);
      
      expect(family).toBeDefined();
      expect(family.name).toBe(familyName);
      expect(family.owner_id).toBe(testUserId1);
      expect(family.id).toBeDefined();
      
      testFamilyId = family.id;
    });
  });

  describe('getFamilyById', () => {
    it('should get family by id', async () => {
      const familyName = 'Test Family';
      const family = await familyRepository.createFamily(familyName, testUserId1);
      
      const retrievedFamily = await familyRepository.getFamilyById(family.id);
      
      expect(retrievedFamily).toBeDefined();
      expect(retrievedFamily.name).toBe(familyName);
      expect(retrievedFamily.owner_id).toBe(testUserId1);
      expect(retrievedFamily.owner_username).toBeDefined();
    });
  });

  describe('getUserFamily', () => {
    it('should get user family when user is a member', async () => {
      const familyName = 'Test Family';
      const family = await familyRepository.createFamily(familyName, testUserId1);
      await familyRepository.addUserToFamily(family.id, testUserId1);
      
      const userFamily = await familyRepository.getUserFamily(testUserId1);
      
      expect(userFamily).toBeDefined();
      expect(userFamily.name).toBe(familyName);
      expect(userFamily.owner_id).toBe(testUserId1);
    });

    it('should return null when user is not in any family', async () => {
      const userFamily = await familyRepository.getUserFamily(testUserId2);
      
      expect(userFamily).toBeUndefined();
    });
  });

  describe('addUserToFamily', () => {
    it('should add user to family successfully', async () => {
      const familyName = 'Test Family';
      const family = await familyRepository.createFamily(familyName, testUserId1);
      
      const result = await familyRepository.addUserToFamily(family.id, testUserId2);
      
      expect(result).toBeDefined();
      expect(result.family_id).toBe(family.id);
      expect(result.user_id).toBe(testUserId2);
    });

    it('should throw error when trying to add user to multiple families', async () => {
      const family1 = await familyRepository.createFamily('Family 1', testUserId1);
      const family2 = await familyRepository.createFamily('Family 2', testUserId2);
      
      await familyRepository.addUserToFamily(family1.id, testUserId2);
      
      await expect(familyRepository.addUserToFamily(family2.id, testUserId2))
        .rejects.toThrow();
    });
  });

  describe('removeUserFromFamily', () => {
    it('should remove user from family successfully', async () => {
      const familyName = 'Test Family';
      const family = await familyRepository.createFamily(familyName, testUserId1);
      await familyRepository.addUserToFamily(family.id, testUserId2);
      
      await familyRepository.removeUserFromFamily(family.id, testUserId2);
      
      const userFamily = await familyRepository.getUserFamily(testUserId2);
      expect(userFamily).toBeUndefined();
    });
  });

  describe('getFamilyMembers', () => {
    it('should get all family members', async () => {
      const familyName = 'Test Family';
      const family = await familyRepository.createFamily(familyName, testUserId1);
      await familyRepository.addUserToFamily(family.id, testUserId1);
      await familyRepository.addUserToFamily(family.id, testUserId2);
      
      const members = await familyRepository.getFamilyMembers(family.id);
      
      expect(members).toHaveLength(2);
      expect(members.find(m => m.id === testUserId1).role).toBe('owner');
      expect(members.find(m => m.id === testUserId2).role).toBe('member');
    });
  });

  describe('isUserInFamily', () => {
    it('should return true when user is in family', async () => {
      const familyName = 'Test Family';
      const family = await familyRepository.createFamily(familyName, testUserId1);
      await familyRepository.addUserToFamily(family.id, testUserId1);
      
      const isInFamily = await familyRepository.isUserInFamily(testUserId1);
      
      expect(isInFamily).toBe(true);
    });

    it('should return false when user is not in family', async () => {
      const isInFamily = await familyRepository.isUserInFamily(testUserId2);
      
      expect(isInFamily).toBe(false);
    });
  });

  describe('isUserFamilyOwner', () => {
    it('should return true when user is family owner', async () => {
      const familyName = 'Test Family';
      const family = await familyRepository.createFamily(familyName, testUserId1);
      
      const isOwner = await familyRepository.isUserFamilyOwner(testUserId1);
      
      expect(isOwner).toBe(true);
    });

    it('should return false when user is not family owner', async () => {
      const isOwner = await familyRepository.isUserFamilyOwner(testUserId2);
      
      expect(isOwner).toBe(false);
    });
  });

  describe('deleteFamily', () => {
    it('should delete family and convert expenses to personal', async () => {
      const familyName = 'Test Family';
      const family = await familyRepository.createFamily(familyName, testUserId1);
      await familyRepository.addUserToFamily(family.id, testUserId1);
      
      // Добавляем семейный расход
      const expenseRepo = require('../repositories/ExpenseRepository');
      const expenseRepository = new expenseRepo();
      await expenseRepository.addExpense(testUserId1, 100, 'Test expense', null, 'RUB', 'UTC', family.id);
      
      await familyRepository.deleteFamily(family.id);
      
      // Проверяем, что семья удалена
      const deletedFamily = await familyRepository.getFamilyById(family.id);
      expect(deletedFamily).toBeUndefined();
      
      // Проверяем, что расход стал личным
      const expenses = await expenseRepository.query('SELECT * FROM expenses WHERE user_id = $1', [testUserId1]);
      expect(expenses.rows[0].family_id).toBeNull();
    });
  });
}); 