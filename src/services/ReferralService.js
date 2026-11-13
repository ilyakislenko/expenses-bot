const crypto = require('crypto');
const logger = require('../utils/logger');
const { REFERRAL } = require('../utils/constants');

// Код ссылки: строчные буквы и цифры без похожих (0/o, 1/l/i) — легко продиктовать
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const CODE_LENGTH = 7;
const CODE_ATTEMPTS = 5;
// start-параметр приглашения: ref_<код>. Ссылка с картинки или текста «поделиться» (итоги месяца, квиз, разнос):
// share_<вид>_<код> — пришедший по ней тоже приглашён этим человеком, но в воронке виден свой источник share_<вид>;
// share_<вид> без кода — если код получить не удалось
const START_PATTERN = /^ref_([a-z0-9]{4,16})$/i;
const SHARE_PATTERN = /^share_([a-z]+)(?:_([a-z0-9]{4,16}))?$/i;
const SHARE_KINDS = ['wrapped', 'quiz', 'roast'];

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

  // "ref_k3m9x2p" / "share_quiz_k3m9x2p" → "k3m9x2p"; другой start-параметр (рекламный код) → null
  static parseStartCode(payload) {
    const text = String(payload || '');
    const match = START_PATTERN.exec(text) || SHARE_PATTERN.exec(text);
    const code = match && match[match.length - 1];
    return code ? code.toLowerCase() : null;
  }

  // "share_quiz_k3m9x2p" / "share_quiz" → "quiz"; не ссылка «поделиться» → null
  static parseShareKind(payload) {
    const match = SHARE_PATTERN.exec(String(payload || ''));
    return match ? match[1].toLowerCase() : null;
  }

  // Источник для воронки: приглашения (ref_<код>) — один источник «ref», ссылки «поделиться» — share_<вид>
  // (без кода пригласившего), остальное (рекламный код) — как есть
  static funnelSource(payload) {
    if (!payload) return null;
    if (START_PATTERN.test(payload)) return 'ref';
    const kind = ReferralService.parseShareKind(payload);
    return kind ? `share_${kind}` : payload;
  }

  static inviteLink(botUsername, code) {
    return `https://t.me/${botUsername}?start=ref_${code}`;
  }

  // Ссылка на бота для картинки или текста «поделиться»: share_<вид>_<код> (без кода — share_<вид>)
  static shareLink(botUsername, kind, code = null) {
    if (!SHARE_KINDS.includes(kind)) throw new Error(`Unknown share kind: ${kind}`);
    if (!botUsername) return null;
    return `https://t.me/${botUsername}?start=share_${kind}${code ? `_${code}` : ''}`;
  }

  // То же с кодом этого пользователя; код не получить (ошибка БД) — ссылка без кода, «поделиться» не ломается
  async shareLinkFor(userId, kind, botUsername) {
    if (!botUsername) return null;
    const code = await this.getOrCreateCode(userId).catch((error) => {
      logger.warn('Referral code for share link failed', { userId, kind, error: error.message });
      return null;
    });
    return ReferralService.shareLink(botUsername, kind, code);
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

  // Мягкая подсказка к сообщению о лимите для бесплатного пользователя: «или пригласи друга — +30 дней».
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

  // «📤 Покажи другу» в удачный момент (moment — из SHARE_MOMENTS): короткая строка и кнопка, открывающая отправку
  // приглашения (t.me/share/url с личной ссылкой). Каждый момент — один раз на пользователя, всего — не чаще раза в
  // SHARE_PROMPT_INTERVAL_DAYS (user_notifications 'share_prompt'). Никогда не бросает. → true, если отправлено
  async offerShare(userId, moment) {
    if (!this.config.SHARE_MOMENTS.includes(moment)) throw new Error(`Unknown share moment: ${moment}`);
    try {
      const username = this.notificationService.botUsername ? this.notificationService.botUsername() : null;
      if (!username) return false;
      const code = await this.getOrCreateCode(userId);
      if (!(await this.referralRepository.claimSharePrompt(userId, moment, this.config.SHARE_PROMPT_INTERVAL_DAYS))) return false;
      const [lang, stats] = await Promise.all([this.userService.getUserLanguage(userId), this.referralRepository.getInviterStats(userId)]);
      const days = this.config.REWARD_DAYS;
      const bonus = inviterBonusDays(stats, this.config) === 0 ? 'share_prompt_bonus_friend' : 'share_prompt_bonus_both';
      const url = ReferralService.shareUrl(ReferralService.inviteLink(username, code), this.t(lang, 'referral_share_text', { days }));
      await this.notificationService.sendMessage(userId, `${this.t(lang, `share_prompt_${moment}`)}\n${this.t(lang, bonus, { days })}`, {
        reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'share_prompt_button'), url }]] }
      });
      logger.info('Share prompt sent', { userId, moment });
      return true;
    } catch (error) {
      logger.warn('Share prompt failed', { userId, moment, error: error.message });
      return false;
    }
  }

  // Для моментов внутри действия (track() до ответа): подсказка приходит через SHARE_PROMPT_DELAY_MS — после ответа
  offerShareLater(userId, moment) {
    const timer = setTimeout(() => this.offerShare(userId, moment), this.config.SHARE_PROMPT_DELAY_MS);
    if (timer.unref) timer.unref();
  }
}

module.exports = ReferralService;
module.exports.generateCode = generateCode;
module.exports.inviterBonusDays = inviterBonusDays;
module.exports.maxInviterDays = maxInviterDays;
module.exports.CODE_ALPHABET = CODE_ALPHABET;
module.exports.SHARE_KINDS = SHARE_KINDS;
