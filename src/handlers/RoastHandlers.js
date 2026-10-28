const respond = require('../utils/respond');
const ReferralService = require('../services/ReferralService');
const { SAVAGE_LANGUAGES } = require('../utils/roast');

const ORIGINS = { s: 'settings', m: 'month' };
const BACK = { s: 'rst', m: 'rsm' };

// «😈 Злой режим»: экран настройки (⚙️ Настройки → «😈 Злой режим», `rst`), пол для согласования фраз, 18+ для
// уровня «без цензуры» и «Разнос месяца» (`/roast`, `rsm`). origin в callback_data — куда вернуться после выбора:
// `s` — экран настройки, `m` — «Разнос месяца», `o` — опрос «🧭 Настроим бота под тебя» (registerOrigin).
class RoastHandlers {
  constructor({ roastService, userService, localizationService }) {
    this.roastService = roastService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.extraOrigins = {};
  }

  // Другой экран, который переиспользует выбор уровня, пол и 18+: show(ctx, notice) после сохранения уровня, back — «Назад»
  registerOrigin(code, { show, back }) {
    this.extraOrigins[code] = { show, back };
  }

  backFor(origin) {
    return (this.extraOrigins[origin] && this.extraOrigins[origin].back) || BACK[origin] || 'rst';
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  levelLabel(lang, level) {
    return this.t(lang, `roast_level_${level}`);
  }

  genderLabel(lang, gender) {
    return this.t(lang, gender ? `roast_gender_${gender}` : 'roast_gender_unset');
  }

  async answer(ctx, text) {
    if (ctx.callbackQuery) await ctx.answerCbQuery(text).catch(() => {});
  }

  // callback: rst — уровень (текущий отмечен ✅), обращение, «Разнос месяца», «Назад» в настройки.
  // «Без цензуры» — только на ru/en: на других языках кнопки нет, а сохранённый savage показан и работает как ехидный.
  // enabled — режим только что включили: пример подколки и когда она приходит (до первого повода режим молчит)
  async showSettings(ctx, { notice = null, enabled = false } = {}) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx, notice);
    const settings = await this.roastService.getSettings(userId);
    const savageLanguage = SAVAGE_LANGUAGES.includes(lang);
    const level = !savageLanguage && settings.level === 'savage' ? 'spicy' : settings.level;
    const levels = savageLanguage
      ? this.t(lang, 'roast_settings_levels')
      : `${this.t(lang, 'roast_settings_levels').split('\n')[0]}\n${this.t(lang, 'roast_savage_unavailable')}`;
    const lines = [
      `😈 *${this.t(lang, 'roast_settings_title')}*`,
      '',
      this.t(lang, 'roast_settings_intro'),
      '',
      levels,
      '',
      this.t(lang, 'roast_settings_current', { level: this.levelLabel(lang, level) }),
      this.t(lang, 'roast_settings_gender', { gender: this.genderLabel(lang, settings.gender) })
    ];
    if (enabled && level !== 'off') {
      const sample = this.roastService.sampleLine(lang, level, settings.gender, await this.userService.getUserCurrency(userId));
      if (sample) lines.push('', this.t(lang, 'roast_enabled_sample', { sample }));
      lines.push('', this.t(lang, 'roast_enabled_when'));
    }
    const levelButton = (code) => ({
      text: `${level === code ? '✅ ' : ''}${this.levelLabel(lang, code)}`,
      callback_data: `rstl|${code}|s`
    });
    const levelRows = [[levelButton('off'), levelButton('spicy')]];
    if (savageLanguage) levelRows.push([levelButton('savage')]);
    await respond(ctx, lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          ...levelRows,
          [{ text: this.t(lang, 'button_roast_gender', { gender: this.genderLabel(lang, settings.gender) }), callback_data: 'rstg|s' }],
          [{ text: this.t(lang, 'button_roast_month'), callback_data: 'rsm' }],
          [{ text: this.t(lang, 'button_back'), callback_data: 'back_to_settings' }]
        ]
      }
    });
  }

  // Куда вернуться после выбора
  async showOrigin(ctx, origin, notice = null, { enabled = false } = {}) {
    if (this.extraOrigins[origin]) return this.extraOrigins[origin].show(ctx, notice);
    if (ORIGINS[origin] === 'month') {
      await this.answer(ctx, notice);
      return this.showMonth(ctx);
    }
    return this.showSettings(ctx, { notice, enabled });
  }

  // callback: rstl|<off|spicy|savage>|<s|m|o>. Не off: сначала пол (если не указан), для savage — право на него
  // (USER_LIMITS.*.ROAST_SAVAGE) и разовое подтверждение 18+
  async chooseLevel(ctx) {
    const [, level, origin] = ctx.match;
    return this.applyLevel(ctx, level, origin);
  }

  async applyLevel(ctx, level, origin) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    // Старая кнопка «без цензуры» на языке, где его нет, — ехидный
    if (level === 'savage' && !SAVAGE_LANGUAGES.includes(lang)) level = 'spicy';
    const settings = await this.roastService.getSettings(userId);
    if (level !== 'off') {
      if (!settings.gender) return this.showGender(ctx, { level, origin });
      if (level === 'savage') {
        if (!(await this.roastService.savageAllowed(userId))) return this.showSavageLocked(ctx, lang, origin);
        if (!settings.adultConfirmed) return this.showAdult(ctx, lang, origin);
      }
    }
    await this.roastService.setLevel(userId, level);
    const enabled = level !== 'off' && level !== settings.level;
    return this.showOrigin(ctx, origin, this.t(lang, 'roast_saved', { level: this.levelLabel(lang, level) }), { enabled });
  }

  // callback: rstg|<s|m|o> — сменить обращение; при включении режима без пола — то же с уровнем, к которому идём
  async showGender(ctx, { level = '-', origin = 's' } = {}) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const button = (gender) => ({ text: this.t(lang, `roast_gender_${gender}`), callback_data: `rstgs|${gender}|${level}|${origin}` });
    await respond(ctx, `${this.t(lang, 'roast_gender_title')}\n\n${this.t(lang, 'roast_gender_hint')}`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [button('m'), button('f')],
          [button('x')],
          [{ text: this.t(lang, 'button_back'), callback_data: this.backFor(origin) }]
        ]
      }
    });
  }

  // callback: rstgs|<m|f|x>|<уровень или ->|<s|m|o>
  async setGender(ctx) {
    const [, gender, level, origin] = ctx.match;
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.roastService.setGender(userId, gender);
    if (level !== '-') return this.applyLevel(ctx, level, origin);
    return this.showOrigin(ctx, origin, this.t(lang, 'roast_gender_saved', { gender: this.genderLabel(lang, gender) }));
  }

  showAdult(ctx, lang, origin) {
    return this.answer(ctx).then(() => respond(ctx, `${this.t(lang, 'roast_adult_title')}\n\n${this.t(lang, 'roast_adult_text')}`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: this.t(lang, 'button_roast_adult_yes'), callback_data: `rsty|${origin}` }],
          [{ text: this.t(lang, 'button_roast_adult_no'), callback_data: `rstl|spicy|${origin}` }]
        ]
      }
    }));
  }

  // Без цензуры только с премиумом (если владелец так настроил USER_LIMITS)
  showSavageLocked(ctx, lang, origin) {
    return this.answer(ctx).then(() => respond(ctx, this.t(lang, 'roast_savage_premium'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }],
          [{ text: this.levelLabel(lang, 'spicy'), callback_data: `rstl|spicy|${origin}` }],
          [{ text: this.t(lang, 'button_back'), callback_data: this.backFor(origin) }]
        ]
      }
    }));
  }

  // callback: rsty|<s|m|o> — «Мне есть 18»: подтверждение запоминается, уровень — без цензуры
  async confirmAdult(ctx) {
    const origin = ctx.match[1];
    const userId = ctx.from.id;
    await this.roastService.confirmAdult(userId);
    return this.applyLevel(ctx, 'savage', origin);
  }

  // /roast, callback rsm — «Разнос месяца» на уровне пользователя; выключен — ехидный предпросмотр и кнопки включить
  async showMonth(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const settings = await this.roastService.getSettings(userId);
    const enabled = settings.level !== 'off';
    const level = enabled ? await this.roastService.effectiveLevel(userId, settings.level, lang) : 'spicy';
    const roast = await this.roastService.monthRoast(userId, lang, { level, gender: settings.gender || 'x' });

    let text = roast.text;
    if (!enabled) text += `\n\n${this.t(lang, 'roast_month_preview_note')}`;
    const keyboard = [];
    if (!enabled) {
      const row = [{ text: this.t(lang, 'button_roast_enable_spicy'), callback_data: 'rstl|spicy|m' }];
      if (SAVAGE_LANGUAGES.includes(lang)) row.push({ text: this.t(lang, 'button_roast_enable_savage'), callback_data: 'rstl|savage|m' });
      keyboard.push(row);
    }
    if (roast.hasData && ctx.botInfo && ctx.botInfo.username) {
      const link = `https://t.me/${ctx.botInfo.username}?start=roast`;
      const shareText = `${this.t(lang, 'roast_share_header')}\n\n${roast.shareText}`;
      keyboard.push([{ text: this.t(lang, 'button_roast_share'), url: ReferralService.shareUrl(link, shareText) }]);
    }
    keyboard.push([{ text: this.t(lang, 'button_roast_settings'), callback_data: 'rst' }]);
    await respond(ctx, text, { parse_mode: 'Markdown', disable_web_page_preview: true, reply_markup: { inline_keyboard: keyboard } });
  }
}

module.exports = RoastHandlers;
