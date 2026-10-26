const logger = require('../utils/logger');

class IncomeService {
  constructor(incomeRepository, userRepository) {
    this.incomeRepository = incomeRepository;
    this.userRepository = userRepository;
  }

  async getIncomeCurrency(userId) {
    return this.userRepository.getUserIncomeCurrency(userId);
  }

  async setIncomeCurrency(userId, currency) {
    return this.userRepository.setUserIncomeCurrency(userId, currency);
  }

  // currency = null → валюта дохода пользователя по умолчанию
  async addIncome(userId, amount, currency, description) {
    const incomeCurrency = currency || await this.userRepository.getUserIncomeCurrency(userId);
    const income = await this.incomeRepository.addIncome(userId, amount, incomeCurrency, description);
    logger.info('Income added', { userId, amount, currency: incomeCurrency, incomeId: income.id });
    return income;
  }

  // period — { start, end } из utils/period, timezone — часовой пояс пользователя
  async getIncomes(userId, timezone, period) {
    return this.incomeRepository.getIncomesBetween(userId, timezone, period.start, period.end);
  }

  // { byCurrency: [{ currency, total }], count }
  async getTotals(userId, timezone, period) {
    return this.incomeRepository.getTotalsBetween(userId, timezone, period.start, period.end);
  }

  async getIncome(userId, incomeId) {
    return this.incomeRepository.getIncomeById(userId, incomeId);
  }

  async deleteIncome(userId, incomeId) {
    return this.incomeRepository.deleteIncomeById(userId, incomeId);
  }
}

module.exports = IncomeService;
