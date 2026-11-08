// Один вопрос за раз на пользователя: пока ответ считается в фоне, новый вопрос — «ещё думаю» (busy).
// Один набор на процесс (AssistantService.turns) — общий для бота и Mini App: вопрос в чате и в приложении
// одновременно тоже не задать.
class QuestionTurns {
  constructor() {
    this.busy = new Set();
    this.tasks = new Set();
  }

  // Занять очередь пользователя: false — уже думаем над его вопросом
  claim(userId) {
    if (this.busy.has(userId)) return false;
    this.busy.add(userId);
    return true;
  }

  release(userId) {
    this.busy.delete(userId);
  }

  // Ответ в фоне: пользователь занят, пока промис не завершится
  track(userId, promise) {
    const task = Promise.resolve(promise).finally(() => {
      this.busy.delete(userId);
      this.tasks.delete(task);
    });
    this.tasks.add(task);
    return task;
  }

  // Все фоновые ответы завершены (для тестов и smoke)
  async idle() {
    await Promise.all([...this.tasks]);
  }
}

module.exports = { QuestionTurns };
