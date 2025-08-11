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
const PremiumTransactionRepository = require('./repositories/PremiumTransactionRepository');
const DonationRepository = require('./repositories/DonationRepository');
const BugReportRepository = require('./repositories/BugReportRepository');

// Services
const ExpenseService = require('./services/ExpenseService');
const UserService = require('./services/UserService');
const PremiumService = require('./services/PremiumService');
const PaymentService = require('./services/PaymentService');
const LocalizationService = require('./services/LocalizationService');
const FamilyService = require('./services/FamilyService');
const NotificationService = require('./services/NotificationService');
const CategoryService = require('./services/CategoryService');
const AdminService = require('./services/AdminService');

// Handlers
const CommandHandlers = require('./handlers/commands');
const MessageHandlers = require('./handlers/messages');
const CallbackHandlers = require('./handlers/callbacks');
const AdminHandlers = require('./handlers/AdminHandlers');

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

      case 'premiumTransactionRepository':
        return new PremiumTransactionRepository();

      case 'donationRepository':
        return new DonationRepository();

      case 'bugReportRepository':
        return new BugReportRepository();

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
          this.get('enhancedValidator'),
          this.get('localizationService'),
          this.get('userService')
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
          this.get('categoryRepository'),
          this.get('premiumService')
        );

          case 'userService':
      return new UserService(
        this.get('userRepository'),
        this.get('categoryRepository'),
        this.get('premiumTransactionRepository')
      );

      case 'premiumService':
        return new PremiumService(
          this.get('userRepository'),
          this.get('expenseRepository'),
          this.get('userService')
        );

      case 'paymentService':
        // Создаем PaymentService с отложенной инициализацией бота
        const paymentService = new PaymentService(this.get('donationRepository'));
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

      case 'categoryService':
        return new CategoryService(
          this.get('categoryRepository'),
          this.get('premiumService'),
          this.get('expenseRepository')
        );

      case 'adminService':
        return new AdminService(
          this.get('userService'),
          this.get('expenseRepository'),
          this.get('bugReportRepository'),
          this.get('donationRepository'),
          this.get('premiumTransactionRepository'),
          this.get('notificationService'),
          this.get('localizationService')
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
          keyboardGenerators: this.get('keyboardGenerators'),
          paymentService: this.get('paymentService')
        });

      case 'messageHandlers':
        return new MessageHandlers({
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          familyService: this.get('familyService'),
          categoryService: this.get('categoryService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          commandHandlers: this.get('commandHandlers'),
          stateService: this.get('stateService'),
          validator: this.get('enhancedValidator'),
          paymentService: this.get('paymentService'),
          donationRepository: this.get('donationRepository'),
          bugReportRepository: this.get('bugReportRepository'),
          adminHandlers: this.get('adminHandlers')
        });

      case 'callbackHandlers':
        return new CallbackHandlers({
          expenseService: this.get('expenseService'),
          premiumService: this.get('premiumService'),
          paymentService: this.get('paymentService'),
          familyService: this.get('familyService'),
          categoryService: this.get('categoryService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          userService: this.get('userService'),
          commandHandlers: this.get('commandHandlers'),
          keyboardGenerators: this.get('keyboardGenerators')
        });

      case 'adminHandlers':
        return new AdminHandlers(
          this.get('adminService'),
          this.get('userService'),
          this.get('localizationService'),
          this.get('formatter'),
          this.get('stateService')
        );

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
        const adminService = this.get('adminService');
        if (adminService) {
          adminService.setBot(bot);
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
          generateMainMenuKeyboard: (userLanguage, isAdmin = false) => generateMainMenuKeyboard(this.get('localizationService'), userLanguage, isAdmin),
          generateInlineMainMenu: (userLanguage, isAdmin = false) => generateInlineMainMenu(this.get('localizationService'), userLanguage, isAdmin),
          generateCurrencyKeyboard: (userLanguage) => generateCurrencyKeyboard(this.get('localizationService'), userLanguage),
          generateSettingsKeyboard: (userLanguage, reminderEnabled) => generateSettingsKeyboard(this.get('localizationService'), userLanguage, reminderEnabled),
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
      adminHandlers: this.get('adminHandlers'),
      stateService: this.get('stateService'),
      expenseService: this.get('expenseService'),
      userService: this.get('userService'),
      premiumService: this.get('premiumService'),
      paymentService: this.get('paymentService'),
      donationRepository: this.get('donationRepository'),
      familyService: this.get('familyService'),
      localizationService: this.get('localizationService'),
      currencyUtils: this.get('currencyUtils'),
      formatter: this.get('formatter'),
      logger: this.get('logger'),
      callbackDeduplicator: this.get('callbackDeduplicator'),
      securityMiddleware: this.get('securityMiddleware'),
      rateLimiter: this.get('rateLimiter'),
      enhancedValidator: this.get('enhancedValidator'),
      adminService: this.get('adminService')
    };
  }
}

module.exports = Container; 