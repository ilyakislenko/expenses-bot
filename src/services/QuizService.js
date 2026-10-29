const crypto = require('crypto');
const logger = require('../utils/logger');
const { QUIZ } = require('../utils/constants');
const { addDays, customPeriod } = require('../utils/period');
const quiz = require('../utils/quiz');

// Локали Intl для названий дней недели
const INTL_LOCALES = { jp: 'ja', kz: 'kk' };
const FOOD_NAMES = ['Еда', 'Food'];
const STALE_ASK_MS = 60000; // отправка вопроса «застряла» (процесс упал между отметкой и sendPoll)
const STALE_GRANT_MS = 10 * 60000;
const ANSWER_MARK = { correct: 'c', wrong: 'w', missed: 'm' };

function shortDate(day) {
  return `${day.slice(8, 10)}.${day.slice(5, 7)}`;
}

// Ошибка Telegram, при которой опрос не отправить вовсе (а не сеть или блокировка бота) — тогда кнопки
function pollRejected(error) {
  const code = error && (error.code || (error.response && error.response.error_code));
  const description = String((error && (error.description || (error.response && error.response.description))) || '');
  return code === 400 && !/chat not found|bot was blocked|user is deactivated/i.test(description);
}

// «🎲 Угадай свои траты» — квиз недели. Вопросы — из своих трат (utils/quiz.js), отправка — опросом-викториной
// Telegram (ответ приходит апдейтом poll_answer, связь poll_id → вопрос — в quiz_polls), запасной вариант — кнопки.
// Всё состояние — в БД: перезапуск посреди квиза не ломает его (таймеры вопросов восстанавливает sweep()).
class QuizService {
  constructor({ quizRepository, userService, expenseService, incomeService, budgetService, currencyUtils, formatter, localizationService, notificationService, userNotificationRepository, achievementService = null, chartService = null, timers = true }) {
    this.repo = quizRepository;
    this.userService = userService;
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.budgetService = budgetService;
    this.currencyUtils = currencyUtils;
    this.formatter = formatter;
    this.localizationService = localizationService;
    this.notificationService = notificationService;
    this.userNotificationRepository = userNotificationRepository;
    this.achievementService = achievementService;
    this.chartService = chartService;
    this.useTimers = timers;
    this.timers = new Map(); // poll_id → таймер «время вышло» (после перезапуска — sweep() раз в минуту)
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  get telegram() {
    return this.notificationService.bot ? this.notificationService.bot.telegram : null;
  }

  botUsername() {
    return this.notificationService.botUsername ? this.notificationService.botUsername() : null;
  }

  shareLink() {
    const username = this.botUsername();
    return username ? `https://t.me/${username}?start=quiz` : null;
  }

  weekRange(weekKey) {
    return this.formatter.formatPeriodRange({ start: weekKey, last: addDays(weekKey, 6) });
  }

  weekdayLabel(date, lang) {
    let name;
    try {
      name = new Intl.DateTimeFormat(INTL_LOCALES[lang] || lang, { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
    } catch (error) {
      name = new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
    }
    return `${name.charAt(0).toLocaleUpperCase() + name.slice(1)}, ${shortDate(date)}`;
  }

  formatters(lang, currency) {
    const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
    return {
      t: (key, params) => this.t(lang, key, params),
      // От 100 — целые (как люди и помнят свои траты; отбрасываем, а не округляем — как границы диапазонов), меньше — до копеек
      money: (value) => this.formatter.formatAmount(Math.abs(value) >= 100 ? Math.trunc(value + 1e-9) : Math.trunc(value * 100 + 1e-6) / 100, currency),
      num: (value) => number.format(value),
      weekday: (date) => this.weekdayLabel(date, lang)
    };
  }

  // ---------- Вопросы ----------

  // Траты 4 полных недель до недели квиза в основной валюте (по курсу — как в обзоре), бюджет и доход прошлого периода
  async loadData(userId, lang, weekKey) {
    const { timezone, currency, startDay } = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const periods = quiz.quizPeriods(weekKey);
    const rows = await this.repo.getExpenses(userId, timezone, periods.month.start, periods.month.end);
    const rates = new Map();
    for (const code of new Set(rows.map(r => r.currency || currency))) {
      rates.set(code, code === currency ? 1 : await this.currencyUtils.convert(1, code, currency).catch(() => null));
    }
    const expenses = rows.filter(r => rates.get(r.currency || currency) !== null).map((row) => {
      const name = row.category_name || '';
      const translated = name ? this.formatter.translateCategoryName(name, this.localizationService, lang) : this.t(lang, 'quiz_no_category');
      return {
        amount: Number(row.amount) * rates.get(row.currency || currency),
        date: row.day,
        categoryName: name,
        categoryIcon: row.category_icon || '📦',
        categoryLabel: `${row.category_icon || '📦'} ${translated}`,
        description: row.description || '',
        recurring: !!row.recurring
      };
    });

    // Прошлый пользовательский период (закончился до недели квиза или вместе с ней): общий бюджет и доход
    const previous = customPeriod(weekKey, startDay, -1);
    let budget = null;
    let income = null;
    try {
      const statuses = await this.budgetService.getStatus(userId, { timezone, currency, period: previous });
      const total = statuses.find(s => s.category_name === null);
      if (total) budget = { limit: total.limit, spent: total.spent, range: this.formatter.formatPeriodRange(previous) };
      const [incomeTotals, spentTotals] = await Promise.all([
        this.incomeService.getTotals(userId, timezone, previous),
        this.expenseService.getTotals(userId, timezone, previous)
      ]);
      if (incomeTotals.count) {
        income = {
          income: await this.formatter.sumInCurrency(incomeTotals.byCurrency, currency),
          spent: await this.formatter.sumInCurrency(spentTotals.byCurrency, currency),
          range: this.formatter.formatPeriodRange(previous)
        };
      }
    } catch (error) {
      logger.warn('Quiz: budget/income data unavailable', { userId, error: error.message });
    }
    return { data: { weekKey, expenses, budget, income, foodNames: FOOD_NAMES }, currency, timezone };
  }

  // Вопросы квиза недели для пользователя (null — данных не хватает)
  async buildQuestions(userId, lang, weekKey) {
    const { data, currency } = await this.loadData(userId, lang, weekKey);
    const usedTrivia = await this.repo.usedTriviaIds(userId);
    return quiz.buildQuiz(data, this.formatters(lang, currency), { lang, seed: `${userId}:${weekKey}`, usedTrivia });
  }

  // ---------- Состояние для экранов ----------

  async userContext(userId, now = new Date()) {
    const [lang, timezone] = await Promise.all([this.userService.getUserLanguage(userId), this.userService.getUserTimezone(userId)]);
    return { lang: lang || 'en', timezone: timezone || 'UTC', window: quiz.quizWindow(now, timezone || 'UTC') };
  }

  async status(userId, now = new Date()) {
    const context = await this.userContext(userId, now);
    const [session, invites, lastDraw] = await Promise.all([
      this.repo.getSession(userId, context.window.weekKey),
      this.repo.getInvitesEnabled(userId),
      this.repo.getLastDraw()
    ]);
    const last = session && session.status === 'finished' ? session : await this.repo.getLastFinished(userId);
    const prizes = lastDraw ? await this.repo.userPrizes(userId, lastDraw.week_key) : [];
    return { ...context, session, last, invites, lastDraw, prizes };
  }

  // ---------- Игра ----------

  // «▶️ Играть» / «▶️ Продолжить». { status: 'closed' | 'no_data' | 'finished' | 'waiting' | 'started' | 'resumed', session }
  async start(userId, now = new Date()) {
    const { lang, window } = await this.userContext(userId, now);
    let session = await this.repo.getSession(userId, window.weekKey);
    if (session && session.status === 'finished') return { status: 'finished', session, lang, window };
    if (!session) {
      if (!window.open) return { status: 'closed', lang, window };
      const questions = await this.buildQuestions(userId, lang, window.weekKey);
      if (!questions) return { status: 'no_data', lang, window };
      session = await this.repo.createSession(userId, window.weekKey, lang, questions)
        || await this.repo.getSession(userId, window.weekKey);
      logger.info('Quiz started', { userId, weekKey: window.weekKey, kinds: questions.map(q => q.kind) });
      await this.askCurrent(session, now);
      return { status: 'started', session, lang, window };
    }
    // Начатый квиз можно закончить и после закрытия окна (начат вовремя)
    if (session.status === 'paused') {
      session = (await this.repo.resume(session.id)) || session;
      await this.askCurrent(session, now);
      return { status: 'resumed', session, lang, window };
    }
    // Текущий вопрос уже отправлен и ещё открыт — ждём ответа; не отправлен (сбой) — отправляем
    if (await this.askCurrent(session, now)) return { status: 'resumed', session, lang, window };
    return { status: 'waiting', session, lang, window };
  }

  // Отправить текущий вопрос сессии, если его ещё никто не отправил. true — отправлен этим вызовом
  async askCurrent(session, now = new Date()) {
    const index = session.current_index;
    if (index >= session.total) return false;
    const claimed = await this.repo.claimAsk(session.id, index, now, STALE_ASK_MS);
    if (!claimed) return false;
    try {
      await this.sendQuestion(claimed, index, now);
      return true;
    } catch (error) {
      await this.repo.releaseAsk(session.id, index);
      logger.warn('Quiz question not delivered', { userId: session.user_id, sessionId: session.id, index, error: error.message });
      return false;
    }
  }

  questionHeader(session, index) {
    return this.t(session.lang, 'quiz_question_header', { n: index + 1, total: session.total });
  }

  async sendQuestion(session, index, now = new Date()) {
    const question = session.questions[index];
    const chatId = Number(session.user_id);
    const header = this.questionHeader(session, index);
    const text = quiz.clip(`${header} ${question.text}`, quiz.LIMITS.question);
    try {
      const message = await this.telegram.callApi('sendPoll', {
        chat_id: chatId,
        question: text,
        options: question.options.map(option => ({ text: option })),
        type: 'quiz',
        is_anonymous: false,
        correct_option_id: question.correct,
        explanation: question.explanation || undefined,
        open_period: QUIZ.OPEN_PERIOD_SEC
      });
      const deadline = new Date(now.getTime() + QUIZ.OPEN_PERIOD_SEC * 1000);
      await this.repo.insertPoll({
        pollId: message.poll.id, sessionId: session.id, userId: chatId, index, messageId: message.message_id,
        correctOption: question.correct, kind: 'poll', deadline
      });
      this.schedule(message.poll.id, deadline);
      return;
    } catch (error) {
      if (!pollRejected(error)) throw error;
      logger.warn('Quiz poll rejected, falling back to buttons', { userId: chatId, sessionId: session.id, index, error: error.message });
    }
    // Запасной вариант: тот же вопрос кнопками, срок — BUTTON_PERIOD_SEC (таймера на экране нет — пишем срок в тексте)
    const pollId = `b${session.id}_${index}`;
    const message = await this.telegram.callApi('sendMessage', {
      chat_id: chatId,
      text: `${text}\n\n${this.t(session.lang, 'quiz_buttons_deadline', { seconds: QUIZ.BUTTON_PERIOD_SEC })}`,
      reply_markup: {
        inline_keyboard: question.options.map((option, i) => [{ text: option, callback_data: `qza|${session.id}|${index}|${i}` }])
      }
    });
    const deadline = new Date(now.getTime() + QUIZ.BUTTON_PERIOD_SEC * 1000);
    await this.repo.insertPoll({
      pollId, sessionId: session.id, userId: chatId, index, messageId: message.message_id,
      correctOption: question.correct, kind: 'buttons', deadline
    });
    this.schedule(pollId, deadline);
  }

  schedule(pollId, deadline) {
    if (!this.useTimers) return;
    const delay = Math.max(0, deadline.getTime() + QUIZ.ANSWER_GRACE_MS + 500 - Date.now());
    const timer = setTimeout(() => {
      this.timers.delete(pollId);
      this.expire(pollId).catch(error => logger.warn('Quiz timeout failed', { pollId, error: error.message }));
    }, delay);
    if (typeof timer.unref === 'function') timer.unref();
    this.timers.set(pollId, timer);
  }

  clearTimer(pollId) {
    clearTimeout(this.timers.get(pollId));
    this.timers.delete(pollId);
  }

  // Ответ на опрос (poll_answer). Чужой, повторный, поздний (после срока + ANSWER_GRACE_MS) и неизвестный — молча мимо
  async answerPoll(pollId, userId, optionIds, now = new Date()) {
    if (!Array.isArray(optionIds) || !optionIds.length) return { status: 'ignored' };
    let poll = await this.repo.getPoll(pollId);
    if (!poll) return { status: 'unknown' };
    const claimed = await this.repo.claimAnswer(pollId, userId, optionIds[0], now, QUIZ.ANSWER_GRACE_MS);
    if (!claimed) {
      logger.info('Quiz answer ignored', { pollId, userId, status: poll.status, late: now > new Date(poll.deadline) });
      return { status: 'ignored' };
    }
    poll = claimed;
    this.clearTimer(pollId);
    const correct = Number(poll.chosen_option) === Number(poll.correct_option);
    return this.resolve(poll, correct ? 'correct' : 'wrong', now);
  }

  // Кнопка запасного варианта (qza|<сессия>|<вопрос>|<вариант>): то же, что ответ на опрос. Результат — для alert
  async answerButton(userId, sessionId, index, option, now = new Date()) {
    const pollId = `b${sessionId}_${index}`;
    const poll = await this.repo.getPoll(pollId);
    if (!poll || Number(poll.user_id) !== Number(userId)) return { status: 'unknown' };
    const claimed = await this.repo.claimAnswer(pollId, userId, option, now, QUIZ.ANSWER_GRACE_MS);
    if (!claimed) return { status: poll.status === 'open' ? 'late' : 'ignored', poll };
    this.clearTimer(pollId);
    const correct = Number(option) === Number(claimed.correct_option);
    const result = await this.resolve(claimed, correct ? 'correct' : 'wrong', now);
    return { ...result, correct, poll: claimed };
  }

  // Telegram закрыл опрос (апдейт poll): голос есть — это ответ (апдейт poll_answer мог прийти в той же пачке позже),
  // голосов нет — «не успел»
  async pollClosed(pollUpdate, now = new Date()) {
    if (!pollUpdate || !pollUpdate.is_closed) return { status: 'ignored' };
    const poll = await this.repo.getPoll(pollUpdate.id);
    if (!poll || poll.status !== 'open') return { status: 'ignored' };
    const voted = (pollUpdate.options || []).findIndex(o => o.voter_count > 0);
    if (pollUpdate.total_voter_count > 0 && voted >= 0) return this.answerPoll(pollUpdate.id, Number(poll.user_id), [voted], now);
    const expired = await this.repo.expirePoll(pollUpdate.id, now, QUIZ.ANSWER_GRACE_MS, true);
    if (!expired) return { status: 'ignored' };
    this.clearTimer(pollUpdate.id);
    return this.resolve(expired, 'missed', now);
  }

  // Срок вопроса вышел (таймер или sweep)
  async expire(pollId, now = new Date()) {
    const expired = await this.repo.expirePoll(pollId, now, QUIZ.ANSWER_GRACE_MS);
    if (!expired) return { status: 'ignored' };
    this.clearTimer(pollId);
    if (expired.kind === 'buttons' && expired.message_id) {
      const session = await this.repo.getSessionById(expired.session_id);
      if (session) {
        const question = session.questions[expired.question_index];
        await this.telegram.callApi('editMessageText', {
          chat_id: Number(expired.user_id),
          message_id: Number(expired.message_id),
          text: `${this.questionHeader(session, expired.question_index)} ${question.text}\n\n${this.t(session.lang, 'quiz_time_up', { answer: question.options[question.correct] })}`
        }).catch(() => {});
      }
    }
    return this.resolve(expired, 'missed', now);
  }

  // Вопрос закрыт: счётчики, следующий вопрос, пауза или итоги
  async resolve(poll, outcome, now = new Date()) {
    const session = await this.repo.advance(poll.session_id, poll.question_index, {
      correct: outcome === 'correct',
      missed: outcome === 'missed',
      mark: ANSWER_MARK[outcome],
      pauseAfter: QUIZ.PAUSE_AFTER_MISSED
    });
    if (!session) return { status: 'ignored' };
    if (session.current_index >= session.total) return { status: outcome, finished: true, ...(await this.finish(session, now)) };
    if (session.status === 'paused') {
      await this.telegram.callApi('sendMessage', {
        chat_id: Number(session.user_id),
        text: this.t(session.lang, 'quiz_paused', { n: session.current_index, total: session.total }),
        reply_markup: { inline_keyboard: [[{ text: this.t(session.lang, 'quiz_button_continue'), callback_data: 'qz|go' }]] }
      }).catch(error => logger.warn('Quiz pause message not delivered', { userId: session.user_id, error: error.message }));
      return { status: outcome, paused: true, session };
    }
    await this.askCurrent(session, now);
    return { status: outcome, session };
  }

  // ---------- Итоги ----------

  // Результат пройденного квиза: очки, «лучше, чем N%», серия недель
  async summary(session) {
    const score = quiz.scoreOf({ correct: session.correct_count, total: session.total, finished: session.status === 'finished' });
    let scores = await this.repo.finishedScores([session.week_key], session.id);
    if (scores.length < QUIZ.PERCENTILE_MIN_PLAYERS) {
      const weeks = Array.from({ length: QUIZ.PERCENTILE_WEEKS }, (_, i) => addDays(session.week_key, -7 * i));
      scores = await this.repo.finishedScores(weeks, session.id);
    }
    const weeks = await this.repo.finishedWeeks(session.user_id);
    return {
      score,
      percent: quiz.percentBetter(session.score || score.total, scores),
      streak: quiz.weekStreak(weeks, session.week_key),
      perfect: session.total > 0 && session.correct_count === session.total
    };
  }

  resultText(session, summary, extraLines = []) {
    const { lang } = session;
    const lines = [
      this.t(lang, 'quiz_result_title'),
      '',
      this.t(lang, 'quiz_result_correct', { correct: session.correct_count, total: session.total, dots: this.dots(session.answers) }),
      this.t(lang, 'quiz_result_points', { points: summary.score.total, answers: summary.score.answers, finish: summary.score.finish }),
    ];
    if (summary.perfect) lines.push(this.t(lang, 'quiz_result_perfect', { points: summary.score.perfect, days: QUIZ.PERFECT_DAYS }));
    lines.push(summary.percent === null ? this.t(lang, 'quiz_result_first') : this.t(lang, 'quiz_result_percent', { percent: summary.percent }));
    if (summary.streak >= 2) lines.push(this.t(lang, 'quiz_result_streak', { weeks: summary.streak }));
    lines.push('', this.t(lang, 'quiz_result_draw', { points: summary.score.total }));
    const extra = extraLines.filter(Boolean);
    if (extra.length) lines.push('', ...extra);
    return lines.join('\n');
  }

  dots(answers) {
    return [...String(answers || '')].map(mark => (mark === 'c' ? '🟩' : mark === 'w' ? '🟥' : '⬜')).join('');
  }

  // Квиз пройден: очки, отметка (один раз), достижения и сообщение с карточкой результата
  async finish(session, now = new Date()) {
    const score = quiz.scoreOf({ correct: session.correct_count, total: session.total, finished: true });
    const finished = await this.repo.finish(session.id, score.total, now);
    if (!finished) return { session };
    const summary = await this.summary(finished);
    logger.info('Quiz finished', { userId: finished.user_id, weekKey: finished.week_key, correct: finished.correct_count, score: score.total });
    const achievement = this.achievementService
      ? await this.achievementService.track(Number(finished.user_id), 'quiz_finished', { lang: finished.lang })
      : '';
    const text = this.resultText(finished, summary, [achievement]);
    await this.sendResult(finished, summary, text);
    return { session: finished, summary, text };
  }

  resultKeyboard(lang) {
    return {
      inline_keyboard: [
        [{ text: this.t(lang, 'quiz_button_rules'), callback_data: 'qzr' }, { text: this.t(lang, 'quiz_button_menu'), callback_data: 'qz' }]
      ]
    };
  }

  // Результат — карточкой-картинкой с подписью (её пересылают друзьям: на ней нет сумм и описаний), без картинки — текстом
  async sendResult(session, summary, text) {
    const chatId = Number(session.user_id);
    const png = await this.resultCard(session, summary).catch((error) => {
      logger.warn('Quiz card not rendered', { userId: chatId, error: error.message });
      return null;
    });
    const link = this.shareLink();
    const caption = link ? `${text}\n\n${this.t(session.lang, 'quiz_share_line', { link })}` : text;
    try {
      if (png && caption.length <= 1024) {
        await this.telegram.sendPhoto(chatId, { source: png, filename: 'quiz.png' }, { caption, parse_mode: 'Markdown', reply_markup: this.resultKeyboard(session.lang) });
        return;
      }
      await this.telegram.sendMessage(chatId, caption, { parse_mode: 'Markdown', disable_web_page_preview: true, reply_markup: this.resultKeyboard(session.lang) });
    } catch (error) {
      logger.warn('Quiz result not delivered', { userId: chatId, error: error.message });
    }
  }

  async resultCard(session, summary) {
    if (!this.chartService) return null;
    return this.chartService.quizCard({
      weekRange: this.weekRange(session.week_key),
      score: summary.score.total,
      correct: session.correct_count,
      total: session.total,
      answers: session.answers,
      percent: summary.percent,
      streak: summary.streak,
      perfect: summary.perfect
    }, session.lang, { botUsername: this.botUsername() });
  }

  // ---------- Фоновые задачи ----------

  // Раз в минуту: вопросы с истёкшим сроком (таймеры пропали при перезапуске) и неотправленные вопросы
  async sweep(now = new Date()) {
    let expired = 0;
    for (const pollId of await this.repo.expiredOpenPolls(now, QUIZ.ANSWER_GRACE_MS)) {
      try {
        const result = await this.expire(pollId, now);
        if (result.status !== 'ignored') expired++;
      } catch (error) {
        logger.warn('Quiz sweep: expire failed', { pollId, error: error.message });
      }
    }
    let resent = 0;
    for (const session of await this.repo.stuckSessions(now, STALE_ASK_MS)) {
      try {
        if (await this.askCurrent(session, now)) resent++;
      } catch (error) {
        logger.warn('Quiz sweep: resend failed', { sessionId: session.id, error: error.message });
      }
    }
    return { expired, resent };
  }

  inviteKeyboard(lang) {
    return {
      inline_keyboard: [
        [{ text: this.t(lang, 'quiz_button_play'), callback_data: 'qz|go' }],
        [{ text: this.t(lang, 'quiz_button_rules'), callback_data: 'qzr' }, { text: this.t(lang, 'quiz_button_invites_off'), callback_data: 'qzo|i' }]
      ]
    };
  }

  // Cron: приглашение в четверг вечером по местному времени — тем, у кого включено, хватает трат и квиза ещё не было.
  // По разу за неделю (user_notifications quiz_invite, ключ — понедельник недели)
  async processInvites(now = new Date()) {
    const since = new Date(now.getTime() - QUIZ.RECORDS_DAYS * 86400000);
    const candidates = await this.repo.getInviteCandidates(QUIZ.MIN_RECORDS, since);
    let sent = 0;
    for (const candidate of candidates) {
      try {
        const window = quiz.quizWindow(now, candidate.timezone || 'UTC');
        if (!window.inviteTime || !window.open) continue;
        if (await this.userNotificationRepository.isSent(candidate.id, 'quiz_invite', window.weekKey)) continue;
        if (await this.repo.getSession(candidate.id, window.weekKey)) continue;
        const lang = candidate.language || 'en';
        // Хватает ли данных на вопросы (на языках без загадок нужны все 5 своих)
        if (!(await this.buildQuestions(candidate.id, lang, window.weekKey))) continue;
        if (!(await this.userNotificationRepository.markSent(candidate.id, 'quiz_invite', window.weekKey))) continue;
        await this.notificationService.sendMessage(candidate.id, this.t(lang, 'quiz_invite', {
          seconds: QUIZ.OPEN_PERIOD_SEC, days: QUIZ.PRIZES[0].days, questions: QUIZ.QUESTIONS
        }), { parse_mode: 'Markdown', reply_markup: this.inviteKeyboard(lang) });
        sent++;
      } catch (error) {
        logger.warn('Quiz invite not delivered', { userId: candidate.id, error: error.message });
      }
    }
    return sent;
  }

  // Розыгрыш недели: участники — прошедшие квиз, вес — очки; идеальный результат — +PERFECT_DAYS каждому
  draw(participants, seed = crypto.randomBytes(16).toString('hex')) {
    const winners = quiz.drawWinners(participants, seed);
    const perfect = participants.filter(p => p.perfect).map(p => ({ userId: p.userId, kind: 'perfect', days: QUIZ.PERFECT_DAYS }));
    return { seed, digest: quiz.participantsDigest(participants), winners, perfect };
  }

  // Cron: провести наступившие розыгрыши (одна транзакция на неделю, повторный запуск ничего не меняет)
  async processDraws(now = new Date()) {
    const latest = quiz.latestDrawableWeek(now);
    const weeks = await this.repo.undrawnWeeks(latest, addDays(latest, -28));
    let drawn = 0;
    for (const weekKey of weeks) {
      const result = await this.repo.runDraw(weekKey, (participants) => this.draw(participants));
      if (!result) continue;
      drawn++;
      logger.info('Quiz draw', {
        weekKey, seed: result.seed, digest: result.digest, participants: result.participants.length,
        totalWeight: result.participants.reduce((s, p) => s + p.weight, 0), winners: result.winners, perfect: result.perfect.length
      });
    }
    return drawn;
  }

  // Выдача призов: ровно один раз (отметка + проверка транзакции с prize_id, если упали между выдачей и отметкой)
  async grantPrizes(now = new Date()) {
    let granted = 0;
    for (const prize of await this.repo.ungrantedPrizes()) {
      const claimed = await this.repo.claimGrant(prize.id, now, STALE_GRANT_MS);
      if (!claimed) continue;
      try {
        if (!(await this.repo.grantTransactionExists(prize.id, prize.user_id))) {
          await this.userService.grantRewardDays(Number(prize.user_id), prize.days, 'quiz', { prize_id: prize.id, kind: prize.kind, week: prize.week_key });
          granted++;
        }
        await this.repo.markGranted(prize.id, now);
      } catch (error) {
        await this.repo.releaseGrant(prize.id);
        logger.error('Quiz prize not granted', { prizeId: prize.id, userId: prize.user_id, error: error.message });
      }
    }
    return granted;
  }

  // Объявление выигрыша — днём по местному времени, одним сообщением на неделю (все призы пользователя)
  async announcePrizes(now = new Date()) {
    const groups = new Map();
    for (const row of await this.repo.unannouncedPrizes()) {
      const key = `${row.user_id}:${row.week_key}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    let sent = 0;
    for (const rows of groups.values()) {
      const first = rows[0];
      const hour = quiz.localMoment(now, first.timezone || 'UTC').hour;
      if (hour < QUIZ.NOTIFY_FROM_HOUR || hour >= QUIZ.NOTIFY_TO_HOUR) continue;
      const marked = await this.repo.markAnnounced(rows.map(r => r.id), now);
      if (!marked.length) continue;
      const lang = first.language || 'en';
      const lines = [this.t(lang, 'quiz_prize_title', { range: this.weekRange(first.week_key) }), ''];
      for (const row of rows.filter(r => marked.includes(r.id))) lines.push(this.t(lang, `quiz_prize_${row.kind}`, { days: row.days }));
      const user = await this.userService.getUserById(Number(first.user_id));
      if (user && user.premium_expires_at) {
        lines.push('', this.t(lang, 'quiz_prize_until', { date: this.formatter.formatDate(user.premium_expires_at, first.timezone || 'UTC').slice(0, 10) }));
      }
      try {
        await this.notificationService.sendMessage(Number(first.user_id), lines.join('\n'), {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'quiz_button_menu'), callback_data: 'qz' }]] }
        });
        sent++;
      } catch (error) {
        logger.warn('Quiz prize announcement not delivered', { userId: first.user_id, error: error.message });
      }
    }
    return sent;
  }

  async processPrizes(now = new Date()) {
    const drawn = await this.processDraws(now);
    const granted = await this.grantPrizes(now);
    const announced = await this.announcePrizes(now);
    return { drawn, granted, announced };
  }

  async setInvitesEnabled(userId, enabled) {
    await this.repo.setInvitesEnabled(userId, enabled);
  }

  async getInvitesEnabled(userId) {
    return this.repo.getInvitesEnabled(userId);
  }
}

module.exports = QuizService;
