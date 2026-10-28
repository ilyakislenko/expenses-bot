const respond = require('../utils/respond');
const logger = require('../utils/logger');
const { keepTyping } = require('./ReceiptHandlers');
const { parseEntries } = require('../utils/multiEntry');

const EXAMPLE_COUNT = 6;
const EXAMPLES_IN_HINT = 3;

// Слово (или пара слов) до пробела, знака препинания или конца текста; «что-то», «где-то» — не вопрос
const word = (alternatives) => `(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}-])`;
// Начало вопроса — вопрос и без «?»: «сколько я потратил вчера», «how much did i spend yesterday»
const QUESTION_START = new RegExp(`^(?:${word([
  'сколько', 'скольк\\p{L}*', 'скок\\p{L}?', 'скоко', 'куда', 'на\\s+что', 'что', 'какие', 'какая', 'какой', 'каких', 'какую',
  'когда', 'где', 'покажи', 'how\\s+much', 'how\\s+many', 'what', 'where', 'which', 'when', 'show\\s+me',
  'cu[aá]nto\\p{L}*', 'combien', 'wie\\s*viel\\p{L}*', 'quanto\\p{L}*', 'ne\\s+kadar', 'ka[çc]', 'qancha', 'қанша',
  'რამდენ\\p{L}*', 'कितना', 'कितने', 'कितनी'
].join('|'))}|いくら|多少|哪)`, 'iu');
// Вопросительные слова где угодно: с «?» в конце или после даты в начале («14 сентября сколько потратил»)
// текст — вопрос, даже если начинается с числа («3 самых дорогих покупки в августе?»)
const QUESTION_WORDS = new RegExp(word([
  'сколько', 'скольк\\p{L}*', 'скок\\p{L}?', 'скоко', 'какие', 'какой', 'какая', 'каких', 'самы[хйея]', 'самая', 'самое', 'топ',
  'how\\s+much', 'how\\s+many', 'what', 'which', 'top', 'most', 'biggest',
  'cu[aá]nto\\p{L}*', 'combien', 'wie\\s*viel\\p{L}*', 'quanto\\p{L}*', 'ne\\s+kadar', 'qancha', 'қанша', 'რამდენ\\p{L}*', 'कितना'
].join('|')) + '|いくら|多少', 'iu');
// Число и месяц в начале: «14 сентября …», «5 oct …»
const DATE_START = /^\d{1,2}\s+(?:январ|феврал|март|апрел|ма[яй]|июн|июл|август|сентябр|октябр|ноябр|декабр|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/iu;

// Вопрос боту, а не запись:
// — начинается с «?»;
// — начинается с вопросительного слова («сколько я потратил вчера» — и без «?»);
// — есть вопросительное слово и «?» в конце или дата в начале («14 сентября сколько потратил?»);
// — «?» в конце и в тексте нет записей с суммой (иначе «такси 400?», «кофе 250, такси 400?» — записи).
// entries — уже разобранные записи (голос разбирает по-своему), иначе разбираются здесь
function isQuestion(text, entries) {
  const value = String(text || '').trim();
  if (/^[?？¿]/.test(value)) return /\p{L}/u.test(value);
  if (QUESTION_START.test(value) && /\S\s+\S/.test(value)) return true;
  const endsWithMark = /[?？]$/.test(value);
  if (QUESTION_WORDS.test(value) && (endsWithMark || DATE_START.test(value))) return true;
  if (!endsWithMark) return false;
  const parsed = entries === undefined ? parseEntries(value) : entries;
  if (parsed && parsed.length) return false;
  return !/^[+-]?\s*\d/.test(value) && /\p{L}{2,}/u.test(value) && value.split(/\s+/).length >= 2;
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
      logger.info('Assistant did not answer', { userId, status: result.status, source: result.source, position: result.position });
      const key = {
        future: 'ai_future',
        model_down: 'ai_model_down',
        model_busy: result.position ? 'ai_model_busy' : 'ai_model_busy_now',
        model_limit: 'ai_model_limit',
        period_unclear: 'ai_period_unclear'
      }[result.status] || 'ai_not_understood';
      const params = { examples: this.examplesHint(lang), position: result.position, limit: result.limit };
      await this.editStatus(ctx, statusId, this.t(lang, key, params), {
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

  // aiw|<id> — «🙅 Не то» под ответом: ответ не засчитывается в дневной лимит (один раз в день), следующее
  // сообщение — уточнённый вопрос. Сверх раза в день — тоже можно уточнить, но ответ остаётся в лимите
  async markWrong(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const result = await this.assistantService.markWrong(userId, parseInt(ctx.match[1], 10));
    if (result === 'missing' || result === 'done') {
      await ctx.answerCbQuery(this.t(lang, result === 'missing' ? 'ai_wrong_missing' : 'ai_wrong_done')).catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    this.stateService.setUserState(userId, 'ai_in:q');
    await ctx.reply(this.t(lang, result === 'marked' ? 'ai_wrong_ack' : 'ai_wrong_used'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_back'), callback_data: 'ai' }]] }
    });
  }
}

AssistantHandlers.isQuestion = isQuestion;

module.exports = AssistantHandlers;
