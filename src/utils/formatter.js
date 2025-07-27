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
  
    static formatStats(total, categoryStats, period = 'месяц') {
      let periodLabel = 'месяц';
      if (period === 'day' || period === 'день') periodLabel = 'день';
      if (period === 'week' || period === 'неделя') periodLabel = 'неделю';
      let message = `📊 *Статистика за ${periodLabel}*\n\n`;

      // Группируем суммы по валютам
      if (Array.isArray(total.byCurrency)) {
        const parts = total.byCurrency.map(({currency, total}) => {
          return this.formatAmount(total, currency);
        });
        message += `💰 Всего потрачено: *${parts.join(', ')}*\n`;
      } else {
        message += `💰 Всего потрачено: *${this.formatAmount(total.total, total.currency || 'RUB')}*\n`;
      }
      message += `📝 Количество записей: ${total.count}\n\n`;

      if (categoryStats.length > 0) {
        message += `*По категориям:*\n`;
        categoryStats.forEach(cat => {
          const percentage = total.total > 0 ? (cat.total / total.total * 100).toFixed(1) : 0;
          message += `${cat.icon} ${cat.name}: ${this.formatAmount(cat.total, cat.currency || 'RUB')} (${percentage}%)\n`;
        });
      }

      return message;
    }
  
    static formatCSV(expenses) {
      let csv = 'Дата,Сумма,Категория,Описание\n';
      expenses.forEach(expense => {
        const date = this.formatDate(expense.created_at);
        const amount = expense.amount;
        const category = expense.category || 'Другое';
        const description = (expense.description || '').replace(/"/g, '""');
        csv += `"${date}","${amount}","${category}","${description}"\n`;
      });
      return csv;
    }

    static formatCategories(categories) {
      return categories.map(cat => `${cat.icon} ${cat.name}`).join('\n');
    }
  }
  
  module.exports = Formatter;
  