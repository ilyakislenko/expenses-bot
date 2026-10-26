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
      return formattedDate;
    } catch (error) {
      console.error('Error formatting date:', error, 'date:', date);
      return 'Date error';
    }
  }

  // Подпись записи: описание (экранированное для Markdown) или название категории, если описания нет
  expenseLabel(expense, localizationService, userLanguage) {
    if (expense.description) return this.escapeMarkdown(expense.description);
    if (expense.category_name) return this.escapeMarkdown(this.translateCategoryName(expense.category_name, localizationService, userLanguage));
    return '—';
  }

  formatTime(date, timezone = 'UTC') {
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(date));
  }

  formatShortDateTime(date, timezone = 'UTC') {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(date));
  }

  // { start, last } из utils/period → '05.10 – 04.11.2026'
  formatPeriodRange(period) {
    const [sy, sm, sd] = period.start.split('-');
    const [ly, lm, ld] = period.last.split('-');
    return sy === ly ? `${sd}.${sm} – ${ld}.${lm}.${ly}` : `${sd}.${sm}.${sy} – ${ld}.${lm}.${ly}`;
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
        const translatedName = this.escapeMarkdown(this.translateCategoryName(name, localizationService, userLanguage));
        const percentage = totalInUserCurrency > 0 ? (sum / totalInUserCurrency * 100).toFixed(1) : 0;
        message += `${icon} ${translatedName}: ${this.formatAmount(sum, userCurrency)} (${percentage}%)\n`;
      }
    }
    return message;
  }

  // Экранирование пользовательского текста для parse_mode: 'Markdown'
  escapeMarkdown(text) {
    return String(text ?? '').replace(/([_*`\[])/g, '\\$1');
  }

  // Обрезка длинного текста для строк списков (лимит сообщения Telegram — 4096 символов). Экранировать — после.
  shorten(text, max = 40) {
    const str = String(text ?? '');
    return str.length > max ? `${str.slice(0, max - 1).trimEnd()}…` : str;
  }

  // Текстовая шкала: 0.72 → '▓▓▓▓▓▓▓░░░' (больше 100% — полная шкала)
  progressBar(ratio, width = 10) {
    const filled = Math.max(0, Math.min(width, Math.round(ratio * width)));
    return '▓'.repeat(filled) + '░'.repeat(width - filled);
  }

  // 'YYYY-MM-DD' → 'DD.MM.YYYY'
  formatLocalDate(ymd) {
    const [y, m, d] = ymd.split('-');
    return `${d}.${m}.${y}`;
  }

  async sumInCurrency(byCurrency, targetCurrency) {
    let sum = 0;
    for (const { currency, total } of byCurrency) {
      sum += await this.currencyUtils.convert(Number(total), currency, targetCurrency);
    }
    return sum;
  }

  // Блок "доход / остаток" для статистики за период. Пусто, если доходов за период нет.
  async formatIncomeSummary(incomeTotals, expenseTotal, userCurrency, localizationService, userLanguage) {
    if (!incomeTotals || !incomeTotals.count) return '';
    const incomeSum = await this.sumInCurrency(incomeTotals.byCurrency, userCurrency);
    const expenseSum = await this.sumInCurrency(expenseTotal.byCurrency || [], userCurrency);

    let text = localizationService.getText(userLanguage, 'income_total', { amount: this.formatAmount(incomeSum, userCurrency) });
    const hasForeign = incomeTotals.byCurrency.some(({ currency }) => currency !== userCurrency);
    if (hasForeign) {
      text += `\n(${incomeTotals.byCurrency.map(({ currency, total }) => this.formatAmount(total, currency)).join(' + ')})`;
    }
    text += '\n' + localizationService.getText(userLanguage, 'balance_label', { amount: this.formatAmount(incomeSum - expenseSum, userCurrency) });
    return text;
  }


// CSV для Excel: BOM (иначе кириллица ломается); разделитель и десятичный знак — как в Excel для языка
// пользователя: где дробь пишут через запятую (ru, de, fr…), Excel ждёт ';' и «10,50», иначе ',' и «10.50».
async formatCSV(expenses, userCurrency, userTimezone = 'UTC', localizationService = null, userLanguage = 'ru') {
  const commaDecimal = !['en', 'hi', 'jp', 'zh'].includes(userLanguage);
  const SEP = commaDecimal ? ';' : ',';
  const EMPTY_CELLS = SEP.repeat(4);
  const formatNumber = (value) => (commaDecimal ? String(value).replace('.', ',') : String(value));
  // Экранирование: удваивает кавычки, сохраняет \n для многострочных полей.
  // Текст, начинающийся с = + - @ (или табуляции/CR), Excel исполнит как формулу — нейтрализуем апострофом.
  // Числовые ячейки (сумма) не трогаем.
  function escapeCSV(value, { text = true } = {}) {
    let str = String(value ?? '');
    if (text && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
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

  let csv = '\uFEFF' + [dateHeader, amountHeader, currencyHeader, categoryHeader, descriptionHeader].join(SEP) + '\n';
  const totalsByCurrency = {};
  const totalsByCategory = {}; // { категория: { валюта: сумма } }
  
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
      escapeCSV(formatNumber(amount), { text: false }),
      escapeCSV(currency),
      escapeCSV(category),
      escapeCSV(description)
    ].join(SEP) + '\n';

    totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + Number(amount);
    totalsByCategory[category] = totalsByCategory[category] || {};
    totalsByCategory[category][currency] = (totalsByCategory[category][currency] || 0) + Number(amount);
  }
  csv += '\n';
  // Итоги по категориям в основной валюте, от большей к меньшей
  const totalByCategoriesText = localizationService ?
    localizationService.getText(userLanguage, 'total_by_categories') : 'Total by categories:';
  csv += escapeCSV(totalByCategoriesText) + EMPTY_CELLS + '\n';
  const categoryTotals = [];
  for (const [category, currencies] of Object.entries(totalsByCategory)) {
    let total = 0;
    for (const [currency, amount] of Object.entries(currencies)) {
      total += await this.currencyUtils.convert(amount, currency, userCurrency);
    }
    categoryTotals.push({ category, total });
  }
  categoryTotals.sort((a, b) => b.total - a.total);
  for (const { category, total } of categoryTotals) {
    csv += escapeCSV(`${category}: ${this.formatAmount(total, userCurrency)}`) + EMPTY_CELLS + '\n';
  }
  csv += '\n';
  // Итоги по валютам: добавляем заголовок отдельной строкой
  const totalByCurrenciesText = localizationService ? 
    localizationService.getText(userLanguage, 'total_by_currencies') : 'Total by currencies:';
  csv += escapeCSV(totalByCurrenciesText) + EMPTY_CELLS + '\n';
  // Итоги по валютам: каждая валюта отдельной строкой (только в первой колонке)
  for (const [currency, total] of Object.entries(totalsByCurrency)) {
    csv += escapeCSV(`${currency}: ${this.formatAmount(total, currency)}`) + EMPTY_CELLS + '\n';
  }
  // Итоговая сумма в userCurrency отдельной строкой
  let totalInUserCurrency = 0;
  for (const [currency, total] of Object.entries(totalsByCurrency)) {
    totalInUserCurrency += await this.currencyUtils.convert(total, currency, userCurrency);
  }
  const totalInCurrencyText = localizationService ? 
    localizationService.getText(userLanguage, 'total_in_currency', { currency: userCurrency }) : `Total in ${userCurrency}`;
  csv += escapeCSV(`${totalInCurrencyText}: ${this.formatAmount(totalInUserCurrency, userCurrency)}`) + EMPTY_CELLS + '\n';

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
}

module.exports = Formatter;
  