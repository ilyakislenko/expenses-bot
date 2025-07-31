// Константы для бота

const errorMessages = {
  too_long: '❌ Описание слишком длинное!\nМаксимум 60 символов.',
  no_description: '❌ Нужно указать описание после суммы.',
  amount: '❌ Некорректная сумма. Введите число от 0.01 до 999999.',
  format: '❌ Не понял формат. Напиши сумму и описание через пробел.\nНапример: `200 продукты` или `1500 обед в кафе`'
};

// Главное меню
const MAIN_MENU_KEYBOARD = [
  [{ text: '📋 Меню' }],
  [{ text: '💰 Траты за месяц' }, { text: '💰 Траты за день' }],
  [{ text: '💰 Траты по категориям' }],
  [{ text: '⚙️ Настройки' }],
  [{ text: '🗑️ Удалить последнюю запись' }]
];

// Клавиатура выбора валюты
const CURRENCY_KEYBOARD = [
  [
    { text: '₽ RUB', callback_data: 'set_currency|RUB' },
    { text: '$ USD', callback_data: 'set_currency|USD' },
    { text: '€ EUR', callback_data: 'set_currency|EUR' },
    { text: '₸ KZT', callback_data: 'set_currency|KZT' },
    { text: '¥ CNY', callback_data: 'set_currency|CNY' },
    { text: '฿ THB', callback_data: 'set_currency|THB' }
  ],
  [
    { text: '⬅️ Назад', callback_data: 'back_to_settings' }
  ]
];

// Клавиатура настроек
const SETTINGS_KEYBOARD = [
  [{ text: 'Сменить валюту', callback_data: 'change_currency' }],
  [{ text: '🌍 Часовой пояс', callback_data: 'change_timezone' }],
  [{ text: '⬅️ Назад', callback_data: 'back_to_menu' }]
];

// Функция для генерации клавиатуры выбора времени
function generateTimeKeyboard() {
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
  keyboard.push([{ text: '⬅️ Назад', callback_data: 'back_to_settings' }]);
  
  return keyboard;
}

const USER_LIMITS = {
  regular: {
    MAX_DESCRIPTION_LENGTH: 60,
    MAX_NOTES_PER_MONTH: 100,
    NOTE_RETENTION_DAYS: 30,
    ALLOW_CUSTOM_CATEGORIES: false,
    MAX_CUSTOM_CATEGORIES: 0,
  },
  premium: {
    MAX_DESCRIPTION_LENGTH: 120,
    MAX_NOTES_PER_MONTH: 300,
    NOTE_RETENTION_DAYS: null, // null = неограниченно
    ALLOW_CUSTOM_CATEGORIES: true,
    MAX_CUSTOM_CATEGORIES: 5,
  }
};

module.exports = {
  errorMessages,
  MAIN_MENU_KEYBOARD,
  CURRENCY_KEYBOARD,
  SETTINGS_KEYBOARD,
  USER_LIMITS,
  generateTimeKeyboard
}; 