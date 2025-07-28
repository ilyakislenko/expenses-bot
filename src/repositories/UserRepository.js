const db = require('../database');

class UserRepository {
  static async createUser(userId, username, firstName) {
    return db.createUser(userId, username, firstName);
  }

  static async setUserCurrency(userId, currency) {
    return db.setUserCurrency(userId, currency);
  }

  static async getUserCurrency(userId) {
    return db.getUserCurrency(userId);
  }
}

module.exports = UserRepository; 