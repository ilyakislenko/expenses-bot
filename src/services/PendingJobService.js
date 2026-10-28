const crypto = require('crypto');
const logger = require('../utils/logger');

// Фоновые распознавания (чек, голосовое) идут после ответа на апдейт, а сообщение «🔍 Распознаю чек…» ждёт результата.
// Задача отмечается в БД на время работы; после перезапуска бота оставшиеся отметки прошлого запуска превращаются
// в «прервалось — пришли ещё раз» (или в прежний черновик чека — restorers). Ошибки БД задачу не останавливают.
class PendingJobService {
  constructor({ pendingJobRepository, userService, localizationService }) {
    this.pendingJobRepository = pendingJobRepository;
    this.userService = userService;
    this.localizationService = localizationService;
    this.instance = crypto.randomUUID(); // этот запуск бота
  }

  // kind: 'receipt' | 'voice'
  async start(kind, { userId, chatId, messageId }) {
    try {
      await this.pendingJobRepository.start(this.instance, kind, { userId, chatId, messageId });
    } catch (error) {
      logger.warn('Pending job not saved', { kind, userId, error: error.message });
    }
  }

  async finish(chatId, messageId) {
    try {
      await this.pendingJobRepository.finish(this.instance, chatId, messageId);
    } catch (error) {
      logger.warn('Pending job not cleared', { chatId, messageId, error: error.message });
    }
  }

  // При запуске бота: задачи прошлых запусков. restorers[kind](job) → true, если сообщение уже восстановлено
  // (например, прежний черновик чека); иначе статус меняется на job_interrupted_<kind>
  async recoverInterrupted(telegram, restorers = {}) {
    const jobs = await this.pendingJobRepository.takeInterrupted(this.instance);
    for (const job of jobs) {
      try {
        const restore = restorers[job.kind];
        if (restore && await restore(job)) continue;
        const lang = await this.userService.getUserLanguage(job.user_id);
        await telegram.editMessageText(job.chat_id, job.message_id, undefined,
          this.localizationService.getText(lang, `job_interrupted_${job.kind}`), { reply_markup: { inline_keyboard: [] } });
      } catch (error) {
        logger.warn('Interrupted job not reported', { kind: job.kind, userId: job.user_id, error: error.message });
      }
    }
    if (jobs.length) logger.info('Interrupted jobs reported', { count: jobs.length });
    return jobs.length;
  }
}

module.exports = PendingJobService;
