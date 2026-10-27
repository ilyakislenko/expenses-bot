// Прогноз накоплений помесячно. Ставки — проценты годовых:
// yieldRate — доходность новых взносов и частей без своей ставки (капитализация ежемесячно, i = y/12),
// inflationRate — инфляция, contributionGrowth — рост ежемесячного взноса раз в год (индексация зарплаты).
// Накопления — части { balance, yieldRate } (счета со своей ставкой: вклад, наличные 0%…) или одна сумма balance.
// Каждая часть растёт по своей ставке; взносы поступают в конце месяца после процентов и растут по yieldRate.
// Сумма не уходит ниже нуля.

const MAX_MONTHS = 600; // 50 лет — дальше прогноз не ищем

function monthlyRate(yieldRate) {
  return (Number(yieldRate) || 0) / 100 / 12;
}

// Взнос в месяце k (1..n): индексация в начале каждого следующего года
function contributionAt(monthly, contributionGrowth, k) {
  return monthly * Math.pow(1 + (Number(contributionGrowth) || 0) / 100, Math.floor((k - 1) / 12));
}

// Множитель «сегодняшних денег» через k месяцев
function deflator(inflationRate, k) {
  return Math.pow(1 + (Number(inflationRate) || 0) / 100, k / 12);
}

// Части накоплений: своя ставка части или, если её нет (null/undefined), ставка по умолчанию
function normalizeParts({ parts, balance = 0, yieldRate = 0 }) {
  const list = parts || [{ balance, yieldRate }];
  return list.map(p => ({
    balance: Number(p.balance) || 0,
    rate: monthlyRate(p.yieldRate === null || p.yieldRate === undefined ? yieldRate : p.yieldRate)
  }));
}

// Пошаговая модель: next() — сумма на конец следующего месяца
function stepper({ parts, balance, monthly, yieldRate = 0, contributionGrowth = 0 }) {
  const balances = normalizeParts({ parts, balance, yieldRate });
  const i = monthlyRate(yieldRate);
  let pool = 0; // взносы (при отрицательном — изъятия) со ставкой по умолчанию
  let k = 0;
  let depleted = false;
  const start = balances.reduce((sum, p) => sum + p.balance, 0);
  return {
    start,
    next() {
      k += 1;
      if (depleted) return { k, total: 0, depleted };
      for (const p of balances) p.balance *= 1 + p.rate;
      pool = pool * (1 + i) + contributionAt(monthly, contributionGrowth, k);
      const total = balances.reduce((sum, p) => sum + p.balance, 0) + pool;
      if (total <= 0) {
        depleted = true;
        return { k, total: 0, depleted, justDepleted: true };
      }
      return { k, total, depleted };
    }
  };
}

// Сумма по месяцам 0..months: { month, nominal, real, simple }.
// simple — без процентов, инфляции и роста взноса; real — nominal в сегодняшних деньгах.
// depletedAt — месяц, когда при отрицательном взносе накопления закончились (иначе null).
function simulate({ parts, balance, monthly, yieldRate = 0, inflationRate = 0, contributionGrowth = 0, months }) {
  const model = stepper({ parts, balance, monthly, yieldRate, contributionGrowth });
  const points = [{ month: 0, nominal: model.start, real: model.start, simple: model.start }];
  let depletedAt = null;
  for (let k = 1; k <= months; k++) {
    const { total, justDepleted } = model.next();
    if (justDepleted) depletedAt = k;
    points.push({
      month: k,
      nominal: total,
      real: total / deflator(inflationRate, k),
      simple: Math.max(0, model.start + monthly * k)
    });
  }
  return { points, depletedAt };
}

// Через сколько месяцев накопления дойдут до target. inToday = true: цель в сегодняшних ценах
// (дорожает с инфляцией). null — не дойдут за 50 лет.
function monthsToTarget({ parts, balance, monthly, yieldRate = 0, inflationRate = 0, contributionGrowth = 0, target, inToday = false }) {
  const model = stepper({ parts, balance, monthly, yieldRate, contributionGrowth });
  if (model.start >= target) return 0;
  for (let k = 1; k <= MAX_MONTHS; k++) {
    const { total, depleted } = model.next();
    if (depleted) return null;
    const value = inToday ? total / deflator(inflationRate, k) : total;
    if (value >= target) return k;
  }
  return null;
}

// Сколько откладывать в месяц (первый год; дальше — с ростом взноса), чтобы через months месяцев
// накопить target. inToday = true: цель в сегодняшних ценах. 0 — уже хватает.
function requiredMonthly({ parts, balance, target, months, yieldRate = 0, inflationRate = 0, contributionGrowth = 0, inToday = false }) {
  if (months <= 0) return null;
  const i = monthlyRate(yieldRate);
  const goal = inToday ? target * deflator(inflationRate, months) : target;
  // Сумма через n месяцев линейна по взносу: Σ B_j·(1+i_j)^n + C·Σ g_k·(1+i)^(n−k)
  const grown = normalizeParts({ parts, balance, yieldRate })
    .reduce((sum, p) => sum + p.balance * Math.pow(1 + p.rate, months), 0);
  let factor = 0;
  for (let k = 1; k <= months; k++) {
    factor += contributionAt(1, contributionGrowth, k) * Math.pow(1 + i, months - k);
  }
  return Math.max(0, (goal - grown) / factor);
}

module.exports = { simulate, monthsToTarget, requiredMonthly, MAX_MONTHS };
