// Константы для бота

const errorMessages = {
  too_long_regular: '❌ Описание слишком длинное!\nМаксимум 80 символов для обычных пользователей.',
  too_long_premium: '❌ Описание слишком длинное!\nМаксимум 160 символов для премиум пользователей.',
  no_description: '❌ Нужно указать описание после суммы.',
  amount: '❌ Некорректная сумма. Введите число от 0.01 до 999999.',
  format: '❌ Не понял формат. Напиши сумму и описание через пробел.\nНапример: `200 продукты` или `1500 обед в кафе`',
  limit_reached: '❌ Достигнут лимит записей!\nОбычные пользователи: 100 записей\nПремиум пользователи: 300 записей\n\n💎 Перейдите на премиум для увеличения лимитов!',
  premium_required: '💎 Эта функция доступна только премиум пользователям!\n\nПреимущества премиума:\n• 160 символов в описании (вместо 80)\n• 300 записей (вместо 100)\n• Кастомные категории\n• Расширенная статистика'
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
    MAX_DESCRIPTION_LENGTH: 80,
    MAX_NOTES_COUNT: 50,
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

module.exports = {
  errorMessages,
  MAIN_MENU_KEYBOARD,
  CURRENCY_KEYBOARD,
  SETTINGS_KEYBOARD,
  USER_LIMITS,
  generateTimeKeyboard
}; 