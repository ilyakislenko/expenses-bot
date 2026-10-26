// Навигация одним сообщением: из callback — редактируем сообщение с кнопкой, из текста/команды — отправляем новое.
// Если отредактировать нельзя (например, это документ или сообщение удалено) — отправляем новое.
async function respond(ctx, text, extra = {}) {
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch (error) {
      const description = String(error.description || (error.response && error.response.description) || error.message);
      if (description.includes('message is not modified')) return;
    }
  }
  await ctx.reply(text, extra);
}

module.exports = respond;
