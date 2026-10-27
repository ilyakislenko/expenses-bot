// Погашение долга помесячно (кредит, ипотека, рассрочка, долг другу). rate — проценты годовых:
// в начале месяца начисляется balance · rate/12, затем вносится платёж (последний — сколько осталось).
// Без платежа долг растёт на проценты (без ставки — не меняется).

const { MAX_MONTHS } = require('./savingsForecast');

const EPSILON = 0.005; // остаток меньше копейки — долг закрыт

function monthlyRate(rate) {
  return (Number(rate) || 0) / 100 / 12;
}

// План погашения при ежемесячном платеже payment.
// { paidOff, months, totalInterest, lastPayment, interest, reason }:
// paidOff — закроется не дольше чем за 50 лет; months — число платежей; totalInterest — переплата по процентам;
// lastPayment — последний (неполный) платёж; interest — проценты за первый месяц;
// reason (если не закроется): 'no_payment' | 'below_interest' (платёж ≤ процентов) | 'too_long'.
function amortize({ balance, rate = 0, payment }) {
  const start = Number(balance) || 0;
  const i = monthlyRate(rate);
  const interest = start * i;
  if (start <= EPSILON) return { paidOff: true, months: 0, totalInterest: 0, lastPayment: 0, interest: 0, reason: null };
  const pay = Number(payment) || 0;
  const fail = (reason) => ({ paidOff: false, months: null, totalInterest: null, lastPayment: null, interest, reason });
  if (pay <= 0) return fail('no_payment');
  if (pay <= interest) return fail('below_interest');

  let owed = start;
  let totalInterest = 0;
  for (let k = 1; k <= MAX_MONTHS; k++) {
    const accrued = owed * i;
    totalInterest += accrued;
    owed += accrued;
    const paid = Math.min(pay, owed);
    owed -= paid;
    if (owed <= EPSILON) return { paidOff: true, months: k, totalInterest, lastPayment: paid, interest, reason: null };
  }
  return fail('too_long');
}

// Остаток долга по месяцам 0..months при платеже payment (нет платежа — растёт на проценты), не ниже нуля
function projectDebt({ balance, rate = 0, payment, months }) {
  const i = monthlyRate(rate);
  const pay = Number(payment) || 0;
  let owed = Number(balance) || 0;
  const points = [owed];
  for (let k = 1; k <= months; k++) {
    owed = Math.max(0, owed * (1 + i) - pay);
    if (owed <= EPSILON) owed = 0;
    points.push(owed);
  }
  return points;
}

module.exports = { amortize, projectDebt };
