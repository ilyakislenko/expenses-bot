require('dotenv').config();

// Валидация переменных окружения
if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN is required');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const db = require('./database');
const createCurrencyUtils = require('./utils/currency');
const Formatter = require('./utils/formatter');
const Validator = require('./utils/validator');
const errorHandler = require('./middleware/errorHandler');

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
      case 'db':
        return db;

      case 'currencyUtils':
        return createCurrencyUtils(this.get('db'));

      case 'formatter':
        return new Formatter(this.get('currencyUtils'));

      case 'validator':
        return Validator;

      case 'errorHandler':
        return errorHandler;

      case 'stateService':
        return new StateService();

      case 'expenseService':
        return ExpenseService;

      case 'userService':
        return UserService;

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
      db: this.get('db'),
      formatter: this.get('formatter')
    };
  }
}

module.exports = Container; 