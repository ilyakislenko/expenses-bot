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
  'creating_family_plan',
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
// dt_in: — «✏️ Другая дата» записи, дохода или чека, sub_in: — пробный период (кнопки дат несут id черновика),
// tax_in: — слово для поиска траты в «💡 Верни 13%» (найденные траты — кнопками с id)
const AUTO_RESET_PREFIXES = ['setting_budget:', 'renaming_custom_category:', 'admin_refund_search:', 'editing_income:', 'sv_in:', 'pl_in:', 'sub_in:', 'ai_in:', 'rd_in:', 'dt_in:', 'tax_in:'];

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
      if (command && command !== 'cancel') {
        if (stateService.hasUserState(userId) || stateService.hasUserEditState(userId)) {
          logger.debug('Input state reset by command', { userId, command });
        }
        stateService.clearInputs(userId); // и пометку «ввод устарел»: следующий текст — обычная запись
      }
      // Голосовое — новая запись, а не ответ на подсказку: подсказка снимается, иначе следующий текст ушёл бы
      // в брошенный ввод (доход, правка…). Вопрос о бюджете в опросе ждёт дальше, как и при «250 кофе» текстом
      if ((ctx.message?.voice || ctx.message?.audio) && stateService.getUserState(userId) !== 'onb_budget') {
        stateService.clearInputs(userId);
      }
    }

    // Ответ на опрос квиза (poll_answer) — не кнопка навигации: ожидаемый ввод и правка записи остаются
    if (userId && ctx.updateType !== 'message' && ctx.updateType !== 'poll_answer') {
      stateService.dropExpiredInput(userId);
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
