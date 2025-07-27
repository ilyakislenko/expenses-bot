const currencyUtils = require('./currency');

class Formatter {
  static formatAmount(amount, currency = 'RUB') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  static formatDate(date) {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  static formatExpenseList(expenses) {
    if (!expenses.length) {
      return 'Расходов пока нет 📝';
    }

    return expenses.map((expense, index) => {
      const icon = expense.category_icon || '📦';
      const amount = this.formatAmount(expense.amount, expense.currency || 'RUB');
      const description = expense.description || 'Без описания';
      const date = this.formatDate(expense.created_at);
      
      return `${icon} ${amount} - ${description}\n📅 ${date}`;
    }).join('\n\n');
  }

  static async formatStats(total, categoryStats, userCurrency = 'RUB', period = 'месяц') {
    let periodLabel = 'месяц';
    if (period === 'day' || period === 'день') periodLabel = 'день';
    if (period === 'week' || period === 'неделя') periodLabel = 'неделю';
    let message = `📊 *Статистика за ${periodLabel}*\n\n`;

    // Конвертируем total в userCurrency
    let totalInUserCurrency = 0;
    if (Array.isArray(total.byCurrency)) {
      let sum = 0;
      for (const {currency, total: amount} of total.byCurrency) {
        const converted = await currencyUtils.convert(Number(amount), currency, userCurrency);
        sum += converted;
      }
      totalInUserCurrency = sum;
      message += `💰 Всего потрачено: *${this.formatAmount(sum, userCurrency)}*\n`;
    } else {
      totalInUserCurrency = await currencyUtils.convert(Number(total.total), total.currency || 'RUB', userCurrency);
      message += `💰 Всего потрачено: *${this.formatAmount(totalInUserCurrency, userCurrency)}*\n`;
    }
    message += `📝 Количество записей: ${total.count}\n\n`;

    if (categoryStats.length > 0) {
      // Агрегируем по категориям (name+icon), складываем суммы после конвертации
      const catMap = new Map();
      for (const cat of categoryStats) {
        const key = `${cat.icon}||${cat.name}`;
        const prev = catMap.get(key) || 0;
        const catTotal = await currencyUtils.convert(Number(cat.total), cat.currency || 'RUB', userCurrency);
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

  static async formatCSV(expenses, userCurrency) {
    let csv = 'Дата,Сумма,Валюта,Категория,Описание\n';
    const totalsByCurrency = {};
    for (const expense of expenses) {
      const date = this.formatDate(expense.created_at);
      const amount = expense.amount;
      const currency = expense.currency || 'RUB';
      const category = expense.category || 'Другое';
      const description = (expense.description || '').replace(/"/g, '""');
      csv += `"${date}","${amount}","${currency}","${category}","${description}"\n`;
      totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + Number(amount);
    }

    // Итоги по валютам
    csv += '\nИтого по валютам:\n';
    for (const [currency, total] of Object.entries(totalsByCurrency)) {
      csv += `${currency}: ${total}\n`;
    }

    // Общая сумма в выбранной валюте пользователя
    let totalInUserCurrency = 0;
    const currencyUtils = require('./currency');
    for (const [currency, total] of Object.entries(totalsByCurrency)) {
      const converted = await currencyUtils.convert(total, currency, userCurrency);
      totalInUserCurrency += converted;
    }
    csv += `\nВсего в ${userCurrency}: ${totalInUserCurrency.toFixed(2)}\n`;

    return csv;
  }

  static formatCategories(categories) {
    return categories.map(cat => `${cat.icon} ${cat.name}`).join('\n');
  }
}

module.exports = Formatter;
  