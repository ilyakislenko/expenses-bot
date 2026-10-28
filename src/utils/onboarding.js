// «🧭 Настроим бота под тебя»: порядок вопросов и перевод ответов в настройки — чистые функции без Telegram и БД.
// Черновик ответов хранится в users.onboarding_answers (JSONB), поэтому опрос переживает рестарт процесса.
//
// Коды шагов (в callback_data `onb|<шаг>|…`):
//   g — цели (несколько), c — валюта, z — часовой пояс (только у нового пользователя), p — день зарплаты (начало
//   периода), b — бюджет на месяц (только с целью «бюджет» и премиумом), i — способы записи (несколько),
//   r — напоминания, n — что присылать (несколько), m — злой режим.

const GOALS = ['track', 'budget', 'save', 'debt', 'family', 'subs'];
const INPUTS = ['text', 'voice', 'receipt', 'statement'];
const NOTIFY = ['daily', 'weekly', 'month', 'bills'];
const PAYDAYS = [1, 5, 10, 15, 20, 25];
const ROAST_LEVELS = ['off', 'spicy', 'savage'];
// Напоминания «записать траты»: часы по местному времени; null — выключить
const REMINDERS = { e: [21], me: [9, 21], no: null };
const MODES = ['new', 'setup'];
const STEP_CODES = ['g', 'c', 'z', 'p', 'b', 'i', 'r', 'n', 'm'];

// Основная валюта по языку интерфейса — отмечена на шаге валюты у нового пользователя
const LANGUAGE_CURRENCY = {
  ru: 'RUB', en: 'USD', de: 'EUR', es: 'EUR', fr: 'EUR', pt: 'EUR', kz: 'KZT',
  zh: 'CNY', jp: 'JPY', hi: 'INR', tr: 'TRY', ka: 'GEL', uz: 'UZS'
};

// Часовой пояс по языку — пока новый пользователь не указал своё время. Только где язык почти однозначно даёт пояс
// (как LANGUAGE_CURRENCY: es/pt/fr/de — Европа); у en угадать нельзя — остаётся UTC
const LANGUAGE_TIMEZONE = {
  ru: 'Europe/Moscow', de: 'Europe/Berlin', es: 'Europe/Madrid', fr: 'Europe/Paris', pt: 'Europe/Lisbon',
  kz: 'Asia/Almaty', zh: 'Asia/Shanghai', jp: 'Asia/Tokyo', hi: 'Asia/Kolkata', tr: 'Europe/Istanbul',
  ka: 'Asia/Tbilisi', uz: 'Asia/Tashkent'
};
// Напоминания нового пользователя, пока он не ответил на вопрос о них: одно вечером — если пояс известен (выбран или
// угадан по языку), иначе выключены, чтобы не писать ночью
const DEFAULT_REMINDERS = 'e';

// Кнопки итогового экрана по целям (и выписке как способу записи), не больше MAX_FINAL_ACTIONS
const MAX_FINAL_ACTIONS = 4;
const GOAL_ACTIONS = {
  save: { key: 'onb_btn_goal', callback: 'svgn' },
  debt: { key: 'onb_btn_debt', callback: 'svbn' },
  family: { key: 'onb_btn_family', callback: 'family' },
  subs: { key: 'onb_btn_subs', callback: 'pls' },
  budget: { key: 'onb_btn_budget', callback: 'bg_menu' },
  track: { key: 'onb_btn_overview', callback: 'ov|0' }
};
const IMPORT_ACTION = { key: 'onb_btn_import', callback: 'import' };

function newDraft(mode, { previous = null, budgetAllowed = false, currency = null, now = new Date() } = {}) {
  const keep = (list, allowed) => (Array.isArray(list) ? list.filter((v) => allowed.includes(v)) : []);
  return {
    v: 1,
    status: 'active',
    mode: MODES.includes(mode) ? mode : 'setup',
    step: 'g',
    // Повторный проход (/setup) начинается с прошлых целей и способов записи
    goals: keep(previous && previous.goals, GOALS),
    inputs: keep(previous && previous.inputs, INPUTS),
    // currencyAuto — валюта поставлена по языку, а не выбрана: при смене языка «Назад» её можно поменять
    answers: currency ? { currency, currencyAuto: true } : {},
    notify: null, // выбор на шаге «что присылать»; null — ещё не показан (начальное значение — текущие настройки)
    skipped: [],
    budgetAllowed: !!budgetAllowed,
    mid: null,
    startedAt: now.toISOString()
  };
}

// Шаги этого прохода по порядку
function steps(draft) {
  const list = ['g', 'c'];
  if (draft.mode === 'new') list.push('z');
  list.push('p');
  if (draft.budgetAllowed && draft.goals.includes('budget')) list.push('b');
  list.push('i', 'r', 'n', 'm');
  return list;
}

// Следующий шаг после step; null — вопросы кончились. Шаг не из этого прохода (старая кнопка) — текущий шаг
function nextStep(draft, step) {
  const list = steps(draft);
  const index = list.indexOf(step);
  if (index === -1) return list.includes(draft.step) ? draft.step : list[0];
  return list[index + 1] || null;
}

function prevStep(draft, step) {
  const list = steps(draft);
  const index = list.indexOf(step);
  return index > 0 ? list[index - 1] : null;
}

function progress(draft, step) {
  const list = steps(draft);
  return { n: Math.max(1, list.indexOf(step) + 1), total: list.length };
}

// Голос и фото чека предлагаются, только если распознавание настроено
function inputOptions({ voice = false, receipt = false } = {}) {
  return INPUTS.filter((code) => (code === 'voice' ? voice : code === 'receipt' ? receipt : true));
}

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Начальный выбор «что присылать»: текущие настройки, плюс подсказка по целям, если пользователь ещё не включал
function initialNotify(draft, current) {
  const selected = NOTIFY.filter((code) => current[code]);
  if (draft.goals.includes('subs') && !selected.includes('bills')) selected.push('bills');
  if (draft.goals.includes('track') && !selected.includes('weekly')) selected.push('weekly');
  return NOTIFY.filter((code) => selected.includes(code));
}

function notifyPlan(selected) {
  return Object.fromEntries(NOTIFY.map((code) => [code, selected.includes(code)]));
}

function reminderPlan(code) {
  if (!Object.prototype.hasOwnProperty.call(REMINDERS, code)) return null;
  const hours = REMINDERS[code];
  return hours ? { enabled: true, hours } : { enabled: false, hours: null };
}

// «Нерегулярно» (0) — месяц с 1-го числа
function paydayToPeriodDay(day) {
  const value = Number(day);
  if (!Number.isInteger(value) || value < 0 || value > 31) return null;
  return value === 0 ? 1 : value;
}

function finalActions(draft) {
  const actions = [];
  for (const goal of GOALS.filter((g) => g !== 'track' && g !== 'budget').concat(['budget', 'track'])) {
    if (draft.goals.includes(goal)) actions.push(GOAL_ACTIONS[goal]);
  }
  if (draft.inputs.includes('statement')) actions.splice(Math.min(actions.length, 1), 0, IMPORT_ACTION);
  return actions.slice(0, MAX_FINAL_ACTIONS);
}

function isActive(draft) {
  return !!(draft && draft.status === 'active' && STEP_CODES.includes(draft.step));
}

module.exports = {
  GOALS,
  INPUTS,
  NOTIFY,
  PAYDAYS,
  ROAST_LEVELS,
  REMINDERS,
  STEP_CODES,
  LANGUAGE_CURRENCY,
  LANGUAGE_TIMEZONE,
  DEFAULT_REMINDERS,
  MAX_FINAL_ACTIONS,
  newDraft,
  steps,
  nextStep,
  prevStep,
  progress,
  inputOptions,
  toggle,
  initialNotify,
  notifyPlan,
  reminderPlan,
  paydayToPeriodDay,
  finalActions,
  isActive
};
