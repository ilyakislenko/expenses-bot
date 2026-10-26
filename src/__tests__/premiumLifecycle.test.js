const PremiumLifecycleService = require('../services/PremiumLifecycleService');
const FunnelService = require('../services/FunnelService');

describe('PremiumLifecycleService.stageFor', () => {
  const { stageFor } = PremiumLifecycleService;
  const now = new Date('2026-10-26T12:00:00Z');
  const hours = (h) => new Date(now.getTime() + h * 3600 * 1000);
  const user = (expiresAt, extra = {}) => ({ premium_expires_at: expiresAt, has_active_subscription: false, ...extra });

  test('warns during the last 2 days before the end', () => {
    expect(stageFor(user(hours(47)), now).kind).toBe('premium_expiring');
    expect(stageFor(user(hours(1)), now).kind).toBe('premium_expiring');
    expect(stageFor(user(hours(49)), now)).toBeNull();
  });

  test('reports the end during the first day after expiry', () => {
    expect(stageFor(user(hours(0)), now).kind).toBe('premium_expired');
    expect(stageFor(user(hours(-23)), now).kind).toBe('premium_expired');
  });

  test('silent between day 1 and day 7, win-back on day 7 only', () => {
    expect(stageFor(user(hours(-25)), now)).toBeNull();
    expect(stageFor(user(hours(-7 * 24 - 1)), now).kind).toBe('premium_winback');
    expect(stageFor(user(hours(-8 * 24 - 1)), now)).toBeNull();
  });

  test('auto-renewing subscription is never warned', () => {
    expect(stageFor(user(hours(10), { has_active_subscription: true }), now)).toBeNull();
  });
});

describe('FunnelService.parseStartSource', () => {
  test('takes the deep link code after /start', () => {
    expect(FunnelService.parseStartSource('/start ads_tg-1')).toBe('ads_tg-1');
  });

  test('plain /start and invalid codes give no source', () => {
    expect(FunnelService.parseStartSource('/start')).toBeNull();
    expect(FunnelService.parseStartSource('/start bad$code')).toBeNull();
    expect(FunnelService.parseStartSource(`/start ${'a'.repeat(65)}`)).toBeNull();
    expect(FunnelService.parseStartSource(undefined)).toBeNull();
  });
});
