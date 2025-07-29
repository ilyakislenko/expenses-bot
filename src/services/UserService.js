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

  static async setUserPremium(userId, isPremium) {
    return UserRepository.setUserPremium(userId, isPremium);
  }

  static async getUserPremium(userId) {
    return UserRepository.getUserPremium(userId);
  }
}

module.exports = UserService; 