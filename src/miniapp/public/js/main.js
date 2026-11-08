// Запуск Mini App: проверка Telegram, /api/me, вкладки, экраны разделов (js/screens/*.js — у каждого register()),
// роутер. Экраны разделов подключаются списком ниже; маршруты — в BOT_PAGES.md («Mini App»).
import { tg, initTelegram } from './core/tg.js';
import { h, icon } from './core/ui.js';
import { t } from './core/i18n.js';
import { reloadMe } from './core/session.js';
import { start, navigate } from './core/router.js';

const TABS = [
  { id: 'today', icon: 'today' },
  { id: 'overview', icon: 'chart' },
  { id: 'plans', icon: 'target' },
  { id: 'savings', icon: 'piggy' },
  { id: 'more', icon: 'more' }
];

const SCREENS = [
  'today', 'add', 'record',
  'overview',
  'income', 'recurring',
  'plans', 'budgets',
  'savings',
  'more', 'settings', 'family', 'premium', 'admin',
  'achievements', 'tags', 'export', 'import', 'tax', 'assistant', 'quiz'
];

const root = document.getElementById('app');

function fatal(text) {
  root.replaceChildren(h('div', { class: 'fatal' }, h('div', null, text)));
}

async function boot() {
  if (!tg || !tg.initData) return fatal('Открой приложение кнопкой в боте · Open the app from the bot');
  initTelegram();
  try {
    await reloadMe();
  } catch (error) {
    return fatal(error.code === 'auth' ? t('core_open_from_bot') : 'Не получилось загрузить · Could not load');
  }
  await Promise.all(SCREENS.map(name => import(`./screens/${name}.js`)
    .then(module => module.register())
    .catch(error => console.error(`screen ${name}`, error))));

  const view = h('main', { class: 'view' });
  const buttons = TABS.map(tab => h('button', {
    class: 'tab', dataset: { tab: tab.id },
    onclick: () => { if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); navigate(`/${tab.id}`); }
  }, icon(tab.icon), h('span', null, t(`core_tab_${tab.id}`))));
  const bar = h('nav', { class: 'tabbar' }, buttons);
  root.replaceChildren(view, bar);
  start(view, {
    onTabChange(active) {
      bar.classList.toggle('hidden', active === null);
      buttons.forEach(b => b.classList.toggle('on', b.dataset.tab === active));
    }
  });
}

boot();
