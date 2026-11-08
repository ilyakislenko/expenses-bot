// Навигация по hash (#/overview?offset=-1). Экраны регистрируют маршруты: route('/record/:id', render, { tab }).
// render(ctx) получает { params, query, path, refresh(), onChange(topic, fn), navigate } и возвращает DOM-узел
// (можно промис). Корневые экраны вкладок — без кнопки «Назад», вложенные — с нативной BackButton Telegram.
// Изменения данных — событие changed(topic): открытые экраны, подписанные через ctx.onChange, перерисовываются.
import { backButton, mainButton } from './tg.js';

const routes = [];
const listeners = new Map(); // topic → Set(fn)
let viewEl = null;
let onTab = null;
let stack = [];
let current = null;

export function route(pattern, render, { tab = null, root = false, tabs = true } = {}) {
  const keys = [];
  const regex = new RegExp(`^${pattern.replace(/\/:([a-zA-Z]+)/g, (_, key) => { keys.push(key); return '/([^/]+)'; })}$`);
  routes.push({ pattern, regex, keys, render, tab, root, tabs });
}

function parse(hash) {
  const raw = (hash || '').replace(/^#/, '') || '/today';
  const [path, search = ''] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(search));
  return { path, query, full: raw };
}

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (replace) {
    stack[stack.length - 1] = path;
    history.replaceState(null, '', target);
    render();
  } else if (location.hash === target) {
    render();
  } else {
    location.hash = target;
  }
}

export function back() {
  if (stack.length > 1) history.back();
  else navigate(current && current.route.tab ? `/${current.route.tab}` : '/today', { replace: true });
}

// Копия списка: обработчик может перерисовать экран, а перерисовка снимает и снова ставит подписки
export function changed(topic) {
  for (const fn of [...(listeners.get(topic) || [])]) fn();
}

export function currentPath() { return current ? current.full : null; }

async function render(options) {
  const keepScroll = !!(options && options.keepScroll);
  const { path, query, full } = parse(location.hash);
  const match = routes.find(r => r.regex.test(path)) || routes.find(r => r.pattern === '/today');
  if (!match) return;
  // Стек для «Назад»: переход назад по истории — снимаем верх, иначе кладём
  if (stack[stack.length - 2] === full) stack.pop();
  else if (stack[stack.length - 1] !== full) stack.push(full);
  if (match.root) stack = [full];

  if (current && current.cleanup) current.cleanup.forEach(fn => fn());
  mainButton.clear();
  const values = (path.match(match.regex) || []).slice(1).map(decodeURIComponent);
  const params = Object.fromEntries(match.keys.map((key, i) => [key, values[i]]));
  const cleanup = [];
  const state = { route: match, full, cleanup };
  current = state;

  if (match.root || stack.length <= 1) backButton.hide(); else backButton.show(back);
  document.body.classList.toggle('no-tabs', !match.tabs);
  viewEl.classList.toggle('no-tabs', !match.tabs);
  if (onTab) onTab(match.tabs ? match.tab : null);

  const ctx = {
    params,
    query,
    path: full,
    refresh: () => { if (current === state) render({ keepScroll: true }); },
    onChange(topic, fn) {
      if (!listeners.has(topic)) listeners.set(topic, new Set());
      const handler = () => { if (current === state) fn(); };
      listeners.get(topic).add(handler);
      cleanup.push(() => listeners.get(topic).delete(handler));
    },
    onLeave(fn) { cleanup.push(fn); }
  };
  let node;
  try {
    node = await match.render(ctx);
  } catch (error) {
    console.error(error);
    node = document.createTextNode('');
  }
  if (current !== state) return; // пока грузилось, ушли на другой экран
  viewEl.replaceChildren(node);
  if (!keepScroll) window.scrollTo(0, 0);
}

export function start(view, { onTabChange } = {}) {
  viewEl = view;
  onTab = onTabChange;
  window.addEventListener('hashchange', () => render());
  render();
}
