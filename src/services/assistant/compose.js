// Ответ из посчитанного результата (AssistantService.compute) по локализованным шаблонам: числа считает бот,
// текст — шаблоны, модель в ответе не участвует. Пользовательский текст (описания, названия категорий, слова
// поиска) экранируется и не попадает внутрь *жирного*. Возвращает { text, keyboard }.
const MAX_CATEGORY_LINES = 10;

function shortDate(localDate) {
  const [, m, d] = localDate.split('-');
  return `${d}.${m}`;
}

class AnswerComposer {
  constructor({ localizationService, formatter, lang }) {
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.lang = lang;
  }

  t(key, params) {
    return this.localizationService.getText(this.lang, key, params);
  }

  money(value, currency) {
    return this.formatter.formatAmount(value, currency);
  }

  categoryLabel(category) {
    const name = this.formatter.translateCategoryName(category.name, this.localizationService, this.lang);
    return `${category.icon || '📦'} ${this.formatter.escapeMarkdown(name)}`;
  }

  periodLabel(spec, period) {
    if (!spec) return this.formatter.formatPeriodRange(period);
    const date = this.formatter.formatLocalDate(period.start);
    if (spec.kind === 'day' && spec.offset === 0) return this.t('ai_period_today', { date });
    if (spec.kind === 'day' && spec.offset === -1) return this.t('ai_period_yesterday', { date });
    if (spec.kind === 'all') return this.t('ai_period_all');
    if (period.start === period.last) return date;
    return this.formatter.formatPeriodRange(period);
  }

  // «🔎 🍔 Еда · «такси»» — чем отфильтрованы траты
  filterLine(intent) {
    const parts = [
      ...intent.categories.map(category => this.categoryLabel(category)),
      ...intent.terms.map(term => `«${this.formatter.escapeMarkdown(term)}»`)
    ];
    return parts.length ? `🔎 ${parts.join(' · ')}` : null;
  }

  nothing(intent) {
    return this.t(intent.categories.length || intent.terms.length ? 'ai_nothing_filtered' : 'ai_nothing');
  }

  compose(result) {
    const { intent } = result;
    const lines = this[`compose_${intent.type}`](result).filter(line => line !== null && line !== undefined);
    return { text: lines.join('\n'), keyboard: this.keyboard(result) };
  }

  header(key, result) {
    return `*${this.t(key, { period: this.periodLabel(result.intent.period, result.period) })}*`;
  }

  compose_spend_total(result) {
    const { intent, currency } = result;
    return [
      this.header('ai_title_spent', result),
      this.filterLine(intent),
      result.count ? this.t('ai_spent', { amount: this.money(result.total, currency), count: result.count }) : this.nothing(intent)
    ];
  }

  compose_count_records(result) {
    const { intent, currency } = result;
    return [
      this.header('ai_title_count', result),
      this.filterLine(intent),
      result.count ? this.t('ai_count', { count: result.count, amount: this.money(result.total, currency) }) : this.nothing(intent)
    ];
  }

  compose_spend_by_category(result) {
    const { intent, currency } = result;
    const lines = [this.header('ai_title_categories', result), this.filterLine(intent)];
    if (!result.count) return [...lines, this.nothing(intent)];
    lines.push(this.t('ai_total', { amount: this.money(result.total, currency) }), '');
    for (const category of result.categories.slice(0, MAX_CATEGORY_LINES)) {
      const percent = result.total > 0 ? Math.round(category.total / result.total * 100) : 0;
      lines.push(`${this.categoryLabel(category)} — ${this.money(category.total, currency)} (${percent}%)`);
    }
    if (result.categories.length > MAX_CATEGORY_LINES) {
      lines.push(this.t('ai_more_categories', { count: result.categories.length - MAX_CATEGORY_LINES }));
    }
    return lines;
  }

  expenseLine(row) {
    const description = this.formatter.expenseLabel(row, this.localizationService, this.lang);
    return `*${this.money(row.amount, row.currency)}* — ${description} · ${shortDate(row.local_date)}`;
  }

  compose_top_expenses(result) {
    const { intent } = result;
    const lines = [this.header('ai_title_top', result), this.filterLine(intent)];
    if (!result.items.length) return [...lines, this.nothing(intent)];
    result.items.forEach((row, index) => lines.push(`${index + 1}. ${this.expenseLine(row)}`));
    return lines;
  }

  compose_largest_purchase(result) {
    const { intent } = result;
    const lines = [this.header('ai_title_largest', result), this.filterLine(intent)];
    if (!result.items.length) return [...lines, this.nothing(intent)];
    const row = result.items[0];
    lines.push(this.expenseLine(row));
    if (row.category_name) lines.push(this.categoryLabel({ name: row.category_name, icon: row.category_icon }));
    return lines;
  }

  compose_compare_periods(result) {
    const { intent, currency, current, previous } = result;
    const lines = [`*${this.t('ai_title_compare')}*`, this.filterLine(intent)];
    lines.push(`${this.formatter.formatPeriodRange(current.period)}: *${this.money(current.total, currency)}*`);
    lines.push(`${this.formatter.formatPeriodRange(previous.period)}: *${this.money(previous.total, currency)}*`);
    const diff = current.total - previous.total;
    if (!previous.total) {
      lines.push(this.t(current.total ? 'ai_compare_no_previous' : 'ai_nothing'));
    } else {
      const percent = Math.round(Math.abs(diff) / previous.total * 100);
      if (percent === 0) lines.push(this.t('ai_compare_same'));
      else if (diff > 0) lines.push(this.t('ai_compare_more', { amount: this.money(diff, currency), percent }));
      else lines.push(this.t('ai_compare_less', { amount: this.money(-diff, currency), percent }));
    }
    if (result.toDate) lines.push(`_${this.t('ai_compare_to_date', { days: result.days })}_`);
    return lines;
  }

  compose_average_daily(result) {
    const { intent, currency } = result;
    const lines = [this.header('ai_title_average', result), this.filterLine(intent)];
    if (!result.count) return [...lines, this.nothing(intent)];
    lines.push(this.t('ai_average', {
      amount: this.money(result.average, currency), total: this.money(result.total, currency), days: result.days
    }));
    return lines;
  }

  compose_income_total(result) {
    const { currency } = result;
    const lines = [this.header('ai_title_income', result)];
    if (!result.count) return [...lines, this.t('ai_income_none')];
    lines.push(this.t('ai_income', { amount: this.money(result.total, currency), count: result.count }));
    return lines;
  }

  compose_balance(result) {
    const { currency } = result;
    const lines = [this.header('ai_title_balance', result)];
    if (!result.incomeCount && !result.expenseCount) return [...lines, this.t('ai_nothing_period')];
    lines.push(this.t('ai_balance', {
      income: this.money(result.income, currency),
      expenses: this.money(result.expenses, currency),
      balance: this.money(result.balance, currency)
    }));
    if (!result.incomeCount) lines.push(this.t('ai_balance_no_income'));
    else lines.push(this.t(result.balance >= 0 ? 'ai_comment_plus' : 'ai_comment_minus'));
    return lines;
  }

  compose_savings_status(result) {
    const { currency } = result;
    const lines = [`*${this.t('ai_title_savings')}*`];
    if (result.empty) return [...lines, this.t('ai_savings_empty')];
    lines.push(this.t('ai_total', { amount: this.money(result.total, currency) }));
    if (result.debtTotal > 0) {
      lines.push(this.t('ai_savings_debts', { amount: this.money(result.debtTotal, currency), net: this.money(result.netWorth, currency) }));
    }
    for (const goal of result.goals) {
      lines.push(this.t('ai_savings_goal', {
        name: this.formatter.escapeMarkdown(goal.name),
        percent: Math.min(100, Math.round(goal.ratio * 100)),
        current: this.money(Math.min(goal.current, goal.target), currency),
        target: this.money(goal.target, currency)
      }));
    }
    return lines;
  }

  compose_budget_status(result) {
    const { currency } = result;
    const lines = [this.header('ai_title_budget', result)];
    if (result.locked) return [...lines, this.t('ai_budget_premium', { amount: this.money(result.spent, currency) })];
    if (!result.budgets.length) return [...lines, this.t('ai_budget_none')];
    for (const budget of result.budgets) {
      const mark = budget.ratio > 1 ? '🚨' : budget.ratio >= 0.8 ? '⚠️' : '✅';
      const tail = budget.ratio > 1
        ? this.t('ai_budget_over', { amount: this.money(budget.spent - budget.limit, currency) })
        : this.t('ai_budget_left', { amount: this.money(budget.limit - budget.spent, currency) });
      lines.push(`${mark} ${budget.label}: ${this.money(budget.spent, currency)} / ${this.money(budget.limit, currency)} (${Math.round(budget.ratio * 100)}%) · ${tail}`);
    }
    return lines;
  }

  compose_subscriptions(result) {
    const { currency } = result;
    const lines = [`*${this.t('ai_title_subscriptions')}*`];
    if (!result.count) return [...lines, this.t('ai_subscriptions_none')];
    lines.push(this.t('ai_subscriptions_total', { amount: this.money(result.totalMonthly, currency), count: result.count }), '');
    for (const sub of result.items) {
      lines.push(`• ${this.formatter.escapeMarkdown(sub.label)} — ${this.t('ai_per_month', { amount: this.money(sub.monthly, currency) })}`);
    }
    if (result.hiddenCount) {
      lines.push(this.t('ai_subscriptions_hidden', { count: result.hiddenCount, amount: this.money(result.hiddenMonthly, currency) }));
    }
    return lines;
  }

  compose_debt_status(result) {
    const { currency } = result;
    const lines = [`*${this.t('ai_title_debts')}*`];
    if (!result.debts.length) return [...lines, this.t('ai_debts_none')];
    if (result.debts.length > 1) lines.push(this.t('ai_total', { amount: this.money(result.total, currency) }), '');
    for (const debt of result.debts) {
      const payment = debt.payment ? ` · ${this.t('ai_debt_payment', { amount: this.money(debt.payment, currency) })}` : '';
      lines.push(`💳 ${this.formatter.escapeMarkdown(debt.name)} — *${this.money(debt.amount, currency)}*${payment}`);
    }
    return lines;
  }

  // Кнопка на экран с подробностями, если такой есть, и «🤖 Ещё вопрос»
  keyboard(result) {
    const { intent } = result;
    const spec = intent.period;
    const rows = [];
    const button = (key, callback) => rows.push([{ text: this.t(key), callback_data: callback }]);
    const expenseType = !['income_total', 'balance', 'savings_status', 'budget_status'].includes(intent.type);
    if (intent.type === 'savings_status' || intent.type === 'debt_status') button('ai_button_savings', 'sv');
    else if (intent.type === 'subscriptions') button('ai_button_subscriptions', 'pls');
    else if (intent.type === 'budget_status') {
      if (result.locked) button('button_premium', 'premium_subscription');
      else button('ai_button_budgets', 'bg_menu');
    } else if (intent.type === 'income_total') {
      if (spec.kind === 'month' && spec.offset === 0) button('ai_button_income', 'income_menu');
    } else if (spec && spec.kind === 'month') {
      const single = intent.categories.length === 1 && !intent.terms.length && expenseType ? intent.categories[0].id : null;
      if (single) button('ai_button_category', `oc|${single}|${spec.offset}|0`);
      else button('ai_button_overview', `ov|${spec.offset}`);
    } else if (spec && spec.kind === 'day' && expenseType) {
      button('ai_button_day', `dy|${spec.offset}|0`);
    }
    button('ai_button_more', 'ai');
    return rows;
  }
}

module.exports = { AnswerComposer, shortDate };
