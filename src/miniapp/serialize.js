// Общие формы данных API Mini App — одна запись выглядит одинаково на всех экранах (клиент: ui.expenseRow).

// Локальная дата 'YYYY-MM-DD' момента в поясе пользователя
function localDate(at, timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at));
}

// Название категории на языке пользователя (системные переводятся, свои — как есть)
function categoryLabel(name, ctx, get) {
  if (!name) return null;
  return get('formatter').translateCategoryName(name, get('localizationService'), ctx.lang);
}

// Трата: строка из ExpenseRepository (e.*, category_name, category_icon, username, first_name) →
// { id, amount, currency, description, category: { id, name, label, icon } | null, createdAt (ISO UTC), date (локальная),
//   author: { id, name } | null (не сам пользователь), family, recurring, receiptId, imported, mine }
function expense(row, ctx, get) {
  const userId = Number(row.user_id);
  const mine = userId === ctx.userId;
  return {
    id: Number(row.id),
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description || null,
    category: row.category_name ? { id: row.category_id === null || row.category_id === undefined ? null : Number(row.category_id), name: row.category_name, label: categoryLabel(row.category_name, ctx, get), icon: row.category_icon || '📦' } : null,
    createdAt: new Date(row.created_at_utc).toISOString(),
    date: localDate(row.created_at_utc, ctx.timezone),
    author: mine ? null : { id: userId, name: row.first_name || row.username || '' },
    family: row.family_id !== null && row.family_id !== undefined,
    recurring: row.recurring_expense_id !== null && row.recurring_expense_id !== undefined,
    receiptId: row.receipt_id ? Number(row.receipt_id) : null,
    imported: row.import_id !== null && row.import_id !== undefined,
    mine
  };
}

module.exports = { expense, categoryLabel, localDate };
