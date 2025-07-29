class UserService {
  constructor(userRepository, categoryRepository) {
    this.userRepository = userRepository;
    this.categoryRepository = categoryRepository;
  }

  async registerUser(userId, username, firstName) {
    const user = await this.userRepository.createUser(userId, username, firstName);
    await this.categoryRepository.createDefaultCategories(userId);
    return user;
  }

  async setUserCurrency(userId, currency) {
    return this.userRepository.setUserCurrency(userId, currency);
  }

  async getUserCurrency(userId) {
    return this.userRepository.getUserCurrency(userId);
  }

  async setUserPremium(userId, isPremium) {
    return this.userRepository.setUserPremium(userId, isPremium);
  }

  async getUserPremium(userId) {
    return this.userRepository.getUserPremium(userId);
  }
}

module.exports = UserService; 