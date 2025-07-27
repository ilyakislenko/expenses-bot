class Validator {
    static parseExpense(text) {
      // Пример: '200 такси'
      const match = text.match(/^(\d+[.,]?\d*)\s+(.+)$/);
      if (!match) {
        return { isValid: false, error: 'format' };
      }
      const amount = parseFloat(match[1].replace(',', '.'));
      const description = match[2].trim();
      if (!description) {
        return { isValid: false, error: 'no_description' };
      }
      if (description.length > 60) {
        return { isValid: false, error: 'too_long' };
      }
      if (isNaN(amount) || amount <= 0 || amount > 999999) {
        return { isValid: false, error: 'amount' };
      }
      return {
        isValid: true,
        amount,
        description
      };
    }
  
    static isValidAmount(amount) {
      return typeof amount === 'number' && amount > 0 && amount <= 999999;
    }
  }
  
  module.exports = Validator;
  