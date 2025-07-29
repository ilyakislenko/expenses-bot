const Container = require('../container');

describe('Container', () => {
  let container;

  beforeEach(() => {
    container = new Container();
  });

  test('should create user repository instance', () => {
    const userRepository = container.get('userRepository');
    expect(userRepository).toBeDefined();
    expect(typeof userRepository.query).toBe('function');
  });

  test('should create formatter instance', () => {
    const formatter = container.get('formatter');
    expect(formatter).toBeDefined();
    expect(typeof formatter.formatAmount).toBe('function');
  });

  test('should create state service instance', () => {
    const stateService = container.get('stateService');
    expect(stateService).toBeDefined();
    expect(typeof stateService.setUserEditState).toBe('function');
    expect(typeof stateService.getUserEditState).toBe('function');
  });

  test('should create handlers with dependencies', () => {
    const handlers = container.getHandlers();
    
    expect(handlers.commandHandlers).toBeDefined();
    expect(handlers.messageHandlers).toBeDefined();
    expect(handlers.callbackHandlers).toBeDefined();
    expect(handlers.stateService).toBeDefined();
    expect(handlers.expenseService).toBeDefined();
    expect(handlers.userService).toBeDefined();
    expect(handlers.formatter).toBeDefined();
  });

  test('should cache instances', () => {
    const userRepo1 = container.get('userRepository');
    const userRepo2 = container.get('userRepository');
    expect(userRepo1).toBe(userRepo2);
  });

  test('should throw error for unknown dependency', () => {
    expect(() => {
      container.get('unknown');
    }).toThrow('Unknown dependency: unknown');
  });
}); 