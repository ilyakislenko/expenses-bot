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

  formatDate(date) {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  formatExpenseList(expenses) {
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

  async formatStats(total, categoryStats, userCurrency = 'RUB', period = 'месяц') {
    let periodLabel = 'месяц';
    if (period === 'day' || period === 'день') periodLabel = 'день';
    if (period === 'week' || period === 'неделя') periodLabel = 'неделю';
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

  async formatCSV(expenses, userCurrency) {
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
    csv += '\nИтого по валютам:\n';
    for (const [currency, total] of Object.entries(totalsByCurrency)) {
      csv += `${currency}: ${total}\n`;
    }
    let totalInUserCurrency = 0;
    for (const [currency, total] of Object.entries(totalsByCurrency)) {
      totalInUserCurrency += await this.currencyUtils.convert(total, currency, userCurrency);
    }
    csv += `\nИтого в ${userCurrency}: ${this.formatAmount(totalInUserCurrency, userCurrency)}\n`;
    return csv;
  }

  formatCategories(categories) {
    return categories.map(cat => `${cat.icon} ${cat.name}`).join(', ');
  }

  formatExpenseWithActions(expense) {
    const icon = expense.category_icon || '📦';
    const amount = this.formatAmount(expense.amount, expense.currency || 'RUB');
    const description = expense.description || 'Без описания';
    const date = this.formatDate(expense.created_at);
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
  