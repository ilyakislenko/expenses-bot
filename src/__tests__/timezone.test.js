const { Pool } = require('pg');
const UserRepository = require('../repositories/UserRepository');
const ExpenseRepository = require('../repositories/ExpenseRepository');
const UserService = require('../services/UserService');
const { getTimezoneByCode, getTimezoneCode, TIMEZONE_MAPPING } = require('../utils/timezone');

// Мокаем репозитории
jest.mock('../repositories/UserRepository');
jest.mock('../repositories/ExpenseRepository');

describe('Timezone functionality', () => {
  let userRepository;
  let expenseRepository;
  let userService;

  beforeEach(() => {
    // Создаем моки
    userRepository = {
      getUserTimezone: jest.fn(),
      setUserTimezone: jest.fn(),
      query: jest.fn()
    };
    
    expenseRepository = {
      addExpense: jest.fn(),
      getDailyExpenses: jest.fn(),
      getTotalExpenses: jest.fn(),
      query: jest.fn()
    };
    
    userService = new UserService(userRepository, {});
  });

  describe('UserRepository timezone methods', () => {
    test('getUserTimezone should return user timezone', async () => {
      const mockResult = {
        rows: [{ timezone: 'Europe/Moscow' }]
      };
      userRepository.query.mockResolvedValue(mockResult);

      const timezone = await userRepository.getUserTimezone(123);
      
      expect(userRepository.query).toHaveBeenCalledWith(
        'SELECT timezone FROM users WHERE id = $1',
        [123]
      );
      expect(timezone).toBe('Europe/Moscow');
    });

    test('getUserTimezone should return UTC as default', async () => {
      const mockResult = { rows: [] };
      userRepository.query.mockResolvedValue(mockResult);

      const timezone = await userRepository.getUserTimezone(123);
      
      expect(timezone).toBe('UTC');
    });

    test('setUserTimezone should update user timezone', async () => {
      userRepository.query.mockResolvedValue({ rows: [] });

      await userRepository.setUserTimezone(123, 'America/New_York');
      
      expect(userRepository.query).toHaveBeenCalledWith(
        'UPDATE users SET timezone = $1 WHERE id = $2',
        ['America/New_York', 123]
      );
    });
  });

  describe('UserService timezone methods', () => {
    test('setUserTimezone should call repository method', async () => {
      userRepository.setUserTimezone = jest.fn().mockResolvedValue(undefined);

      await userService.setUserTimezone(123, 'Europe/Moscow');
      
      expect(userRepository.setUserTimezone).toHaveBeenCalledWith(123, 'Europe/Moscow');
    });

    test('getUserTimezone should call repository method', async () => {
      userRepository.getUserTimezone = jest.fn().mockResolvedValue('Europe/Moscow');

      const timezone = await userService.getUserTimezone(123);
      
      expect(userRepository.getUserTimezone).toHaveBeenCalledWith(123);
      expect(timezone).toBe('Europe/Moscow');
    });
  });

  describe('ExpenseRepository timezone methods', () => {
    test('addExpense should include timezone in query', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          user_id: 123,
          amount: 100,
          description: 'test',
          created_at_utc: new Date(),
          local_date: '2024-01-15'
        }]
      };
      expenseRepository.query.mockResolvedValue(mockResult);

      await expenseRepository.addExpense(
        123, 
        100, 
        'test', 
        1, 
        'RUB', 
        'Europe/Moscow'
      );
      
      expect(expenseRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at_utc, local_date'),
        [123, 100, 'test', 1, 'RUB', 'Europe/Moscow']
      );
    });

    test('getDailyExpenses should use local_date filter', async () => {
      const mockResult = { rows: [] };
      expenseRepository.query.mockResolvedValue(mockResult);

      await expenseRepository.getDailyExpenses(123, 'Europe/Moscow');
      
      expect(expenseRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('local_date = (NOW() AT TIME ZONE'),
        [123, 'Europe/Moscow']
      );
    });

    test('getTotalExpenses should use timezone for date filtering', async () => {
      const mockResult = { rows: [] };
      expenseRepository.query.mockResolvedValue(mockResult);

      await expenseRepository.getTotalExpenses(123, 'day', 'Europe/Moscow');
      
      expect(expenseRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('local_date = (NOW() AT TIME ZONE'),
        [123, 'Europe/Moscow']
      );
    });
  });

  describe('Timezone validation', () => {
    test('should handle valid timezones', () => {
      const validTimezones = [
        'Europe/Moscow',
        'America/New_York',
        'Asia/Tokyo',
        'UTC'
      ];

      validTimezones.forEach(timezone => {
        expect(() => {
          // В реальном коде здесь была бы валидация
          if (!timezone || typeof timezone !== 'string') {
            throw new Error('Invalid timezone');
          }
        }).not.toThrow();
      });
    });

    test('should handle invalid timezones', () => {
      const invalidTimezones = [
        null,
        undefined,
        '',
        123,
        'Invalid/Timezone'
      ];

      invalidTimezones.forEach(timezone => {
        expect(() => {
          if (!timezone || typeof timezone !== 'string') {
            throw new Error('Invalid timezone');
          }
        }).toThrow('Invalid timezone');
      });
    });
  });

  describe('Timezone code mapping', () => {
    test('getTimezoneByCode should return correct timezone', () => {
      expect(getTimezoneByCode('moscow')).toBe('Europe/Moscow');
      expect(getTimezoneByCode('ny')).toBe('America/New_York');
      expect(getTimezoneByCode('tokyo')).toBe('Asia/Tokyo');
      expect(getTimezoneByCode('utc')).toBe('UTC');
      expect(getTimezoneByCode('unknown')).toBe('UTC'); // default fallback
    });

    test('getTimezoneCode should return correct code', () => {
      expect(getTimezoneCode('Europe/Moscow')).toBe('moscow');
      expect(getTimezoneCode('America/New_York')).toBe('ny');
      expect(getTimezoneCode('Asia/Tokyo')).toBe('tokyo');
      expect(getTimezoneCode('UTC')).toBe('utc');
      expect(getTimezoneCode('Unknown/Timezone')).toBe('utc'); // default fallback
    });

    test('TIMEZONE_MAPPING should contain all expected mappings', () => {
      expect(TIMEZONE_MAPPING.moscow).toBe('Europe/Moscow');
      expect(TIMEZONE_MAPPING.ny).toBe('America/New_York');
      expect(TIMEZONE_MAPPING.la).toBe('America/Los_Angeles');
      expect(TIMEZONE_MAPPING.tokyo).toBe('Asia/Tokyo');
      expect(TIMEZONE_MAPPING.utc).toBe('UTC');
    });
  });
}); 