/**
 * Middleware для автоматической очистки состояний пользователя
 * Сбрасывает состояния при любых callback_query или командах
 */
function stateCleanupMiddleware(handlers) {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    
    if (userId && handlers.stateService.hasUserState(userId)) {
      const userState = handlers.stateService.getUserState(userId);
      
      // Список состояний, которые нужно сбрасывать автоматически
      const autoResetStates = [
        'setting_period_start',
        'adding_custom_category', 
        'entering_donation',
        'bug_report',
        'admin_search',
        'admin_broadcast',
        'creating_family',
        'joining_family',
        'adding_family_expense',
        'adding_personal_expense',
        'inviting_member',
        'adding_income',
        'adding_recurring',
        'adding_recurring_day',
        'export_date_range',
        'onb_budget'
      ];
      // Состояния с параметром после двоеточия (например, setting_budget:<цель>); rd_in: — строка/дата черновика чека,
      // dt_in: — «✏️ Другая дата» записи, дохода или чека
      const autoResetPrefixes = ['setting_budget:', 'renaming_custom_category:', 'admin_refund_search:', 'editing_income:', 'sv_in:', 'pl_in:', 'ai_in:', 'rd_in:', 'dt_in:'];
      // Найденная транзакция для возврата живёт только до кнопки «Вернуть» на её карточке
      const isStaleRefundConfirm = userState?.type === 'admin_refund_confirm'
        && ctx.callbackQuery?.data !== 'panel_refund_exec';
      // Вопрос о бюджете в опросе ждёт сумму и после траты, записанной посреди него («250 кофе» → выбор категории)
      const keepForExpenseCard = userState === 'onb_budget' && /^category\|/.test(ctx.callbackQuery?.data || '');
      const shouldReset = (autoResetStates.includes(userState)
        || (typeof userState === 'string' && autoResetPrefixes.some(prefix => userState.startsWith(prefix)))
        || isStaleRefundConfirm) && !keepForExpenseCard;

      // Сбрасываем состояния при любых действиях пользователя (кроме текстовых сообщений)
      if (shouldReset && ctx.updateType !== 'message') {
        console.log(`🔄 Автоматически сбрасываем состояние ${userState} для пользователя ${userId} при действии: ${ctx.updateType}`);
        handlers.stateService.deleteUserState(userId);
      }
    }
    
    await next();
  };
}

module.exports = stateCleanupMiddleware;
