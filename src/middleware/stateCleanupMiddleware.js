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
        'inviting_member',
        'adding_income',
        'adding_recurring',
        'adding_recurring_day'
      ];
      // Состояния с параметром после двоеточия (например, setting_budget:<цель>)
      const autoResetPrefixes = ['setting_budget:'];
      const shouldReset = autoResetStates.includes(userState)
        || (typeof userState === 'string' && autoResetPrefixes.some(prefix => userState.startsWith(prefix)));

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
