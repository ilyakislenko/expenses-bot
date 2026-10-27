const respond = require('../utils/respond');
const logger = require('../utils/logger');
const { keepTyping } = require('./ReceiptHandlers');

const EXAMPLE_COUNT = 6;
const EXAMPLES_IN_HINT = 3;

// Вопрос боту: «? сколько я потратил…», или текст без суммы в начале, который заканчивается «?»
// (трата всегда начинается с суммы — «250 кофе» вопросом не станет)
function isQuestion(text) {
  const value = String(text || '').trim();
  if (/^[?？¿]/.test(value)) return /\p{L}/u.test(value);
  return /[?？]$/.test(value) && !/^[+-]?\s*\d/.test(value) && /\p{L}{2,}/u.test(value) && value.split(/\s+/).length >= 2;
}

// «🤖 Спроси бота»: экран с примерами, вопрос текстом (`?`, /ask, состояние ai_in:), ответ в фоне — сообщение
// «🤔 Думаю…» превращается в ответ. Один вопрос за раз на пользователя.
class AssistantHandlers {
  constructor({ assistantService, userService, stateService, localizationService }) {
    this.assistantService = assistantService;
    this.userService = userService;
    this.stateService = stateService;
    this.localizationService = localizationService;
    this.tasks = new Set();
    this.busyUsers = new Set();
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  exampleList(lang, count = EXAMPLE_COUNT) {
    return Array.from({ length: count }, (_, i) => this.t(lang, `ai_example_${i + 1}`));
  }

  // Экран примеров: кнопка = вопрос; «✍️ Свой вопрос»; лимит на сегодня
  async showExamples(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const timezone = await this.userService.getUserTimezone(userId);
    const limit = await this.assistantService.checkLimit(userId, timezone);
    let text = this.t(lang, 'ai_intro');
    text += `\n\n${limit.isPremium
      ? this.t(lang, 'ai_limits_premium', { left: limit.remaining, limit: limit.limit })
      : this.t(lang, 'ai_limits_regular', { left: limit.remaining, limit: limit.limit, premium: this.assistantService.premiumLimit })}`;
    const keyboard = this.exampleList(lang).map((example, i) => [{ text: example, callback_data: `ai|${i + 1}` }]);
    keyboard.push([{ text: this.t(lang, 'button_ai_own'), callback_data: 'aiq' }]);
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: 'back_to_menu' }]);
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // aiq — свой вопрос следующим сообщением (состояние ai_in:q)
  async startInput(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await ctx.answerCbQuery().catch(() => {});
    this.stateService.setUserState(userId, 'ai_in:q');
    await respond(ctx, this.t(lang, 'ai_ask_prompt'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_back'), callback_data: 'ai' }]] }
    });
  }

  async handleInput(ctx, text, lang) {
    this.stateService.deleteUserState(ctx.from.id);
    await this.ask(ctx, text, lang);
  }

  // ai|<n> — пример с экрана; экран примеров остаётся, ответ приходит отдельным сообщением
  async askExample(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    await ctx.answerCbQuery().catch(() => {});
    const n = parseInt(ctx.match[1], 10);
    await this.ask(ctx, this.t(lang, `ai_example_${n}`), lang, { example: n });
  }

  // /ask <вопрос>; без вопроса — экран примеров
  async handleCommand(ctx) {
    const question = String(ctx.message.text || '').replace(/^\/ask(?:@\w+)?/i, '').trim();
    if (!question) return this.showExamples(ctx);
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    return this.ask(ctx, question, lang);
  }

  async ask(ctx, rawQuestion, lang, { example = null } = {}) {
    // Ответы — о личных деньгах: в группах не отвечаем
    if (ctx.chat && ctx.chat.type !== 'private') return;
    const userId = ctx.from.id;
    const question = String(rawQuestion || '').trim().replace(/^[?？¿]+\s*/, '');
    if (!question) {
      await ctx.reply(this.t(lang, 'ai_ask_prompt'), { parse_mode: 'Markdown' });
      return;
    }
    if (question.length > this.assistantService.constructor.MAX_QUESTION_LENGTH) {
      await ctx.reply(this.t(lang, 'ai_too_long', { max: this.assistantService.constructor.MAX_QUESTION_LENGTH }));
      return;
    }
    if (this.busyUsers.has(userId)) {
      await ctx.reply(this.t(lang, 'ai_busy'));
      return;
    }
    this.busyUsers.add(userId);
    let started = false;
    try {
      const timezone = await this.userService.getUserTimezone(userId);
      const limit = await this.assistantService.checkLimit(userId, timezone);
      if (!limit.remaining) {
        const key = limit.isPremium ? 'ai_limit_premium' : 'ai_limit_regular';
        const keyboard = limit.isPremium ? [] : [[{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]];
        // used может быть больше лимита: например, премиум закончился сегодня после 20 вопросов
        await ctx.reply(this.t(lang, key, { used: Math.min(limit.used, limit.limit), limit: limit.limit, premium: this.assistantService.premiumLimit }), {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
        return;
      }
      const status = await ctx.reply(this.t(lang, 'ai_thinking'));
      // Нейросеть может думать секунды, а в очереди за чеком — дольше: обработчик апдейта не ждёт,
      // иначе polling задержит остальных пользователей
      this.track(userId, this.answerInBackground(ctx, { question, lang, statusId: status.message_id, limit, example }));
      started = true;
    } finally {
      if (!started) this.busyUsers.delete(userId);
    }
  }

  track(userId, promise) {
    const task = promise.finally(() => {
      this.busyUsers.delete(userId);
      this.tasks.delete(task);
    });
    this.tasks.add(task);
  }

  // Все фоновые ответы завершены (для тестов и smoke)
  async idle() {
    await Promise.all([...this.tasks]);
  }

  async editStatus(ctx, messageId, text, extra = {}) {
    try {
      await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, text, extra);
    } catch (error) {
      await ctx.reply(text, extra);
    }
  }

  examplesHint(lang) {
    return this.exampleList(lang, EXAMPLES_IN_HINT).map(example => `• ${example}`).join('\n');
  }

  async answerInBackground(ctx, { question, lang, statusId, limit, example = null }) {
    const userId = ctx.from.id;
    const stopTyping = keepTyping(ctx);
    let statusText = this.t(lang, 'ai_thinking');
    let statusEdits = Promise.resolve();
    const onStatus = ({ position }) => {
      const text = position ? this.t(lang, 'ai_thinking_queued', { position }) : this.t(lang, 'ai_thinking');
      if (text === statusText) return;
      statusText = text;
      statusEdits = statusEdits.then(() => ctx.telegram.editMessageText(ctx.chat.id, statusId, undefined, text)).catch(() => {});
    };
    const moreButton = [[{ text: this.t(lang, 'ai_button_more'), callback_data: 'ai' }]];
    try {
      const result = await this.assistantService.answer(userId, question, { lang, onStatus, example });
      await statusEdits;
      stopTyping();
      if (result.status === 'answered') {
        let text = result.text;
        if (!limit.isPremium) {
          text += `\n\n_${this.t(lang, 'ai_left_today', { left: Math.max(0, limit.remaining - 1), limit: limit.limit })}_`;
        }
        await this.editStatus(ctx, statusId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: result.keyboard } });
        return;
      }
      logger.info('Assistant did not answer', { userId, status: result.status, source: result.source });
      const key = { future: 'ai_future', model_down: 'ai_model_down' }[result.status] || 'ai_not_understood';
      await this.editStatus(ctx, statusId, this.t(lang, key, { examples: this.examplesHint(lang) }), {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: moreButton }
      });
    } catch (error) {
      logger.error('Assistant answer failed', { userId, error: error.message, stack: error.stack });
      await statusEdits;
      await this.editStatus(ctx, statusId, this.t(lang, 'ai_error'), { reply_markup: { inline_keyboard: moreButton } }).catch(() => {});
    } finally {
      stopTyping();
    }
  }
}

AssistantHandlers.isQuestion = isQuestion;

module.exports = AssistantHandlers;
