module.exports = {
  // Настройки бота
  BOT: {
    token: process.env.BOT_TOKEN,
    username: process.env.BOT_USERNAME || 'expenses_tracker_bot'
  },
  // Поддержка платежей и юридическая информация
  PAY_SUPPORT: {
    businessName: process.env.BUSINESS_NAME || 'SpendTracker',
    supportUsername: process.env.SUPPORT_USERNAME || 'iamnotapepe',
    supportEmail: process.env.SUPPORT_EMAIL || '-',
    termsUrl: process.env.TERMS_URL || '-',
    privacyUrl: process.env.PRIVACY_URL || '-',
    refundPolicyUrl: process.env.REFUND_POLICY_URL || '-'
  }
}; 