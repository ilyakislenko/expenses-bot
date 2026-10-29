const logger = require('../utils/logger');
const { COINS } = require('../utils/constants');
const { BY_CODE } = require('../utils/achievements');

// Причины в журнале (у каждой — строка истории coins_reason_<причина>); остальные показываются как «другое»
const REASONS = ['day', 'streak', 'plan', 'challenge', 'achievement', 'quiz', 'redeem', 'refund'];
const KEY_MAX = 100;
const REASON_MAX = 20;

function localMonth(timezone, now) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit' })
    .formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return `${parts.year}-${parts.month}`;
}

// Монеты за значок: XP / COINS.XP_PER_COIN (вниз, но не меньше 1)
function badgeCoins(code) {
  const badge = BY_CODE.get(code);
  return badge ? Math.max(1, Math.floor(badge.xp / COINS.XP_PER_COIN)) : 0;
}

// «🪙 Монеты»: начисления с ключом идемпотентности (повтор — ничего не меняет) и обмен на дни премиума с лимитом
// в месяц. Публичный API для других разделов (квиз и т.п.): award(userId, reason, amount, { idempotencyKey })
class CoinService {
  constructor({ coinRepository, userService, achievementRepository = null, now = () => new Date() }) {
    this.coinRepository = coinRepository;
    this.userService = userService;
    this.achievementRepository = achievementRepository; // открытые значки — монеты за них при заходе на экран
    this.now = now;
  }

  // Начислить amount монет один раз на ключ. → { awarded, balance }. Исключений не бросает: монеты — бонус к действию
  async award(userId, reason, amount, { idempotencyKey } = {}) {
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0 || !idempotencyKey || typeof reason !== 'string' || !reason) {
      logger.warn('Coin award rejected', { userId, reason, amount });
      return { awarded: false, balance: null };
    }
    try {
      const { added, balance } = await this.coinRepository.credit(userId, reason.slice(0, REASON_MAX), [
        { amount: value, key: String(idempotencyKey).slice(0, KEY_MAX) }
      ]);
      return { awarded: added > 0, balance };
    } catch (error) {
      logger.warn('Coin award failed', { userId, reason, error: error.message });
      return { awarded: false, balance: null };
    }
  }

  // Несколько начислений одной причины одним запросом. → сколько монет начислено (0 — всё уже было или ошибка)
  async awardMany(userId, reason, items) {
    try {
      const { added } = await this.coinRepository.credit(userId, reason, items.filter(i => i.amount > 0));
      return added;
    } catch (error) {
      logger.warn('Coin award failed', { userId, reason, error: error.message });
      return 0;
    }
  }

  // Для AchievementService.track: день с записями, каждые 7 дней серии и только что открытые значки.
  // → монеты сверх обычного дня (их стоит показать строкой), 0 — нечего показывать
  async onActivity(userId, snap, unlockedCodes = []) {
    let bonus = 0;
    if (snap.streak.todayActive) {
      await this.awardMany(userId, 'day', [{ amount: COINS.DAY, key: `day:${snap.today}` }]);
      if (snap.streak.current > 0 && snap.streak.current % 7 === 0) {
        bonus += await this.awardMany(userId, 'streak', [{ amount: COINS.STREAK_WEEK, key: `streak:${snap.today}` }]);
      }
    }
    if (unlockedCodes.length) bonus += await this.syncBadges(userId, unlockedCodes);
    return bonus;
  }

  // Монеты за значки (по одному разу на значок; открытые до появления монет — тоже, при заходе на экраны)
  async syncBadges(userId, codes) {
    return this.awardMany(userId, 'achievement', codes.map(code => ({ amount: badgeCoins(code), key: `ach:${code}` })));
  }

  async onChallengeWon(userId, challengeId) {
    return this.award(userId, 'challenge', COINS.CHALLENGE_WON, { idempotencyKey: `challenge:${challengeId}` });
  }

  async getBalance(userId) {
    return (await this.coinRepository.getBalance(userId)).balance;
  }

  async month(userId) {
    const timezone = (await this.userService.getUserTimezone(userId)) || 'UTC';
    return localMonth(timezone, this.now());
  }

  // Экран: баланс, обменено дней в этом месяце, история. Значки, открытые до появления монет, засчитываются здесь
  async getOverview(userId) {
    if (this.achievementRepository) {
      const unlocked = await this.achievementRepository.getUnlocked(userId).catch(() => []);
      if (unlocked.length) await this.syncBadges(userId, unlocked.map(row => row.code));
    }
    const [{ balance, earned }, month] = await Promise.all([this.coinRepository.getBalance(userId), this.month(userId)]);
    const [used, history] = await Promise.all([
      this.coinRepository.redeemedDays(userId, month),
      this.coinRepository.getHistory(userId, COINS.HISTORY)
    ]);
    return { balance, earned, used, left: Math.max(0, COINS.MONTHLY_DAYS_CAP - used), cap: COINS.MONTHLY_DAYS_CAP, history, shop: COINS.SHOP };
  }

  // Обмен на days дней премиума. idempotencyKey — одно нажатие (сообщение с подтверждением): двойное нажатие
  // списывает один раз. Премиум — через UserService.grantRewardDays (транзакция 'reward'); не вышло — монеты
  // возвращаются. → { status: 'ok' | 'duplicate' | 'cap' | 'insufficient' | 'unknown' | 'failed', balance, need, left, expiresAt }
  async redeem(userId, days, { idempotencyKey }) {
    const item = COINS.SHOP.find(i => i.days === Number(days));
    if (!item || !idempotencyKey) return { status: 'unknown' };
    const month = await this.month(userId);
    const result = await this.coinRepository.redeem(userId, {
      price: item.price, days: item.days, month, refKey: `redeem:${idempotencyKey}`.slice(0, KEY_MAX), cap: COINS.MONTHLY_DAYS_CAP
    });
    const left = Math.max(0, COINS.MONTHLY_DAYS_CAP - (result.used || 0));
    if (result.status === 'insufficient') return { ...result, need: item.price - result.balance, left };
    if (result.status !== 'ok') return { ...result, left };
    try {
      const grant = await this.userService.grantRewardDays(userId, item.days, 'coins', { ledger_id: result.ledgerId, price: item.price });
      logger.info('Coins redeemed for premium', { userId, days: item.days, price: item.price, ledgerId: result.ledgerId });
      return { status: 'ok', balance: result.balance, left, days: item.days, price: item.price, expiresAt: grant.newExpiryDate };
    } catch (error) {
      logger.error('Coin redemption grant failed, refunding', { userId, ledgerId: result.ledgerId, error: error.message });
      await this.coinRepository.credit(userId, 'refund', [{ amount: item.price, key: `refund:${result.ledgerId}` }], { days: -item.days, month })
        .catch((refundError) => logger.error('Coin refund failed', { userId, ledgerId: result.ledgerId, error: refundError.message }));
      return { status: 'failed' };
    }
  }
}

CoinService.REASONS = REASONS;
CoinService.badgeCoins = badgeCoins;
CoinService.localMonth = localMonth;

module.exports = CoinService;
