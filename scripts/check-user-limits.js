#!/usr/bin/env node

require('dotenv').config();
const Container = require('../src/container');

async function main() {
  const userId = Number(process.argv[2] || '907470387');
  const container = new Container();
  const {
    userService,
    expenseService,
    categoryService,
    formatter,
    localizationService
  } = container.getHandlers();

  const userLanguage = await userService.getUserLanguage(userId);
  const userCurrency = await userService.getUserCurrency(userId);
  const userTimezone = await userService.getUserTimezone(userId);
  const startDay = await userService.getUserPeriodStartDay(userId);
  const settings = await userService.getReminderSettings(userId);

  function fmt(amount) { return formatter.formatAmount(amount, userCurrency); }

  // Daily spending
  const { total: dailyTotal } = await expenseService.getDailyTotalsForSummary(userId);
  let dailySpent = 0;
  if (Array.isArray(dailyTotal.byCurrency)) {
    for (const row of dailyTotal.byCurrency) {
      dailySpent += await formatter.currencyUtils.convert(Number(row.total), row.currency || 'RUB', userCurrency);
    }
  } else if (dailyTotal.total != null) {
    dailySpent = await formatter.currencyUtils.convert(Number(dailyTotal.total), dailyTotal.currency || 'RUB', userCurrency);
  }

  // Monthly spending (custom period start day)
  const { total: monthTotal } = await expenseService.getMonthlyStats(userId);
  let monthlySpent = 0;
  if (Array.isArray(monthTotal.byCurrency)) {
    for (const row of monthTotal.byCurrency) {
      monthlySpent += await formatter.currencyUtils.convert(Number(row.total), row.currency || 'RUB', userCurrency);
    }
  } else if (monthTotal.total != null) {
    monthlySpent = await formatter.currencyUtils.convert(Number(monthTotal.total), monthTotal.currency || 'RUB', userCurrency);
  }

  console.log('=== User info ===');
  console.log('User ID:', userId);
  console.log('Language:', userLanguage);
  console.log('Currency:', userCurrency);
  console.log('Timezone:', userTimezone);
  console.log('Period start day:', startDay);
  console.log('--- Settings ---');
  console.log('Category limits enabled:', !!settings.category_limits_enabled);
  console.log('Global limits enabled:', !!settings.global_limits_enabled);
  console.log('Daily limit:', settings.daily_limit_amount == null ? null : `${fmt(Number(settings.daily_limit_amount))} (${settings.daily_limit_currency || userCurrency})`);
  console.log('Monthly limit:', settings.monthly_limit_amount == null ? null : `${fmt(Number(settings.monthly_limit_amount))} (${settings.monthly_limit_currency || userCurrency})`);

  console.log('\n=== Totals ===');
  console.log('Daily spent:', fmt(dailySpent));
  console.log('Monthly spent:', fmt(monthlySpent));

  console.log('\n=== Category limits (current / limit) ===');
  const categories = await expenseService.getCategories(userId, localizationService, userLanguage);
  for (const cat of categories) {
    const info = await categoryService.isCategoryLimitExceeded(userId, cat.id);
    if (!info.enabled) continue;
    const current = fmt(info.currentAmount || 0);
    let limitDisplay = '-';
    if (info.limitAmount != null) {
      let limitInUser = Number(info.limitAmount) || 0;
      try {
        const converted = await formatter.currencyUtils.convert(Number(info.limitAmount), info.limitCurrency || userCurrency, userCurrency);
        if (Number.isFinite(converted)) limitInUser = converted;
      } catch (_) {}
      limitDisplay = fmt(limitInUser);
    }
    console.log(`${cat.icon || '📦'} ${cat.name}: ${current} / ${limitDisplay}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = main;


