const respond = require('../utils/respond');
const ReferralService = require('../services/ReferralService');

// «🎁 Пригласить друга» (`ref`, /invite): личная ссылка, текст для пересылки, кнопка «Поделиться», статистика
class ReferralHandlers {
  constructor({ referralService, userService, localizationService }) {
    this.referralService = referralService;
    this.userService = userService;
    this.localizationService = localizationService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  async inviteContext(ctx) {
    const userId = ctx.from.id;
    const [lang, code] = await Promise.all([
      this.userService.getUserLanguage(userId),
      this.referralService.getOrCreateCode(userId)
    ]);
    const link = ReferralService.inviteLink(ctx.botInfo.username, code);
    const days = this.referralService.rewardDays;
    return { userId, lang, link, days };
  }

  // callback: ref, команда /invite
  async showInvite(ctx) {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const { userId, lang, link, days } = await this.inviteContext(ctx);
    const stats = await this.referralService.getStats(userId);
    const expenses = this.referralService.config.ACTIVATION_EXPENSES;

    const lines = [
      this.t(lang, 'referral_title'),
      '',
      this.t(lang, 'referral_intro', { days, expenses }),
      '',
      this.t(lang, 'referral_link_label'),
      `\`${link}\``,
      '',
      this.t(lang, 'referral_stats', { invited: stats.invited, activated: stats.activated }),
      this.t(lang, 'referral_stats_days', { days: stats.days, max: stats.maxDays })
    ];
    if (stats.capped) lines.push('', this.t(lang, 'referral_capped_note', { max: stats.maxDays, days }));

    const shareText = this.t(lang, 'referral_share_text', { days });
    await respond(ctx, lines.join('\n'), {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [{ text: this.t(lang, 'referral_button_share'), url: ReferralService.shareUrl(link, shareText) }],
          [{ text: this.t(lang, 'referral_button_text'), callback_data: 'ref_text' }],
          [{ text: this.t(lang, 'button_back'), callback_data: 'back_to_menu' }]
        ]
      }
    });
  }

  // callback: ref_text — отдельное сообщение без разметки, чтобы его можно было переслать другу как есть
  async sendForwardText(ctx) {
    await ctx.answerCbQuery().catch(() => {});
    const { lang, link, days } = await this.inviteContext(ctx);
    await ctx.reply(`${this.t(lang, 'referral_share_text', { days })}\n\n${link}`, { disable_web_page_preview: true });
  }
}

module.exports = ReferralHandlers;
