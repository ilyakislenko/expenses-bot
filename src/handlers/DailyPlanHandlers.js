const respond = require('../utils/respond');
const { DAILY_PLAN } = require('../utils/constants');

const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;

// «☀️ План на день» — настройка (dpo, из ⚙️ под планом и с экрана «🔔 Напоминания»): вкл/выкл (dpt), час (dph|<час>),
// «👀 Показать сейчас» (dpn — отдельным сообщением, без отметки «отправлено» и без монет)
class DailyPlanHandlers {
  constructor({ dailyPlanService, userService, localizationService }) {
    this.dailyPlanService = dailyPlanService;
    this.userService = userService;
    this.localizationService = localizationService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  async show(ctx, notice = null) {
    const userId = ctx.from.id;
    const [lang, settings, hasData] = await Promise.all([
      this.userService.getUserLanguage(userId),
      this.dailyPlanService.getSettings(userId),
      this.dailyPlanService.hasData(userId)
    ]);
    if (ctx.callbackQuery) await ctx.answerCbQuery(notice || undefined).catch(() => {});
    const lines = [`☀️ *${this.t(lang, 'dp_settings_title')}*`, '', this.t(lang, 'dp_settings_info'), ''];
    lines.push(settings.enabled ? this.t(lang, 'dp_settings_on', { time: hourLabel(settings.hour) }) : this.t(lang, 'dp_settings_off'));
    if (!hasData) lines.push('', this.t(lang, 'dp_settings_no_data'));

    const hours = DAILY_PLAN.HOURS.map(hour => ({
      text: `${settings.enabled && hour === settings.hour ? '✅' : '☐'} ${hourLabel(hour)}`,
      callback_data: `dph|${hour}`
    }));
    const keyboard = [[{ text: this.t(lang, settings.enabled ? 'dp_button_turn_off' : 'dp_button_turn_on'), callback_data: 'dpt' }]];
    for (let i = 0; i < hours.length; i += 3) keyboard.push(hours.slice(i, i + 3));
    if (hasData) keyboard.push([{ text: this.t(lang, 'dp_button_preview'), callback_data: 'dpn' }]);
    else keyboard.push([{ text: this.t(lang, 'button_add_income'), callback_data: 'income_add' }]);
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: 'configure_reminder_hours' }]);
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  async toggle(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    const enabled = await this.dailyPlanService.toggle(ctx.from.id);
    return this.show(ctx, this.t(lang, enabled ? 'dp_enabled' : 'dp_disabled'));
  }

  async setHour(ctx) {
    const hour = parseInt(ctx.match[1], 10);
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    if (!(await this.dailyPlanService.setHour(ctx.from.id, hour))) return this.show(ctx); // подменённая кнопка
    return this.show(ctx, this.t(lang, 'dp_hour_set', { time: hourLabel(hour) }));
  }

  async preview(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const plan = await this.dailyPlanService.build(userId, lang);
    if (!plan) return ctx.answerCbQuery(this.t(lang, 'dp_no_data_alert'), { show_alert: true }).catch(() => {});
    await ctx.answerCbQuery().catch(() => {});
    await ctx.reply(plan.text, { parse_mode: 'Markdown', reply_markup: this.dailyPlanService.keyboard(lang) });
  }
}

module.exports = DailyPlanHandlers;
