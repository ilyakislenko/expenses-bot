const logger = require('../utils/logger');

// Пометка «заблокировал бота» (users.blocked_at, ставит NotificationService на 403) снимается, как только
// пользователь снова что-то делает в личке: сообщение, кнопка, /start, разблокировка (my_chat_member member).
// my_chat_member kicked — заблокировал: помечаем сразу, не дожидаясь 403 от рассылки. Этот апдейт тоже приходит
// от пользователя, поэтому «снова пишет» он не означает. Группы не в счёт: из группы бот в личку всё равно не напишет.
// В БД ходит только первый апдейт пользователя за жизнь процесса и первый после пометки (UserService.markReachable).
module.exports = function reachabilityMiddleware(userService) {
  return async (ctx, next) => {
    const from = ctx.from;
    if (from && !from.is_bot && ctx.chat && ctx.chat.type === 'private') {
      const status = ctx.myChatMember && ctx.myChatMember.new_chat_member && ctx.myChatMember.new_chat_member.status;
      try {
        if (status === 'kicked') await userService.markUnreachable(from.id);
        else await userService.markReachable(from.id);
      } catch (error) {
        logger.warn('Reachability update failed', { userId: from.id, error: error.message });
      }
    }
    return next();
  };
};
