// Константы для бота

// Количество записей не ограничено ни для кого: премиум даёт возможности, а не снимает блокировки
const USER_LIMITS = {
  regular: {
    MAX_DESCRIPTION_LENGTH: 80,
    ALLOW_CUSTOM_CATEGORIES: false,
    MAX_CUSTOM_CATEGORIES: 0,
    MAX_SAVINGS_GOALS: 1,
    MAX_RECEIPTS_PER_MONTH: 10, // распознанных фото чеков в локальный календарный месяц
    PLANNING_SUBSCRIPTIONS: 3, // подписок в списке и с предупреждением о списании (остальные — числом и суммой)
    SUB_TRIALS: 1, // пробных периодов с напоминанием одновременно
    PLANNING_INFLATION_ITEMS: 1, // «Моя инфляция»: тизер — одна позиция, без процента корзины
    STREAK_FREEZES_PER_WEEK: 1, // заморозок серии в неделю (закрывают пропущенный день автоматически)
    MAX_ACTIVE_CHALLENGES: 1, // челленджей одновременно
    MAX_ASSISTANT_QUESTIONS_PER_DAY: 5, // отвеченных вопросов «🤖 Спроси бота» в локальный день
    MAX_ASSISTANT_MODEL_CALLS_PER_DAY: 15, // запросов к нейросети от «Спроси бота» в локальный день — с ответом или без (быстрый разбор не считается)
    MAX_VOICE_PER_DAY: 20, // распознанных голосовых в локальный день (запись текстом — без лимита)
    ROAST_SAVAGE: true, // «😈 Злой режим» без цензуры (18+); false — только с премиумом (ехидный остаётся всем)
  },
  premium: {
    MAX_DESCRIPTION_LENGTH: 160,
    ALLOW_CUSTOM_CATEGORIES: true,
    MAX_CUSTOM_CATEGORIES: 5,
    MAX_SAVINGS_GOALS: 10,
    MAX_RECEIPTS_PER_MONTH: 300,
    PLANNING_SUBSCRIPTIONS: 20,
    SUB_TRIALS: Infinity,
    PLANNING_INFLATION_ITEMS: 10, // в списках «подорожало» / «подешевело»
    STREAK_FREEZES_PER_WEEK: 2,
    MAX_ACTIVE_CHALLENGES: Infinity,
    MAX_ASSISTANT_QUESTIONS_PER_DAY: 100,
    MAX_ASSISTANT_MODEL_CALLS_PER_DAY: 60,
    MAX_VOICE_PER_DAY: 300,
    ROAST_SAVAGE: true,
  }
};

// Константы для пробного периода
const TRIAL_PERIOD = {
  DAYS: 14, // 14 дней пробного периода для новых пользователей
  TYPE: 'trial'
};

// Часы напоминаний по умолчанию (users.reminder_hours = NULL, «Сбросить», опрос без ответа) — одно вечером
const DEFAULT_REMINDER_HOURS = [21];

// «😈 Злой режим»: не больше одной подколки на действие, MAX_PER_DAY за локальный день и не чаще раза в
// MIN_GAP_MINUTES — кроме превышения бюджета (по разу на бюджет за период). Импульсная покупка — трата не меньше
// IMPULSE_FACTOR медиан своих трат за HISTORY_DAYS дней (нужно хотя бы IMPULSE_MIN_HISTORY трат); вредная трата
// заслуживает подколки, если она не меньше медианы или это уже JUNK_HABIT_COUNT-я такая трата за период.
// Ночью, в выходные, в понедельник и в первые дни после зарплаты с вероятностью CONTEXT_CHANCE — ситуационный вариант;
// у вредной траты с вероятностью SUBTYPE_CHANCE — вариант про её вид (кофе, такси…), иначе общий
const ROAST = {
  MAX_PER_DAY: 3,
  MIN_GAP_MINUTES: 120,
  IMPULSE_FACTOR: 3,
  IMPULSE_MIN_HISTORY: 10,
  HISTORY_DAYS: 60,
  JUNK_HABIT_COUNT: 3,
  RECENT_VARIANTS: 15, // столько последних показанных вариантов не повторяются (на пользователя)
  CONTEXT_CHANCE: 0.5,
  SUBTYPE_CHANCE: 0.7
};

// Реферальная программа: оба получают REWARD_DAYS премиума, когда у приглашённого ACTIVATION_EXPENSES трат хотя бы
// в ACTIVATION_DAYS разных днях (ручных или из чека — не регулярных и не из импорта; удалённые не считаются).
// Пригласившему — не больше MAX_REWARDED_INVITES наград
// и MAX_BONUS_DAYS дней всего; приглашённый получает награду всегда. Одинаково для всех: это путь к премиуму.
// Подсказка «пригласи друга» к сообщениям о лимитах — не чаще раза в UPSELL_INTERVAL_DAYS.
const REFERRAL = {
  REWARD_DAYS: 7,
  ACTIVATION_EXPENSES: 3,
  ACTIVATION_DAYS: 2,
  MAX_REWARDED_INVITES: 10,
  MAX_BONUS_DAYS: 90,
  UPSELL_INTERVAL_DAYS: 7
};

// Общие расходы в группах: бесплатно — GROUP_LIMITS в месяц на группу (траты без «рассчитались» и без итогов чеков;
// начатые дележи чеков). «🎫 Пропуск для группы» (GROUP_PASS, Stars) снимает лимиты группы на DAYS дней; премиум у того,
// кто включил учёт группы, — тоже
const GROUP_LIMITS = {
  FREE_EXPENSES_PER_MONTH: 30,
  FREE_SPLITS_PER_MONTH: 3
};
const GROUP_PASS = {
  days: 30,
  stars: 99
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

// Меню «☰ Ещё» (inline): длинные подписи (импорт, приглашение) — в паре с короткими
function generateMoreMenu(localizationService, userLanguage, isAdmin = false) {
  const t = (key) => localizationService.getText(userLanguage, key);
  const keyboard = [
    [{ text: t('button_ai'), callback_data: 'ai' }],
    [{ text: t('button_planning'), callback_data: 'pl' }, { text: t('button_savings'), callback_data: 'sv' }],
    [{ text: t('button_achievements'), callback_data: 'ach' }, { text: t('button_invite'), callback_data: 'ref' }],
    [{ text: t('button_family'), callback_data: 'family' }, { text: t('premium_subscription_title'), callback_data: 'premium_subscription' }],
    [{ text: t('button_export'), callback_data: 'export' }, { text: t('button_settings'), callback_data: 'settings' }],
    [{ text: t('button_import'), callback_data: 'import' }, { text: t('button_help'), callback_data: 'help' }]
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
      button(userLanguage === 'ru' || userLanguage === 'kz' ? 'сум UZS' : 'soʻm UZS', 'UZS'),
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
    [{ text: t('button_roast_settings'), callback_data: 'rst' }],
    [{ text: t('button_onboarding_setup'), callback_data: 'onb_setup' }],
    [{ text: t('button_back'), callback_data: 'back_to_menu' }]
  ];
}

// Клавиатура выбора времени: часы 0–23 с текущими минутами UTC.
// Пояс считается от даты сообщения с клавиатурой (handleTimezoneSelection), поэтому позднее нажатие не сдвигает его.
// onboarding: кнопки несут признак шага онбординга (`|ob`), «Назад» ведёт на предыдущий шаг (валюта), а не в Настройки.
// half: минуты сдвинуты на 30 — для поясов с половиной часа (Индия UTC+5:30, Иран…), кнопки `time|<ч>|<м>|h[|ob]`;
// переключатель `tzh|<0|1>[|ob]`. По умолчанию сдвиг — у hi (в Индии UTC+5:30)
function generateTimeKeyboard(localizationService, userLanguage, { onboarding = false, half = userLanguage === 'hi', now = new Date() } = {}) {
  const keyboard = [];
  const utcMinutes = now.getUTCMinutes();
  const shown = (utcMinutes + (half ? 30 : 0)) % 60;
  const other = (utcMinutes + (half ? 0 : 30)) % 60;
  const suffix = onboarding ? '|ob' : '';
  const pad = (value) => String(value).padStart(2, '0');

  // 6 рядов по 4 кнопки (0-23 часа)
  for (let row = 0; row < 6; row++) {
    const rowButtons = [];
    for (let col = 0; col < 4; col++) {
      const hour = row * 4 + col;
      rowButtons.push({
        text: `${pad(hour)}:${pad(shown)}`,
        callback_data: `time|${hour}|${shown}${half ? '|h' : ''}${suffix}`
      });
    }
    keyboard.push(rowButtons);
  }

  keyboard.push([{
    text: localizationService.getText(userLanguage, 'button_tz_other_minutes', { minutes: pad(other) }),
    callback_data: `tzh|${half ? 0 : 1}${suffix}`
  }]);

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
  DEFAULT_REMINDER_HOURS,
  REFERRAL,
  GROUP_LIMITS,
  GROUP_PASS,
  ROAST,
  generateMainMenuKeyboard,
  generateMoreMenu,
  LEGACY_MENU_BUTTON_KEYS,
  generateCurrencyKeyboard,
  generateSettingsKeyboard,
  generateTimeKeyboard,
  generatePremiumPaymentButtons
}; 