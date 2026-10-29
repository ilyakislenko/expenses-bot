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
const FamilyPremiumRepository = require('./repositories/FamilyPremiumRepository');
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
const GroupRepository = require('./repositories/GroupRepository');
const PendingJobRepository = require('./repositories/PendingJobRepository');
const PendingJobService = require('./services/PendingJobService');
const PlanningRepository = require('./repositories/PlanningRepository');
const AchievementRepository = require('./repositories/AchievementRepository');
const CoinRepository = require('./repositories/CoinRepository');
const DailyPlanRepository = require('./repositories/DailyPlanRepository');
const ReferralRepository = require('./repositories/ReferralRepository');
const AssistantRepository = require('./repositories/AssistantRepository');
const EntryBatchRepository = require('./repositories/EntryBatchRepository');
const RoastRepository = require('./repositories/RoastRepository');
const UserInputStateRepository = require('./repositories/UserInputStateRepository');
const QuizRepository = require('./repositories/QuizRepository');
const BankNotificationRepository = require('./repositories/BankNotificationRepository');

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
const FamilyPremiumService = require('./services/FamilyPremiumService');
const FamilyPremiumHandlers = require('./handlers/FamilyPremiumHandlers');
const BudgetService = require('./services/BudgetService');
const ReportService = require('./services/ReportService');
const DailySummaryService = require('./services/DailySummaryService');
const WeeklyInsightService = require('./services/WeeklyInsightService');
const ImportService = require('./services/ImportService');
const ReceiptService = require('./services/ReceiptService');
const GroupService = require('./services/GroupService');
const PlanningService = require('./services/PlanningService');
const SubscriptionAlertService = require('./services/SubscriptionAlertService');
const AchievementService = require('./services/AchievementService');
const CoinService = require('./services/CoinService');
const DailyPlanService = require('./services/DailyPlanService');
const CoinHandlers = require('./handlers/CoinHandlers');
const TagHandlers = require('./handlers/TagHandlers');
const DailyPlanHandlers = require('./handlers/DailyPlanHandlers');
const ReferralService = require('./services/ReferralService');
const { createProviderFromEnv: createReceiptProvider } = require('./services/receipt/chain');
const AssistantService = require('./services/AssistantService');
const { createAssistantProvider } = require('./services/assistant/model');
const EntryBatchService = require('./services/EntryBatchService');
const VoiceService = require('./services/VoiceService');
const BankNotificationService = require('./services/BankNotificationService');
const RoastService = require('./services/RoastService');
const { createSttFromEnv } = require('./services/voice/whisper');
const QuizService = require('./services/QuizService');

// Handlers
const CommandHandlers = require('./handlers/commands');
const MessageHandlers = require('./handlers/messages');
const CallbackHandlers = require('./handlers/callbacks');
const AdminHandlers = require('./handlers/AdminHandlers');
const IncomeHandlers = require('./handlers/IncomeHandlers');
const SavingsHandlers = require('./handlers/SavingsHandlers');
const BankNotificationHandlers = require('./handlers/BankNotificationHandlers');
const RecurringExpenseHandlers = require('./handlers/RecurringExpenseHandlers');
const ExpenseHandlers = require('./handlers/ExpenseHandlers');
const BudgetHandlers = require('./handlers/BudgetHandlers');
const ExportHandlers = require('./handlers/ExportHandlers');
const ImportHandlers = require('./handlers/ImportHandlers');
const ReceiptHandlers = require('./handlers/ReceiptHandlers');
const GroupHandlers = require('./handlers/GroupHandlers');
const PlanningHandlers = require('./handlers/PlanningHandlers');
const SubscriptionHandlers = require('./handlers/SubscriptionHandlers');
const AchievementHandlers = require('./handlers/AchievementHandlers');
const ChartHandlers = require('./handlers/ChartHandlers');
const ChartService = require('./services/ChartService');
const ChartRenderer = require('./services/ChartRenderer');
const ReferralHandlers = require('./handlers/ReferralHandlers');
const AssistantHandlers = require('./handlers/AssistantHandlers');
const MultiEntryHandlers = require('./handlers/MultiEntryHandlers');
const RoastHandlers = require('./handlers/RoastHandlers');
const OnboardingHandlers = require('./handlers/OnboardingHandlers');
const OnboardingService = require('./services/OnboardingService');
const QuizHandlers = require('./handlers/QuizHandlers');

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

      case 'familyPremiumRepository':
        return new FamilyPremiumRepository();

      // Семейный тариф: покупка, возврат, места в семье, уведомления (право на премиум — PremiumService)
      case 'familyPremiumService':
        return new FamilyPremiumService({
          familyPremiumRepository: this.get('familyPremiumRepository'),
          familyRepository: this.get('familyRepository'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          userNotificationRepository: this.get('userNotificationRepository'),
          notificationService: this.get('notificationService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter')
        });

      case 'familyPremiumHandlers':
        return new FamilyPremiumHandlers({
          familyPremiumService: this.get('familyPremiumService'),
          paymentService: this.get('paymentService'),
          userService: this.get('userService'),
          stateService: this.get('stateService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter')
        });

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
          receiptService: this.get('receiptService'),
          achievementService: this.get('achievementService')
        });

      case 'receiptRepository':
        return new ReceiptRepository();

      // Групповой режим: общие расходы чатов, делёж чеков, «🎫 Пропуск для группы»
      case 'groupRepository':
        return new GroupRepository();

      case 'groupService':
        return new GroupService({
          groupRepository: this.get('groupRepository'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          currencyUtils: this.get('currencyUtils'),
          expenseService: this.get('expenseService')
        });

      case 'groupHandlers':
        return new GroupHandlers({
          groupService: this.get('groupService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          validator: this.get('enhancedValidator'),
          receiptService: this.get('receiptService'),
          receiptHandlers: this.get('receiptHandlers'),
          paymentService: this.get('paymentService')
        });

      // Фоновые распознавания (чек, голос) с сообщением-статусом: после перезапуска — «прервалось»
      case 'pendingJobService':
        return new PendingJobService({
          pendingJobRepository: new PendingJobRepository(),
          userService: this.get('userService'),
          localizationService: this.get('localizationService')
        });

      case 'achievementRepository':
        return new AchievementRepository();

      // Серия, достижения, челленджи, «Итоги месяца»; track() вызывают обработчики действий
      case 'achievementService':
        return new AchievementService({
          achievementRepository: this.get('achievementRepository'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          expenseService: this.get('expenseService'),
          reportService: this.get('reportService'),
          budgetService: this.get('budgetService'),
          savingsService: this.get('savingsService'),
          currencyUtils: this.get('currencyUtils'),
          formatter: this.get('formatter'),
          localizationService: this.get('localizationService'),
          notificationService: this.get('notificationService'),
          userNotificationRepository: this.get('userNotificationRepository'),
          chartService: this.get('chartService'),
          coinService: this.get('coinService')
        });

      // «🪙 Монеты»: журнал с ключами идемпотентности, обмен на дни премиума (UserService.grantRewardDays)
      case 'coinRepository':
        return new CoinRepository();

      case 'coinService':
        return new CoinService({
          coinRepository: this.get('coinRepository'),
          userService: this.get('userService'),
          achievementRepository: this.get('achievementRepository')
        });

      // «🏷 Теги»: траты с «#тегом» в описании — суммы по тегам
      case 'tagHandlers':
        return new TagHandlers({
          expenseRepository: this.get('expenseRepository'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          currencyUtils: this.get('currencyUtils')
        });

      case 'coinHandlers':
        return new CoinHandlers({
          coinService: this.get('coinService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter')
        });

      // «☀️ План на день»: утром — «можно сегодня», вчера против плана, платежи, серия
      case 'dailyPlanRepository':
        return new DailyPlanRepository();

      case 'dailyPlanService':
        return new DailyPlanService({
          dailyPlanRepository: this.get('dailyPlanRepository'),
          planningService: this.get('planningService'),
          achievementService: this.get('achievementService'),
          roastService: this.get('roastService'),
          coinService: this.get('coinService'),
          userService: this.get('userService'),
          userNotificationRepository: this.get('userNotificationRepository'),
          notificationService: this.get('notificationService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter')
        });

      case 'dailyPlanHandlers':
        return new DailyPlanHandlers({
          dailyPlanService: this.get('dailyPlanService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService')
        });

      // Графики картинками: SVG → PNG без браузера (@resvg/resvg-js), шрифты — assets/fonts + системный CJK
      case 'chartRenderer':
        return new ChartRenderer();

      case 'chartService':
        return new ChartService({
          expenseService: this.get('expenseService'),
          reportService: this.get('reportService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          chartRenderer: this.get('chartRenderer')
        });

      case 'chartHandlers':
        return new ChartHandlers({
          chartService: this.get('chartService'),
          achievementService: this.get('achievementService'),
          premiumService: this.get('premiumService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          referralService: this.get('referralService')
        });

      case 'achievementHandlers':
        return new AchievementHandlers({
          achievementService: this.get('achievementService'),
          expenseService: this.get('expenseService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          chartService: this.get('chartService'),
          coinService: this.get('coinService')
        });

      case 'referralRepository':
        return new ReferralRepository();

      case 'referralService':
        return new ReferralService({
          referralRepository: this.get('referralRepository'),
          userService: this.get('userService'),
          notificationService: this.get('notificationService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter')
        });

      case 'referralHandlers':
        return new ReferralHandlers({
          referralService: this.get('referralService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService')
        });

      case 'quizRepository':
        return new QuizRepository();

      // «🎲 Угадай свои траты» — квиз недели: вопросы из своих трат, опросы-викторины, розыгрыш дней премиума
      case 'quizService':
        return new QuizService({
          quizRepository: this.get('quizRepository'),
          userService: this.get('userService'),
          expenseService: this.get('expenseService'),
          incomeService: this.get('incomeService'),
          budgetService: this.get('budgetService'),
          currencyUtils: this.get('currencyUtils'),
          formatter: this.get('formatter'),
          localizationService: this.get('localizationService'),
          notificationService: this.get('notificationService'),
          userNotificationRepository: this.get('userNotificationRepository'),
          achievementService: this.get('achievementService'),
          chartService: this.get('chartService')
        });

      case 'quizHandlers':
        return new QuizHandlers({
          quizService: this.get('quizService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService')
        });
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
          funnelService: this.get('funnelService'),
          referralService: this.get('referralService')
        });

      case 'receiptHandlers':
        return new ReceiptHandlers({
          receiptService: this.get('receiptService'),
          expenseHandlers: this.get('expenseHandlers'),
          expenseService: this.get('expenseService'),
          budgetService: this.get('budgetService'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          validator: this.get('enhancedValidator'),
          achievementService: this.get('achievementService'),
          referralService: this.get('referralService'),
          pendingJobService: this.get('pendingJobService')
        });

      case 'planningRepository':
        return new PlanningRepository();

      case 'planningService':
        return new PlanningService({
          planningRepository: this.get('planningRepository'),
          expenseService: this.get('expenseService'),
          recurringExpenseService: this.get('recurringExpenseService'),
          budgetService: this.get('budgetService'),
          premiumService: this.get('premiumService'),
          userService: this.get('userService'),
          userNotificationRepository: this.get('userNotificationRepository'),
          notificationService: this.get('notificationService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          currencyUtils: this.get('currencyUtils')
        });

      // Предупреждения о списании подписок, пробные периоды, «Как отменить»
      case 'subscriptionAlertService':
        return new SubscriptionAlertService({
          planningService: this.get('planningService'),
          planningRepository: this.get('planningRepository'),
          expenseService: this.get('expenseService'),
          userNotificationRepository: this.get('userNotificationRepository'),
          notificationService: this.get('notificationService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter')
        });

      case 'subscriptionHandlers':
        return new SubscriptionHandlers({
          subscriptionAlertService: this.get('subscriptionAlertService'),
          planningService: this.get('planningService'),
          planningHandlers: this.get('planningHandlers'),
          recurringExpenseHandlers: this.get('recurringExpenseHandlers'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          referralService: this.get('referralService')
        });

      case 'planningHandlers':
        return new PlanningHandlers({
          planningService: this.get('planningService'),
          subscriptionAlertService: this.get('subscriptionAlertService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService')
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
          planningService: this.get('planningService'),
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

      case 'roastRepository':
        return new RoastRepository();

      // «😈 Злой режим»: подколки после записи, строка к сводке недели, «Разнос месяца»
      case 'roastService':
        return new RoastService({
          roastRepository: this.get('roastRepository'),
          expenseService: this.get('expenseService'),
          budgetService: this.get('budgetService'),
          planningService: this.get('planningService'),
          premiumService: this.get('premiumService'),
          reportService: this.get('reportService'),
          userNotificationRepository: this.get('userNotificationRepository'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          currencyUtils: this.get('currencyUtils')
        });

      case 'roastHandlers':
        return new RoastHandlers({
          roastService: this.get('roastService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService')
        });

      case 'onboardingService':
        return new OnboardingService({
          userService: this.get('userService'),
          budgetService: this.get('budgetService'),
          planningService: this.get('planningService'),
          achievementService: this.get('achievementService'),
          dailyPlanService: this.get('dailyPlanService'),
          premiumService: this.get('premiumService'),
          funnelService: this.get('funnelService')
        });

      case 'onboardingHandlers':
        return new OnboardingHandlers({
          onboardingService: this.get('onboardingService'),
          userService: this.get('userService'),
          roastService: this.get('roastService'),
          roastHandlers: this.get('roastHandlers'),
          commandHandlers: this.get('commandHandlers'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          stateService: this.get('stateService'),
          validator: this.get('enhancedValidator'),
          premiumService: this.get('premiumService'),
          referralService: this.get('referralService'),
          voiceService: this.get('voiceService'),
          receiptService: this.get('receiptService')
        });

      case 'entryBatchRepository':
        return new EntryBatchRepository();

      case 'entryBatchService':
        return new EntryBatchService({
          entryBatchRepository: this.get('entryBatchRepository'),
          expenseService: this.get('expenseService'),
          incomeService: this.get('incomeService'),
          userService: this.get('userService'),
          funnelService: this.get('funnelService'),
          referralService: this.get('referralService')
        });

      // Распознавание речи из VOICE_STT_* (smoke-тесты подменяют его через instances); null — голос не настроен
      case 'voiceStt':
        return createSttFromEnv(process.env);

      case 'voiceService':
        return new VoiceService({
          stt: this.get('voiceStt'),
          entryBatchRepository: this.get('entryBatchRepository'),
          premiumService: this.get('premiumService'),
          languageMode: process.env.VOICE_STT_LANGUAGE
        });

      case 'multiEntryHandlers':
        return new MultiEntryHandlers({
          entryBatchService: this.get('entryBatchService'),
          voiceService: this.get('voiceService'),
          expenseHandlers: this.get('expenseHandlers'),
          incomeHandlers: this.get('incomeHandlers'),
          expenseService: this.get('expenseService'),
          incomeService: this.get('incomeService'),
          premiumService: this.get('premiumService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter'),
          validator: this.get('enhancedValidator'),
          achievementService: this.get('achievementService'),
          assistantHandlers: this.get('assistantHandlers'),
          pendingJobService: this.get('pendingJobService')
        });

      case 'bankNotificationRepository':
        return new BankNotificationRepository();

      // Уведомления банка: шаблоны, иначе нейросеть «Спроси бота» (assistantProvider — общая очередь с чеками)
      case 'bankNotificationService':
        return new BankNotificationService({
          bankNotificationRepository: this.get('bankNotificationRepository'),
          entryBatchService: this.get('entryBatchService'),
          userService: this.get('userService'),
          premiumService: this.get('premiumService'),
          validator: this.get('enhancedValidator'),
          provider: this.get('assistantProvider')
        });

      case 'bankNotificationHandlers':
        return new BankNotificationHandlers({
          bankNotificationService: this.get('bankNotificationService'),
          multiEntryHandlers: this.get('multiEntryHandlers'),
          expenseHandlers: this.get('expenseHandlers'),
          incomeHandlers: this.get('incomeHandlers'),
          expenseService: this.get('expenseService'),
          incomeService: this.get('incomeService'),
          premiumService: this.get('premiumService'),
          userService: this.get('userService'),
          localizationService: this.get('localizationService'),
          formatter: this.get('formatter')
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

      case 'userInputStateRepository':
        return new UserInputStateRepository();

      // Ожидаемый ввод и черновики: память + user_input_states (переживают перезапуск, загрузка — hydrate() при старте)
      case 'stateService':
        return new StateService(this.get('userInputStateRepository'));

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
          this.get('formatter'),
          this.get('familyPremiumService')
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
          formatter: this.get('formatter'),
          achievementService: this.get('achievementService'),
          dailyPlanService: this.get('dailyPlanService')
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
          formatter: this.get('formatter'),
          planningService: this.get('planningService'),
          roastService: this.get('roastService'),
          subscriptionAlertService: this.get('subscriptionAlertService')
        });

      case 'expenseService':
        return new ExpenseService(
          this.get('expenseRepository'),
          this.get('userRepository'),
          this.get('categoryRepository'),
          this.get('premiumService'),
          this.get('funnelService'),
          this.get('referralService')
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
          this.get('userService'),
          this.get('familyPremiumRepository')
        );

      case 'paymentService':
        // Создаем PaymentService с отложенной инициализацией бота
        const paymentService = new PaymentService(
          this.get('donationRepository'),
          this.get('localizationService'),
          this.get('funnelService'),
          this.get('premiumTransactionRepository'),
          this.get('userRepository'),
          this.get('familyPremiumService')
        );
        paymentService.setGroupService(this.get('groupService'));
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
          this.get('premiumService'),
          this.get('familyPremiumService')
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
          this.get('localizationService'),
          this.get('familyPremiumService')
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
          receiptService: this.get('receiptService'),
          referralService: this.get('referralService'),
          voiceService: this.get('voiceService'),
          roastService: this.get('roastService'),
          quizHandlers: this.get('quizHandlers'),
          familyPremiumService: this.get('familyPremiumService')
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
          planningHandlers: this.get('planningHandlers'),
          subscriptionHandlers: this.get('subscriptionHandlers'),
          assistantHandlers: this.get('assistantHandlers'),
          multiEntryHandlers: this.get('multiEntryHandlers'),
          onboardingHandlers: this.get('onboardingHandlers'),
          receiptHandlers: this.get('receiptHandlers'),
          bankNotificationHandlers: this.get('bankNotificationHandlers')
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
          weeklyInsightService: this.get('weeklyInsightService'),
          planningService: this.get('planningService'),
          achievementService: this.get('achievementService'),
          onboardingHandlers: this.get('onboardingHandlers'),
          subscriptionAlertService: this.get('subscriptionAlertService'),
          dailyPlanService: this.get('dailyPlanService'),
          quizService: this.get('quizService')
        });

      case 'adminHandlers':
        return new AdminHandlers(
          this.get('adminService'),
          this.get('userService'),
          this.get('localizationService'),
          this.get('formatter'),
          this.get('stateService'),
          this.get('funnelService'),
          this.get('paymentService'),
          this.get('referralService')
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
          reportService: this.get('reportService'),
          planningService: this.get('planningService'),
          achievementService: this.get('achievementService'),
          roastService: this.get('roastService'),
          chartService: this.get('chartService')
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
          validator: this.get('enhancedValidator'),
          achievementService: this.get('achievementService'),
          referralService: this.get('referralService')
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
          validator: this.get('enhancedValidator'),
          achievementService: this.get('achievementService'),
          referralService: this.get('referralService')
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
          validator: this.get('enhancedValidator'),
          achievementService: this.get('achievementService')
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
          budgetService: this.get('budgetService'),
          subscriptionAlertService: this.get('subscriptionAlertService')
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
      achievementHandlers: this.get('achievementHandlers'),
      chartHandlers: this.get('chartHandlers'),
      achievementService: this.get('achievementService'),
      coinService: this.get('coinService'),
      coinHandlers: this.get('coinHandlers'),
      tagHandlers: this.get('tagHandlers'),
      dailyPlanService: this.get('dailyPlanService'),
      dailyPlanHandlers: this.get('dailyPlanHandlers'),
      exportHandlers: this.get('exportHandlers'),
      importHandlers: this.get('importHandlers'),
      receiptHandlers: this.get('receiptHandlers'),
      groupHandlers: this.get('groupHandlers'),
      groupService: this.get('groupService'),
      referralHandlers: this.get('referralHandlers'),
      familyPremiumHandlers: this.get('familyPremiumHandlers'),
      familyPremiumService: this.get('familyPremiumService'),
      referralService: this.get('referralService'),
      assistantHandlers: this.get('assistantHandlers'),
      multiEntryHandlers: this.get('multiEntryHandlers'),
      bankNotificationHandlers: this.get('bankNotificationHandlers'),
      pendingJobService: this.get('pendingJobService'),
      roastHandlers: this.get('roastHandlers'),
      quizHandlers: this.get('quizHandlers'),
      quizService: this.get('quizService'),
      onboardingHandlers: this.get('onboardingHandlers'),
      savingsHandlers: this.get('savingsHandlers'),
      planningHandlers: this.get('planningHandlers'),
      planningService: this.get('planningService'),
      subscriptionHandlers: this.get('subscriptionHandlers'),
      subscriptionAlertService: this.get('subscriptionAlertService'),
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