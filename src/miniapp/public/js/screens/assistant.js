// «Спроси бота» (/assistant): вопрос о своих деньгах обычными словами — ответ считает тот же AssistantService, что
// в боте. Пока переписки нет — что умеет и примеры (тап — вопрос); поле вопроса внизу, главная кнопка — «Спросить».
// Ответ считается в фоне: POST ставит вопрос, экран опрашивает его, пока бот «думает» (с местом в очереди).
// Под ответом — ссылка на экран с подробностями и тихое «Не то» (ответ не в счёт лимита, фокус — в поле для уточнения).
import { h, page, section, row, icon, toast, errorText, async as load } from '../core/ui.js';
import { route, navigate } from '../core/router.js';
import { t } from '../core/i18n.js';
import { api, ApiError } from '../core/api.js';
import { mainButton, haptic } from '../core/tg.js';

const POLL_MS = 900;
const POLL_FAILURES = 5;

export function register() {
  route('/assistant', render, { tab: 'more', tabs: false });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Куски ответа с сервера ({ text, bold, italic }) — узлами, без HTML
function rich(parts) {
  return (parts || []).map((part) => {
    let node = document.createTextNode(part.text);
    if (part.italic) node = h('i', null, node);
    if (part.bold) node = h('b', null, node);
    return node;
  });
}

function render(ctx) {
  const state = { alive: true, busy: false, text: '', limit: null, maxLength: 300, examples: [] };
  ctx.onLeave(() => { state.alive = false; });

  const button = mainButton.push({ text: t('xtra_ai_ask'), enabled: false, onClick: () => submit() });
  const updateButton = () => {
    button.update({ enabled: !state.busy && !!state.text.trim() });
    button.busy(state.busy);
  };

  const log = h('div', { class: 'ai-log' });
  const intro = h('div');
  const left = h('div', { class: 'ai-left' });
  const input = h('textarea', {
    rows: 1,
    placeholder: t('xtra_ai_placeholder'),
    oninput: () => { state.text = input.value; grow(); updateButton(); },
    onkeydown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); }
    }
  });
  const grow = () => { input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; };

  const showLimit = () => {
    const limit = state.limit;
    left.replaceChildren();
    if (limit && !limit.isPremium) left.textContent = t('xtra_ai_left', { left: limit.remaining, limit: limit.limit });
  };
  const scrollDown = () => requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));

  // Пузырь ответа бота: пока «Думаю…», потом ответ или текст «без ответа»
  function botBubble() {
    const bubble = h('div', { class: 'ai-a thinking ai-msg' }, t('xtra_ai_thinking'));
    log.appendChild(bubble);
    return {
      thinking(position) {
        bubble.textContent = position ? t('xtra_ai_queued', { position }) : t('xtra_ai_thinking');
      },
      show(parts, { link = null, answerId = null } = {}) {
        bubble.classList.remove('thinking');
        bubble.replaceChildren(...rich(parts));
        const actions = [];
        if (link) {
          actions.push(h('button', { class: 'ai-link', onclick: () => { haptic.tap(); navigate(link.path); } },
            link.label, icon('chevron-right')));
        }
        if (answerId) {
          const wrong = h('button', { class: 'ai-wrong', onclick: () => markWrong(answerId, wrong) }, t('xtra_ai_wrong'));
          actions.push(wrong);
        }
        if (actions.length) bubble.after(h('div', { class: 'ai-actions' }, actions));
        scrollDown();
      },
      text(text, link = null) {
        this.show([{ text }], { link });
      }
    };
  }

  function addQuestion(text) {
    intro.replaceChildren();
    log.appendChild(h('div', { class: 'ai-q ai-msg' }, text));
    const bubble = botBubble();
    scrollDown();
    return bubble;
  }

  async function markWrong(answerId, wrongButton) {
    haptic.tap();
    try {
      const { result } = await api.post(`/assistant/answers/${answerId}/wrong`);
      wrongButton.remove();
      if (result === 'marked' && state.limit && !state.limit.isPremium) {
        state.limit.remaining = Math.min(state.limit.limit, state.limit.remaining + 1);
        showLimit();
      }
      toast(t(result === 'marked' ? 'xtra_ai_wrong_marked' : result === 'used' ? 'xtra_ai_wrong_used' : 'xtra_ai_wrong_done'));
      input.focus();
    } catch (error) {
      haptic.error();
      toast(errorText(error));
    }
  }

  // Опрос вопроса, пока бот думает
  async function follow(jobId, bubble) {
    let failures = 0;
    while (state.alive) {
      await sleep(POLL_MS);
      if (!state.alive) return;
      let job;
      try {
        job = await api.get(`/assistant/questions/${encodeURIComponent(jobId)}`);
        failures = 0;
      } catch (error) {
        if ((error instanceof ApiError && error.status === 404) || ++failures >= POLL_FAILURES) {
          bubble.text(t('xtra_ai_error'));
          break;
        }
        continue;
      }
      if (job.status === 'thinking') {
        bubble.thinking(job.position);
        continue;
      }
      if (job.status === 'answered') {
        haptic.success();
        bubble.show(job.answer.parts, { link: job.answer.link, answerId: job.answer.id });
      } else {
        bubble.show(job.parts);
      }
      if (job.limit) { state.limit = job.limit; showLimit(); }
      break;
    }
    state.busy = false;
    updateButton();
  }

  // Вопрос: свой текст или пример (номер — готовый разбор, как кнопка-пример в боте)
  async function ask({ text, example = null }) {
    if (state.busy) return;
    state.busy = true;
    updateButton();
    haptic.tap();
    const bubble = addQuestion(text);
    try {
      const job = await api.post('/assistant/questions', example ? { example } : { question: text });
      follow(job.id, bubble);
    } catch (error) {
      state.busy = false;
      updateButton();
      haptic.error();
      if (error instanceof ApiError && (error.status === 402 || error.status === 429) && error.data.text) {
        if (error.data.limit) { state.limit = error.data.limit; showLimit(); }
        bubble.text(error.data.text, error.status === 402 ? { path: '/premium', label: t('xtra_ai_premium') } : null);
        return;
      }
      bubble.text(errorText(error));
    }
  }

  function submit() {
    const text = state.text.trim();
    if (!text || state.busy) return;
    input.value = '';
    state.text = '';
    grow();
    ask({ text });
  }

  function build(info) {
    state.limit = info.limit;
    state.maxLength = info.maxLength;
    input.maxLength = info.maxLength;
    showLimit();
    if (info.pending) {
      state.busy = true;
      updateButton();
      const bubble = addQuestion(info.pending.question);
      bubble.thinking(info.pending.position);
      follow(info.pending.id, bubble);
    } else {
      intro.replaceChildren(
        h('p', { class: 'ai-intro' }, t('xtra_ai_intro')),
        h('div', { class: 'ai-examples' }, section({ title: t('xtra_ai_examples') },
          info.examples.map((example, i) => row({ title: example, chevron: false, onClick: () => ask({ text: example, example: i + 1 }) }))))
      );
    }
    return h('div', { class: 'ai-screen' },
      intro,
      log,
      h('div', { class: 'ai-composer' }, input, left));
  }

  return page({ title: t('xtra_ai_title') }, load(() => api.get('/assistant'), build));
}
