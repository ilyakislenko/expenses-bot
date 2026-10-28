// «Как отменить подписку»: официальные страницы управления подпиской и инструкции по отмене. Ссылки только
// проверенные (страница существует и ведёт на отмену/управление у самого сервиса); добавить сервис — новая строка.
// keywords — слова или фразы из описания траты (без регистра и знаков; одно слово — по началу слова, фраза —
// целиком), порядок важен: первая подошедшая запись (YouTube раньше Google, Xbox — это Microsoft).
// manage — страница, где подписку отключают; help — официальная инструкция. Можно одно из двух.
// store: 'apple' | 'google' — подписка оформлена через магазин приложений: шаги для другого магазина не нужны.

const APP_STORE = {
  manage: 'https://apps.apple.com/account/subscriptions',
  help: 'https://support.apple.com/en-us/118428'
};

const GOOGLE_PLAY = {
  manage: 'https://play.google.com/store/account/subscriptions',
  help: 'https://support.google.com/googleplay/answer/7018481'
};

const SERVICES = [
  {
    id: 'apple',
    name: 'Apple',
    keywords: ['apple', 'icloud', 'itunes', 'app store', 'appstore'],
    manage: APP_STORE.manage,
    help: APP_STORE.help,
    store: 'apple'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    keywords: ['youtube', 'ютуб'],
    manage: 'https://www.youtube.com/paid_memberships',
    help: 'https://support.google.com/youtube/answer/6308278'
  },
  {
    id: 'google_one',
    name: 'Google One',
    keywords: ['google one', 'googleone'],
    manage: 'https://one.google.com/settings',
    help: 'https://support.google.com/googleone/answer/9056360'
  },
  {
    id: 'google_play',
    name: 'Google Play',
    keywords: ['google play', 'googleplay'],
    manage: GOOGLE_PLAY.manage,
    help: GOOGLE_PLAY.help,
    store: 'google'
  },
  {
    id: 'netflix',
    name: 'Netflix',
    keywords: ['netflix', 'нетфликс'],
    manage: 'https://www.netflix.com/cancelplan',
    help: 'https://help.netflix.com/en/node/407'
  },
  {
    id: 'spotify',
    name: 'Spotify',
    keywords: ['spotify', 'спотифай'],
    help: 'https://support.spotify.com/article/cancel-premium/'
  },
  {
    id: 'disney',
    name: 'Disney+',
    keywords: ['disney'],
    manage: 'https://www.disneyplus.com/account/subscription'
  },
  {
    id: 'amazon_prime',
    name: 'Amazon Prime',
    keywords: ['amazon prime', 'prime video', 'amzn prime'],
    manage: 'https://www.amazon.com/mm/pipeline/cancellation',
    help: 'https://www.amazon.com/gp/help/customer/display.html?nodeId=TKX9QawwBIbXy736eI'
  },
  {
    id: 'openai',
    name: 'ChatGPT',
    keywords: ['chatgpt', 'openai', 'chat gpt'],
    help: 'https://help.openai.com/en/articles/7232927'
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    keywords: ['microsoft', 'office 365', 'xbox', 'game pass', 'gamepass', 'onedrive'],
    manage: 'https://account.microsoft.com/services',
    help: 'https://support.microsoft.com/en-us/accounts-billing/subscriptions/cancel-your-microsoft-subscription'
  },
  {
    id: 'playstation',
    name: 'PlayStation Plus',
    keywords: ['playstation', 'ps plus', 'psn'],
    help: 'https://www.playstation.com/en-us/support/subscriptions/cancel-playstation-plus/'
  },
  {
    id: 'steam',
    name: 'Steam',
    keywords: ['steam'],
    manage: 'https://store.steampowered.com/account/subscriptions/'
  },
  {
    id: 'telegram_premium',
    name: 'Telegram Premium',
    keywords: ['telegram premium', 'телеграм премиум', 'телеграмм премиум'],
    help: 'https://telegram.org/faq_premium#cancellation'
  }
];

function keywordText(text) {
  return ` ${String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
}

function matches(text, keyword) {
  return keyword.includes(' ') ? text.includes(` ${keyword} `) : text.includes(` ${keyword}`);
}

// Сервис по описанию траты / названию подписки (или ключу продавца); null — не знаю, нужен общий совет
function findCancelService(...texts) {
  const haystack = texts.map(keywordText).join(' ');
  return SERVICES.find(service => service.keywords.some(keyword => matches(haystack, keyword))) || null;
}

module.exports = { SERVICES, APP_STORE, GOOGLE_PLAY, findCancelService };
