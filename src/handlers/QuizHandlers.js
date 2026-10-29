const respond = require('../utils/respond');
const logger = require('../utils/logger');
const { QUIZ } = require('../utils/constants');

// «🎲 Угадай свои траты»: экран квиза (qz, /quiz), старт и «Продолжить» (qz|go), правила (qzr), приглашения вкл/выкл
// (qzo|<s|i> — с экрана квиза / под приглашением, qzt — с экрана «🔔 Напоминания»), ответы: poll_answer, закрытие
// опроса (poll) и кнопки запасного варианта (qza|<сессия>|<вопрос>|<вариант>)
class QuizHandlers {
  constructor({ quizService, userService, localizationService }) {
    this.quizService = quizService;
    this.userService = userService;
    this.localizationService = localizationService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  weekday(lang, date) {
    return this.quizService.weekdayLabel(date, lang);
  }

  // Экран квиза: открыт ли сейчас, твой результат недели, прошлый розыгрыш, кнопки
  async show(ctx) {
    const userId = ctx.from.id;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const st = await this.quizService.status(userId);
    const { lang, window, session } = st;
    const lines = [this.t(lang, 'quiz_title'), ''];
    const keyboard = [];

    if (session && session.status === 'finished') {
      const summary = await this.quizService.summary(session);
      lines.push(this.t(lang, 'quiz_screen_done', {
        correct: session.correct_count, total: session.total, points: session.score, dots: this.quizService.dots(session.answers)
      }));
      if (summary.percent !== null) lines.push(this.t(lang, 'quiz_result_percent', { percent: summary.percent }));
      if (summary.streak >= 2) lines.push(this.t(lang, 'quiz_result_streak', { weeks: summary.streak }));
      lines.push('', this.t(lang, 'quiz_screen_next', { day: this.weekday(lang, window.nextOpenDate), hour: QUIZ.OPEN_HOUR }));
    } else if (session && session.status === 'paused') {
      lines.push(this.t(lang, 'quiz_screen_paused', { n: session.current_index, total: session.total }));
      keyboard.push([{ text: this.t(lang, 'quiz_button_continue'), callback_data: 'qz|go' }]);
    } else if (session) {
      lines.push(this.t(lang, 'quiz_screen_active', { n: Math.min(session.current_index + 1, session.total), total: session.total }));
      keyboard.push([{ text: this.t(lang, 'quiz_button_continue'), callback_data: 'qz|go' }]);
    } else if (window.open) {
      lines.push(this.t(lang, 'quiz_screen_open', {
        questions: QUIZ.QUESTIONS, seconds: QUIZ.OPEN_PERIOD_SEC, until: this.weekday(lang, window.closeDate), days: QUIZ.PRIZES[0].days
      }));
      keyboard.push([{ text: this.t(lang, 'quiz_button_play'), callback_data: 'qz|go' }]);
    } else {
      lines.push(this.t(lang, 'quiz_screen_closed', { day: this.weekday(lang, window.nextOpenDate), hour: QUIZ.OPEN_HOUR }));
      if (st.last) {
        lines.push('', this.t(lang, 'quiz_screen_last', {
          range: this.quizService.weekRange(st.last.week_key), correct: st.last.correct_count, total: st.last.total, points: st.last.score
        }));
      }
    }

    if (st.lastDraw) {
      lines.push('', this.t(lang, 'quiz_screen_draw', { range: this.quizService.weekRange(st.lastDraw.week_key), players: st.lastDraw.participants }));
      for (const prize of st.prizes) lines.push(this.t(lang, `quiz_prize_${prize.kind}`, { days: prize.days }));
    }

    keyboard.push([
      { text: this.t(lang, 'quiz_button_rules'), callback_data: 'qzr' },
      { text: this.t(lang, st.invites ? 'quiz_button_invites_on' : 'quiz_button_invites_off_state'), callback_data: 'qzo|s' }
    ]);
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: 'menu' }]);
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // «▶️ Играть» / «▶️ Продолжить»: первый (или текущий) вопрос приходит опросом отдельным сообщением
  async start(ctx) {
    const userId = ctx.from.id;
    const result = await this.quizService.start(userId);
    const { lang } = result;
    if (result.status === 'started' || result.status === 'resumed') {
      await ctx.answerCbQuery(this.t(lang, 'quiz_started_alert', { seconds: QUIZ.OPEN_PERIOD_SEC })).catch(() => {});
      if (ctx.callbackQuery) await ctx.editMessageReplyMarkup(undefined).catch(() => {});
      return;
    }
    if (result.status === 'waiting') {
      return ctx.answerCbQuery(this.t(lang, 'quiz_waiting_alert'), { show_alert: true }).catch(() => {});
    }
    if (result.status === 'no_data') {
      return this.reply(ctx, this.t(lang, 'quiz_no_data', { questions: QUIZ.QUESTIONS }));
    }
    if (result.status === 'closed') {
      return this.reply(ctx, this.t(lang, 'quiz_screen_closed', { day: this.weekday(lang, result.window.nextOpenDate), hour: QUIZ.OPEN_HOUR }));
    }
    // Уже пройден на этой неделе
    return ctx.answerCbQuery(this.t(lang, 'quiz_already_done'), { show_alert: true }).catch(() => this.show(ctx));
  }

  async reply(ctx, text) {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    await respond(ctx, text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'quiz_button_rules'), callback_data: 'qzr' }, { text: this.t(lang, 'button_back'), callback_data: 'qz' }]] }
    });
  }

  // «📜 Правила»: когда, как считаются очки, что разыгрывается и как
  async rules(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const [grand, runner] = QUIZ.PRIZES;
    const text = this.t(lang, 'quiz_rules', {
      hour: QUIZ.OPEN_HOUR,
      questions: QUIZ.QUESTIONS,
      seconds: QUIZ.OPEN_PERIOD_SEC,
      correct: QUIZ.POINTS_CORRECT,
      finish: QUIZ.BONUS_FINISH,
      perfect: QUIZ.BONUS_PERFECT,
      max: QUIZ.QUESTIONS * QUIZ.POINTS_CORRECT + QUIZ.BONUS_FINISH + QUIZ.BONUS_PERFECT,
      grandDays: grand.days,
      grandCount: grand.count,
      runnerDays: runner.days,
      runnerCount: runner.count,
      perfectDays: QUIZ.PERFECT_DAYS,
      drawHour: QUIZ.DRAW_HOUR_UTC
    });
    // Экран квиза и приглашение (текст) — правила на их месте; итоги (картинка с подписью) — новым сообщением
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_back'), callback_data: 'qz' }]] } });
  }

  // Приглашения вкл/выкл: с экрана квиза (qzo|s) — экран заново; под приглашением (qzo|i) — кнопки приглашения убираются
  async toggleInvites(ctx) {
    const userId = ctx.from.id;
    const origin = ctx.match[1];
    const lang = await this.userService.getUserLanguage(userId);
    const enabled = origin === 'i' ? false : !(await this.quizService.getInvitesEnabled(userId));
    await this.quizService.setInvitesEnabled(userId, enabled);
    await ctx.answerCbQuery(this.t(lang, enabled ? 'quiz_invites_enabled' : 'quiz_invites_disabled')).catch(() => {});
    if (origin === 'i') {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: this.t(lang, 'quiz_button_play'), callback_data: 'qz|go' }]] }).catch(() => {});
      return;
    }
    await this.show(ctx);
  }

  // «🎲 Квиз: вкл/выкл» на экране «🔔 Напоминания»
  async toggleFromReminders(ctx, showReminders) {
    const userId = ctx.from.id;
    const enabled = !(await this.quizService.getInvitesEnabled(userId));
    await this.quizService.setInvitesEnabled(userId, enabled);
    const lang = await this.userService.getUserLanguage(userId);
    await ctx.answerCbQuery(this.t(lang, enabled ? 'quiz_invites_enabled' : 'quiz_invites_disabled')).catch(() => {});
    await showReminders(ctx);
  }

  // Ответ на опрос-викторину (апдейт poll_answer: без чата, только пользователь и номер варианта)
  async pollAnswer(ctx) {
    const answer = ctx.pollAnswer;
    if (!answer || !answer.user) return;
    const result = await this.quizService.answerPoll(answer.poll_id, answer.user.id, answer.option_ids);
    if (result.status === 'unknown') {
      // Ответ пришёл раньше, чем записали опрос (мгновенное нажатие) — ещё одна попытка через секунду
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.quizService.answerPoll(answer.poll_id, answer.user.id, answer.option_ids);
    }
  }

  // Telegram закрыл опрос (апдейт poll): по голосам видно, был ли ответ
  async pollClosed(ctx) {
    await this.quizService.pollClosed(ctx.poll);
  }

  // Запасной вариант — кнопки (qza|<сессия>|<вопрос>|<вариант>)
  async buttonAnswer(ctx) {
    const userId = ctx.from.id;
    const [sessionId, index, option] = ctx.match.slice(1, 4).map(Number);
    const lang = await this.userService.getUserLanguage(userId);
    const result = await this.quizService.answerButton(userId, sessionId, index, option);
    if (result.status === 'late') return ctx.answerCbQuery(this.t(lang, 'quiz_late_alert'), { show_alert: true }).catch(() => {});
    if (result.status !== 'correct' && result.status !== 'wrong') {
      await ctx.editMessageReplyMarkup(undefined).catch(() => {});
      return ctx.answerCbQuery(this.t(lang, 'button_outdated')).catch(() => {});
    }
    await ctx.answerCbQuery(this.t(lang, result.correct ? 'quiz_correct_alert' : 'quiz_wrong_alert')).catch(() => {});
    const session = result.session || (await this.quizService.repo.getSessionById(sessionId));
    const question = session && session.questions[index];
    if (question) {
      const mark = result.correct ? '✅' : '❌';
      await ctx.editMessageText(`${this.quizService.questionHeader(session, index)} ${question.text}\n\n${mark} ${question.options[option]}\n${question.explanation}`)
        .catch(error => logger.debug('Quiz button message not edited', { error: error.message }));
    }
  }
}

module.exports = QuizHandlers;
