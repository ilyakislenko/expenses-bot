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
const EnhancedValidator = require('./utils/enhancedValidator');
const RateLimiter = require('./utils/rateLimiter');
const SecurityMiddleware = require('./middleware/securityMiddleware');
const errorHandler = require('./middleware/errorHandler');
const MonitoringServer = require('./utils/monitoring');
const CallbackDeduplicator = require('./utils/callbackDeduplicator');

// Repositories
const UserRepository = require('./repositories/UserRepository');
const ExpenseRepository = require('./repositories/ExpenseRepository');
const CategoryRepository = require('./repositories/CategoryRepository');
const CurrencyRepository = require('./repositories/CurrencyRepository');
const FamilyRepository = require('./repositories/FamilyRepository');
const FamilyInvitationRepository = require('./repositories/FamilyInvitationRepository');

// Services
const ExpenseService = require('./services/ExpenseService');
const UserService = require('./services/UserService');
const PremiumService = require('./services/PremiumService');
const PaymentService = require('./services/PaymentService');
const LocalizationService = require('./services/LocalizationService');
const FamilyService = require('./services/FamilyService');
const NotificationService = require('./services/NotificationService');

// Handlers
const CommandHandlers = require('./handlers/commands');
const MessageHandlers = require('./handlers/messages');
const CallbackHandlers = require('./handlers/callbacks');

// State management
const StateService = require('./services/StateService');

// Constants and utilities
const { 
  generateMainMenuKeyboard, 
  generateInlineMainMenu, 
  generateCurrencyKeyboard, 
  generateSettingsKeyboard, 
  generateTimeKeyboard 
} = require('./utils/constants');

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

      case 'familyRepository':
        return new FamilyRepository();

      case 'familyInvitationRepository':
        return new FamilyInvitationRepository();

      case 'currencyUtils':
        return createCurrencyUtils(this.get('currencyRepository'));

      case 'formatter':
        return new Formatter(this.get('currencyUtils'));

      case 'enhancedValidator':
        return new EnhancedValidator();

      case 'rateLimiter':
        return new RateLimiter();

      case 'securityMiddleware':
        return new SecurityMiddleware(
          this.get('rateLimiter'),
          this.get('enhancedValidator')
        );

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

      case 'premiumService':
        return new PremiumService(
          this.get('userRepository'),
          this.get('expenseRepository'),
          this.get('userService')
        );

      case 'paymentService':
        // Создаем PaymentService с отложенной инициализацией бота
        const paymentService = new PaymentService();
        // Устанавливаем бота позже, когда он будет создан
        if (this.instances.has('bot')) {
          paymentService.setBot(this.get('bot'));
        }
        return paymentService;

      case 'localizationService':
        return new LocalizationService();

      case 'notificationService':
        return new NotificationService(
          this.get('localizationService')
        );

      case 'familyService':
        return new FamilyService(
          this.get('familyRepository'),
          this.get('familyInvitationRepository'),
          this.get('userRepository'),
          this.get('expenseRepository'),
          this.get('notificationService')
        );

      case 'commandHandlers':
        return new CommandHandlers({
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          familyService: this.get('familyService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          keyboardGenerators: this.get('keyboardGenerators')
        });

      case 'messageHandlers':
        return new MessageHandlers({
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          familyService: this.get('familyService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          commandHandlers: this.get('commandHandlers'),
          stateService: this.get('stateService'),
          validator: this.get('enhancedValidator')
        });

      case 'callbackHandlers':
        return new CallbackHandlers({
          expenseService: this.get('expenseService'),
          premiumService: this.get('premiumService'),
          paymentService: this.get('paymentService'),
          familyService: this.get('familyService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          userService: this.get('userService'),
          commandHandlers: this.get('commandHandlers'),
          keyboardGenerators: this.get('keyboardGenerators')
        });

      case 'bot':
        const bot = new Telegraf(process.env.BOT_TOKEN);
        // Устанавливаем бота в сервисы после его создания
        const notificationService = this.get('notificationService');
        if (notificationService) {
          notificationService.setBot(bot);
        }
        const paymentServiceInstance = this.get('paymentService');
        if (paymentServiceInstance) {
          paymentServiceInstance.setBot(bot);
        }
        return bot;

      case 'cron':
        return cron;

      case 'monitoringServer':
        return new MonitoringServer(process.env.MONITORING_PORT || 3001);

      case 'callbackDeduplicator':
        return new CallbackDeduplicator();

      case 'keyboardGenerators':
        return {
          generateMainMenuKeyboard: (userLanguage) => generateMainMenuKeyboard(this.get('localizationService'), userLanguage),
          generateInlineMainMenu: (userLanguage) => generateInlineMainMenu(this.get('localizationService'), userLanguage),
          generateCurrencyKeyboard: (userLanguage) => generateCurrencyKeyboard(this.get('localizationService'), userLanguage),
          generateSettingsKeyboard: (userLanguage) => generateSettingsKeyboard(this.get('localizationService'), userLanguage),
          generateTimeKeyboard: (userLanguage) => generateTimeKeyboard(this.get('localizationService'), userLanguage)
        };

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
      premiumService: this.get('premiumService'),
      paymentService: this.get('paymentService'),
      familyService: this.get('familyService'),
      localizationService: this.get('localizationService'),
      currencyUtils: this.get('currencyUtils'),
      formatter: this.get('formatter'),
      logger: this.get('logger'),
      callbackDeduplicator: this.get('callbackDeduplicator'),
      securityMiddleware: this.get('securityMiddleware'),
      rateLimiter: this.get('rateLimiter'),
      enhancedValidator: this.get('enhancedValidator')
    };
  }
}

module.exports = Container; 