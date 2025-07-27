class Validator {
    static parseExpense(text) {
      // Паттерны для парсинга: "сумма описание" или "сумма категория описание"
      const patterns = [
        /^(\d+(?:[.,]\d{1,2})?)\s+(.+)$/,  // "100 еда в магазине"
        /^(\d+(?:[.,]\d{1,2})?)\s*$/       // только "100"
      ];
  
      for (const pattern of patterns) {
        const match = text.trim().match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(',', '.'));
          const description = match[2] || '';
          
          if (amount > 0 && amount <= 999999) {
            return {
              amount,
              description: description.trim(),
              isValid: true
            };
          }
        }
      }
  
      return { isValid: false };
    }
  
    static isValidAmount(amount) {
      return typeof amount === 'number' && amount > 0 && amount <= 999999;
    }
  }
  
  module.exports = Validator;
  