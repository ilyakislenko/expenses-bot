// Прогноз накоплений помесячно. Ставки — проценты годовых:
// yieldRate — доходность (капитализация ежемесячно, i = y/12), inflationRate — инфляция,
// contributionGrowth — рост ежемесячного взноса раз в год (индексация зарплаты).
// Взнос поступает в конце месяца после начисления процентов. Баланс не уходит ниже нуля.

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

// Баланс по месяцам 0..months: { month, nominal, real, simple }.
// simple — без процентов, инфляции и роста взноса; real — nominal в сегодняшних деньгах.
// depletedAt — месяц, когда при отрицательном взносе накопления закончились (иначе null).
function simulate({ balance, monthly, yieldRate = 0, inflationRate = 0, contributionGrowth = 0, months }) {
  const i = monthlyRate(yieldRate);
  const points = [{ month: 0, nominal: balance, real: balance, simple: balance }];
  let nominal = balance;
  let depletedAt = null;
  for (let k = 1; k <= months; k++) {
    nominal = nominal * (1 + i) + contributionAt(monthly, contributionGrowth, k);
    if (nominal <= 0) {
      nominal = 0;
      if (depletedAt === null) depletedAt = k;
    }
    points.push({
      month: k,
      nominal,
      real: nominal / deflator(inflationRate, k),
      simple: Math.max(0, balance + monthly * k)
    });
  }
  return { points, depletedAt };
}

// Через сколько месяцев накопления дойдут до target. inToday = true: цель в сегодняшних ценах
// (дорожает с инфляцией). null — не дойдут за 50 лет.
function monthsToTarget({ balance, monthly, yieldRate = 0, inflationRate = 0, contributionGrowth = 0, target, inToday = false }) {
  if (balance >= target) return 0;
  const i = monthlyRate(yieldRate);
  let nominal = balance;
  for (let k = 1; k <= MAX_MONTHS; k++) {
    nominal = nominal * (1 + i) + contributionAt(monthly, contributionGrowth, k);
    if (nominal <= 0) return null;
    const value = inToday ? nominal / deflator(inflationRate, k) : nominal;
    if (value >= target) return k;
  }
  return null;
}

// Сколько откладывать в месяц (первый год; дальше — с ростом взноса), чтобы через months месяцев
// накопить target. inToday = true: цель в сегодняшних ценах. 0 — уже хватает.
function requiredMonthly({ balance, target, months, yieldRate = 0, inflationRate = 0, contributionGrowth = 0, inToday = false }) {
  if (months <= 0) return null;
  const i = monthlyRate(yieldRate);
  const goal = inToday ? target * deflator(inflationRate, months) : target;
  // Баланс через n месяцев линеен по взносу: B·(1+i)^n + C·Σ g_k·(1+i)^(n−k)
  const grown = balance * Math.pow(1 + i, months);
  let factor = 0;
  for (let k = 1; k <= months; k++) {
    factor += contributionAt(1, contributionGrowth, k) * Math.pow(1 + i, months - k);
  }
  return Math.max(0, (goal - grown) / factor);
}

module.exports = { simulate, monthsToTarget, requiredMonthly, MAX_MONTHS };
