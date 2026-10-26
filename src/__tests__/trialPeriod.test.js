const UserService = require('../services/UserService');

const DAY_MS = 24 * 60 * 60 * 1000;
const tick = () => new Promise(resolve => setImmediate(resolve));

// In-memory users table behind UserRepository: understands the statements UserService issues.
// Every call yields to the event loop, so concurrent registerUser calls interleave like real DB round-trips.
function makeUserRepository(existing = null) {
  const users = new Map();
  if (existing) users.set(existing.id, { ...existing });
  return {
    users,
    createUser: jest.fn(async (id, username, firstName) => {
      await tick();
      const row = users.get(id);
      if (row) {
        Object.assign(row, { username, first_name: firstName });
        return { ...row, is_new: false };
      }
      const created = { id, username, first_name: firstName, premium: false, premium_expires_at: null, premium_activated_at: null, has_trial: true };
      users.set(id, created);
      return { ...created, is_new: true };
    }),
    getUserById: jest.fn(async (id) => {
      await tick();
      return users.has(id) ? { ...users.get(id) } : undefined;
    }),
    query: jest.fn(async (sql, params) => {
      await tick();
      const row = users.get(params[0]) || users.get(params[1]);
      if (/SET has_trial = FALSE/.test(sql)) {
        if (row.has_trial && !row.premium_activated_at) {
          row.has_trial = false;
          return { rowCount: 1, rows: [{ id: row.id }] };
        }
        return { rowCount: 0, rows: [] };
      }
      if (/SET has_trial = TRUE/.test(sql)) {
        if (!row.premium_activated_at) row.has_trial = true;
        return { rowCount: 1, rows: [] };
      }
      if (/premium_activated_at = COALESCE/.test(sql)) {
        const [expiresAt, , now] = params;
        Object.assign(row, { premium: true, premium_expires_at: expiresAt, premium_activated_at: row.premium_activated_at || now });
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    })
  };
}

describe('Trial Period for New Users', () => {
  let premiumTransactionRepository;

  beforeEach(() => {
    premiumTransactionRepository = { createTransaction: jest.fn().mockResolvedValue({ id: 1 }) };
  });

  describe('UserService.registerUser', () => {
    it('gives a new user 14 days of premium and consumes the trial', async () => {
      const userRepository = makeUserRepository();
      const userService = new UserService(userRepository, {}, premiumTransactionRepository);

      const before = Date.now();
      const result = await userService.registerUser(123456, 'testuser', 'Test User');
      const after = Date.now();

      expect(result).toEqual(expect.objectContaining({ id: 123456, username: 'testuser', isNew: true }));
      expect(premiumTransactionRepository.createTransaction).toHaveBeenCalledTimes(1);
      const trial = premiumTransactionRepository.createTransaction.mock.calls[0][0];
      expect(trial).toEqual(expect.objectContaining({
        user_id: 123456,
        transaction_type: 'trial',
        tariff_duration: 14,
        stars_amount: 0,
        telegram_payment_id: null,
        previous_expiry_date: null,
        status: 'completed'
      }));
      expect(trial.new_expiry_date.getTime()).toBeGreaterThanOrEqual(before + 14 * DAY_MS);
      expect(trial.new_expiry_date.getTime()).toBeLessThanOrEqual(after + 14 * DAY_MS);

      const stored = userRepository.users.get(123456);
      expect(stored.premium_expires_at).toEqual(trial.new_expiry_date);
      expect(stored.has_trial).toBe(false);
    });

    it('does not give a trial to a user whose trial was already consumed', async () => {
      const userRepository = makeUserRepository({ id: 123456, premium: false, premium_expires_at: null, premium_activated_at: null, has_trial: false });
      const userService = new UserService(userRepository, {}, premiumTransactionRepository);

      const result = await userService.registerUser(123456, 'testuser', 'Test User');

      expect(result.isNew).toBe(false);
      expect(premiumTransactionRepository.createTransaction).not.toHaveBeenCalled();
    });

    it('does not give a trial to a user who already had premium', async () => {
      const userRepository = makeUserRepository({ id: 123456, premium: false, premium_expires_at: null, premium_activated_at: new Date('2024-01-01'), has_trial: true });
      const userService = new UserService(userRepository, {}, premiumTransactionRepository);

      await userService.registerUser(123456, 'testuser', 'Test User');

      expect(premiumTransactionRepository.createTransaction).not.toHaveBeenCalled();
    });

    it('returns the trial right if granting it fails', async () => {
      const userRepository = makeUserRepository();
      const userService = new UserService(userRepository, {}, premiumTransactionRepository);
      // activatePremium reads the user first; the trial was already claimed by then
      userRepository.getUserById.mockRejectedValueOnce(new Error('db down'));

      await expect(userService.registerUser(123456, 'testuser', 'Test User')).rejects.toThrow('db down');
      expect(userRepository.users.get(123456).has_trial).toBe(true);
      expect(premiumTransactionRepository.createTransaction).not.toHaveBeenCalled();
    });

    it('propagates errors during user registration', async () => {
      const userRepository = makeUserRepository();
      userRepository.createUser.mockRejectedValue(new Error('Database error'));
      const userService = new UserService(userRepository, {}, premiumTransactionRepository);

      await expect(userService.registerUser(123456, 'testuser', 'Test User')).rejects.toThrow('Database error');
    });
  });
});
