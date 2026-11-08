const logger = require('../utils/logger');
const { moveToDate } = require('../utils/recordDate');

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

  // currency = null → валюта дохода пользователя по умолчанию. date — другой день (локальная 'YYYY-MM-DD', проверена
  // вызывающим; Mini App), timezone — пояс пользователя; без date — сейчас
  async addIncome(userId, amount, currency, description, { date = null, timezone = null } = {}) {
    const incomeCurrency = currency || await this.userRepository.getUserIncomeCurrency(userId);
    let income = await this.incomeRepository.addIncome(userId, amount, incomeCurrency, description);
    logger.info('Income added', { userId, amount, currency: incomeCurrency, incomeId: income.id });
    if (date && timezone) {
      income = await this.incomeRepository.setIncomeCreatedAt(userId, income.id, moveToDate(income.created_at_utc, date, timezone)) || income;
    }
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

  // changes — { amount, currency, description } целиком (незаданные поля берёт обработчик из старой записи)
  async updateIncome(userId, incomeId, changes) {
    const income = await this.incomeRepository.updateIncome(userId, incomeId, changes);
    if (income) logger.info('Income updated', { userId, incomeId, amount: changes.amount, currency: changes.currency });
    return income;
  }

  // Другой день дохода (date — локальная 'YYYY-MM-DD', проверена обработчиком): местное время суток остаётся,
  // не позже текущего момента. null — дохода нет
  async setIncomeDate(userId, incomeId, date, timezone) {
    const current = await this.incomeRepository.getIncomeById(userId, incomeId);
    if (!current) return null;
    const income = await this.incomeRepository.setIncomeCreatedAt(userId, incomeId, moveToDate(current.created_at_utc, date, timezone));
    if (income) logger.info('Income date changed', { userId, incomeId, date });
    return income;
  }

  async deleteIncome(userId, incomeId) {
    return this.incomeRepository.deleteIncomeById(userId, incomeId);
  }

  // «Вернуть» сразу после удаления: row — удалённая строка (результат deleteIncome) с тем же id, временем и отметкой
  // выписки. null — строка чужая или id уже занят
  async restoreIncome(userId, row) {
    if (!row || Number(row.user_id) !== Number(userId)) return null;
    const income = await this.incomeRepository.restoreIncome(row);
    if (income) logger.info('Income restored', { userId, incomeId: income.id });
    return income || null;
  }
}

module.exports = IncomeService;
