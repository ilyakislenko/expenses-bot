class Validator {
    static parseExpense(text) {
      // Пример: '200 такси'
      const match = text.match(/^(\d+[.,]?\d*)\s+(.+)$/);
      if (!match) {
        return { isValid: false };
      }
      const amount = parseFloat(match[1].replace(',', '.'));
      if(!this.isValidAmount(amount)){
        return {isValid:false}
      }
      const description = match[2].trim();
      if (!description) {
        return { isValid: false };
      }
      return {
        isValid: !isNaN(amount) && amount > 0 && !!description,
        amount,
        description
      };
    }
  
    static isValidAmount(amount) {
      return typeof amount === 'number' && amount > 0 && amount <= 999999;
    }
  }
  
  module.exports = Validator;
  