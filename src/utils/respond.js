// Навигация одним сообщением: из callback — редактируем сообщение с кнопкой, из текста/команды — отправляем новое.
// Если отредактировать нельзя (например, это документ или сообщение удалено) — отправляем новое.
// Обзор месяца и графики — картинки (respondPhoto): текст из них не отредактировать, поэтому новое сообщение, а старая
// картинка-экран удаляется, чтобы переход «обзор → категория» не оставлял её в чате
const SCREEN_PHOTO_CALLBACK = /^(ov|fov|chp|cht|chc)\|/;

function isScreenPhoto(message) {
  if (!message || !message.photo) return false;
  const rows = (message.reply_markup && message.reply_markup.inline_keyboard) || [];
  return rows.some(row => row.some(button => SCREEN_PHOTO_CALLBACK.test(button.callback_data || '')));
}

async function respond(ctx, text, extra = {}) {
  const message = ctx.callbackQuery && ctx.callbackQuery.message;
  if (message && !message.photo) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch (error) {
      const description = String(error.description || (error.response && error.response.description) || error.message);
      if (description.includes('message is not modified')) return;
    }
  }
  await ctx.reply(text, extra);
  if (isScreenPhoto(message)) await ctx.deleteMessage(message.message_id).catch(() => {});
}

respond.isScreenPhoto = isScreenPhoto;
module.exports = respond;
