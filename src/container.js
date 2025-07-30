require('dotenv').config();
const logger = require('./utils/logger');

// Валидация переменных окружения
if (!process.env.BOT_TOKEN) {
  logger.error('BOT_TOKEN is required');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL is required');
  process.exit(1);
}

const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const createCurrencyUtils = require('./utils/currency');
const Formatter = require('./utils/formatter');
const Validator = require('./utils/validator');
const errorHandler = require('./middleware/errorHandler');
const MonitoringServer = require('./utils/monitoring');
const CallbackDeduplicator = require('./utils/callbackDeduplicator');

// Repositories
const UserRepository = require('./repositories/UserRepository');
const ExpenseRepository = require('./repositories/ExpenseRepository');
const CategoryRepository = require('./repositories/CategoryRepository');
const CurrencyRepository = require('./repositories/CurrencyRepository');

// Services
const ExpenseService = require('./services/ExpenseService');
const UserService = require('./services/UserService');

// Handlers
const CommandHandlers = require('./handlers/commands');
const MessageHandlers = require('./handlers/messages');
const CallbackHandlers = require('./handlers/callbacks');

// State management
const StateService = require('./services/StateService');

class Container {
  constructor() {
    this.instances = new Map();
  }

  // Создание и кэширование экземпляров
  get(key) {
    if (!this.instances.has(key)) {
      this.instances.set(key, this.create(key));
    }
    return this.instances.get(key);
  }

  create(key) {
    switch (key) {
      case 'userRepository':
        return new UserRepository();

      case 'expenseRepository':
        return new ExpenseRepository();

      case 'categoryRepository':
        return new CategoryRepository();

      case 'currencyRepository':
        return new CurrencyRepository();

      case 'currencyUtils':
        return createCurrencyUtils(this.get('currencyRepository'));

      case 'formatter':
        return new Formatter(this.get('currencyUtils'));

      case 'validator':
        return Validator;

      case 'errorHandler':
        return errorHandler;

      case 'logger':
        return logger;

      case 'stateService':
        return new StateService();

      case 'expenseService':
        return new ExpenseService(
          this.get('expenseRepository'),
          this.get('userRepository'),
          this.get('categoryRepository')
        );

      case 'userService':
        return new UserService(
          this.get('userRepository'),
          this.get('categoryRepository')
        );

      case 'commandHandlers':
        return new CommandHandlers({
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          formatter: this.get('formatter')
        });

      case 'messageHandlers':
        return new MessageHandlers({
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          formatter: this.get('formatter'),
          commandHandlers: this.get('commandHandlers'),
          stateService: this.get('stateService'),
          validator: this.get('validator')
        });

      case 'callbackHandlers':
        return new CallbackHandlers({
          expenseService: this.get('expenseService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService')
        });

      case 'bot':
        return new Telegraf(process.env.BOT_TOKEN);

      case 'cron':
        return cron;

      case 'monitoringServer':
        return new MonitoringServer(process.env.MONITORING_PORT || 3001);

      case 'callbackDeduplicator':
        return new CallbackDeduplicator();

      default:
        throw new Error(`Unknown dependency: ${key}`);
    }
  }

  // Получение всех зависимостей для роутинга
  getHandlers() {
    return {
      errorHandler: this.get('errorHandler'),
      commandHandlers: this.get('commandHandlers'),
      messageHandlers: this.get('messageHandlers'),
      callbackHandlers: this.get('callbackHandlers'),
      stateService: this.get('stateService'),
      expenseService: this.get('expenseService'),
      userService: this.get('userService'),
      currencyUtils: this.get('currencyUtils'),
      formatter: this.get('formatter'),
      logger: this.get('logger'),
      callbackDeduplicator: this.get('callbackDeduplicator')
    };
  }
}

module.exports = Container; 