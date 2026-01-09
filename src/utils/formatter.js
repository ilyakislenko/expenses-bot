const periodsConfig = require('../config/periods');

class Formatter {
  constructor(currencyUtils) {
    this.currencyUtils = currencyUtils;
  }

  formatAmount(amount, currency = 'RUB') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(date, timezone = 'UTC') {
    try {
      // Проверяем, что date не null/undefined
      if (!date) {
        console.warn('Empty date provided to formatDate');
        return 'Unknown date';
      }
      
      // Если это строка даты из PostgreSQL, парсим её
      let dateObj;
      if (typeof date === 'string') {
        // PostgreSQL возвращает даты в формате "2024-01-15" или "2024-01-15T10:30:00.000Z"
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date);
      }
      
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date provided to formatDate:', date);
        return 'Invalid date';
      }
      
      const formattedDate = new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone
      }).format(dateObj);
      
      // Отладочная информация только для проблемных случаев
      if (timezone === 'UTC' || timezone === 'Europe/Moscow') {
        console.log('Date formatting:', {
          original: date,
          parsed: dateObj.toISOString(),
          timezone: timezone,
          formatted: formattedDate
        });
      }
      
      return formattedDate;
    } catch (error) {
      console.error('Error formatting date:', error, 'date:', date);
      return 'Date error';
    }
  }

  formatExpenseList(expenses, userTimezone = 'UTC', localizationService = null, userLanguage = 'ru') {
    if (!expenses.length) {
      return localizationService ? 
        localizationService.getText(userLanguage, 'no_expenses_period') : 
        'Расходов пока нет 📝';
    }
    return expenses.map((expense, index) => {
      const icon = expense.category_icon || '📦';
      const amount = this.formatAmount(expense.amount, expense.currency || 'RUB');
      const description = expense.description || (localizationService ? 
        localizationService.getText(userLanguage, 'not_found') : 
        'Без описания');
      const date = this.formatDate(expense.created_at_utc, userTimezone);
      return `${icon} ${amount} - ${description}\n📅 ${date}`;
    }).join('\n\n');
  }

  async formatStats(total, categoryStats, userCurrency = 'RUB', period = periodsConfig.LABELS.month, localizationService = null, userLanguage = 'ru') {
    const periodLabel = period || 'месяц';
    
    // Определяем заголовок в зависимости от периода
    let title;
    if (period === 'день' || period === 'day') {
      title = localizationService ? 
        localizationService.getText(userLanguage, 'daily_stats') : 
        '📊 *Статистика за день*';
    } else {
      title = localizationService ? 
        localizationService.getText(userLanguage, 'monthly_stats') : 
        '📊 *Статистика за месяц*';
    }
    
    let message = `${title}\n\n`;
    let totalInUserCurrency = 0;
    if (Array.isArray(total.byCurrency)) {
      let sum = 0;
      for (const {currency, total: amount} of total.byCurrency) {
        const converted = await this.currencyUtils.convert(Number(amount), currency, userCurrency);
        sum += converted;
      }
      totalInUserCurrency = sum;
      const totalSpentText = localizationService ? 
        localizationService.getText(userLanguage, 'total_spent', { amount: this.formatAmount(sum, userCurrency) }) : 
        `💰 Всего потрачено: *${this.formatAmount(sum, userCurrency)}*`;
      message += `${totalSpentText}\n`;
    } else {
      totalInUserCurrency = await this.currencyUtils.convert(Number(total.total), total.currency || 'RUB', userCurrency);
      const totalSpentText = localizationService ? 
        localizationService.getText(userLanguage, 'total_spent', { amount: this.formatAmount(totalInUserCurrency, userCurrency) }) : 
        `💰 Всего потрачено: *${this.formatAmount(totalInUserCurrency, userCurrency)}*`;
      message += `${totalSpentText}\n`;
    }
    
    const recordsCountText = localizationService ? 
      localizationService.getText(userLanguage, 'records_count', { count: total.count }) : 
      `📝 Количество записей: ${total.count}`;
    message += `${recordsCountText}\n\n`;
    if (categoryStats.length > 0) {
      const catMap = new Map();
      for (const cat of categoryStats) {
        const key = `${cat.icon}||${cat.name}`;
        const prev = catMap.get(key) || 0;
        const catTotal = await this.currencyUtils.convert(Number(cat.total), cat.currency || 'RUB', userCurrency);
        catMap.set(key, prev + catTotal);
      }
      const byCategoriesText = localizationService ? 
        localizationService.getText(userLanguage, 'by_categories') : 
        '*По категориям:*';
      message += `${byCategoriesText}\n`;
      for (const [key, sum] of catMap.entries()) {
        const [icon, name] = key.split('||');
        const translatedName = this.translateCategoryName(name, localizationService, userLanguage);
        const percentage = totalInUserCurrency > 0 ? (sum / totalInUserCurrency * 100).toFixed(1) : 0;
        message += `${icon} ${translatedName}: ${this.formatAmount(sum, userCurrency)} (${percentage}%)\n`;
      }
    }
    return message;
  }


// Обновлённая версия formatCSV: поддержка многострочных полей, правильное экранирование, итоги в одной ячейке
async formatCSV(expenses, userCurrency, userTimezone = 'UTC', localizationService = null, userLanguage = 'ru') {
  // Вспомогательная функция для экранирования: удваивает кавычки, сохраняет \n для многострочных полей
  function escapeCSV(value) {
    const str = String(value ?? '');
    // Удаляем только \r (для кросс-платформенности), \n оставляем для многострочности
    const clean = str.replace(/\r/g, '').replace(/"/g, '""');
    return `"${clean}"`;
  }

  // Получаем переведенные заголовки
  const dateHeader = localizationService ? 
    localizationService.getText(userLanguage, 'date_label') : 'Date';
  const amountHeader = localizationService ? 
    localizationService.getText(userLanguage, 'amount_label') : 'Amount';
  const currencyHeader = localizationService ? 
    localizationService.getText(userLanguage, 'currency_label') : 'Currency';
  const categoryHeader = localizationService ? 
    localizationService.getText(userLanguage, 'category_label') : 'Category';
  const descriptionHeader = localizationService ? 
    localizationService.getText(userLanguage, 'description_label') : 'Description';

  let csv = `${dateHeader},${amountHeader},${currencyHeader},${categoryHeader},${descriptionHeader}\n`;
  const totalsByCurrency = {};
  const totalsByCategory = {};
  
  for (const expense of expenses) {
    // Используем created_at_utc как основной источник даты
    let dateToFormat = expense.created_at_utc;
    const date = this.formatDate(dateToFormat, userTimezone);
    const amount = expense.amount;
    const currency = expense.currency || 'RUB';
    // Переводим категорию, если это стандартная категория
    // Поддерживаем оба варианта названия поля: category_name (семейные) и category (личные)
    const categoryName = expense.category_name || expense.category || 'Other';
    const category = this.translateCategoryName(categoryName, localizationService, userLanguage);
    const description = expense.description || '';

    // Формируем строку с экранированными полями
    csv += [
      escapeCSV(date),
      escapeCSV(amount),
      escapeCSV(currency),
      escapeCSV(category),
      escapeCSV(description)
    ].join(',') + '\n';

    totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + Number(amount);
    // Группируем суммы по категориям и валютам
    if (!totalsByCategory[category]) {
      totalsByCategory[category] = {};
    }
    totalsByCategory[category][currency] = (totalsByCategory[category][currency] || 0) + Number(amount);
  }
  csv += '\n';

  const totalByCategoriesText = localizationService ? 
  localizationService.getText(userLanguage, 'total_by_categories') : 'Total by categories:';
  csv += escapeCSV(totalByCategoriesText) + ',,,,' + '\n';
  // Выводим сумму по каждой категории в валюте пользователя
  for (const [category, currencies] of Object.entries(totalsByCategory)) {
    let categoryTotalInUserCurrency = 0;
    for (const [currency, total] of Object.entries(currencies)) {
      categoryTotalInUserCurrency += await this.currencyUtils.convert(Number(total), currency, userCurrency);
    }
    csv += escapeCSV(`${category}: ${this.formatAmount(categoryTotalInUserCurrency, userCurrency)}`) + ',,,,' + '\n';
  }
  csv += '\n';
  // Итоги по валютам: добавляем заголовок отдельной строкой
  const totalByCurrenciesText = localizationService ? 
    localizationService.getText(userLanguage, 'total_by_currencies') : 'Total by currencies:';
  csv += escapeCSV(totalByCurrenciesText) + ',,,,' + '\n';
  // Итоги по валютам: каждая валюта отдельной строкой (только в первой колонке)
  for (const [currency, total] of Object.entries(totalsByCurrency)) {
    csv += escapeCSV(`${currency}: ${total}`) + ',,,,' + '\n';
  }
  // Итоговая сумма в userCurrency отдельной строкой
  let totalInUserCurrency = 0;
  for (const [currency, total] of Object.entries(totalsByCurrency)) {
    totalInUserCurrency += await this.currencyUtils.convert(total, currency, userCurrency);
  }
  const totalInCurrencyText = localizationService ? 
    localizationService.getText(userLanguage, 'total_in_currency', { currency: userCurrency }) : `Total in ${userCurrency}`;
  csv += escapeCSV(`${totalInCurrencyText}: ${this.formatAmount(totalInUserCurrency, userCurrency)}`) + ',,,,' + '\n';

  return csv;
}



  formatCategories(categories) {
    return categories.map(cat => `${cat.icon} ${cat.name}`).join(', ');
  }

  translateCategoryName(categoryName, localizationService, userLanguage) {
    if (!localizationService) {
      return categoryName;
    }
    
    const categoryMap = {
      // Русские названия
      'Еда': 'category_food',
      'Транспорт': 'category_transport',
      'Развлечения': 'category_entertainment',
      'Покупки': 'category_shopping',
      'Здоровье': 'category_health',
      'Другое': 'category_other',
      // Английские названия
      'Food': 'category_food',
      'Transport': 'category_transport',
      'Entertainment': 'category_entertainment',
      'Shopping': 'category_shopping',
      'Health': 'category_health',
      'Other': 'category_other'
    };
    
    const translationKey = categoryMap[categoryName];
    if (translationKey) {
      return localizationService.getText(userLanguage, translationKey);
    }
    
    return categoryName; // Возвращаем оригинальное название, если перевод не найден
  }

  formatExpenseWithActions(
    expense,
    userTimezone = 'UTC',
    localizationService = null,
    userLanguage = 'ru',
    showEdit = true,
    showDelete = true,
    showMarkFamily = false,
    currentUserId = null
  ) {
    const icon = expense.category_icon || '📦';
    const amount = this.formatAmount(expense.amount, expense.currency || 'RUB');
    const description = expense.description || (localizationService ? 
      localizationService.getText(userLanguage, 'not_found') : 
      'Без описания');
    const date = this.formatDate(expense.created_at_utc, userTimezone);
    
    // Добавляем информацию о пользователе, если это семейная трата
    let userInfo = '';
    if (expense.user_username || expense.user_first_name) {
      const userName = expense.user_username || expense.user_first_name;
      userInfo = `\n👤 ${userName}`;
    }
    
    const editText = localizationService ? 
      localizationService.getText(userLanguage, 'button_edit') : 
      '✏️ Редактировать';
    const deleteText = localizationService ? 
      localizationService.getText(userLanguage, 'button_delete') : 
      '🗑️ Удалить';
    const markFamilyText = localizationService ?
      localizationService.getText(userLanguage, 'button_mark_as_family') :
      '👨‍👩‍👧‍👦 В семью';
    const removeFromFamilyText = localizationService ?
      localizationService.getText(userLanguage, 'button_remove_from_family') :
      '🚫 Из семейного бюджета';
    
    const text = `${icon} ${amount} - ${description}\n📅 ${date}${userInfo}`;
    
    if (!showEdit && !showDelete) {
      return {
        text,
        reply_markup: { inline_keyboard: [] }
      };
    }
    
    const buttons = [];
    
    // Проверяем, является ли текущий пользователь автором траты
    const isOwner = currentUserId && Number(expense.user_id) === currentUserId;
    
    if (showEdit && isOwner) {
      buttons.push({ text: editText, callback_data: `edit_expense|${expense.id}` });
    }
    if (showDelete && isOwner) {
      buttons.push({ text: deleteText, callback_data: `delete_expense|${expense.id}` });
    }
    
    // Кнопка "Пометить как семейную" только для личных трат
    if (showMarkFamily && !expense.family_id) {
      buttons.push({ text: markFamilyText, callback_data: `mark_as_family|${expense.id}` });
    }
    
    // Кнопка "Вычеркнуть из семейного бюджета" только для семейных трат и только для автора
    if (expense.family_id && isOwner) {
      buttons.push({ text: removeFromFamilyText, callback_data: `remove_from_family|${expense.id}` });
    }
    
    return {
      text,
      reply_markup: {
        inline_keyboard: [buttons]
      }
    };
  }
}

module.exports = Formatter;
  