// Дата конца пробного премиума (ДД.ММ.ГГГГ), если премиум сейчас пробный (кроме пробного не было ни оплаты, ни
// подарка — referralService.getPremiumSource), иначе null. Без referralService — null
async function trialUntil({ referralService, userService }, userId) {
  if (!referralService) return null;
  const source = await referralService.getPremiumSource(userId).catch(() => null);
  if (source !== 'trial') return null;
  const status = await userService.getPremiumStatus(userId);
  if (!status.isPremium || !status.expiresAt) return null;
  const date = new Date(status.expiresAt);
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

module.exports = { trialUntil };
