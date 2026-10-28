const logger = require('../utils/logger');

// Состояния, которые сбрасывает любая inline-кнопка
const AUTO_RESET_STATES = [
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
const AUTO_RESET_PREFIXES = ['setting_budget:', 'renaming_custom_category:', 'admin_refund_search:', 'editing_income:', 'sv_in:', 'pl_in:', 'ai_in:', 'rd_in:', 'dt_in:'];

// Команда в начале сообщения: имя без «/» и «@бот» (null — не команда)
function commandName(message) {
  const entity = message?.entities?.[0];
  if (!entity || entity.type !== 'bot_command' || entity.offset !== 0) return null;
  return message.text.slice(1, entity.length).split('@')[0].toLowerCase();
}

/**
 * Middleware для автоматической очистки состояний пользователя.
 * Ждёт загрузки сохранённых состояний (StateService.hydrate) и сбрасывает ожидаемый ввод:
 * - любая команда, кроме /cancel (она сама сообщает, что отменила), — ожидаемый текст и правку записи;
 * - inline-кнопка — ожидаемый текст из списка выше и правку записи (кроме «Отмена» самой правки).
 * Черновики на карточках выбора категории не трогаются.
 */
function stateCleanupMiddleware(handlers) {
  return async (ctx, next) => {
    const { stateService } = handlers;
    if (stateService.ready) await stateService.ready;
    const userId = ctx.from?.id;

    if (userId && ctx.updateType === 'message') {
      const command = commandName(ctx.message);
      if (command && command !== 'cancel' && (stateService.hasUserState(userId) || stateService.hasUserEditState(userId))) {
        logger.debug('Input state reset by command', { userId, command });
        stateService.clearInputs(userId);
      }
    }

    if (userId && ctx.updateType !== 'message') {
      if (ctx.callbackQuery?.data !== 'cancel_edit') stateService.deleteUserEditState(userId);

      if (stateService.hasUserState(userId)) {
        const userState = stateService.getUserState(userId);
        // Найденная транзакция для возврата живёт только до кнопки «Вернуть» на её карточке
        const isStaleRefundConfirm = userState?.type === 'admin_refund_confirm'
          && ctx.callbackQuery?.data !== 'panel_refund_exec';
        // Вопрос о бюджете в опросе ждёт сумму и после траты, записанной посреди него («250 кофе» → выбор категории)
        const keepForExpenseCard = userState === 'onb_budget' && /^category\|/.test(ctx.callbackQuery?.data || '');
        const shouldReset = (AUTO_RESET_STATES.includes(userState)
          || (typeof userState === 'string' && AUTO_RESET_PREFIXES.some(prefix => userState.startsWith(prefix)))
          || isStaleRefundConfirm) && !keepForExpenseCard;

        if (shouldReset) {
          logger.debug('Input state reset by button', { userId, state: typeof userState === 'string' ? userState : userState?.type, updateType: ctx.updateType });
          stateService.deleteUserState(userId);
        }
      }
    }

    await next();
  };
}

module.exports = stateCleanupMiddleware;
