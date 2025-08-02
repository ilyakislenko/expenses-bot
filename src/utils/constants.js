// Константы для бота

const USER_LIMITS = {
  regular: {
    MAX_DESCRIPTION_LENGTH: 80,
    MAX_NOTES_COUNT: 100,
    NOTE_RETENTION_DAYS: 30,
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

// Функция для генерации главного меню
function generateMainMenuKeyboard(localizationService, userLanguage) {
  return [
    [{ text: localizationService.getText(userLanguage, 'button_menu') }],
    [
      { text: localizationService.getText(userLanguage, 'button_expenses_month') }, 
      { text: localizationService.getText(userLanguage, 'button_expenses_day') }
    ],
    [{ text: localizationService.getText(userLanguage, 'button_expenses_categories') }],
    [{ text: localizationService.getText(userLanguage, 'button_settings') }],
    [{ text: localizationService.getText(userLanguage, 'button_delete_last') }]
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

module.exports = {
  USER_LIMITS,
  generateMainMenuKeyboard,
  generateCurrencyKeyboard,
  generateSettingsKeyboard,
  generateTimeKeyboard
}; 