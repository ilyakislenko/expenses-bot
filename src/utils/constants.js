// Константы для бота

const USER_LIMITS = {
  regular: {
    MAX_DESCRIPTION_LENGTH: 80,
    MAX_NOTES_COUNT: 100,
    NOTE_RETENTION_DAYS: 90,
    ALLOW_CUSTOM_CATEGORIES: false,
    MAX_CUSTOM_CATEGORIES: 0,
  },
  premium: {
    MAX_DESCRIPTION_LENGTH: 160,
    MAX_NOTES_COUNT: 300,
    NOTE_RETENTION_DAYS: null, // null = неограниченно
    ALLOW_CUSTOM_CATEGORIES: true,
    MAX_CUSTOM_CATEGORIES: 5,
  }
};

// Константы для пробного периода
const TRIAL_PERIOD = {
  DAYS: 14, // 14 дней пробного периода для новых пользователей
  TYPE: 'trial'
};

//Константы для тарифов премиум подписки
const PREMIUM_TARIFFS = {
  MONTH_1: {
    duration: 30,
    stars: 149,
    usd: 2.99,
    rub: 259,
    originalStars: null,
    discount: null,
    monthlyUsd: 2.99,
    monthlyRub: 299
  },
  MONTH_3: {
    duration: 90,
    stars: 349,
    usd: 6.99,
    rub: 589,
    originalStars: 447,
    discount: 25,
    monthlyUsd: 2.33,
    monthlyRub: 196
  },
  MONTH_6: {
    duration: 180,
    stars: 599,
    usd: 11.98,
    rub: 999,
    originalStars: 894,
    discount: 36,
    monthlyUsd: 1.99,
    monthlyRub: 167
  },
  MONTH_12: {
    duration: 365,
    stars: 999,
    usd: 19.99,
    rub: 1649,
    originalStars: 1788,
    discount: 48,
    monthlyUsd: 1.67,
    monthlyRub: 137
  }
};


// Функция для генерации главного меню (reply-клавиатура)
function generateMainMenuKeyboard(localizationService, userLanguage, isAdmin = false, hasFamily = false, isPremium = false) {
  const keyboard = [
    [{ text: localizationService.getText(userLanguage, 'button_help') }],
    [
      { text: localizationService.getText(userLanguage, 'button_expenses_month') }, 
      { text: localizationService.getText(userLanguage, 'button_expenses_day') }
    ],
    [{ text: localizationService.getText(userLanguage, 'button_expenses_categories') }],
    [{ text: localizationService.getText(userLanguage, 'button_export') }],
    [{ text: localizationService.getText(userLanguage, 'button_family') }]
  ];

  // Добавляем кнопку "добавить семейную трату" только если у пользователя есть семья и премиум
  if (hasFamily && isPremium) {
    keyboard.push([{ text: localizationService.getText(userLanguage, 'family_add_expense') }]);
  }

  keyboard.push(
    [{ text: localizationService.getText(userLanguage, 'button_settings') }],
    [{ text: localizationService.getText(userLanguage, 'button_delete_last') }],
    [{ text: localizationService.getText(userLanguage, 'premium_subscription_title') }]
  );

  // Добавляем кнопку админки только для администраторов
  if (isAdmin) {
    keyboard.push([{ text: localizationService.getText(userLanguage, 'button_admin') }]);
  }

  return keyboard;
}

// Функция для генерации inline-меню
function generateInlineMainMenu(localizationService, userLanguage, isAdmin = false) {
  const keyboard = [
    [{ text: localizationService.getText(userLanguage, 'button_help'), callback_data: 'help' }],
    [
      { text: localizationService.getText(userLanguage, 'button_expenses_month'), callback_data: 'stats' }, 
      { text: localizationService.getText(userLanguage, 'button_expenses_day'), callback_data: 'history' }
    ],
    [{ text: localizationService.getText(userLanguage, 'button_expenses_categories'), callback_data: 'categories' }],
    [{ text: localizationService.getText(userLanguage, 'button_export'), callback_data: 'export_menu' }],
    [{ text: localizationService.getText(userLanguage, 'button_family'), callback_data: 'family' }],
    [{ text: localizationService.getText(userLanguage, 'button_settings'), callback_data: 'settings' }],
    [{ text: localizationService.getText(userLanguage, 'button_delete_last'), callback_data: 'undo' }],
    [{ text: localizationService.getText(userLanguage, 'premium_subscription_title'), callback_data: 'premium_subscription' }]
  ];

  // Добавляем кнопку админки только для администраторов
  if (isAdmin) {
    keyboard.push([{ text: localizationService.getText(userLanguage, 'button_admin'), callback_data: 'panel_main' }]);
  }

  return keyboard;
}

// Функция для генерации клавиатуры выбора валюты
function generateCurrencyKeyboard(localizationService, userLanguage) {
  return [
    [
      { text: '₽ RUB', callback_data: 'set_currency|RUB' },
      { text: '$ USD', callback_data: 'set_currency|USD' },
      { text: '€ EUR', callback_data: 'set_currency|EUR' }
    ],
    [
      { text: '₸ KZT', callback_data: 'set_currency|KZT' },
      { text: '¥ CNY', callback_data: 'set_currency|CNY' },
      { text: '¥ JPY', callback_data: 'set_currency|JPY' }
    ],
    [
      { text: '₹ INR', callback_data: 'set_currency|INR' },
      { text: '₺ TRY', callback_data: 'set_currency|TRY' },
      { text: '₾ GEL', callback_data: 'set_currency|GEL' }
    ],
    [
      { text: 'сум UZS', callback_data: 'set_currency|UZS' },
      { text: '฿ THB', callback_data: 'set_currency|THB' }
    ],
    [
      { text: localizationService.getText(userLanguage, 'button_back'), callback_data: 'back_to_settings' }
    ]
  ];
}

// Функция для генерации клавиатуры настроек
function generateSettingsKeyboard(localizationService, userLanguage, reminderEnabled = false, options = {}) {
  const { dailySummaryEnabled = false, categoryLimitsEnabled = false, globalLimitsEnabled = false } = options || {};
  const reminderIcon = reminderEnabled ? '🟢' : '⚫';
  const summaryIcon = dailySummaryEnabled ? '🟢' : '⚫';
  const notificationsText = `${reminderIcon} ${localizationService.getText(userLanguage, 'button_notifications_management') || 'Управление оповещениями'}`;
  const limitsIcon = (categoryLimitsEnabled || globalLimitsEnabled) ? '🟢' : '⚫';
  const limitsManagementText = `${limitsIcon} ${localizationService.getText(userLanguage, 'button_limits_management') || 'Управление лимитами'}`;
  
  return [
    [{ text: localizationService.getText(userLanguage, 'button_change_currency'), callback_data: 'change_currency' }],
    [{ text: localizationService.getText(userLanguage, 'button_change_timezone'), callback_data: 'change_timezone' }],
    [{ text: localizationService.getText(userLanguage, 'button_change_language'), callback_data: 'change_language' }],
    [{ text: localizationService.getText(userLanguage, 'button_change_period_start'), callback_data: 'change_period_start' }],
    [{ text: notificationsText, callback_data: 'notifications_management_menu' }],
    [{ text: limitsManagementText, callback_data: 'limits_management_menu' }],
    [{ text: localizationService.getText(userLanguage, 'button_custom_categories'), callback_data: 'custom_categories' }],
    [{ text: localizationService.getText(userLanguage, 'button_bug_report'), callback_data: 'bug_report' }],
    [{ text: localizationService.getText(userLanguage, 'button_back'), callback_data: 'back_to_menu' }]
  ];
}

// Функция для генерации клавиатуры выбора времени
function generateTimeKeyboard(localizationService, userLanguage) {
  const keyboard = [];
  const currentUtcTime = new Date();
  const currentUtcHours = currentUtcTime.getUTCHours();
  const currentUtcMinutes = currentUtcTime.getUTCMinutes();
  
  // Создаем 6 рядов по 4 кнопки (0-23 часа)
  for (let row = 0; row < 6; row++) {
    const rowButtons = [];
    for (let col = 0; col < 4; col++) {
      const hour = row * 4 + col;
      if (hour <= 23) {
        const timeText = `${hour.toString().padStart(2, '0')}:${currentUtcMinutes.toString().padStart(2, '0')}`;
        rowButtons.push({
          text: timeText,
          callback_data: `time|${hour}|${currentUtcMinutes}`
        });
      }
    }
    if (rowButtons.length > 0) {
      keyboard.push(rowButtons);
    }
  }
  
  // Добавляем кнопку "Назад"
  keyboard.push([{ text: localizationService.getText(userLanguage, 'button_back'), callback_data: 'back_to_settings' }]);
  
  return keyboard;
}

// Ранее здесь были функции форматирования тарифов с USD/RUB и русским текстом.
// Они удалены в пользу полностью локализованного рендеринга в обработчике, 
// где известно, какая базовая валюта у пользователя и какой язык интерфейса.

// Функция для генерации кнопок оплаты тарифов (синхронная версия)
function generatePremiumPaymentButtons(tariffs, localizationService, userLanguage) {
  const buttons = [];
  
  // Создаем кнопки для каждого тарифа
  Object.keys(tariffs).forEach((tariffKey) => {
    const tariff = tariffs[tariffKey];
    const duration = tariff.duration;
    
    // Локализованный текст кнопки
    const key = duration === 30 ? 'tariff_button_30' 
      : duration === 90 ? 'tariff_button_90' 
      : duration === 180 ? 'tariff_button_180' 
      : 'tariff_button_365';
    const durationLabel = localizationService.getText(userLanguage, key);
    let buttonText = durationLabel || `${duration}d`;
    
    // Добавляем звезды к тексту кнопки
    buttonText += ` - ${tariff.stars} ⭐️`;
    
    buttons.push({
      text: buttonText,
      tariffKey: tariffKey.toLowerCase()
    });
  });
  
  // Группируем кнопки по 2 в ряд
  const groupedButtons = [];
  for (let i = 0; i < buttons.length; i += 2) {
    const row = [buttons[i]];
    if (buttons[i + 1]) {
      row.push(buttons[i + 1]);
    }
    groupedButtons.push(row);
  }
  
  return groupedButtons;
}

// Меню "Управление лимитами"
function generateLimitsManagementKeyboard(localizationService, userLanguage, options = {}) {
  const { categoryLimitsEnabled = false, globalLimitsEnabled = false } = options || {};
  const catIcon = categoryLimitsEnabled ? '🟢' : '⚫';
  const globIcon = globalLimitsEnabled ? '🟢' : '⚫';
  return [
    [{ text: `${catIcon} ${localizationService.getText(userLanguage, 'button_toggle_category_limits') || 'Лимиты по категориям'}`, callback_data: 'toggle_category_limits' }],
    [{ text: `${globIcon} ${localizationService.getText(userLanguage, 'button_toggle_global_limits') || 'Глобальные лимиты (д/м)'}`, callback_data: 'toggle_global_limits' }],
    [{ text: localizationService.getText(userLanguage, 'button_category_limits') || 'Лимиты на категории', callback_data: 'category_limits_menu' }],
    [{ text: localizationService.getText(userLanguage, 'button_set_daily_limit') || 'Установить дневной лимит', callback_data: 'set_daily_limit' }],
    [{ text: localizationService.getText(userLanguage, 'button_set_monthly_limit') || 'Установить месячный лимит', callback_data: 'set_monthly_limit' }],
    [{ text: localizationService.getText(userLanguage, 'button_back'), callback_data: 'back_to_settings' }]
  ];
}

function generateNotificationsManagementKeyboard(localizationService, userLanguage, options = {}) {
  const { reminderEnabled = false, dailySummaryEnabled = false } = options || {};
  const reminderIcon = reminderEnabled ? '🟢' : '⚫';
  const summaryIcon = dailySummaryEnabled ? '🟢' : '⚫';
  return [
    [{ text: `${reminderIcon} ${localizationService.getText(userLanguage, 'button_reminders')}`, callback_data: 'toggle_reminders' }],
    [{ text: localizationService.getText(userLanguage, 'button_configure_reminder_hours'), callback_data: 'configure_reminder_hours' }],
    [{ text: `${summaryIcon} ${localizationService.getText(userLanguage, 'button_daily_summary') || 'Ежедневная сводка'}`, callback_data: 'toggle_daily_summary' }],
    [{ text: localizationService.getText(userLanguage, 'button_configure_daily_summary') || 'Настроить час сводки', callback_data: 'configure_daily_summary_hour' }],
    [{ text: localizationService.getText(userLanguage, 'button_back'), callback_data: 'back_to_settings' }]
  ];
}

module.exports = {
  USER_LIMITS,
  PREMIUM_TARIFFS,
  TRIAL_PERIOD,
  generateMainMenuKeyboard,
  generateInlineMainMenu,
  generateCurrencyKeyboard,
  generateSettingsKeyboard,
  generateNotificationsManagementKeyboard,
  generateTimeKeyboard,
  generatePremiumPaymentButtons,
  generateLimitsManagementKeyboard
}; 