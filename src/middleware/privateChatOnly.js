// Бот работает только в личных чатах: все данные — личные финансы того, кто пишет. В группах любой участник
// увидел бы чужие траты, а анонимные админы всех групп Telegram приходят под одним id (@GroupAnonymousBot) и
// делили бы один аккаунт. Поэтому апдейты из групп, супергрупп и каналов не обрабатываются: в группе бот
// один раз отвечает «пишите мне в личку» и выходит из неё; посты каналов и служебные отправители — тишина.
const logger = require('../utils/logger');

const GROUP_ANONYMOUS_BOT_ID = 1087968824; // анонимный админ группы
const TELEGRAM_SERVICE_ID = 777000; // уведомления Telegram, пересылки из привязанного канала
const SERVICE_SENDER_IDS = new Set([GROUP_ANONYMOUS_BOT_ID, TELEGRAM_SERVICE_ID]);
const HINT_INTERVAL_MS = 60 * 60 * 1000; // подсказка в одну группу — не чаще раза в час
const MAX_HINTED_CHATS = 10000;

const GROUP_TYPES = new Set(['group', 'supergroup']);
const JOINED_STATUSES = new Set(['member', 'administrator']);

// Сообщение от имени канала или группы (анонимный админ, привязанный канал) — у него sender_chat
function senderChatOf(ctx) {
  return ctx.message?.sender_chat || ctx.editedMessage?.sender_chat || null;
}

function privateChatOnly({ localizationService } = {}) {
  const hintedAt = new Map(); // chatId → время последней подсказки

  const shouldHint = (chatId) => {
    const now = Date.now();
    const last = hintedAt.get(chatId);
    if (last && now - last < HINT_INTERVAL_MS) return false;
    if (hintedAt.size >= MAX_HINTED_CHATS) {
      for (const [id, time] of hintedAt) if (now - time >= HINT_INTERVAL_MS) hintedAt.delete(id);
      if (hintedAt.size >= MAX_HINTED_CHATS) hintedAt.clear();
    }
    hintedAt.set(chatId, now);
    return true;
  };

  const hintText = (ctx) => {
    if (!localizationService) return null;
    const lang = localizationService.resolveTelegramLanguage(ctx.from?.language_code) || localizationService.getDefaultLanguage();
    const username = ctx.botInfo?.username;
    return localizationService.getText(lang, 'private_chat_only', { link: username ? `https://t.me/${username}` : '' }).trim();
  };

  // Что-то, обращённое к боту: команда, нажатие кнопки, бота добавили в группу
  const addressedToBot = (ctx) => {
    if (ctx.callbackQuery) return true;
    if (ctx.myChatMember) return JOINED_STATUSES.has(ctx.myChatMember.new_chat_member?.status);
    const text = ctx.message?.text || '';
    return text.startsWith('/') || Boolean(ctx.message?.reply_to_message?.from?.id && ctx.message.reply_to_message.from.id === ctx.botInfo?.id);
  };

  return async (ctx, next) => {
    // Служебные отправители и сообщения от имени канала/группы — не человек с личным аккаунтом
    if (SERVICE_SENDER_IDS.has(ctx.from?.id) || senderChatOf(ctx)) return undefined;

    const chat = ctx.chat;
    // Апдейты без чата (pre_checkout_query, inline) и личные чаты — дальше как обычно
    if (!chat || chat.type === 'private') return next();

    if (!GROUP_TYPES.has(chat.type)) return undefined; // каналы: молча

    if (ctx.callbackQuery) {
      // Кнопка под старым сообщением в группе: ответ видит только нажавший, сообщение не меняется
      const text = hintText(ctx);
      await ctx.answerCbQuery(text || undefined, text ? { show_alert: true } : undefined).catch(() => {});
      return undefined;
    }
    if (!addressedToBot(ctx) || !shouldHint(chat.id)) return undefined;

    logger.info('Group chat update ignored, leaving the chat', { chatId: chat.id, chatType: chat.type, updateType: ctx.updateType });
    const text = hintText(ctx);
    if (text) await ctx.telegram.sendMessage(chat.id, text, { disable_web_page_preview: true }).catch(() => {});
    await ctx.telegram.leaveChat(chat.id).catch(() => {});
    return undefined;
  };
}

module.exports = privateChatOnly;
module.exports.SERVICE_SENDER_IDS = SERVICE_SENDER_IDS;
