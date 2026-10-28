const crypto = require('crypto');
const logger = require('../utils/logger');
const { REFERRAL } = require('../utils/constants');

// Код ссылки: строчные буквы и цифры без похожих (0/o, 1/l/i) — легко продиктовать
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const CODE_LENGTH = 7;
const CODE_ATTEMPTS = 5;
// start-параметр приглашения: ref_<код>
const START_PATTERN = /^ref_([a-z0-9]{4,16})$/i;

function generateCode(randomInt = crypto.randomInt) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

// Сколько всего дней пригласивший может заработать при текущих лимитах
function maxInviterDays(config = REFERRAL) {
  return Math.min(config.MAX_REWARDED_INVITES * config.REWARD_DAYS, config.MAX_BONUS_DAYS);
}

// Дни пригласившему за очередного друга: rewarded — уже награждённых приглашений, days — уже выданных дней
function inviterBonusDays({ rewarded, days }, config = REFERRAL) {
  if (rewarded >= config.MAX_REWARDED_INVITES) return 0;
  return Math.max(0, Math.min(config.REWARD_DAYS, config.MAX_BONUS_DAYS - days));
}

class ReferralService {
  constructor({ referralRepository, userService, notificationService, localizationService, formatter, config = REFERRAL }) {
    this.referralRepository = referralRepository;
    this.userService = userService;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.config = config;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // "ref_k3m9x2p" → "k3m9x2p"; другой start-параметр (рекламный код) → null
  static parseStartCode(payload) {
    const match = START_PATTERN.exec(String(payload || ''));
    return match ? match[1].toLowerCase() : null;
  }

  static inviteLink(botUsername, code) {
    return `https://t.me/${botUsername}?start=ref_${code}`;
  }

  static shareUrl(link, text) {
    return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  }

  get rewardDays() {
    return this.config.REWARD_DAYS;
  }

  get maxInviterDays() {
    return maxInviterDays(this.config);
  }

  // Код создаётся при первом обращении; при совпадении с чужим кодом — новая попытка
  async getOrCreateCode(userId) {
    const existing = await this.referralRepository.getCode(userId);
    if (existing) return existing;
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const inserted = await this.referralRepository.insertCode(userId, generateCode());
      if (inserted) return inserted;
      // Код занят другим пользователем или параллельный вызов уже создал код этому
      const created = await this.referralRepository.getCode(userId);
      if (created) return created;
    }
    throw new Error('Failed to generate referral code');
  }

  // Привязка нового пользователя к пригласившему. Только для только что созданного пользователя (isNew),
  // не к самому себе и не повторно. Возвращает { status: 'attributed', inviterId } или { status: 'ignored', reason }.
  async attribute(inviteeId, code, { isNew }) {
    if (!code) return { status: 'ignored', reason: 'no_code' };
    if (!isNew) return { status: 'ignored', reason: 'not_new' };
    const inviterId = await this.referralRepository.findUserIdByCode(code);
    if (!inviterId) return { status: 'ignored', reason: 'unknown_code' };
    if (inviterId === Number(inviteeId)) return { status: 'ignored', reason: 'self' };
    if (!(await this.referralRepository.createReferral(inviteeId, inviterId))) return { status: 'ignored', reason: 'already' };
    logger.info('Referral attributed', { inviteeId, inviterId });
    return { status: 'attributed', inviterId };
  }

  // Пригласившему: друг пришёл по ссылке. Ошибка отправки (бот заблокирован) не мешает регистрации
  async notifyJoined(inviterId, invitee) {
    try {
      const lang = await this.userService.getUserLanguage(inviterId);
      await this.notificationService.sendMessage(inviterId, this.t(lang, 'referral_joined_notification', {
        name: this.displayName(invitee, lang),
        expenses: this.config.ACTIVATION_EXPENSES,
        activeDays: this.config.ACTIVATION_DAYS,
        days: this.config.REWARD_DAYS
      }), { parse_mode: 'Markdown' });
    } catch (error) {
      logger.warn('Failed to notify inviter about joined friend', { inviterId, error: error.message });
    }
  }

  displayName(user, lang) {
    const name = (user && (user.first_name || (user.username && `@${user.username}`))) || this.t(lang, 'referral_friend_fallback');
    return this.formatter.escapeMarkdown(String(name).slice(0, 64));
  }

  async getPendingInviter(inviteeId) {
    return this.referralRepository.getPendingInviter(inviteeId);
  }

  // После каждой записанной траты: когда у приглашённого ACTIVATION_EXPENSES засчитываемых трат хотя бы в
  // ACTIVATION_DAYS разных днях — награда обоим (три траты одним сообщением и сразу /undo не дают бонус).
  // Вызывается без await из записи траты, поэтому никогда не бросает. Возвращает выданную награду или null.
  async onExpenseRecorded(userId) {
    try {
      if (!(await this.referralRepository.getPendingInviter(userId))) return null;
      const { count, days } = await this.referralRepository.countQualifyingExpenses(userId);
      if (count < this.config.ACTIVATION_EXPENSES || days < this.config.ACTIVATION_DAYS) return null;
      const claim = await this.referralRepository.claimReward(userId, this.config.REWARD_DAYS,
        (stats) => inviterBonusDays(stats, this.config));
      if (!claim) return null;
      logger.info('Referral reward claimed', { inviteeId: userId, ...claim });

      const inviteeGrant = await this.grant(userId, claim.inviteeDays, 'invitee', claim.inviterId);
      const inviterGrant = claim.inviterDays > 0 ? await this.grant(claim.inviterId, claim.inviterDays, 'inviter', userId) : null;
      await this.notifyRewarded(userId, claim, inviteeGrant, inviterGrant);
      return { ...claim, inviteeExpiresAt: inviteeGrant && inviteeGrant.newExpiryDate, inviterExpiresAt: inviterGrant && inviterGrant.newExpiryDate };
    } catch (error) {
      logger.error('Referral reward failed', { userId, error: error.message });
      return null;
    }
  }

  // Премиум продлевается как при выдаче админом: к действующему (в том числе пробному) сроку, истёкший — от сейчас.
  // Транзакция без оплаты (stars 0, без telegram_payment_id): источник премиума — «выдан», возвраты её не трогают.
  async grant(userId, days, role, otherUserId) {
    try {
      return await this.userService.activatePremium(userId, days, {
        stars: 0,
        usd: 0,
        rub: 0,
        telegram_payment_id: null,
        invoice_payload: JSON.stringify({ type: 'referral', role, user_id: userId, other_user_id: otherUserId, tariff: days, stars: 0 })
      });
    } catch (error) {
      logger.error('Failed to grant referral premium', { userId, days, role, error: error.message });
      return null;
    }
  }

  async notifyRewarded(inviteeId, claim, inviteeGrant, inviterGrant) {
    const send = async (userId, build) => {
      try {
        const [lang, timezone] = await Promise.all([this.userService.getUserLanguage(userId), this.userService.getUserTimezone(userId)]);
        const { text, keyboard } = build(lang, timezone);
        await this.notificationService.sendMessage(userId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
      } catch (error) {
        logger.warn('Failed to send referral reward notification', { userId, error: error.message });
      }
    };
    const date = (grant, timezone) => this.formatter.escapeMarkdown(this.formatter.formatDate(grant.newExpiryDate, timezone));

    if (inviteeGrant) {
      await send(inviteeId, (lang, timezone) => ({
        text: this.t(lang, 'referral_reward_invitee', { days: claim.inviteeDays, expenses: this.config.ACTIVATION_EXPENSES, date: date(inviteeGrant, timezone) }),
        keyboard: [[{ text: this.t(lang, 'button_invite'), callback_data: 'ref' }]]
      }));
    }
    const invitee = await this.userService.getUserById(inviteeId).catch(() => null);
    await send(claim.inviterId, (lang, timezone) => {
      const name = this.displayName(invitee, lang);
      const text = inviterGrant
        ? this.t(lang, 'referral_reward_inviter', { name, days: claim.inviterDays, date: date(inviterGrant, timezone) })
        : this.t(lang, 'referral_reward_inviter_capped', { name, days: this.maxInviterDays, friendDays: claim.inviteeDays });
      return { text, keyboard: [[{ text: this.t(lang, 'referral_button_invite_more'), callback_data: 'ref' }]] };
    });
  }

  // { invited, activated, rewarded, days, maxDays, capped }
  async getStats(inviterId) {
    const stats = await this.referralRepository.getInviterStats(inviterId);
    return {
      ...stats,
      maxDays: this.maxInviterDays,
      capped: inviterBonusDays(stats, this.config) === 0
    };
  }

  async getGlobalStats() {
    return this.referralRepository.getGlobalStats();
  }

  async getPremiumSource(userId) {
    return this.referralRepository.getPremiumSource(userId);
  }

  // Мягкая подсказка к сообщению о лимите для бесплатного пользователя: «или пригласи друга — +7 дней».
  // Не чаще раза в UPSELL_INTERVAL_DAYS и не тем, кто уже собрал все бонусы. null — не показывать.
  async limitUpsell(userId, lang) {
    try {
      const stats = await this.referralRepository.getInviterStats(userId);
      if (inviterBonusDays(stats, this.config) === 0) return null;
      if (!(await this.referralRepository.claimUpsellSlot(userId, this.config.UPSELL_INTERVAL_DAYS))) return null;
      return {
        text: this.t(lang, 'referral_upsell_line', { days: this.config.REWARD_DAYS }),
        row: [{ text: this.t(lang, 'button_invite'), callback_data: 'ref' }]
      };
    } catch (error) {
      logger.warn('Referral upsell check failed', { userId, error: error.message });
      return null;
    }
  }

  // Единая точка для сообщений о лимитах: дописывает строку к тексту и кнопку после первой строки клавиатуры
  // (обычно «⭐️ Премиум»). Возвращает { text, keyboard } — без подсказки те же значения.
  async withUpsell(userId, lang, text, keyboard) {
    const upsell = await this.limitUpsell(userId, lang);
    if (!upsell) return { text, keyboard };
    const rows = [...keyboard];
    rows.splice(Math.min(1, rows.length), 0, upsell.row);
    return { text: `${text}\n\n${upsell.text}`, keyboard: rows };
  }
}

module.exports = ReferralService;
module.exports.generateCode = generateCode;
module.exports.inviterBonusDays = inviterBonusDays;
module.exports.maxInviterDays = maxInviterDays;
module.exports.CODE_ALPHABET = CODE_ALPHABET;
