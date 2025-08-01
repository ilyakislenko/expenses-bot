module.exports = (handler) => async (ctx, next) => {
  try {
    await handler(ctx, next);
  } catch (err) {
    console.error('Bot error:', err);
    if (ctx.reply) {
      // Получаем язык пользователя для локализации ошибки
      let userLanguage = 'en'; // fallback
      try {
        if (ctx.from?.id) {
          const { userService, localizationService } = require('../container');
          userLanguage = await userService.getUserLanguage(ctx.from.id);
          const errorText = localizationService.getText(userLanguage, 'error_generic');
          await ctx.reply(errorText);
        } else {
          await ctx.reply('An error occurred. Please try again later.');
        }
      } catch (localizationError) {
        console.error('Localization error:', localizationError);
        await ctx.reply('An error occurred. Please try again later.');
      }
    }
  }
}; 