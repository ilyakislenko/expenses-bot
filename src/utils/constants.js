// Константы для бота

// Количество записей не ограничено ни для кого: премиум даёт возможности, а не снимает блокировки
const USER_LIMITS = {
  regular: {
    MAX_DESCRIPTION_LENGTH: 80,
    ALLOW_CUSTOM_CATEGORIES: false,
    MAX_CUSTOM_CATEGORIES: 0,
    MAX_SAVINGS_GOALS: 1,
    MAX_RECEIPTS_PER_MONTH: 10, // распознанных фото чеков в локальный календарный месяц
    STREAK_FREEZES_PER_WEEK: 1, // заморозок серии в неделю (закрывают пропущенный день автоматически)
    MAX_ACTIVE_CHALLENGES: 1, // челленджей одновременно
  },
  premium: {
    MAX_DESCRIPTION_LENGTH: 160,
    ALLOW_CUSTOM_CATEGORIES: true,
    MAX_CUSTOM_CATEGORIES: 5,
    MAX_SAVINGS_GOALS: 10,
    MAX_RECEIPTS_PER_MONTH: 300,
    STREAK_FREEZES_PER_WEEK: 2,
    MAX_ACTIVE_CHALLENGES: Infinity,
  }
};

// Константы для пробного периода
const TRIAL_PERIOD = {
  DAYS: 14, // 14 дней пробного периода для новых пользователей
  TYPE: 'trial'
};

// Константы для тарифов премиум подписки. Скидки не хранятся: их считает tariffDiscount от месячной цены.
const PREMIUM_TARIFFS = {
  MONTH_1: {
    duration: 30,
    months: 1,
    stars: 149,
    usd: 2.99,
    rub: 259
  },
  MONTH_3: {
    duration: 90,
    months: 3,
    stars: 349,
    usd: 6.99,
    rub: 589
  },
  MONTH_6: {
    duration: 180,
    months: 6,
    stars: 599,
    usd: 11.98,
    rub: 999
  },
  MONTH_12: {
    duration: 365,
    months: 12,
    stars: 999,
    usd: 19.99,
    rub: 1649
  }
};

// Выгода тарифа относительно помесячной оплаты: цена «без скидки» = месячный тариф × число месяцев
function tariffDiscount(tariff) {
  const month = PREMIUM_TARIFFS.MONTH_1;
  const fullStars = month.stars * tariff.months;
  return {
    fullStars,
    fullUsd: month.usd * tariff.months,
    percent: Math.round((1 - tariff.stars / fullStars) * 100)
  };
}


// Главная reply-клавиатура: только частые разделы, остальное — в «☰ Ещё».
// quickExpense — быстрая кнопка-исключение: 'family' (траты по умолчанию личные) или 'personal'
// (включён режим «все траты в семью»); null — без кнопки (нет премиума или семьи)
function generateMainMenuKeyboard(localizationService, userLanguage, quickExpense = null) {
  const t = (key) => localizationService.getText(userLanguage, key);
  const keyboard = [
    [{ text: t('button_overview') }, { text: t('button_today') }],
    [{ text: t('button_income') }, { text: t('button_recurring') }]
  ];
  const quickKey = { family: 'family_add_expense', personal: 'button_personal_expense' }[quickExpense];
  if (quickKey) {
    keyboard.push([{ text: t(quickKey) }, { text: t('button_more') }]);
  } else {
    keyboard.push([{ text: t('button_more') }]);
  }
  return keyboard;
}

// Ключи кнопок старой reply-клавиатуры: у пользователей она остаётся в клиенте до первой отправки новой
const LEGACY_MENU_BUTTON_KEYS = [
  'button_expenses_month',
  'button_expenses_day',
  'button_expenses_categories',
  'button_delete_last',
  'button_settings',
  'button_help',
  'button_family',
  'button_menu',
  'premium_subscription_title',
  'button_admin'
];

// Меню «☰ Ещё» (inline)
function generateMoreMenu(localizationService, userLanguage, isAdmin = false) {
  const t = (key) => localizationService.getText(userLanguage, key);
  const keyboard = [
    [{ text: t('button_savings'), callback_data: 'sv' }],
    [{ text: t('button_achievements'), callback_data: 'ach' }],
    [{ text: t('button_family'), callback_data: 'family' }, { text: t('premium_subscription_title'), callback_data: 'premium_subscription' }],
    [{ text: t('button_export'), callback_data: 'export' }, { text: t('button_settings'), callback_data: 'settings' }],
    [{ text: t('button_import'), callback_data: 'import' }],
    [{ text: t('button_help'), callback_data: 'help' }]
  ];
  if (isAdmin) {
    keyboard.push([{ text: t('button_admin'), callback_data: 'panel_main' }]);
  }
  return keyboard;
}

// Функция для генерации клавиатуры выбора валюты
// callbackPrefix/backCallback позволяют переиспользовать клавиатуру (например, для валюты дохода)
function generateCurrencyKeyboard(localizationService, userLanguage, callbackPrefix = 'set_currency', backCallback = 'back_to_settings', callbackSuffix = '') {
  const button = (text, code) => ({ text, callback_data: `${callbackPrefix}|${code}${callbackSuffix}` });
  return [
    [
      button('₽ RUB', 'RUB'),
      button('$ USD', 'USD'),
      button('€ EUR', 'EUR')
    ],
    [
      button('₸ KZT', 'KZT'),
      button('¥ CNY', 'CNY'),
      button('¥ JPY', 'JPY')
    ],
    [
      button('₹ INR', 'INR'),
      button('₺ TRY', 'TRY'),
      button('₾ GEL', 'GEL')
    ],
    [
      button('сум UZS', 'UZS'),
      button('฿ THB', 'THB')
    ],
    [
      { text: localizationService.getText(userLanguage, 'button_back'), callback_data: backCallback }
    ]
  ];
}

// Клавиатура настроек: значения показываются в тексте экрана, кнопки — короткие
function generateSettingsKeyboard(localizationService, userLanguage) {
  const t = (key) => localizationService.getText(userLanguage, key);
  return [
    [{ text: t('button_currencies'), callback_data: 'settings_currencies' }, { text: t('button_change_timezone'), callback_data: 'change_timezone' }],
    [{ text: t('button_change_language'), callback_data: 'change_language' }, { text: t('button_change_period_start'), callback_data: 'change_period_start' }],
    [{ text: t('button_reminders'), callback_data: 'configure_reminder_hours' }, { text: t('button_custom_categories'), callback_data: 'custom_categories' }],
    [{ text: t('button_back'), callback_data: 'back_to_menu' }]
  ];
}

// Клавиатура выбора времени: часы 0–23 с текущими минутами UTC.
// Пояс считается от даты сообщения с клавиатурой (handleTimezoneSelection), поэтому позднее нажатие не сдвигает его.
// onboarding: кнопки несут признак шага онбординга (`|ob`), «Назад» ведёт на предыдущий шаг (валюта), а не в Настройки.
function generateTimeKeyboard(localizationService, userLanguage, { onboarding = false } = {}) {
  const keyboard = [];
  const currentUtcMinutes = new Date().getUTCMinutes();
  const suffix = onboarding ? '|ob' : '';

  // 6 рядов по 4 кнопки (0-23 часа)
  for (let row = 0; row < 6; row++) {
    const rowButtons = [];
    for (let col = 0; col < 4; col++) {
      const hour = row * 4 + col;
      rowButtons.push({
        text: `${hour.toString().padStart(2, '0')}:${currentUtcMinutes.toString().padStart(2, '0')}`,
        callback_data: `time|${hour}|${currentUtcMinutes}${suffix}`
      });
    }
    keyboard.push(rowButtons);
  }

  keyboard.push([{
    text: localizationService.getText(userLanguage, 'button_back'),
    callback_data: onboarding ? 'ob_currency' : 'back_to_settings'
  }]);

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

module.exports = {
  USER_LIMITS,
  PREMIUM_TARIFFS,
  tariffDiscount,
  TRIAL_PERIOD,
  generateMainMenuKeyboard,
  generateMoreMenu,
  LEGACY_MENU_BUTTON_KEYS,
  generateCurrencyKeyboard,
  generateSettingsKeyboard,
  generateTimeKeyboard,
  generatePremiumPaymentButtons
}; 