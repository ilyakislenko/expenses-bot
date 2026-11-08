const { QUIZ } = require('../../utils/constants');

// «🎲 Квиз недели» в Mini App: статус недели и итог (как экран qz), правила (qzr), приглашения (qzo|s) и игра кнопками
// на экране — тот же квиз из quiz_sessions (QuizService.playInApp / answerInApp): те же вопросы, срок, очки, «не успел»,
// пауза, итог, достижения и билеты. Вопрос, уже открытый в чате, остаётся в чате — приложение предлагает ответить там.
module.exports = (router, { get, http }) => {
  const plain = (text) => String(text || '').replace(/[*_`]/g, '').trim();

  const resultOf = (session, summary) => ({
    correct: session.correct_count,
    total: session.total,
    points: summary.score.total,
    answers: [...String(session.answers || '')], // 'c' — верно, 'w' — мимо, 'm' — не успел
    percent: summary.percent,
    streak: summary.streak,
    perfect: summary.perfect,
    perfectDays: QUIZ.PERFECT_DAYS
  });

  const chatLink = (quiz) => {
    const username = quiz.botUsername();
    return username ? `https://t.me/${username}` : null;
  };

  // Экран недели: open — можно начать; playing — идёт (продолжить здесь); in_chat — текущий вопрос открыт в чате;
  // paused — пауза после пропусков; finished — пройден на этой неделе; closed — окно закрыто
  router.get('/quiz', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const quiz = get('quizService');
    const st = await quiz.status(req.userId);
    const { window, session } = st;
    let state;
    if (session && session.status === 'finished') state = 'finished';
    else if (session && session.status === 'paused') state = 'paused';
    else if (session) state = (await quiz.currentChannel(session)) === 'chat' ? 'in_chat' : 'playing';
    else state = window.open ? 'open' : 'closed';
    const day = (date) => quiz.weekdayLabel(date, ctx.lang);
    res.json({
      state,
      questions: QUIZ.QUESTIONS,
      seconds: QUIZ.OPEN_PERIOD_SEC,
      grandDays: QUIZ.PRIZES[0].days,
      hour: QUIZ.OPEN_HOUR,
      closes: day(window.closeDate),
      nextOpen: day(window.nextOpenDate),
      progress: session && state !== 'finished' ? { done: session.current_index, total: session.total } : null,
      result: state === 'finished' ? resultOf(session, await quiz.summary(session)) : null,
      last: state === 'closed' && st.last
        ? { range: quiz.weekRange(st.last.week_key), correct: st.last.correct_count, total: st.last.total, points: st.last.score }
        : null,
      draw: st.lastDraw
        ? { range: quiz.weekRange(st.lastDraw.week_key), players: st.lastDraw.participants, prizes: st.prizes.map(p => ({ kind: p.kind, days: p.days })) }
        : null,
      invites: st.invites,
      chatLink: state === 'in_chat' ? chatLink(quiz) : null
    });
  }));

  // Числа правил (те же, что в quiz_rules бота); время розыгрыша — понедельник drawHour:00 UTC, клиент пишет его по местному
  router.get('/quiz/rules', http.wrap(async (req, res) => {
    res.json(get('quizService').rulesParams());
  }));

  router.put('/quiz/invites', http.wrap(async (req, res) => {
    const enabled = req.body && req.body.enabled;
    if (typeof enabled !== 'boolean') throw http.badRequest('bad_enabled');
    const quiz = get('quizService');
    await quiz.setInvitesEnabled(req.userId, enabled);
    res.json({ invites: await quiz.getInvitesEnabled(req.userId) });
  }));

  // «Играть» / «Продолжить» / «Дальше»: текущий вопрос с оставшимся временем (без верного ответа) или почему нельзя
  router.post('/quiz/start', http.wrap(async (req, res) => {
    const quiz = get('quizService');
    const now = new Date();
    const result = await quiz.playInApp(req.userId, now);
    if (result.status === 'in_chat') return res.json({ status: 'in_chat', chatLink: chatLink(quiz) });
    // closed / no_data / finished — с числами для текста экрана
    if (result.status !== 'question') return res.json({ status: result.status, hour: QUIZ.OPEN_HOUR, questions: QUIZ.QUESTIONS });
    const { session, index } = result;
    const question = session.questions[index];
    res.json({
      status: 'question',
      session: session.id,
      index,
      total: session.total,
      text: question.text,
      options: question.options,
      seconds: QUIZ.OPEN_PERIOD_SEC,
      remainingMs: Math.max(0, result.deadline.getTime() - now.getTime())
    });
  }));

  // Ответ: option — номер варианта, null — время вышло. Один раз, только своя сессия; позже срока — «не успел» (late)
  router.post('/quiz/answer', http.wrap(async (req, res) => {
    const body = req.body || {};
    const sessionId = http.int(body.session, { min: 1, max: 2147483647, code: 'bad_session' });
    const index = http.int(body.question, { min: 0, max: 99, code: 'bad_question' });
    const option = body.option === null ? null : http.int(body.option, { min: 0, max: 99, code: 'bad_option' });
    const quiz = get('quizService');
    const result = await quiz.answerInApp(req.userId, sessionId, index, option);
    if (result.status === 'unknown') throw http.notFound();
    if (result.status === 'answered') throw new http.HttpError(409, 'quiz_answered');
    if (result.status === 'bad_option') throw http.badRequest('bad_option');
    res.json({
      outcome: result.status,
      late: result.late,
      correct: result.question.correct,
      explanation: result.question.explanation || null,
      finished: result.finished,
      result: result.finished && result.summary ? resultOf(result.session, result.summary) : null,
      achievement: plain(result.achievement) || null
    });
  }));
};
