const UserRepository = require('../repositories/UserRepository');

class UserService {
  static async registerUser(userId, username, firstName) {
    return UserRepository.createUser(userId, username, firstName);
  }

  static async setUserCurrency(userId, currency) {
    return UserRepository.setUserCurrency(userId, currency);
  }

  static async getUserCurrency(userId) {
    return UserRepository.getUserCurrency(userId);
  }
}

module.exports = UserService; 