// Fix E: оболочка, новичок, разметка накоплений, челленджи, приглашения, злой режим
const SavingsHandlers = require('../handlers/SavingsHandlers');
const RoastHandlers = require('../handlers/RoastHandlers');
const RoastService = require('../services/RoastService');
const ReferralService = require('../services/ReferralService');
const ReferralRepository = require('../repositories/ReferralRepository');
const AchievementRepository = require('../repositories/AchievementRepository');
const AchievementService = require('../services/AchievementService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const { generateTimeKeyboard, generateCurrencyKeyboard } = require('../utils/constants');
const { calculateTimezoneFromUserTime } = require('../utils/timezoneCalculator');
const { SAVAGE_LANGUAGES } = require('../utils/roast');

const localizationService = new LocalizationService();
const formatter = new Formatter({});
const LANGS = Object.keys(localizationService.supportedLanguages);
const t = (lang, key, params) => localizationService.getText(lang, key, params);
const flat = (keyboard) => keyboard.flat();

// Разбор legacy Markdown так, как это делает Telegram (tdlib): `\` экранирует _ * ` [ только вне сущностей; внутри
// *…* / _…_ / `…` экранирования нет — сущность кончается на первом таком же символе. Бросает как Telegram (400),
// а ещё — если внутри сущности остался `\` перед спецсимволом (пользователь увидел бы обратный слэш).
function checkTelegramMarkdown(text) {
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && '_*`['.includes(text[i + 1])) { i += 2; continue; }
    if (c === '*' || c === '_' || c === '`') {
      const fence = c === '`' && text.startsWith('```', i) ? '```' : c;
      const end = text.indexOf(fence, i + fence.length);
      if (end === -1) throw new Error(`Can't find end of the entity starting at byte offset ${i}: ${JSON.stringify(text.slice(i, i + 40))}`);
      const inner = text.slice(i + fence.length, end);
      if (fence !== '```' && /\\[_*`[]/.test(inner)) throw new Error(`Escape inside entity is shown as is: ${JSON.stringify(inner)}`);
      i = end + fence.length;
      continue;
    }
    if (c === '[') {
      const end = text.indexOf(']', i + 1);
      if (end === -1) throw new Error(`Can't find end of the link text at ${i}`);
      i = end + 1;
      if (text[i] === '(') {
        const close = text.indexOf(')', i);
        if (close === -1) throw new Error(`Can't find end of the URL at ${i}`);
        i = close + 1;
      }
      continue;
    }
    i += 1;
  }
  return true;
}

describe('Telegram Markdown check', () => {
  test('accepts escaped text outside entities, rejects escapes inside them', () => {
    expect(checkTelegramMarkdown('🎯 Отпуск \\*мечта\\* — *100 ₽*')).toBe(true);
    expect(() => checkTelegramMarkdown('🎯 *Отпуск \\*мечта\\**')).toThrow(/end of the entity|inside entity/);
    expect(() => checkTelegramMarkdown('🎯 *new\\_phone*')).toThrow(/inside entity/);
  });
});

function ctxFor(data = 'x') {
  return {
    from: { id: 1 },
    chat: { id: 1, type: 'private' },
    callbackQuery: { data, message: { message_id: 5 } },
    match: null,
    reply: jest.fn(async () => ({ message_id: 6 })),
    editMessageText: jest.fn(async () => ({})),
    editMessageReplyMarkup: jest.fn(async () => ({})),
    answerCbQuery: jest.fn(async () => true)
  };
}
const shown = (ctx) => {
  const calls = ctx.editMessageText.mock.calls.length ? ctx.editMessageText.mock.calls : ctx.reply.mock.calls;
  const [text, extra] = calls[calls.length - 1];
  return { text, extra, data: extra && extra.reply_markup ? flat(extra.reply_markup.inline_keyboard).map((b) => b.callback_data) : [] };
};

describe('savings cards with Markdown characters in names (Fix E, ВАЖНО)', () => {
  const NAMES = ['Отпуск *мечта*', 'Вклад*', 'new_phone', '[x] `y`', '*_[`'];

  function savings(name, lang) {
    const account = { id: 1, kind: 'account', name, balance: 3000, balanceMain: 285000, currency: 'USD', yield_rate: 16, created_at: new Date('2026-10-01') };
    const goal = { id: 2, kind: 'goal', name, goal_mode: 'own', balance: 0, balanceMain: 0, target_amount: 100000, currency: 'RUB', target_date: '2027-06-30' };
    const debt = { id: 3, kind: 'debt', name, balance: 50000, balanceMain: 50000, currency: 'RUB', yield_rate: 12, monthly_payment: 5000 };
    const state = {
      currency: 'RUB', today: '2026-10-28', pots: [account, goal, debt], accounts: [account], goals: [goal], debts: [debt],
      settings: { yieldRate: 0, inflationRate: 0, contributionGrowth: 0, manualMonthly: null }, monthly: null, total: 285000
    };
    const savingsService = {
      getState: jest.fn(async () => state),
      getRecentOperations: jest.fn(async () => [{ amount: 500, created_at: new Date('2026-10-20') }]),
      getPot: jest.fn(async (userId, id) => state.pots.find((p) => p.id === id)),
      goalStatus: jest.fn(async () => ({ current: 0, target: 100000, ratio: 0, achieved: false, left: 100000, monthsLeft: 8, etaNominal: null, etaReal: null, requiredNominal: 12500, requiredReal: null }))
    };
    const userService = { getUserLanguage: jest.fn(async () => lang), getUserTimezone: jest.fn(async () => 'UTC') };
    return new SavingsHandlers({ savingsService, userService, localizationService, formatter });
  }

  const SCREENS = [
    ['account card', (h, ctx) => h.showPot(ctx, 1)],
    ['account settings', (h, ctx) => { ctx.match = [null, '1']; return h.showAccountSettings(ctx); }],
    ['goal card', (h, ctx) => h.showPot(ctx, 2)],
    ['goal settings', (h, ctx) => { ctx.match = [null, '2']; return h.showGoalSettings(ctx); }],
    ['debt card', (h, ctx) => h.showDebt(ctx, 3)],
    ['debt settings', (h, ctx) => { ctx.match = [null, '3']; return h.showDebtSettings(ctx); }]
  ];

  for (const name of NAMES) {
    for (const [screen, open] of SCREENS) {
      test(`${screen}: «${name}» renders and the name is shown without backslashes`, async () => {
        for (const lang of ['ru', 'en', 'de']) {
          const ctx = ctxFor();
          await open(savings(name, lang), ctx);
          const { text, extra } = shown(ctx);
          expect(extra.parse_mode).toBe('Markdown');
          expect(() => checkTelegramMarkdown(text)).not.toThrow();
          expect(text).toContain(formatter.escapeMarkdown(name)); // экранировано вне сущности — Telegram покажет как есть
        }
      });
    }
  }
});

describe('time keyboard and half-hour time zones (Fix E)', () => {
  const now = new Date('2026-10-28T14:40:00Z');

  test('buttons with UTC minutes and a toggle to minutes shifted by 30', () => {
    const plain = flat(generateTimeKeyboard(localizationService, 'en', { now }));
    expect(plain.find((b) => b.callback_data === 'time|20|40').text).toBe('20:40');
    const toggle = plain.find((b) => b.callback_data.startsWith('tzh|'));
    expect(toggle.callback_data).toBe('tzh|1');
    expect(toggle.text).toContain(':10');
    expect(plain[plain.length - 1].callback_data).toBe('back_to_settings');

    const half = flat(generateTimeKeyboard(localizationService, 'en', { now, half: true, onboarding: true }));
    expect(half.find((b) => b.callback_data === 'time|20|10|h|ob').text).toBe('20:10');
    expect(half.some((b) => b.callback_data === 'tzh|0|ob')).toBe(true);
    // У hi сдвиг по умолчанию — в Индии UTC+5:30
    expect(flat(generateTimeKeyboard(localizationService, 'hi', { now })).some((b) => b.callback_data === 'time|20|10|h')).toBe(true);
    for (const lang of LANGS) {
      const all = flat(generateTimeKeyboard(localizationService, lang, { now, onboarding: true }));
      expect(all.every((b) => Buffer.byteLength(b.callback_data) <= 64 && b.text.length <= 64)).toBe(true);
    }
  });

  test.each([
    ['20:10 on the half-hour keyboard is India (any language)', 20, 10, true, 'en', 'Asia/Kolkata'],
    ['…even if the tap came 25 minutes after the keyboard was shown', 20, 10, true, 'en', 'Asia/Kolkata', 25],
    ['hi picks the whole hour after its time', 20, 40, false, 'hi', 'Asia/Kolkata'],
    ['hi picks the whole hour before its time', 19, 40, false, 'hi', 'Asia/Kolkata'],
    ['UTC+5 for en stays UTC+5', 19, 40, false, 'en', 'Etc/GMT-5'],
    ['Iran +3:30', 18, 10, true, 'ru', 'Asia/Tehran'],
    ['Newfoundland −3:30', 11, 10, true, 'en', 'America/St_Johns'],
    ['half-hour offset nobody has (−5:30) → nearest hour', 9, 10, true, 'en', 'Etc/GMT+5'],
    ['Moscow', 17, 40, false, 'ru', 'Europe/Moscow'],
    ['a minute of drift still lands on the hour', 17, 41, false, 'ru', 'Europe/Moscow']
  ])('%s', (name, hour, minute, half, language, expected, delay = 0) => {
    const reference = new Date(now.getTime() + delay * 60000);
    expect(calculateTimezoneFromUserTime(hour, minute, reference, { language, half })).toBe(expected);
  });
});

describe('language picker (Fix E)', () => {
  test('first screen: continue in the Telegram language first, the rest two per row', () => {
    const keyboard = localizationService.getLanguageKeyboardLocalized('ru', { onboarding: true });
    expect(keyboard[0]).toEqual([{ text: t('ru', 'language_continue'), callback_data: 'set_language|ru|ob' }]);
    expect(keyboard.slice(1).every((row) => row.length <= 2)).toBe(true);
    const data = flat(keyboard).map((b) => b.callback_data);
    expect(new Set(data).size).toBe(LANGS.length);
    expect(keyboard.length).toBeLessThanOrEqual(8);
  });

  test('settings: two per row, current marked, back at the end', () => {
    const keyboard = localizationService.getLanguageKeyboardLocalized('de');
    expect(flat(keyboard).find((b) => b.callback_data === 'set_language|de').text.startsWith('✅')).toBe(true);
    expect(keyboard[keyboard.length - 1][0].callback_data).toBe('settings');
    expect(flat(keyboard).length).toBe(LANGS.length + 1);
  });

  test('every language has a greeting and a «continue» label', () => {
    for (const lang of LANGS) {
      expect(t(lang, 'onb_welcome')).not.toBe('onb_welcome');
      expect(t(lang, 'language_continue')).toMatch(/^✅ /);
    }
  });

  test('UZS button is not in Cyrillic outside ru/kz', () => {
    const label = (lang) => flat(generateCurrencyKeyboard(localizationService, lang)).find((b) => b.callback_data === 'set_currency|UZS').text;
    expect(label('uz')).not.toMatch(/[а-я]/);
    expect(label('en')).not.toMatch(/[а-я]/);
    expect(label('ru')).toBe('сум UZS');
  });
});

describe('challenge «a week without a category» (Fix E)', () => {
  test('only expenses after the challenge started are counted', async () => {
    const repo = Object.create(AchievementRepository.prototype);
    repo.query = jest.fn(async () => ({ rows: [] }));
    await repo.getCategorySpendDays(1, 'Europe/Moscow', 'Транспорт', '2026-10-28', '2026-11-04', '2026-10-28T09:00:00Z');
    const [sql, params] = repo.query.mock.calls[0];
    expect(sql).toMatch(/e\.created_at_utc >= \$6::timestamptz/);
    expect(params[5]).toBe('2026-10-28T09:00:00Z');

    const getCategorySpendDays = jest.fn(async () => []);
    const challenge = { kind: 'no_category', category_name: 'Транспорт', start_date: '2026-10-28', end_date: '2026-11-04', created_at: new Date('2026-10-28T09:00:00Z') };
    const result = await AchievementService.prototype.evaluate.call(
      { achievementRepository: { getCategorySpendDays } },
      1, { today: '2026-10-28', timezone: 'Europe/Moscow', expenseDays: new Set(['2026-10-28']), markDays: new Set() }, challenge
    );
    expect(getCategorySpendDays).toHaveBeenCalledWith(1, 'Europe/Moscow', 'Транспорт', '2026-10-28', '2026-11-04', challenge.created_at);
    expect(result.status).toBe('active');
  });
});

describe('referral reward needs expenses on 2 different days (Fix E)', () => {
  function service(counts) {
    const referralRepository = {
      getPendingInviter: jest.fn(async () => 5),
      countQualifyingExpenses: jest.fn(async () => counts),
      claimReward: jest.fn(async () => null)
    };
    return { referralRepository, svc: new ReferralService({ referralRepository, userService: {}, notificationService: {}, localizationService, formatter }) };
  }

  test('3 expenses on one day (e.g. «1 1 1» in one message) — no reward yet', async () => {
    const { svc, referralRepository } = service({ count: 3, days: 1 });
    expect(await svc.onExpenseRecorded(10)).toBeNull();
    expect(referralRepository.claimReward).not.toHaveBeenCalled();
  });

  test('3 expenses on 2 days — reward is claimed', async () => {
    const { svc, referralRepository } = service({ count: 3, days: 2 });
    await svc.onExpenseRecorded(10);
    expect(referralRepository.claimReward).toHaveBeenCalled();
  });

  test('only existing expenses after registration count, days by the user timezone', async () => {
    const repo = Object.create(ReferralRepository.prototype);
    repo.query = jest.fn(async () => ({ rows: [{ count: 3, days: 2 }] }));
    expect(await repo.countQualifyingExpenses(10)).toEqual({ count: 3, days: 2 });
    const [sql] = repo.query.mock.calls[0];
    expect(sql).toMatch(/COUNT\(DISTINCT/);
    expect(sql).toMatch(/e\.created_at_utc >= u\.created_at/);
  });

  test('texts in every language mention the days', () => {
    for (const lang of LANGS) {
      for (const key of ['referral_intro', 'referral_joined_notification', 'referral_welcome_note']) {
        const text = t(lang, key, { expenses: 3, activeDays: 2, days: 7, name: 'A' });
        expect(text).not.toMatch(/\{activeDays\}/);
        expect(text).toContain('2');
      }
    }
  });
});

describe('roast mode (Fix E)', () => {
  function roastService(level = 'off') {
    const svc = Object.create(RoastService.prototype);
    Object.assign(svc, {
      localizationService, formatter, random: () => 0.1,
      roastRepository: { getSettings: jest.fn(async () => ({ level, gender: 'm', adultConfirmed: true })), getHistory: jest.fn(async () => []), setLevel: jest.fn(async () => {}) },
      expenseService: { getExpenses: jest.fn(async () => []) },
      premiumService: { isPremiumUser: jest.fn(async () => true) }
    });
    return svc;
  }

  test('a newcomer gets roasted on the first junk expense (no history to compare with)', async () => {
    const svc = roastService('spicy');
    const expense = { id: 1, description: 'шаурма', amount: 300, currency: 'RUB', category_name: 'Еда' };
    const memo = new Map();
    const data = {
      userId: 1, lang: 'ru', currency: 'RUB', timezone: 'UTC', today: '2026-10-28', period: { start: '2026-10-01', end: '2026-11-01' },
      items: [{ expense, value: 300, localDate: '2026-10-28' }], convert: async (v) => Number(v),
      once: (key, load) => { if (!memo.has(key)) memo.set(key, load()); return memo.get(key); }
    };
    const trigger = await svc.detectJunk(data);
    expect(trigger && trigger.kind).toBe('junk');
  });

  test('«uncensored» works only in ru/en; elsewhere it is spicy', async () => {
    const svc = roastService();
    expect(await svc.effectiveLevel(1, 'savage', 'de')).toBe('spicy');
    expect(await svc.effectiveLevel(1, 'savage', 'ru')).toBe('savage');
    expect(await svc.effectiveLevel(1, 'spicy', 'jp')).toBe('spicy');
  });

  test('sample line exists in every language and is valid Markdown', () => {
    const svc = roastService();
    for (const lang of LANGS) {
      for (const level of ['spicy', 'savage']) {
        const line = svc.sampleLine(lang, level, 'x', 'RUB');
        expect(line).toMatch(/^😈 /);
        expect(() => checkTelegramMarkdown(line)).not.toThrow();
      }
    }
  });

  function roastHandlers(lang, level) {
    const store = { level, gender: 'f', adultConfirmed: true };
    const roast = roastService();
    roast.roastRepository.getSettings = jest.fn(async () => ({ ...store }));
    roast.roastRepository.setLevel = jest.fn(async (id, value) => { store.level = value; });
    const userService = { getUserLanguage: jest.fn(async () => lang), getUserCurrency: jest.fn(async () => 'EUR') };
    return { store, handlers: new RoastHandlers({ roastService: roast, userService, localizationService }) };
  }

  test('settings outside ru/en: no «uncensored» button, saved savage is shown as spicy with an explanation', async () => {
    for (const lang of LANGS) {
      const { handlers } = roastHandlers(lang, 'savage');
      const ctx = ctxFor('rst');
      await handlers.showSettings(ctx);
      const { text, data } = shown(ctx);
      expect(() => checkTelegramMarkdown(text)).not.toThrow();
      if (SAVAGE_LANGUAGES.includes(lang)) {
        expect(data).toContain('rstl|savage|s');
      } else {
        expect(data).not.toContain('rstl|savage|s');
        expect(text).toContain(t(lang, 'roast_savage_unavailable'));
        expect(text).toContain(t(lang, 'roast_settings_current', { level: t(lang, 'roast_level_spicy') }));
      }
    }
  });

  test('turning it on shows a sample roast and when it comes; an old savage button outside ru/en saves spicy', async () => {
    for (const lang of LANGS) {
      const { handlers, store } = roastHandlers(lang, 'off');
      const ctx = ctxFor('rstl|spicy|s');
      ctx.match = ['rstl|spicy|s', 'spicy', 's'];
      await handlers.chooseLevel(ctx);
      const { text } = shown(ctx);
      expect(text).toContain(t(lang, 'roast_enabled_when'));
      expect(text).toMatch(/😈 /);
      expect(() => checkTelegramMarkdown(text)).not.toThrow();
      expect(store.level).toBe('spicy');
    }
    const { handlers, store } = roastHandlers('fr', 'off');
    const ctx = ctxFor('rstl|savage|s');
    ctx.match = ['rstl|savage|s', 'savage', 's'];
    await handlers.chooseLevel(ctx);
    expect(store.level).toBe('spicy');
  });
});

describe('new texts are valid Markdown in every language (Fix E)', () => {
  test('onboarding and budget hints', () => {
    const params = { timezone: formatter.escapeMarkdown('Asia/Kolkata (UTC+5:30)'), example: '30000 USD', max: '1 000 000 000 $', other: 'EUR', hours: '21:00', sample: '😈 x' };
    const keys = ['onb_q_timezone_last', 'onb_done_timezone_guess', 'onb_done_timezone_unknown', 'onb_done_reminders_auto_off',
      'onb_budget_need_number', 'onb_budget_too_big', 'onb_q_roast_spicy_only', 'onb_q_budget', 'roast_savage_unavailable',
      'roast_enabled_sample', 'roast_enabled_when', 'referral_intro', 'referral_welcome_note'];
    for (const lang of LANGS) {
      for (const key of keys) {
        const text = t(lang, key, { ...params, expenses: 3, activeDays: 2, days: 7 });
        expect(text).not.toBe(key);
        expect(text).not.toMatch(/\{\w+\}|%[A-Z]+%/);
        expect(() => checkTelegramMarkdown(text)).not.toThrow();
      }
    }
  });
});
