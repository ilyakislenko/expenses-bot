// «Квиз недели» (/quiz): статус недели и итог, розыгрыш, правила, приглашения. Игра (/quiz/play) — тот же квиз, что в
// чате: вопрос с полоской времени, 4 варианта строками, после ответа — верно/мимо и пояснение, «Дальше» — главной
// кнопкой. Вопрос, уже открытый в чате с ботом, остаётся там — экран предлагает открыть чат.
import { h, icon, page, section, row, avatar, toggle, stats, empty, skeleton, errorText, act, async as load } from '../core/ui.js';
import { route, navigate, back, changed } from '../core/router.js';
import { t, me } from '../core/i18n.js';
import { api } from '../core/api.js';
import { mainButton, haptic, openTelegramLink, close } from '../core/tg.js';

// Чат с ботом: ссылкой, если сервер знает имя бота, иначе закрыть приложение — под ним чат
const openChat = (link) => (link ? openTelegramLink(link) : close());

export function register() {
  route('/quiz', render, { tab: 'more' });
  route('/quiz/play', renderPlay, { tab: 'more', tabs: false });
  route('/quiz/rules', renderRules, { tab: 'more' });
}

// Ответы квадратиками: зелёный — верно, красный — мимо, серый — не успел
function squares(answers) {
  return h('div', { class: 'quiz-squares' }, answers.map(mark => h('i', { class: mark })));
}

function result(r) {
  return [
    h('div', { class: 'hero' },
      h('div', { class: 'hero-label' }, t('xtra_quiz_points')),
      h('div', { class: 'hero-value' }, r.points),
      squares(r.answers),
      h('div', { class: 'hero-note' }, t('xtra_quiz_correct', { correct: r.correct, total: r.total })),
      r.perfect ? h('div', { class: 'hero-note tone-good' }, t('xtra_quiz_perfect', { days: r.perfectDays })) : null),
    stats([
      r.percent === null
        ? { label: t('xtra_quiz_better'), value: '—', hint: t('xtra_quiz_first') }
        : { label: t('xtra_quiz_better'), value: `${r.percent}%` },
      r.streak >= 2 ? { label: t('xtra_quiz_streak'), value: t('xtra_quiz_weeks', { weeks: r.streak }) } : null
    ]),
    h('div', { class: 'quiz-note' }, t('xtra_quiz_tickets'))
  ];
}

function render(ctx) {
  let alive = true;
  ctx.onLeave(() => { alive = false; });
  return load(() => api.get('/quiz'), (d) => view(d, () => alive));
}

function view(d, alive) {
  const progress = d.progress || { done: 0, total: d.questions };
  const play = () => navigate('/quiz/play');
  const bar = progress.done > 0
    ? h('div', { class: 'quiz-timer quiz-progress' }, h('span', { style: { width: `${(100 * progress.done) / progress.total}%` } }))
    : null;
  let subtitle = null;
  let body = null;
  let main = null;
  if (d.state === 'open') {
    subtitle = t('xtra_quiz_open_until', { day: d.closes });
    body = h('p', { class: 'quiz-lead' }, t('xtra_quiz_open', { questions: d.questions, seconds: d.seconds, days: d.grandDays }));
    main = { text: t('xtra_quiz_play'), onClick: play };
  } else if (d.state === 'playing') {
    subtitle = t('xtra_quiz_progress', { n: progress.done, total: progress.total });
    body = bar;
    main = { text: t('xtra_quiz_continue'), onClick: play };
  } else if (d.state === 'paused') {
    subtitle = t('xtra_quiz_paused', { n: progress.done, total: progress.total });
    body = bar;
    main = { text: t('xtra_quiz_continue'), onClick: play };
  } else if (d.state === 'in_chat') {
    subtitle = t('xtra_quiz_in_chat', { n: progress.done + 1, total: progress.total });
    body = bar;
    main = { text: t('xtra_quiz_open_chat'), onClick: () => openChat(d.chatLink) };
  } else if (d.state === 'finished') {
    subtitle = t('xtra_quiz_next', { day: d.nextOpen, hour: d.hour });
    body = result(d.result);
  } else {
    subtitle = t('xtra_quiz_next', { day: d.nextOpen, hour: d.hour });
    body = [
      h('p', { class: 'quiz-lead' }, t('xtra_quiz_closed', { hour: d.hour })),
      d.last ? section({}, row({
        title: t('xtra_quiz_last', { range: d.last.range }),
        subtitle: t('xtra_quiz_correct', { correct: d.last.correct, total: d.last.total }),
        value: t('xtra_quiz_points_n', { points: d.last.points })
      })) : null
    ];
  }
  if (main && alive()) mainButton.push(main);

  const invites = toggle(d.invites, async (on) => {
    const saved = await act(() => api.put('/quiz/invites', { enabled: on }));
    if (!saved) { invites.checked = !on; return; }
    invites.checked = saved.invites;
    changed('settings');
  });

  return h('div', { class: 'quiz-wrap' }, page({ title: t('xtra_quiz_title'), subtitle },
    body,
    d.draw ? section({ title: t('xtra_quiz_draw', { range: d.draw.range }) },
      row({ title: t('xtra_quiz_players'), value: d.draw.players }),
      d.draw.prizes.map(p => row({ avatar: avatar('gift', { color: 'var(--good)' }), title: t(`xtra_quiz_prize_${p.kind}`, { days: p.days }) }))) : null,
    section({},
      row({ title: t('xtra_quiz_rules'), href: '/quiz/rules' }),
      row({ title: t('xtra_quiz_invites'), subtitle: t('xtra_quiz_invites_hint'), trailing: invites }))));
}

// ---------- Игра ----------

function renderPlay(ctx) {
  const box = h('div', { class: 'quiz-wrap' });
  const show = (...nodes) => box.replaceChildren(page({ title: t('xtra_quiz_title') }, nodes));
  let alive = true;
  let timer = null;
  let button = null;
  const setMain = (config) => {
    if (button) button.remove();
    button = config && alive ? mainButton.push(config) : null;
  };
  ctx.onLeave(() => { alive = false; clearTimeout(timer); });

  async function next() {
    setMain(null);
    show(skeleton(4));
    let q;
    try {
      q = await api.post('/quiz/start');
    } catch (error) {
      if (!alive) return;
      show(h('div', { class: 'error-box' }, h('div', null, errorText(error)),
        h('button', { class: 'btn secondary', onclick: next }, t('core_retry'))));
      return;
    }
    if (!alive) return;
    if (q.status === 'question') return question(q);
    if (q.status === 'finished') return back();
    if (q.status === 'in_chat') {
      show(empty({ icon: 'help', title: t('xtra_quiz_in_chat_title'), text: t('xtra_quiz_in_chat_text') }));
      setMain({ text: t('xtra_quiz_open_chat'), onClick: () => openChat(q.chatLink) });
      return;
    }
    if (q.status === 'no_data') {
      show(empty({ icon: 'receipt', title: t('xtra_quiz_no_data_title'), text: t('xtra_quiz_no_data', { questions: q.questions }) }));
      return;
    }
    show(empty({ icon: 'clock', title: t('xtra_quiz_closed_title'), text: t('xtra_quiz_closed', { hour: q.hour }) }));
  }

  function question(q) {
    let answered = false;
    const bar = h('span', { style: { width: `${Math.min(100, (100 * q.remainingMs) / (q.seconds * 1000))}%` } });
    const rows = q.options.map((text, i) => {
      const el = row({ title: text, onClick: () => submit(i), chevron: false });
      el.classList.add('quiz-option');
      return el;
    });
    const feedback = h('div');
    box.replaceChildren(page({ title: t('xtra_quiz_question', { n: q.index + 1, total: q.total }) },
      h('div', { class: 'quiz-timer' }, bar),
      h('div', { class: 'quiz-question' }, q.text),
      section({}, rows),
      feedback));
    // Полоска тает до срока; срок вышел — «не успел» (сервер засчитает так же и без нас)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.transition = `width ${q.remainingMs}ms linear`;
      bar.style.width = '0%';
    }));
    timer = setTimeout(() => submit(null), q.remainingMs);

    async function submit(option) {
      if (answered || !alive) return;
      answered = true;
      clearTimeout(timer);
      const width = getComputedStyle(bar).width;
      bar.style.transition = 'none';
      bar.style.width = option === null ? '0%' : width;
      rows.forEach((el) => { el.disabled = true; });
      if (option !== null) rows[option].classList.add('quiz-picked');
      let res;
      try {
        res = await api.post('/quiz/answer', { session: q.session, question: q.index, option });
      } catch (error) {
        if (!alive) return;
        haptic.error();
        feedback.replaceChildren(h('div', { class: 'quiz-explain tone-bad' }, errorText(error)));
        setMain({ text: t('xtra_quiz_next_question'), onClick: next });
        return;
      }
      if (!alive) return;
      rows[res.correct].classList.add('quiz-right');
      rows[res.correct].appendChild(icon('check', { cls: 'quiz-mark' }));
      if (option !== null && option !== res.correct) {
        rows[option].classList.add('quiz-wrong');
        rows[option].appendChild(icon('close', { cls: 'quiz-mark' }));
      }
      const verdict = res.outcome === 'correct' ? ['xtra_quiz_right', 'good']
        : res.outcome === 'wrong' ? ['xtra_quiz_wrong', 'bad']
          : [res.late ? 'xtra_quiz_late' : 'xtra_quiz_time_up', 'hint'];
      if (res.outcome === 'correct') haptic.success(); else if (res.outcome === 'wrong') haptic.error(); else haptic.warn();
      feedback.replaceChildren(h('div', null,
        h('div', { class: `quiz-verdict tone-${verdict[1]}` }, t(verdict[0])),
        res.explanation ? h('div', { class: 'quiz-explain' }, res.explanation) : null,
        res.achievement ? h('div', { class: 'quiz-explain' }, res.achievement) : null));
      if (res.finished) {
        changed('achievements');
        setMain({ text: t('xtra_quiz_results'), onClick: () => back() });
      } else {
        setMain({ text: t('xtra_quiz_next_question'), onClick: next });
      }
    }
  }

  next();
  return box;
}

// ---------- Правила ----------

// Розыгрыш — понедельник drawHour:00 UTC; пишем день и время по поясу пользователя
function drawTime(hour) {
  const monday = new Date(Date.UTC(2026, 0, 5, hour)); // любой понедельник
  const options = { weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: me().timezone };
  try {
    return new Intl.DateTimeFormat(me().locale, options).format(monday);
  } catch (error) {
    return new Intl.DateTimeFormat(me().locale, { ...options, timeZone: 'UTC' }).format(monday);
  }
}

function renderRules() {
  const rule = (name, title, text) => row({ avatar: avatar(name), title, subtitle: text });
  return load(() => api.get('/quiz/rules'), (r) => page({ title: t('xtra_quiz_rules'), subtitle: t('xtra_quiz_rules_free') },
    h('div', { class: 'quiz-wrap quiz-rules' }, section({},
      rule('calendar', t('xtra_quiz_rules_when_title'), t('xtra_quiz_rules_when', r)),
      rule('help', t('xtra_quiz_rules_questions_title', r), t('xtra_quiz_rules_questions', r)),
      rule('star', t('xtra_quiz_points'), t('xtra_quiz_rules_points', r)),
      rule('gift', t('xtra_quiz_rules_draw_title', { time: drawTime(r.drawHour) }), t('xtra_quiz_rules_draw', r)),
      rule('trophy', t('xtra_quiz_rules_prizes_title'), t('xtra_quiz_rules_prizes')),
      rule('shield', t('xtra_quiz_rules_privacy_title'), t('xtra_quiz_rules_privacy'))))));
}
