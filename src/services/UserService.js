class UserService {
  constructor(userRepository, categoryRepository) {
    this.userRepository = userRepository;
    this.categoryRepository = categoryRepository;
  }

  async registerUser(userId, username, firstName) {
    return await this.userRepository.createUser(userId, username, firstName);
    // Категории уже есть в БД как системные (user_id = 0)
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

  // Методы для премиум-категорий
  async createUserCategory(userId, name, icon) {
    const isPremium = await this.getUserPremium(userId);
    if (!isPremium) {
      throw new Error('Премиум функция недоступна');
    }
    return this.categoryRepository.createUserCategory(userId, name, icon);
  }

  async getUserCategories(userId) {
    const isPremium = await this.getUserPremium(userId);
    if (!isPremium) {
      return []; // Обычные пользователи видят только системные категории
    }
    return this.categoryRepository.getUserCategories(userId);
  }

  // Метод для получения всех категорий с учетом премиум-статуса
  async getCategories(userId) {
    const isPremium = await this.getUserPremium(userId);
    return this.categoryRepository.getCategoriesWithPremium(userId, isPremium);
  }

  async deleteUserCategory(userId, categoryId) {
    const isPremium = await this.getUserPremium(userId);
    if (!isPremium) {
      throw new Error('Премиум функция недоступна');
    }
    return this.categoryRepository.deleteUserCategory(userId, categoryId);
  }

  async updateUserCategory(userId, categoryId, data) {
    const isPremium = await this.getUserPremium(userId);
    if (!isPremium) {
      throw new Error('Премиум функция недоступна');
    }
    return this.categoryRepository.updateUserCategory(userId, categoryId, data);
  }
}

module.exports = UserService; 