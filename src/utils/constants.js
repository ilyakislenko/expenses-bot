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

// Константы для тарифов премиум подписки
// const PREMIUM_TARIFFS = {
//   MONTH_1: {
//     duration: 30,
//     stars: 87,
//     usd: 1.99,
//     rub: 156,
//     originalStars: null,
//     discount: null,
//     monthlyUsd: 1.99,
//     monthlyRub: 156
//   },
//   MONTH_3: {
//     duration: 90,
//     stars: 222,
//     usd: 4.99,
//     rub: 399,
//     originalStars: 261,
//     discount: 15,
//     monthlyUsd: 1.69,
//     monthlyRub: 132
//   },
//   MONTH_6: {
//     duration: 180,
//     stars: 392,
//     usd: 8.99,
//     rub: 719,
//     originalStars: 522,
//     discount: 25,
//     monthlyUsd: 1.49,
//     monthlyRub: 117
//   },
//   MONTH_12: {
//     duration: 365,
//     stars: 679,
//     usd: 14.99,
//     rub: 1199,
//     originalStars: 1044,
//     discount: 35,
//     monthlyUsd: 1.29,
//     monthlyRub: 103
//   }
// };

const PREMIUM_TARIFFS = {
  MONTH_1: {
    duration: 30,
    stars: 1,
    usd: 1.99,
    rub: 156,
    originalStars: null,
    discount: null,
    monthlyUsd: 1.99,
    monthlyRub: 156
  },
  MONTH_3: {
    duration: 90,
    stars: 1,
    usd: 4.99,
    rub: 399,
    originalStars: 261,
    discount: 15,
    monthlyUsd: 1.69,
    monthlyRub: 132
  },
  MONTH_6: {
    duration: 180,
    stars: 1,
    usd: 8.99,
    rub: 719,
    originalStars: 522,
    discount: 25,
    monthlyUsd: 1.49,
    monthlyRub: 117
  },
  MONTH_12: {
    duration: 365,
    stars: 1,
    usd: 14.99,
    rub: 1199,
    originalStars: 1044,
    discount: 35,
    monthlyUsd: 1.29,
    monthlyRub: 103
  }
};
// Функция для генерации главного меню (reply-клавиатура)
function generateMainMenuKeyboard(localizationService, userLanguage) {
  return [
    [{ text: localizationService.getText(userLanguage, 'button_help') }],
    [
      { text: localizationService.getText(userLanguage, 'button_expenses_month') }, 
      { text: localizationService.getText(userLanguage, 'button_expenses_day') }
    ],
    [{ text: localizationService.getText(userLanguage, 'button_expenses_categories') }],
    [{ text: localizationService.getText(userLanguage, 'button_family') }],
    [{ text: localizationService.getText(userLanguage, 'button_settings') }],
    [{ text: localizationService.getText(userLanguage, 'button_delete_last') }],
    [{ text: localizationService.getText(userLanguage, 'premium_subscription_title') }]
  ];
}

// Функция для генерации inline-меню
function generateInlineMainMenu(localizationService, userLanguage) {
  return [
    [{ text: localizationService.getText(userLanguage, 'button_help'), callback_data: 'help' }],
    [
      { text: localizationService.getText(userLanguage, 'button_expenses_month'), callback_data: 'stats' }, 
      { text: localizationService.getText(userLanguage, 'button_expenses_day'), callback_data: 'history' }
    ],
    [{ text: localizationService.getText(userLanguage, 'button_expenses_categories'), callback_data: 'categories' }],
    [{ text: localizationService.getText(userLanguage, 'button_family'), callback_data: 'family' }],
    [{ text: localizationService.getText(userLanguage, 'button_settings'), callback_data: 'settings' }],
    [{ text: localizationService.getText(userLanguage, 'button_delete_last'), callback_data: 'undo' }],
    [{ text: localizationService.getText(userLanguage, 'premium_subscription_title'), callback_data: 'premium_subscription' }]
  ];
}

// Функция для генерации клавиатуры выбора валюты
function generateCurrencyKeyboard(localizationService, userLanguage) {
  return [
    [
      { text: '₽ RUB', callback_data: 'set_currency|RUB' },
      { text: '$ USD', callback_data: 'set_currency|USD' },
      { text: '€ EUR', callback_data: 'set_currency|EUR' },
      { text: '₸ KZT', callback_data: 'set_currency|KZT' },
      { text: '¥ CNY', callback_data: 'set_currency|CNY' },
      { text: '฿ THB', callback_data: 'set_currency|THB' }
    ],
    [
      { text: localizationService.getText(userLanguage, 'button_back'), callback_data: 'back_to_settings' }
    ]
  ];
}

// Функция для генерации клавиатуры настроек
function generateSettingsKeyboard(localizationService, userLanguage) {
  return [
    [{ text: localizationService.getText(userLanguage, 'button_change_currency'), callback_data: 'change_currency' }],
    [{ text: localizationService.getText(userLanguage, 'button_change_timezone'), callback_data: 'change_timezone' }],
    [{ text: localizationService.getText(userLanguage, 'button_change_language'), callback_data: 'change_language' }],
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

// Функция для форматирования тарифов премиум подписки
function formatPremiumTariff(tariff, localizationService, userLanguage) {
  const { duration, stars, usd, rub, originalStars, discount, monthlyUsd, monthlyRub } = tariff;
  
  let starsText = `${stars} ⭐️`;
  if (originalStars) {
    starsText = `<s>${originalStars}</s> ${stars} ⭐️`;
  }
  
  let priceText = `(~ $${usd} / ${rub}₽)`;
  if (discount) {
    priceText = `(~ $${usd} / ${rub}₽, экономия ${discount}%)`;
  }
  
  let monthlyText = '';
  if (monthlyUsd && monthlyRub) {
    monthlyText = `\n  (~ $${monthlyUsd} / ${monthlyRub}₽ в месяц)`;
  }
  
  const durationText = duration === 30 ? 'месяц' : 
                      duration === 90 ? 'месяца' : 
                      duration === 180 ? 'месяцев' : 'месяцев';
  
  return `- <b>${duration === 30 ? '1' : duration === 90 ? '3' : duration === 180 ? '6' : '12'} ${durationText} (${duration} дней)</b> — ${starsText}\n  ${priceText}${monthlyText}`;
}

// Функция для генерации кнопок оплаты тарифов (синхронная версия)
function generatePremiumPaymentButtons(tariffs, localizationService, userLanguage) {
  const buttons = [];
  
  // Создаем кнопки для каждого тарифа
  Object.keys(tariffs).forEach((tariffKey) => {
    const tariff = tariffs[tariffKey];
    const duration = tariff.duration;
    
    // Определяем текст кнопки в зависимости от длительности
    let buttonText;
    if (duration === 30) {
      buttonText = userLanguage === 'en' ? '1 Month' : '1 Месяц';
    } else if (duration === 90) {
      buttonText = userLanguage === 'en' ? '3 Months' : '3 Месяца';
    } else if (duration === 180) {
      buttonText = userLanguage === 'en' ? '6 Months' : '6 Месяцев';
    } else if (duration === 365) {
      buttonText = userLanguage === 'en' ? '1 Year' : '1 Год';
    }
    
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

// Функция для форматирования тарифов на английском языке
function formatPremiumTariffEn(tariff, localizationService, userLanguage) {
  const { duration, stars, usd, rub, originalStars, discount, monthlyUsd, monthlyRub } = tariff;
  
  let starsText = `${stars} ⭐️`;
  if (originalStars) {
    starsText = `<s>${originalStars}</s> ${stars} ⭐️`;
  }
  
  let priceText = `(~ $${usd} / ${rub}₽)`;
  if (discount) {
    priceText = `(~ $${usd} / ${rub}₽, save ${discount}%)`;
  }
  
  let monthlyText = '';
  if (monthlyUsd && monthlyRub) {
    monthlyText = `\n  (~ $${monthlyUsd} / ${monthlyRub}₽ per month)`;
  }
  
  const durationText = duration === 30 ? 'month' : 
                      duration === 90 ? 'months' : 
                      duration === 180 ? 'months' : 'months';
  
  return `- <b>${duration === 30 ? '1' : duration === 90 ? '3' : duration === 180 ? '6' : '12'} ${durationText} (${duration} days)</b> — ${starsText}\n  ${priceText}${monthlyText}`;
}

module.exports = {
  USER_LIMITS,
  PREMIUM_TARIFFS,
  generateMainMenuKeyboard,
  generateInlineMainMenu,
  generateCurrencyKeyboard,
  generateSettingsKeyboard,
  generateTimeKeyboard,
  formatPremiumTariff,
  formatPremiumTariffEn,
  generatePremiumPaymentButtons
}; 