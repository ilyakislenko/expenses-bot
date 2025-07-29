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

  static async setUserPremium(userId, isPremium) {
    return db.setUserPremium(userId, isPremium);
  }

  static async getUserPremium(userId) {
    return db.getUserPremium(userId);
  }
}

module.exports = UserRepository; 