// Картинка вместо экрана: кнопка под картинкой меняет картинку в том же сообщении (editMessageMedia),
// кнопка под текстом или команда — новое сообщение с картинкой. PNG — Buffer в памяти, на диск не пишется.
async function respondPhoto(ctx, png, { caption, parse_mode: parseMode, reply_markup: replyMarkup } = {}) {
  const media = { source: png, filename: 'chart.png' };
  const message = ctx.callbackQuery && ctx.callbackQuery.message;
  if (message && message.photo) {
    try {
      await ctx.editMessageMedia({ type: 'photo', media, caption, parse_mode: parseMode }, { reply_markup: replyMarkup });
      return;
    } catch (error) {
      const description = String(error.description || (error.response && error.response.description) || error.message);
      if (description.includes('message is not modified')) return;
    }
  }
  await ctx.replyWithPhoto(media, { caption, parse_mode: parseMode, reply_markup: replyMarkup });
}

module.exports = respondPhoto;
