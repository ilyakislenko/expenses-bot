// Обвязка Telegram.WebApp: запуск, вибро-отклик, нативные MainButton и BackButton, диалоги, оплата.
// Вне Telegram (нет initData) приложение не работает — main.js показывает «открой из бота».
export const tg = window.Telegram && window.Telegram.WebApp;

const has = (version) => !!(tg && tg.isVersionAtLeast && tg.isVersionAtLeast(version));

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  if (has('7.7') && tg.disableVerticalSwipes) tg.disableVerticalSwipes();
  const paint = () => {
    const bg = tg.themeParams.secondary_bg_color || tg.themeParams.bg_color;
    if (bg && has('6.1')) {
      tg.setHeaderColor(bg);
      tg.setBackgroundColor(bg);
    }
    if (has('7.10') && tg.setBottomBarColor && tg.themeParams.secondary_bg_color) tg.setBottomBarColor(tg.themeParams.secondary_bg_color);
  };
  paint();
  tg.onEvent('themeChanged', paint);
}

export const haptic = {
  tap() { tg && tg.HapticFeedback && tg.HapticFeedback.selectionChanged(); },
  light() { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred('light'); },
  success() { tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred('success'); },
  warn() { tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred('warning'); },
  error() { tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred('error'); }
};

// Нативная главная кнопка Telegram — одна на экран. Стек: шторка поверх экрана ставит свою кнопку и снимает её при
// закрытии, кнопка экрана возвращается. Роутер очищает стек при переходе.
const stack = [];
let bound = null;
function applyMain() {
  if (!tg) return;
  const top = stack[stack.length - 1];
  if (bound) tg.MainButton.offClick(bound);
  bound = null;
  if (!top) {
    tg.MainButton.hideProgress();
    tg.MainButton.hide();
    return;
  }
  bound = () => { if (!top.busy && top.enabled !== false) top.onClick(); };
  tg.MainButton.onClick(bound);
  tg.MainButton.setParams({ text: top.text, is_active: top.enabled !== false, is_visible: true, ...(top.color ? { color: top.color } : {}) });
  if (top.busy) tg.MainButton.showProgress(false); else tg.MainButton.hideProgress();
}
export const mainButton = {
  // { text, onClick, enabled } → handle { update({ text, enabled }), busy(bool), remove() }
  push(config) {
    const entry = { ...config };
    stack.push(entry);
    applyMain();
    return {
      update(changes) { Object.assign(entry, changes); if (stack[stack.length - 1] === entry) applyMain(); },
      busy(value) { entry.busy = value; if (stack[stack.length - 1] === entry) applyMain(); },
      remove() { const i = stack.indexOf(entry); if (i >= 0) { stack.splice(i, 1); applyMain(); } }
    };
  },
  clear() { stack.length = 0; applyMain(); }
};

let backHandler = null;
export const backButton = {
  show(handler) {
    if (!tg) return;
    if (backHandler) tg.BackButton.offClick(backHandler);
    backHandler = handler;
    tg.BackButton.onClick(backHandler);
    tg.BackButton.show();
  },
  hide() {
    if (!tg) return;
    if (backHandler) tg.BackButton.offClick(backHandler);
    backHandler = null;
    tg.BackButton.hide();
  }
};

export function confirm(message) {
  return new Promise((resolve) => {
    if (tg && has('6.2')) tg.showConfirm(message, (ok) => resolve(!!ok));
    else resolve(window.confirm(message));
  });
}

export function alert(message) {
  return new Promise((resolve) => {
    if (tg && has('6.2')) tg.showAlert(message, () => resolve());
    else { window.alert(message); resolve(); }
  });
}

// Оплата счётом Telegram (createInvoiceLink на сервере) → 'paid' | 'cancelled' | 'failed' | 'pending'
export function openInvoice(url) {
  return new Promise((resolve) => {
    if (!tg || !has('6.1')) return resolve('failed');
    tg.openInvoice(url, (status) => resolve(status));
  });
}

export function openLink(url) { if (tg) tg.openLink(url); else window.open(url, '_blank'); }
export function openTelegramLink(url) { if (tg) tg.openTelegramLink(url); else window.open(url, '_blank'); }
export function close() { if (tg) tg.close(); }
export function startParam() { return (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || null; }
