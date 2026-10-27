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
const createErrorHandler = require('./middleware/errorHandler');
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
const IncomeRepository = require('./repositories/IncomeRepository');
const SavingsRepository = require('./repositories/SavingsRepository');
const RecurringExpenseRepository = require('./repositories/RecurringExpenseRepository');
const FunnelRepository = require('./repositories/FunnelRepository');
const UserNotificationRepository = require('./repositories/UserNotificationRepository');
const BudgetRepository = require('./repositories/BudgetRepository');
const ImportRepository = require('./repositories/ImportRepository');
const ReceiptRepository = require('./repositories/ReceiptRepository');
const AssistantRepository = require('./repositories/AssistantRepository');

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
const IncomeService = require('./services/IncomeService');
const SavingsService = require('./services/SavingsService');
const RecurringExpenseService = require('./services/RecurringExpenseService');
const FunnelService = require('./services/FunnelService');
const PremiumLifecycleService = require('./services/PremiumLifecycleService');
const BudgetService = require('./services/BudgetService');
const ReportService = require('./services/ReportService');
const DailySummaryService = require('./services/DailySummaryService');
const WeeklyInsightService = require('./services/WeeklyInsightService');
const ImportService = require('./services/ImportService');
const ReceiptService = require('./services/ReceiptService');
const { createProviderFromEnv: createReceiptProvider } = require('./services/receipt/chain');
const AssistantService = require('./services/AssistantService');
const { createAssistantProvider } = require('./services/assistant/model');

// Handlers
const CommandHandlers = require('./handlers/commands');
const MessageHandlers = require('./handlers/messages');
const CallbackHandlers = require('./handlers/callbacks');
const AdminHandlers = require('./handlers/AdminHandlers');
const IncomeHandlers = require('./handlers/IncomeHandlers');
const SavingsHandlers = require('./handlers/SavingsHandlers');
const RecurringExpenseHandlers = require('./handlers/RecurringExpenseHandlers');
const ExpenseHandlers = require('./handlers/ExpenseHandlers');
const BudgetHandlers = require('./handlers/BudgetHandlers');
const ExportHandlers = require('./handlers/ExportHandlers');
const ImportHandlers = require('./handlers/ImportHandlers');
const ReceiptHandlers = require('./handlers/ReceiptHandlers');
const AssistantHandlers = require('./handlers/AssistantHandlers');

// State management
const StateService = require('./services/StateService');

// Constants and utilities
const {
  generateMainMenuKeyboard,
  generateMoreMenu,
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

      case 'savingsRepository':
        return new SavingsRepository();

      case 'incomeRepository':
        return new IncomeRepository();

      case 'recurringExpenseRepository':
        return new RecurringExpenseRepository();

      case 'importRepository':
        return new ImportRepository();

      case 'importService':
        return new ImportService({
          importRepository: this.get('importRepository'),
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          currencyUtils: this.get('currencyUtils')
        });

      case 'importHandlers':
        return new ImportHandlers({
          importService: this.get('importService'),
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          receiptService: this.get('receiptService')
        });

      case 'receiptRepository':
        return new ReceiptRepository();

      // Провайдер распознавания чеков из RECEIPT_AI_* (smoke-тесты подменяют его через instances)
      case 'receiptProvider':
        return createReceiptProvider(process.env);

      case 'receiptService':
        return new ReceiptService({
          receiptRepository: this.get('receiptRepository'),
          provider: this.get('receiptProvider'),
          expenseService: this.get('expenseService'),
          premiumService: this.get('premiumService'),
          localizationService: this.get('localizationService'),
          funnelService: this.get('funnelService')
        });

      case 'receiptHandlers':
        return new ReceiptHandlers({
          receiptService: this.get('receiptService'),
          expenseHandlers: this.get('expenseHandlers'),
          budgetService: this.get('budgetService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter')
        });

      case 'assistantRepository':
        return new AssistantRepository();

      // Модель для вопросов боту из ASSISTANT_AI_* (иначе слоты чеков); smoke-тесты подменяют её через instances
      case 'assistantProvider':
        return createAssistantProvider(process.env);

      case 'assistantService':
        return new AssistantService({
          assistantRepository: this.get('assistantRepository'),
          provider: this.get('assistantProvider'),
          expenseService: this.get('expenseService'),
          incomeService: this.get('incomeService'),
          savingsService: this.get('savingsService'),
          budgetService: this.get('budgetService'),
          premiumService: this.get('premiumService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          currencyUtils: this.get('currencyUtils')
        });

      case 'assistantHandlers':
        return new AssistantHandlers({
          assistantService: this.get('assistantService'),
          userService: this.get('userService'),
          stateService: this.get('stateService'),
          localizationService: this.get('localizationService')
        });

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
        return createErrorHandler({
          userService: this.get('userService'),
          localizationService: this.get('localizationService')
        });

      case 'logger':
        return logger;

      case 'stateService':
        return new StateService();

      case 'funnelRepository':
        return new FunnelRepository();

      case 'userNotificationRepository':
        return new UserNotificationRepository();

      case 'funnelService':
        return new FunnelService(this.get('funnelRepository'));

      case 'premiumLifecycleService':
        return new PremiumLifecycleService(
          this.get('userNotificationRepository'),
          this.get('notificationService'),
          this.get('localizationService'),
          this.get('formatter')
        );

      case 'budgetRepository':
        return new BudgetRepository();

      case 'budgetService':
        return new BudgetService(
          this.get('budgetRepository'),
          this.get('expenseService'),
          this.get('userNotificationRepository'),
          this.get('premiumService'),
          this.get('currencyUtils'),
          this.get('localizationService'),
          this.get('formatter')
        );

      case 'reportService':
        return new ReportService({
          expenseService: this.get('expenseService'),
          incomeService: this.get('incomeService'),
          budgetService: this.get('budgetService'),
          premiumService: this.get('premiumService'),
          userNotificationRepository: this.get('userNotificationRepository'),
          notificationService: this.get('notificationService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          currencyUtils: this.get('currencyUtils')
        });

      case 'dailySummaryService':
        return new DailySummaryService({
          expenseService: this.get('expenseService'),
          incomeService: this.get('incomeService'),
          reportService: this.get('reportService'),
          userNotificationRepository: this.get('userNotificationRepository'),
          notificationService: this.get('notificationService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter')
        });

      case 'weeklyInsightService':
        return new WeeklyInsightService({
          expenseService: this.get('expenseService'),
          incomeService: this.get('incomeService'),
          reportService: this.get('reportService'),
          budgetService: this.get('budgetService'),
          userNotificationRepository: this.get('userNotificationRepository'),
          notificationService: this.get('notificationService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter')
        });

      case 'expenseService':
        return new ExpenseService(
          this.get('expenseRepository'),
          this.get('userRepository'),
          this.get('categoryRepository'),
          this.get('premiumService'),
          this.get('funnelService')
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
          this.get('userService')
        );

      case 'paymentService':
        // Создаем PaymentService с отложенной инициализацией бота
        const paymentService = new PaymentService(
          this.get('donationRepository'),
          this.get('localizationService'),
          this.get('funnelService'),
          this.get('premiumTransactionRepository'),
          this.get('userRepository')
        );
        // Устанавливаем бота позже, когда он будет создан
        if (this.instances.has('bot')) {
          paymentService.setBot(this.get('bot'));
        }
        return paymentService;

      case 'localizationService':
        return new LocalizationService();

      case 'notificationService':
        return new NotificationService(
          this.get('localizationService'),
          this.get('userService'),
          this.get('formatter')
        );

      case 'familyService':
        return new FamilyService(
          this.get('familyRepository'),
          this.get('familyInvitationRepository'),
          this.get('userRepository'),
          this.get('expenseRepository'),
          this.get('notificationService'),
          this.get('premiumService')
        );

      case 'categoryService':
        return new CategoryService(
          this.get('categoryRepository'),
          this.get('premiumService'),
          this.get('budgetRepository')
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

      case 'savingsService':
        return new SavingsService({
          savingsRepository: this.get('savingsRepository'),
          expenseService: this.get('expenseService'),
          incomeService: this.get('incomeService'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          currencyUtils: this.get('currencyUtils')
        });

      case 'incomeService':
        return new IncomeService(
          this.get('incomeRepository'),
          this.get('userRepository')
        );

      case 'recurringExpenseService':
        return new RecurringExpenseService(
          this.get('recurringExpenseRepository'),
          this.get('userRepository'),
          this.get('notificationService'),
          this.get('localizationService'),
          this.get('formatter'),
          this.get('budgetService')
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
          paymentService: this.get('paymentService'),
          incomeService: this.get('incomeService'),
          funnelService: this.get('funnelService'),
          receiptService: this.get('receiptService')
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
          adminHandlers: this.get('adminHandlers'),
          incomeHandlers: this.get('incomeHandlers'),
          recurringExpenseHandlers: this.get('recurringExpenseHandlers'),
          expenseHandlers: this.get('expenseHandlers'),
          budgetHandlers: this.get('budgetHandlers'),
          exportHandlers: this.get('exportHandlers'),
          savingsHandlers: this.get('savingsHandlers'),
          assistantHandlers: this.get('assistantHandlers')
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
          keyboardGenerators: this.get('keyboardGenerators'),
          donationRepository: this.get('donationRepository'),
          funnelService: this.get('funnelService'),
          weeklyInsightService: this.get('weeklyInsightService')
        });

      case 'adminHandlers':
        return new AdminHandlers(
          this.get('adminService'),
          this.get('userService'),
          this.get('localizationService'),
          this.get('formatter'),
          this.get('stateService'),
          this.get('funnelService'),
          this.get('paymentService')
        );

      case 'expenseHandlers':
        return new ExpenseHandlers({
          expenseService: this.get('expenseService'),
          incomeService: this.get('incomeService'),
          recurringExpenseService: this.get('recurringExpenseService'),
          familyService: this.get('familyService'),
          premiumService: this.get('premiumService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          validator: this.get('enhancedValidator'),
          budgetService: this.get('budgetService'),
          reportService: this.get('reportService')
        });

      case 'budgetHandlers':
        return new BudgetHandlers({
          budgetService: this.get('budgetService'),
          expenseService: this.get('expenseService'),
          premiumService: this.get('premiumService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          validator: this.get('enhancedValidator')
        });

      case 'exportHandlers':
        return new ExportHandlers({
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService')
        });

      case 'savingsHandlers':
        return new SavingsHandlers({
          savingsService: this.get('savingsService'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          validator: this.get('enhancedValidator')
        });

      case 'incomeHandlers':
        return new IncomeHandlers({
          incomeService: this.get('incomeService'),
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          validator: this.get('enhancedValidator')
        });

      case 'recurringExpenseHandlers':
        return new RecurringExpenseHandlers({
          recurringExpenseService: this.get('recurringExpenseService'),
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          validator: this.get('enhancedValidator'),
          budgetService: this.get('budgetService')
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
          generateMainMenuKeyboard: (userLanguage, quickExpense = null) => generateMainMenuKeyboard(this.get('localizationService'), userLanguage, quickExpense),
          generateMoreMenu: (userLanguage, isAdmin = false) => generateMoreMenu(this.get('localizationService'), userLanguage, isAdmin),
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
      adminHandlers: this.get('adminHandlers'),
      incomeHandlers: this.get('incomeHandlers'),
      recurringExpenseHandlers: this.get('recurringExpenseHandlers'),
      expenseHandlers: this.get('expenseHandlers'),
      budgetHandlers: this.get('budgetHandlers'),
      exportHandlers: this.get('exportHandlers'),
      importHandlers: this.get('importHandlers'),
      receiptHandlers: this.get('receiptHandlers'),
      assistantHandlers: this.get('assistantHandlers'),
      savingsHandlers: this.get('savingsHandlers'),
      reportService: this.get('reportService'),
      dailySummaryService: this.get('dailySummaryService'),
      weeklyInsightService: this.get('weeklyInsightService'),
      recurringExpenseService: this.get('recurringExpenseService'),
      premiumLifecycleService: this.get('premiumLifecycleService'),
      funnelService: this.get('funnelService'),
      stateService: this.get('stateService'),
      expenseService: this.get('expenseService'),
      userService: this.get('userService'),
      premiumService: this.get('premiumService'),
      notificationService: this.get('notificationService'),
      paymentService: this.get('paymentService'),
      donationRepository: this.get('donationRepository'),
      expenseRepository: this.get('expenseRepository'),
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