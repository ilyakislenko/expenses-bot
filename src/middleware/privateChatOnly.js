// Личные финансы — только в личных чатах: в группе любой участник увидел бы чужие траты, а анонимные админы всех групп
// Telegram приходят под одним id (@GroupAnonymousBot) и делили бы один аккаунт. Поэтому:
// - служебные отправители (анонимный админ, Telegram 777000) и сообщения от имени канала/группы (sender_chat) —
//   не человек с личным аккаунтом: тишина (кроме апдейта «бота добавили/удалили» — его обрабатывает групповой режим);
// - каналы — тишина;
// - группы и супергруппы помечаются ctx.state.groupChat: их обрабатывает только групповой режим (GroupHandlers,
//   общие расходы чата), личные обработчики их не получают никогда (botRoutes отсекает их сразу после него).
const GROUP_ANONYMOUS_BOT_ID = 1087968824; // анонимный админ группы
const TELEGRAM_SERVICE_ID = 777000; // уведомления Telegram, пересылки из привязанного канала
const SERVICE_SENDER_IDS = new Set([GROUP_ANONYMOUS_BOT_ID, TELEGRAM_SERVICE_ID]);

const GROUP_TYPES = new Set(['group', 'supergroup']);

// Сообщение от имени канала или группы (анонимный админ, привязанный канал) — у него sender_chat
function senderChatOf(ctx) {
  return ctx.message?.sender_chat || ctx.editedMessage?.sender_chat || null;
}

function privateChatOnly() {
  return async (ctx, next) => {
    const chat = ctx.chat;
    const groupChat = Boolean(chat && GROUP_TYPES.has(chat.type));
    // «Бота добавили в группу» анонимный админ тоже может — знакомство в чате нужно и тогда
    const membership = groupChat && Boolean(ctx.myChatMember);
    if (!membership && (SERVICE_SENDER_IDS.has(ctx.from?.id) || senderChatOf(ctx))) return undefined;

    // Апдейты без чата (pre_checkout_query, inline) и личные чаты — дальше как обычно
    if (!chat || chat.type === 'private') return next();

    if (!groupChat) return undefined; // каналы: молча

    // Платёж (успешный или возврат) нельзя терять, даже если Telegram прислал его в группу: обычные платёжные обработчики
    if (ctx.message?.successful_payment || ctx.message?.refunded_payment) return next();

    ctx.state.groupChat = true;
    return next();
  };
}

module.exports = privateChatOnly;
module.exports.SERVICE_SENDER_IDS = SERVICE_SENDER_IDS;
module.exports.GROUP_TYPES = GROUP_TYPES;
