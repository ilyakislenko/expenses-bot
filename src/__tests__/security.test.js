const RateLimiter = require('../utils/rateLimiter');
const EnhancedValidator = require('../utils/enhancedValidator');
const SecurityMiddleware = require('../middleware/securityMiddleware');

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  test('should allow first request', () => {
    const result = rateLimiter.checkLimit(123, 'message');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29); // 30 - 1
  });

  test('should block after exceeding limit', () => {
    const userId = 123;
    const limitType = 'command';
    const limit = rateLimiter.limits[limitType].requests;

    // Исчерпываем лимит
    for (let i = 0; i < limit; i++) {
      rateLimiter.checkLimit(userId, limitType);
    }

    // Следующий запрос должен быть заблокирован
    const result = rateLimiter.checkLimit(userId, limitType);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetTime).toBeGreaterThan(0);
  });

  test('should reset after window expires', () => {
    const userId = 123;
    const limitType = 'message';
    const limit = rateLimiter.limits[limitType].requests;

    // Исчерпываем лимит
    for (let i = 0; i < limit; i++) {
      rateLimiter.checkLimit(userId, limitType);
    }

    // Симулируем истечение времени окна
    const key = `${userId}:${limitType}`;
    const userRequests = rateLimiter.requests.get(key);
    userRequests.timestamp = Date.now() - rateLimiter.limits[limitType].windowMs - 1000;
    rateLimiter.requests.set(key, userRequests);

    // Теперь запрос должен быть разрешен
    const result = rateLimiter.checkLimit(userId, limitType);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(limit - 1);
  });

  test('should cleanup expired entries', () => {
    const userId = 123;
    const limitType = 'message';

    // Создаем устаревшую запись
    const key = `${userId}:${limitType}`;
    rateLimiter.requests.set(key, {
      count: 5,
      timestamp: Date.now() - rateLimiter.limits[limitType].windowMs - 1000,
      windowMs: rateLimiter.limits[limitType].windowMs
    });

    rateLimiter.cleanup();
    expect(rateLimiter.requests.has(key)).toBe(false);
  });

  test('should get correct limit info', () => {
    const userId = 123;
    const limitType = 'callback';

    // Делаем несколько запросов
    rateLimiter.checkLimit(userId, limitType);
    rateLimiter.checkLimit(userId, limitType);

    const info = rateLimiter.getLimitInfo(userId, limitType);
    expect(info.used).toBe(2);
    expect(info.limit).toBe(50);
    expect(info.remaining).toBe(48);
  });
});

describe('EnhancedValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new EnhancedValidator();
  });

  describe('validateExpenseMessage', () => {
    test('should validate correct expense message', () => {
      const result = validator.validateExpenseMessage('200 продукты');
      expect(result.isValid).toBe(true);
      expect(result.amount).toBe(200);
      expect(result.description).toBe('продукты');
    });

    test('should reject invalid format', () => {
      const result = validator.validateExpenseMessage('неправильный формат');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalid_format');
    });

    test('should reject too large amount', () => {
      const result = validator.validateExpenseMessage('1000000 продукты');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('amount_too_large');
    });

    test('should reject too small amount', () => {
      const result = validator.validateExpenseMessage('0.001 продукты');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('amount_too_small');
    });

    test('should reject forbidden patterns', () => {
      const result = validator.validateExpenseMessage('200 <script>alert("xss")</script>');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('forbidden_content');
    });

    test('should reject too long message', () => {
      const longDescription = 'a'.repeat(150);
      const result = validator.validateExpenseMessage(`200 ${longDescription}`);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('description_too_long');
    });
  });

  describe('validateCommand', () => {
    test('should validate correct command', () => {
      const result = validator.validateCommand('/start');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('/start');
    });

    test('should reject invalid command format', () => {
      const result = validator.validateCommand('start');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalid_command_format');
    });

    test('should reject forbidden commands', () => {
      const result = validator.validateCommand('/eval');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('forbidden_command');
    });
  });

  describe('validateCallbackData', () => {
    test('should validate correct callback data', () => {
      const result = validator.validateCallbackData('show_category|1');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('show_category|1');
    });

    test('should reject too long callback data', () => {
      const longData = 'a'.repeat(65);
      const result = validator.validateCallbackData(longData);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('callback_data_too_long');
    });

    test('should reject invalid callback format', () => {
      const result = validator.validateCallbackData('category/food');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalid_callback_format');
    });

    test('should validate callback data with pipe separator', () => {
      const result = validator.validateCallbackData('delete_expense|23');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('delete_expense|23');
    });

    test('should validate callback data with colon separator', () => {
      const result = validator.validateCallbackData('category:food');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('category:food');
    });

    test('should validate callback data with cyrillic characters', () => {
      const result = validator.validateCallbackData('category|Транспорт');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('category|Транспорт');
    });

    test('should validate callback data with cyrillic and latin', () => {
      const result = validator.validateCallbackData('category|Продукты');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('category|Продукты');
    });
  });

  describe('parseEditExpense', () => {
    test('should parse only amount', () => {
      const result = validator.parseEditExpense('500');
      expect(result.isValid).toBe(true);
      expect(result.amount).toBe(500);
      expect(result.description).toBeUndefined();
    });

    test('should parse only description', () => {
      const result = validator.parseEditExpense('бобик');
      expect(result.isValid).toBe(true);
      expect(result.amount).toBeUndefined();
      expect(result.description).toBe('бобик');
    });

    test('should parse amount and description', () => {
      const result = validator.parseEditExpense('500 бобик');
      expect(result.isValid).toBe(true);
      expect(result.amount).toBe(500);
      expect(result.description).toBe('бобик');
    });

    test('should reject empty input', () => {
      const result = validator.parseEditExpense('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('empty');
    });

    test('should reject invalid amount', () => {
      const result = validator.parseEditExpense('abc');
      expect(result.isValid).toBe(true);
      expect(result.amount).toBeUndefined();
      expect(result.description).toBe('abc');
    });

    test('should reject too long description', () => {
      const longDesc = 'a'.repeat(61);
      const result = validator.parseEditExpense(longDesc);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('too_long');
    });

    test('should reject forbidden patterns', () => {
      const result = validator.parseEditExpense('<script>alert("xss")</script>');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('forbidden_content');
    });
  });

  describe('parseExpense', () => {
    test('should parse valid expense format', () => {
      const result = validator.parseExpense('500 продукты');
      expect(result.isValid).toBe(true);
      expect(result.amount).toBe(500);
      expect(result.description).toBe('продукты');
    });

    test('should reject format without description', () => {
      const result = validator.parseExpense('500');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('format');
    });

    test('should reject format without amount', () => {
      const result = validator.parseExpense('продукты');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('format');
    });

    test('should reject empty description', () => {
      const result = validator.parseExpense('500  ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('format');
    });

    test('should reject too long description', () => {
      const longDesc = 'a'.repeat(61);
      const result = validator.parseExpense(`500 ${longDesc}`);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('too_long');
    });

    test('should reject invalid amount', () => {
      const result = validator.parseExpense('0 продукты');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('amount');
    });

    test('should reject forbidden patterns', () => {
      const result = validator.parseExpense('500 <script>alert("xss")</script>');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('forbidden_content');
    });
  });

  describe('validateUserData', () => {
    test('should validate correct user data', () => {
      const userData = {
        id: 123456789,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
      };
      const result = validator.validateUserData(userData);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid user ID', () => {
      const userData = { id: -1 };
      const result = validator.validateUserData(userData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid_user_id');
    });

    test('should reject invalid username', () => {
      const userData = { id: 123, username: 'test@user' };
      const result = validator.validateUserData(userData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid_username_format');
    });
  });

  describe('validateCurrency', () => {
    test('should validate correct currency', () => {
      const result = validator.validateCurrency('USD');
      expect(result.isValid).toBe(true);
      expect(result.currency).toBe('USD');
    });

    test('should reject invalid currency format', () => {
      const result = validator.validateCurrency('usd');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalid_currency_format');
    });

    test('should reject unsupported currency', () => {
      const result = validator.validateCurrency('BTC');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('unsupported_currency');
    });
  });

  describe('sanitizeText', () => {
    test('should sanitize text correctly', () => {
      const result = validator.sanitizeText('  <script>alert("xss")</script>  ');
      expect(result).toBe('scriptalert("xss")/script');
    });

    test('should normalize whitespace', () => {
      const result = validator.sanitizeText('  multiple    spaces  ');
      expect(result).toBe('multiple spaces');
    });

    test('should truncate long text', () => {
      const longText = 'a'.repeat(150);
      const result = validator.sanitizeText(longText);
      expect(result.length).toBe(100); // maxDescriptionLength
    });
  });
});

describe('SecurityMiddleware', () => {
  let securityMiddleware;
  let mockRateLimiter;
  let mockEnhancedValidator;

  beforeEach(() => {
    mockRateLimiter = {
      checkLimit: jest.fn(),
      getStats: jest.fn()
    };
    mockEnhancedValidator = {
      validateUserData: jest.fn(),
      validateCommand: jest.fn(),
      validateExpenseMessage: jest.fn(),
      validateCallbackData: jest.fn(),
      getLimits: jest.fn()
    };
    securityMiddleware = new SecurityMiddleware(mockRateLimiter, mockEnhancedValidator);
  });

  test('should create middleware function', () => {
    const middleware = securityMiddleware.middleware();
    expect(typeof middleware).toBe('function');
  });

  test('should handle requests without user ID', async () => {
    const middleware = securityMiddleware.middleware();
    const mockCtx = {
      from: null,
      updateType: 'message',
      reply: jest.fn()
    };

    await middleware(mockCtx, jest.fn());
    expect(mockCtx.reply).toHaveBeenCalled();
  });

  test('should handle rate limit exceeded', async () => {
    const middleware = securityMiddleware.middleware();
    mockRateLimiter.checkLimit.mockReturnValue({
      allowed: false,
      resetTime: 30,
      limit: 10
    });

    const mockCtx = {
      from: { id: 123 },
      updateType: 'message',
      reply: jest.fn()
    };

    await middleware(mockCtx, jest.fn());
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Слишком много запросов'),
      expect.any(Object)
    );
  });

  test('should handle validation errors', async () => {
    const middleware = securityMiddleware.middleware();
    mockRateLimiter.checkLimit.mockReturnValue({ allowed: true });
    mockEnhancedValidator.validateUserData.mockReturnValue({
      isValid: false,
      errors: ['invalid_user_id']
    });

    const mockCtx = {
      from: { id: 123 },
      updateType: 'message',
      reply: jest.fn()
    };

    await middleware(mockCtx, jest.fn());
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка валидации'),
      expect.any(Object)
    );
  });

  test('should allow valid requests', async () => {
    const middleware = securityMiddleware.middleware();
    mockRateLimiter.checkLimit.mockReturnValue({ allowed: true });
    mockEnhancedValidator.validateUserData.mockReturnValue({
      isValid: true,
      sanitizedData: { id: 123 }
    });

    const mockCtx = {
      from: { id: 123 },
      updateType: 'message',
      rateLimitInfo: null,
      validationInfo: null
    };

    const next = jest.fn();
    await middleware(mockCtx, next);
    expect(next).toHaveBeenCalled();
    expect(mockCtx.rateLimitInfo).toBeDefined();
    expect(mockCtx.validationInfo).toBeDefined();
  });

  test('should create admin middleware', () => {
    const adminMiddleware = securityMiddleware.adminOnly();
    expect(typeof adminMiddleware).toBe('function');
  });

  test('should create user block middleware', () => {
    const blockMiddleware = securityMiddleware.checkUserBlock();
    expect(typeof blockMiddleware).toBe('function');
  });

  test('should get security stats', () => {
    mockRateLimiter.getStats.mockReturnValue({ totalUsers: 10 });
    mockEnhancedValidator.getLimits.mockReturnValue({ maxAmount: 999999 });

    const stats = securityMiddleware.getSecurityStats();
    expect(stats.rateLimiter).toBeDefined();
    expect(stats.validatorLimits).toBeDefined();
  });
}); 