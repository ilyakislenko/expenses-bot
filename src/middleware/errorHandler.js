module.exports = (handler) => async (ctx, next) => {
  try {
    await handler(ctx, next);
  } catch (err) {
    console.error('Bot error:', err);
    if (ctx.reply) {
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }
}; 