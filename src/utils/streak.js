// Серия дней с записями (локальные даты 'YYYY-MM-DD', как в utils/period.js) и заморозки серии.
// День активен, если в нём есть хоть одна запись (трата, доход) или отметка «день без трат».
// Заморозка закрывает один пропущенный день: в неделю (пн–вс пропущенного дня) не больше allowance штук.
// Новые заморозки ставятся только на последние FREEZE_WINDOW_DAYS дней — раньше пропуск уже оценивали
// (серия считается при каждой записи), поэтому прошлое не переписывается и сохранённые заморозки стабильны.
const { addDays, parseYmd } = require('./period');

const FREEZE_WINDOW_DAYS = 7;

function toSet(days) {
  return days instanceof Set ? days : new Set(days || []);
}

// Понедельник недели, в которую входит дата
function weekStart(date) {
  const { y, m, d } = parseYmd(date);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 — воскресенье
  return addDays(date, -((dow + 6) % 7));
}

function countByWeek(days) {
  const counts = new Map();
  for (const day of days) {
    const week = weekStart(day);
    counts.set(week, (counts.get(week) || 0) + 1);
  }
  return counts;
}

function earliest(days) {
  let min = null;
  for (const day of days) if (min === null || day < min) min = day;
  return min;
}

// Текущая серия на сегодня. Сегодня без записи серию не рвёт (день ещё не закончился).
// Возвращает:
//   current — дней с записями в серии (замороженные дни не прибавляют, но и не рвут),
//   todayActive, newFreezes — пропуски, которые нужно закрыть заморозкой сейчас (сохранить и сообщить),
//   frozen — все заморозки внутри серии, freezesLeft — сколько заморозок осталось на этой неделе,
//   atRisk — серия от riskFrom дней, а сегодня ещё ничего не записано.
function computeStreak({ activeDays, freezes = [], today, allowance = 1, riskFrom = 3 }) {
  const active = toSet(activeDays);
  const stored = toSet(freezes);
  const perWeek = countByWeek(stored);
  const todayActive = active.has(today);
  const first = earliest(active);
  const minNewFreeze = addDays(today, -FREEZE_WINDOW_DAYS);

  let current = todayActive ? 1 : 0;
  const committed = [];
  let pending = []; // заморозки после последнего найденного активного дня: в силе, только если до них серия есть
  let day = addDays(today, -1);
  while (first !== null && day >= first) {
    if (active.has(day)) {
      current++;
      committed.push(...pending);
      pending = [];
    } else if (stored.has(day)) {
      pending.push({ day, stored: true });
    } else if (day >= minNewFreeze && (perWeek.get(weekStart(day)) || 0) < allowance) {
      perWeek.set(weekStart(day), (perWeek.get(weekStart(day)) || 0) + 1);
      pending.push({ day, stored: false });
    } else {
      break;
    }
    day = addDays(day, -1);
  }
  // Пропуски перед началом серии не заморожены: вернуть недельный лимит
  for (const item of pending) {
    if (!item.stored) perWeek.set(weekStart(item.day), perWeek.get(weekStart(item.day)) - 1);
  }

  const newFreezes = committed.filter(item => !item.stored).map(item => item.day).sort();
  const freezesLeft = Math.max(0, allowance - (perWeek.get(weekStart(today)) || 0));
  return {
    current,
    todayActive,
    newFreezes,
    frozen: committed.map(item => item.day).sort(),
    freezesLeft,
    atRisk: !todayActive && current >= riskFrom
  };
}

// Самая длинная серия за всю историю (заморозки не рвут, но и не прибавляют)
function bestStreak(activeDays, freezes = []) {
  const active = toSet(activeDays);
  const days = [...new Set([...active, ...toSet(freezes)])].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of days) {
    if (prev === null || day !== addDays(prev, 1)) run = 0;
    if (active.has(day)) run++;
    if (run > best) best = run;
    prev = day;
  }
  return best;
}

// Сколько календарных месяцев с записями минимум в minDays дней
function completeMonths(activeDays, minDays = 25) {
  const perMonth = new Map();
  for (const day of toSet(activeDays)) {
    const month = day.slice(0, 7);
    perMonth.set(month, (perMonth.get(month) || 0) + 1);
  }
  let count = 0;
  for (const value of perMonth.values()) if (value >= minDays) count++;
  return count;
}

module.exports = {
  FREEZE_WINDOW_DAYS,
  weekStart,
  computeStreak,
  bestStreak,
  completeMonths
};
