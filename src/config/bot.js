module.exports = {
  // Настройки бота
  BOT: {
    token: process.env.BOT_TOKEN,
    username: process.env.BOT_USERNAME || 'expenses_tracker_bot'
  },
  
  // Настройки сообщений
  MESSAGES: {
    welcome: 'Привет! Я бот для учета расходов. Отправь мне сумму и описание траты.',
    help: 'Справка по командам:\n/start - начать работу\n/help - показать справку\n/stats - статистика',
    error: 'Произошла ошибка. Попробуйте позже.',
    invalidFormat: 'Неверный формат. Используйте: сумма описание'
  },
  
  // Настройки клавиатур
  KEYBOARDS: {
    mainMenu: [
      ['📊 Статистика', '📝 История'],
      ['⚙️ Настройки', '📋 Меню']
    ]
  }
}; 