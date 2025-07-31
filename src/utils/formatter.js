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
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    }).format(new Date(date));
  }

  formatExpenseList(expenses, userTimezone = 'UTC') {
    if (!expenses.length) {
      return 'Расходов пока нет 📝';
    }
    return expenses.map((expense, index) => {
      const icon = expense.category_icon || '📦';
      const amount = this.formatAmount(expense.amount, expense.currency || 'RUB');
      const description = expense.description || 'Без описания';
      const date = this.formatDate(expense.created_at_utc || expense.created_at, userTimezone);
      return `${icon} ${amount} - ${description}\n📅 ${date}`;
    }).join('\n\n');
  }

  async formatStats(total, categoryStats, userCurrency = 'RUB', period = periodsConfig.LABELS.month) {
    const periodLabel = period || 'месяц';
    let message = `📊 *Статистика за ${periodLabel}*\n\n`;
    let totalInUserCurrency = 0;
    if (Array.isArray(total.byCurrency)) {
      let sum = 0;
      for (const {currency, total: amount} of total.byCurrency) {
        const converted = await this.currencyUtils.convert(Number(amount), currency, userCurrency);
        sum += converted;
      }
      totalInUserCurrency = sum;
      message += `💰 Всего потрачено: *${this.formatAmount(sum, userCurrency)}*\n`;
    } else {
      totalInUserCurrency = await this.currencyUtils.convert(Number(total.total), total.currency || 'RUB', userCurrency);
      message += `💰 Всего потрачено: *${this.formatAmount(totalInUserCurrency, userCurrency)}*\n`;
    }
    message += `📝 Количество записей: ${total.count}\n\n`;
    if (categoryStats.length > 0) {
      const catMap = new Map();
      for (const cat of categoryStats) {
        const key = `${cat.icon}||${cat.name}`;
        const prev = catMap.get(key) || 0;
        const catTotal = await this.currencyUtils.convert(Number(cat.total), cat.currency || 'RUB', userCurrency);
        catMap.set(key, prev + catTotal);
      }
      message += `*По категориям:*\n`;
      for (const [key, sum] of catMap.entries()) {
        const [icon, name] = key.split('||');
        const percentage = totalInUserCurrency > 0 ? (sum / totalInUserCurrency * 100).toFixed(1) : 0;
        message += `${icon} ${name}: ${this.formatAmount(sum, userCurrency)} (${percentage}%)\n`;
      }
    }
    return message;
  }


// Обновлённая версия formatCSV: поддержка многострочных полей, правильное экранирование, итоги в одной ячейке
async formatCSV(expenses, userCurrency, userTimezone = 'UTC') {
  // Вспомогательная функция для экранирования: удваивает кавычки, сохраняет \n для многострочных полей
  function escapeCSV(value) {
    const str = String(value ?? '');
    // Удаляем только \r (для кросс-платформенности), \n оставляем для многострочности
    const clean = str.replace(/\r/g, '').replace(/"/g, '""');
    return `"${clean}"`;
  }

  let csv = 'Дата,Сумма,Валюта,Категория,Описание\n';
  const totalsByCurrency = {};
  
  for (const expense of expenses) {
    const date = this.formatDate(expense.created_at_utc || expense.created_at, userTimezone);
    const amount = expense.amount;
    const currency = expense.currency || 'RUB';
    const category = expense.category || 'Другое';
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
  }
  csv += '\n';
  // Итоги по валютам: добавляем заголовок отдельной строкой
  csv += escapeCSV('Итого по валютам:') + ',,,,' + '\n';
  // Итоги по валютам: каждая валюта отдельной строкой (только в первой колонке)
  for (const [currency, total] of Object.entries(totalsByCurrency)) {
    csv += escapeCSV(`${currency}: ${total}`) + ',,,,' + '\n';
  }
  // Итоговая сумма в userCurrency отдельной строкой
  let totalInUserCurrency = 0;
  for (const [currency, total] of Object.entries(totalsByCurrency)) {
    totalInUserCurrency += await this.currencyUtils.convert(total, currency, userCurrency);
  }
  csv += escapeCSV(`Всего в ${userCurrency}: ${this.formatAmount(totalInUserCurrency, userCurrency)}`) + ',,,,' + '\n';

  return csv;
}



  formatCategories(categories) {
    return categories.map(cat => `${cat.icon} ${cat.name}`).join(', ');
  }

  formatExpenseWithActions(expense, userTimezone = 'UTC') {
    const icon = expense.category_icon || '📦';
    const amount = this.formatAmount(expense.amount, expense.currency || 'RUB');
    const description = expense.description || 'Без описания';
    const date = this.formatDate(expense.created_at_utc || expense.created_at, userTimezone);
    return {
      text: `${icon} ${amount} - ${description}\n📅 ${date}`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✏️ Редактировать', callback_data: `edit_expense|${expense.id}` },
            { text: '🗑️ Удалить', callback_data: `delete_expense|${expense.id}` }
          ]
        ]
      }
    };
  }
}

module.exports = Formatter;
  