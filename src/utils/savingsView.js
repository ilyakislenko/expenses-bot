// Раздел «Накопления»: компактные суммы, иконки счетов, очередь мастера «Обновить остатки».

const POINT_DECIMAL_LANGS = ['en', 'hi', 'jp', 'zh']; // как в CSV-экспорте: у остальных десятичная запятая
const NUMBER = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const symbols = new Map();

// Знак валюты так же, как в formatter.formatAmount (ru-RU): ₽, $, €, CN¥, KZT…
function currencySymbol(currency) {
  if (!symbols.has(currency)) {
    const part = new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).formatToParts(0).find(p => p.type === 'currency');
    symbols.set(currency, part ? part.value : currency);
  }
  return symbols.get(currency);
}

function commaDecimal(lang) {
  return !POINT_DECIMAL_LANGS.includes(lang);
}

// 1 530 000 → «1,53 млн ₽», 241 300 → «241 тыс ₽», 3 000 → «3 000 ₽» (округлено до целых).
// units: { thousand: '{n} тыс', million: '{n} млн', comma: true } — слова из локали и десятичный разделитель
function compactAmount(amount, currency, units) {
  const value = Number(amount) || 0;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const symbol = currencySymbol(currency);
  const thousands = Math.round(abs / 1000);
  if (abs >= 1e6 || thousands >= 1000) {
    const millions = abs / 1e6;
    const decimals = millions < 10 ? 2 : (millions < 100 ? 1 : 0);
    const [int, frac] = millions.toFixed(decimals).split('.');
    const fraction = (frac || '').replace(/0+$/, '');
    const number = NUMBER.format(Number(int)) + (fraction ? (units.comma ? ',' : '.') + fraction : '');
    return `${sign}${units.million.replace('{n}', number)} ${symbol}`;
  }
  if (abs >= 10000) return `${sign}${units.thousand.replace('{n}', NUMBER.format(thousands))} ${symbol}`;
  return `${sign}${NUMBER.format(Math.round(abs))} ${symbol}`;
}

// Иконка по названию счёта (ru + en, без учёта регистра). 💳 — только долги, 🎯 — цели, 💰 — общая копилка
const ACCOUNT_ICONS = [
  [/налич|cash/, '💵'],
  [/вклад|депозит|накопит|deposit|saving/, '🏦'],
  [/крипт|crypto|bitcoin|ethereum|\b(?:btc|usdt|eth)\b/, '🪙'],
  [/скин|steam|skin/, '🎮'],
  [/брокер|акци|инвест|broker|stock|invest/, '📈']
];

function potIcon(pot) {
  if (pot.kind === 'general') return '💰';
  if (pot.kind === 'goal') return '🎯';
  if (pot.kind === 'debt') return '💳';
  const name = String(pot.name || '').toLowerCase();
  const match = ACCOUNT_ICONS.find(([pattern]) => pattern.test(name));
  return match ? match[1] : '💼';
}

// Порядок мастера «Обновить остатки»: общая копилка (если в ней что-то есть или других счетов нет), счета,
// цели со своей копилкой, долги. state — из SavingsService.getState
function updateQueue({ accounts, goals, debts }) {
  const others = accounts.filter(p => p.kind !== 'general');
  const general = accounts.find(p => p.kind === 'general');
  const queue = [];
  if (general && (general.balance > 0 || !others.length)) queue.push(general.id);
  queue.push(...others.map(p => p.id));
  queue.push(...goals.filter(g => g.goal_mode === 'own').map(g => g.id));
  queue.push(...debts.map(d => d.id));
  return queue;
}

// Мастер в памяти процесса: userId → { ids, index, before, achieved, expires }. Кнопки старых шагов
// сверяются с текущим шагом (current), просроченный мастер — как будто его нет.
class UpdateWizards {
  constructor(ttlMs = 30 * 60 * 1000, now = () => Date.now()) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.items = new Map();
  }

  start(userId, ids, before) {
    const wizard = { ids, index: 0, before, achieved: [], expires: this.now() + this.ttlMs };
    this.items.set(userId, wizard);
    return wizard;
  }

  get(userId) {
    const wizard = this.items.get(userId);
    if (!wizard) return null;
    if (wizard.expires < this.now()) {
      this.items.delete(userId);
      return null;
    }
    return wizard;
  }

  // id копилки текущего шага или null (мастера нет / закончился)
  current(userId) {
    const wizard = this.get(userId);
    return wizard && wizard.index < wizard.ids.length ? wizard.ids[wizard.index] : null;
  }

  // Шаг potId пройден: true — если это действительно текущий шаг (иначе кнопка/ввод устарели)
  advance(userId, potId) {
    const wizard = this.get(userId);
    if (!wizard || wizard.ids[wizard.index] !== potId) return false;
    wizard.index += 1;
    wizard.expires = this.now() + this.ttlMs;
    return true;
  }

  finish(userId) {
    const wizard = this.get(userId);
    this.items.delete(userId);
    return wizard;
  }
}

module.exports = { compactAmount, currencySymbol, commaDecimal, potIcon, updateQueue, UpdateWizards };
