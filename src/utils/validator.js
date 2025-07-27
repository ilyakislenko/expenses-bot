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

    static parseEditExpense(text) {
      const input = text.trim();
      let amount = null;
      let description = null;
      // Если только число
      const amountMatch = input.match(/^([0-9]+([.,][0-9]+)?)$/);
      if (amountMatch) {
        amount = amountMatch[1].replace(',', '.');
      } else if (/^[0-9]+([.,][0-9]+)?\s+/.test(input)) {
        // число + текст
        const [amt, ...descArr] = input.split(' ');
        amount = amt.replace(',', '.');
        description = descArr.join(' ').trim();
      } else {
        // только текст
        description = input;
      }
      if (!amount && !description) {
        return { isValid: false, error: 'empty' };
      }
      if (amount && (isNaN(Number(amount)) || Number(amount) <= 0 || Number(amount) > 999999)) {
        return { isValid: false, error: 'amount' };
      }
      if (description && description.length > 60) {
        return { isValid: false, error: 'too_long' };
      }
      return {
        isValid: true,
        amount: amount ? Number(amount) : undefined,
        description: description || undefined
      };
    }
  }
  
  module.exports = Validator;
  