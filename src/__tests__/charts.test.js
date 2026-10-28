const charts = require('../utils/charts');
const ChartService = require('../services/ChartService');
const ChartRenderer = require('../services/ChartRenderer');
const ChartHandlers = require('../handlers/ChartHandlers');
const AchievementService = require('../services/AchievementService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');

const textOf = (lang, key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);
const sum = (list) => list.reduce((a, b) => a + b, 0);
const count = (text, needle) => text.split(needle).length - 1;

describe('charts: data preparation', () => {
  test('up to 8 categories are shown as they are, zero totals dropped', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ label: `c${i}`, total: 100 - i }));
    const grouped = charts.groupCategories([...items, { label: 'zero', total: 0 }]);
    expect(grouped).toHaveLength(8);
    expect(grouped.every(g => !g.other)).toBe(true);
  });

  test('30 categories: top 7 + «other» with the rest summed', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ label: `c${i}`, total: 30 - i }));
    const grouped = charts.groupCategories(items);
    expect(grouped).toHaveLength(8);
    expect(grouped.slice(0, 7).map(g => g.label)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
    expect(grouped[7]).toEqual({ other: true, total: sum(items.slice(7).map(i => i.total)), count: 23 });
    expect(sum(grouped.map(g => g.total))).toBe(sum(items.map(i => i.total)));
  });

  test('the default «Other» category joins the grouped tail instead of a second «other»', () => {
    const items = [
      { label: 'Другое', total: 1000, isOther: true },
      ...Array.from({ length: 9 }, (_, i) => ({ label: `c${i}`, total: 100 - i }))
    ];
    const grouped = charts.groupCategories(items);
    expect(grouped.filter(g => g.label === 'Другое')).toHaveLength(0);
    expect(grouped[7]).toMatchObject({ other: true, count: 3, total: 1000 + 93 + 92 });
  });

  test('percentages always add up to 100; tiny shares are «<1%»', () => {
    expect(charts.percentages([1, 1, 1])).toEqual([34, 33, 33]);
    expect(sum(charts.percentages([18200, 6400, 5300, 2100, 1900, 1500, 900, 360]))).toBe(100);
    expect(charts.percentages([0, 0])).toEqual([0, 0]);
    const tiny = charts.percentages([100000, 1]);
    expect(tiny).toEqual([100, 0]);
    expect(charts.percentLabel(tiny[1], 1)).toBe('<1%');
    expect(charts.percentLabel(0, 0)).toBe('0%');
  });

  test('trend average: from the first period with spending, the running period excluded', () => {
    const bars = [0, 0, 100, 200, 300, 50].map(value => ({ value }));
    expect(charts.trendAverage(bars, { excludeLast: true })).toBe(200);
    expect(charts.trendAverage(bars)).toBeCloseTo(162.5);
    expect(charts.trendAverage([0, 0, 0].map(value => ({ value })))).toBeNull();
  });

  test('scale top is a round number above the maximum', () => {
    expect(charts.niceMax(27000)).toBe(30000);
    expect(charts.niceMax(10000)).toBe(10000);
    expect(charts.niceMax(10800)).toBe(12000);
    expect(charts.niceMax(0)).toBe(1);
  });

  test('donut slices cover the circle in order', () => {
    const slices = charts.donutSlices([3, 1], 0);
    expect(slices[0]).toEqual({ from: 0, to: Math.PI * 1.5 });
    expect(slices[1].to).toBeCloseTo(Math.PI * 2);
    expect(charts.donutSlices([0, 0])).toEqual([]);
  });

  test('labels: emoji and control characters dropped, long text cut with «…» by graphemes', () => {
    expect(charts.cleanLabel('🍔 Еда\u0007  и  ☕ кофе 🇷🇺')).toBe('Еда и кофе');
    const cut = charts.fitText('श्रेणी के अनुसार खर्च बहुत लंबा नाम', 24, 120);
    expect(cut.endsWith('…')).toBe(true);
    expect(charts.textWidth(cut, 24)).toBeLessThanOrEqual(120);
    // Режет по границе слога: дальше в исходной строке не знак гласной
    const kept = cut.slice(0, -1).trimEnd();
    const original = 'श्रेणी के अनुसार खर्च बहुत लंबा नाम';
    expect(original.startsWith(kept)).toBe(true);
    expect(/^\p{M}/u.test(original.slice(kept.length).trimStart())).toBe(false);
    expect(charts.fitText('Еда', 24, 500)).toBe('Еда');
  });
});

describe('charts: SVG layout', () => {
  const item = (label, value, extra = {}) => ({ label, amount: `${value} ₽`, percent: '10%', value, other: false, ...extra });

  test('donut: legend rows, totals in the centre, XML escaped', () => {
    const svg = charts.donutSvg({
      title: 'Траты <по> категориям & ко', subtitle: '01.10 – 31.10.2026', total: '36 560 ₽', totalLabel: 'потрачено', brand: '@bot',
      items: [item('Еда', 300), item('Такси', 200), { label: 'Остальное (3)', amount: '50 ₽', percent: '<1%', value: 50, other: true }]
    });
    expect(svg).toContain('Траты &lt;по&gt; категориям &amp; ко');
    expect(svg).toContain('36 560 ₽');
    expect(svg).toContain('&lt;1%');
    expect(count(svg, '<path d="M')).toBe(3); // три куска кольца
    expect(svg).toContain(charts.OTHER_COLOR);
    expect(svg).toContain('@bot');
  });

  test('donut: empty period — grey ring and the empty text, no legend', () => {
    const svg = charts.donutSvg({ title: 'T', subtitle: 'S', total: '0 ₽', totalLabel: 'spent', emptyText: 'No expenses in this period', items: [] });
    expect(svg).toContain('No expenses in this period');
    expect(svg).toContain(`stroke="${charts.THEME.empty}"`);
    expect(svg).not.toContain('<path d="M');
  });

  test('donut: a single category is a full ring of its colour', () => {
    const svg = charts.donutSvg({ title: 'T', total: '5 ₽', items: [item('Еда', 5, { percent: '100%' })] });
    expect(svg).toContain(`stroke="${charts.PALETTE[0]}"`);
    expect(svg).not.toContain('<path d="M');
  });

  test('donut: long category names are cut to the legend width', () => {
    const long = 'Очень длинное название категории, которое не помещается в легенду ни при каком раскладе';
    const svg = charts.donutSvg({ title: 'T', total: '5 ₽', items: [item(long, 5)] });
    expect(svg).not.toContain(long);
    expect(svg).toMatch(/Очень длинное[^<]*…/);
  });

  test('donut: the picture grows with the legend, never cuts rows', () => {
    const eight = Array.from({ length: 8 }, (_, i) => item(`c${i}`, 10 - i));
    const svg = charts.donutSvg({ title: 'T', total: '1 ₽', items: eight });
    for (let i = 0; i < 8; i++) expect(svg).toContain(`>c${i}<`);
    expect(svg).toMatch(/height="(\d+)"/);
  });

  test('trend: 6 bars, the current one highlighted, average dashed line with its label', () => {
    const bars = ['may', 'jun', 'jul', 'aug', 'sep', 'oct'].map((label, i) => ({ label, value: (i + 1) * 100, amount: `${(i + 1) * 100} ₽`, current: i === 5 }));
    const svg = charts.trendSvg({ title: 'Spending by period', subtitle: 'S', bars, average: 300, averageLabel: 'average 300 ₽' });
    expect(count(svg, `fill="${charts.THEME.current}"`)).toBe(1);
    expect(count(svg, `fill="${charts.THEME.bar}"`)).toBe(5);
    expect(svg).toContain('average 300 ₽');
    expect(svg).toContain('stroke-dasharray');
    for (const bar of bars) expect(svg).toContain(`>${bar.label}<`);
  });

  test('trend: nothing spent — empty text, no bars, no average', () => {
    const bars = Array.from({ length: 6 }, (_, i) => ({ label: `p${i}`, value: 0, amount: '0 ₽', current: i === 5 }));
    const svg = charts.trendSvg({ title: 'T', bars, average: null, emptyText: 'No expenses in this period' });
    expect(svg).toContain('No expenses in this period');
    expect(svg).not.toContain('stroke-dasharray');
    expect(svg).not.toContain(`fill="${charts.THEME.current}"`);
  });

  test('wrapped card: numbers, tiles and rows; rows that do not fit are skipped', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ label: `row${i}`, value: `${i}`, detail: 'd' }));
    const svg = charts.wrappedCardSvg({
      title: 'Month in review', subtitle: '01.10 – 31.10.2026', total: '36 560 ₽', totalLabel: 'spent', brand: '@bot', footer: 'f',
      tiles: [{ value: '87', label: 'records' }, { value: '24', label: 'days' }], rows
    });
    expect(svg).toContain('36 560 ₽');
    expect(svg).toContain('>87<');
    expect(svg).toContain('>row0<');
    expect(svg).not.toContain('>row5<');
  });
});

describe('ChartRenderer: fonts by character', () => {
  // Без HarfBuzz: семейства с наборами символов, как после ready()
  function renderer() {
    const r = new ChartRenderer({ resvg: {}, fonts: [] });
    const family = (name, text) => ({ name, regular: { cover: new Set([...text].map(ch => ch.codePointAt(0))) } });
    r.families = [family('latin', 'abcЕдаеда 0123456789₽'), family('deva', 'सारकीओ '), family('cjk', '字あ')];
    return r;
  }

  test('spaces and digits stay with the previous script so words are shaped together', () => {
    const runs = renderer().runs('Еда सा की 12 字');
    expect(runs.map(run => [run.family.name, run.text])).toEqual([['latin', 'Еда '], ['deva', 'सा की '], ['latin', '12 '], ['cjk', '字']]);
  });

  test('unsupported characters: UI text is rejected, user labels lose them', () => {
    const r = renderer();
    expect(r.textSupported('Еда 字')).toBe(true);
    expect(r.textSupported('مرحبا')).toBe(false);
    expect(r.sanitize('Еда مرحبا 字')).toBe('Еда 字');
    expect(r.sanitize('مرحبا')).toBe('…');
  });

  test('without @resvg/resvg-js charts are off', () => {
    expect(new ChartRenderer({ resvg: null, fonts: [] }).available).toBe(false);
  });
});

// Рендер-заглушка: SVG вместо PNG, шрифты «умеют» всё, кроме арабского
function fakeRenderer() {
  return {
    available: true,
    ready: async () => true,
    textSupported: (text) => !/\p{Script=Arabic}/u.test(text),
    sanitize: (text) => text,
    createText: () => charts.estimateText(),
    render: jest.fn(async (svg) => Buffer.from(svg))
  };
}

function chartService({ categories = [], totals = null, perPeriod = null, startDay = 1, lang = 'ru', renderer = fakeRenderer() } = {}) {
  const rates = { RUB: 1, USD: 100, EUR: 110 };
  const currencyUtils = { convert: async (amount, from, to) => amount * rates[from] / rates[to] };
  const formatter = new Formatter(currencyUtils);
  const expenseService = {
    getPeriodContext: jest.fn(async (userId, kind, offset) => {
      const { customPeriod } = require('../utils/period');
      return { timezone: 'UTC', currency: 'RUB', startDay, today: '2026-10-28', period: customPeriod('2026-10-28', startDay, offset) };
    }),
    getTotals: jest.fn(async (userId, tz, period) => (perPeriod ? perPeriod(period) : totals) || { byCurrency: [], count: 0 }),
    getCategoryById: jest.fn(async (userId, id) => (id === 13 ? { id: 13, name: 'Еда', icon: '🍔' } : null))
  };
  const reportService = { categoryBreakdown: jest.fn(async () => categories) };
  const service = new ChartService({ expenseService, reportService, localizationService: new LocalizationService(), formatter, chartRenderer: renderer });
  return { service, expenseService, reportService, renderer, lang };
}

describe('ChartService', () => {
  test('donut uses the converted totals of the text overview (multi-currency)', async () => {
    const { service } = chartService({
      totals: { byCurrency: [{ currency: 'RUB', total: '1000' }, { currency: 'USD', total: '20' }], count: 3 },
      categories: [{ id: 1, name: 'Еда', icon: '🍔', total: 2500 }, { id: 2, name: 'Транспорт', icon: '🚕', total: 500 }]
    });
    const chart = await service.donut(1, 'ru', 0, { botUsername: 'ExpensesAssistant_bot' });
    const svg = chart.png.toString();
    expect(svg).toContain(new Formatter().formatAmount(3000, 'RUB')); // 1000 ₽ + 20 $ × 100
    expect(svg).toContain('Еда');
    expect(svg).toContain('83%');
    expect(svg).toContain('17%');
    expect(svg).toContain('@ExpensesAssistant_bot');
    expect(svg).not.toContain('🍔');
    expect(chart.caption).toContain('01.10 – 31.10.2026');
  });

  test('donut: empty month renders the empty state', async () => {
    const { service } = chartService();
    const svg = (await service.donut(1, 'en', 0)).png.toString();
    expect(svg).toContain('No expenses in this period');
  });

  test('donut: 30 categories → 7 + «Other (23)»', async () => {
    const categories = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Категория ${i + 1}`, icon: '📦', total: 1000 - i }));
    const { service } = chartService({ totals: { byCurrency: [{ currency: 'RUB', total: String(sum(categories.map(c => c.total))) }], count: 30 }, categories });
    const svg = (await service.donut(1, 'ru', 0)).png.toString();
    expect(svg).toContain('Остальное (23)');
    expect(svg).toContain('Категория 7<');
    expect(svg).not.toContain('Категория 8<');
  });

  test('no font for the interface language — no picture (png: null), caption kept', async () => {
    const renderer = fakeRenderer();
    renderer.textSupported = () => false;
    const { service } = chartService({ renderer });
    const chart = await service.donut(1, 'jp', 0);
    expect(chart.png).toBeNull();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  test('trend: 6 periods ending with the selected one, the running period out of the average', async () => {
    const values = { '2026-05-01': 0, '2026-06-01': 1000, '2026-07-01': 2000, '2026-08-01': 3000, '2026-09-01': 2000, '2026-10-01': 500 };
    const { service, expenseService } = chartService({
      perPeriod: (period) => (values[period.start] ? { byCurrency: [{ currency: 'RUB', total: String(values[period.start]) }], count: 1 } : { byCurrency: [], count: 0 })
    });
    const chart = await service.trend(1, 'ru', 0);
    expect(expenseService.getTotals).toHaveBeenCalledTimes(6);
    expect(chart.text.split('\n').filter(line => /—/.test(line))).toHaveLength(6);
    expect(chart.text).toContain('*окт. — 500');
    expect(chart.text).toMatch(/в среднем 2\s000/); // средняя (1000+2000+3000+2000)/4
    expect(chart.png.toString()).toContain(`fill="${charts.THEME.current}"`);
  });

  test('trend by category reads the same breakdown as the overview; unknown category → null', async () => {
    const { service, reportService } = chartService({ categories: [{ id: 13, name: 'Еда', icon: '🍔', total: 700 }] });
    const chart = await service.trend(1, 'ru', -1, { categoryId: 13 });
    expect(reportService.categoryBreakdown).toHaveBeenCalledTimes(6);
    expect(chart.caption).toContain('🍔 Еда');
    expect(chart.png.toString()).toContain('Как менялись траты: Еда');
    expect(await service.trend(1, 'ru', 0, { categoryId: 99 })).toBeNull();
  });

  test('trend falls back to text when the picture cannot be drawn', async () => {
    const renderer = fakeRenderer();
    renderer.textSupported = () => false;
    const { service } = chartService({ renderer, totals: { byCurrency: [{ currency: 'RUB', total: '100' }], count: 1 } });
    const chart = await service.trend(1, 'ru', 0);
    expect(chart.png).toBeNull();
    expect(chart.text).toContain('📈 *Траты по периодам*');
  });

  test('period labels: month names in the user language, dates for custom period starts, year across new year', () => {
    const { service } = chartService();
    const { customPeriod } = require('../utils/period');
    const periods = [-1, 0].map(k => customPeriod('2026-10-28', 1, k));
    expect(service.periodLabels(periods, 'en', 1)).toEqual(['Sep', 'Oct']);
    expect(service.periodLabels(periods, 'jp', 1)).toEqual(['9月', '10月']);
    expect(service.periodLabels([customPeriod('2026-10-28', 25, -1)], 'ru', 25)).toEqual(['25.09']);
    const crossing = [-1, 0].map(k => customPeriod('2027-01-10', 1, k));
    expect(service.periodLabels(crossing, 'en', 1)).toEqual(['Dec 26', 'Jan 27']);
  });

  test('wrapped card: numbers, top category, biggest purchase by category — no descriptions', async () => {
    const { service } = chartService();
    const card = {
      period: { start: '2026-10-01', end: '2026-11-01', last: '2026-10-31' }, currency: 'RUB', total: 36560, count: 87, days: 24, streak: 12,
      top: { name: 'Еда', total: 18200, percent: 50 }, comparison: { count: 15, key: 'pizza' },
      largest: { amount: 99, currency: 'USD', categoryName: 'Покупки', day: '2026-10-14' },
      biggestDay: { day: '2026-10-14', total: 12400 }
    };
    const svg = (await service.wrappedCard(card, 'ru', { botUsername: 'ExpensesAssistant_bot' })).toString();
    expect(svg).toContain('Итоги месяца');
    expect(svg).toContain('>87<');
    expect(svg).toContain('>12<');
    expect(svg).toContain('Еда');
    expect(svg).toContain('Покупки · 14.10');
    expect(svg).toContain('Это примерно 15 × пицца');
    expect(svg).toContain('@ExpensesAssistant_bot');
  });
});

describe('AchievementService.buildWrapped card', () => {
  test('card carries numbers and categories only, the biggest purchase by converted amount', async () => {
    const rates = { RUB: 1, USD: 100 };
    const expenses = [
      { amount: '3000', currency: 'RUB', description: 'секретный подарок', category_name: 'Подарки', created_at_utc: '2026-10-03T10:00:00Z' },
      { amount: '50', currency: 'USD', description: 'тайная покупка', category_name: 'Покупки', created_at_utc: '2026-10-05T10:00:00Z' },
      { amount: '200', currency: 'RUB', description: 'кофе', category_name: 'Еда', created_at_utc: '2026-10-05T12:00:00Z' }
    ];
    const formatter = new Formatter({ convert: async (a, f, t) => a * rates[f] / rates[t] });
    const service = new AchievementService({
      achievementRepository: {
        getDays: async () => ({ expenseDays: ['2026-10-03', '2026-10-04', '2026-10-05'], incomeDays: [], markDays: [] }),
        getFreezes: async () => [],
        getUnlockedBetween: async () => []
      },
      userService: {},
      premiumService: {},
      expenseService: {
        getPeriodContext: async () => ({ timezone: 'UTC', currency: 'RUB', period: { start: '2026-10-01', end: '2026-11-01', last: '2026-10-31' } }),
        getExpenses: async () => expenses
      },
      reportService: {
        categoryBreakdown: async () => [{ name: 'Покупки', total: 5000 }, { name: 'Подарки', total: 3000 }, { name: 'Еда', total: 200 }],
        categoryLabel: (c) => c.name
      },
      budgetService: {},
      savingsService: null,
      currencyUtils: { convert: async (a, f, t) => a * rates[f] / rates[t] },
      formatter,
      localizationService: { getText: textOf },
      notificationService: {},
      userNotificationRepository: {}
    });
    const { card } = await service.buildWrapped(1, 'ru', -1);
    expect(card).toMatchObject({
      total: 8200, count: 3, days: 2, streak: 3, currency: 'RUB',
      top: { name: 'Покупки', total: 5000, percent: 61 },
      largest: { amount: 50, currency: 'USD', categoryName: 'Покупки', day: '2026-10-05' },
      biggestDay: { day: '2026-10-05', total: 5200 }
    });
    expect(JSON.stringify(card)).not.toMatch(/секретный|тайная|кофе/);
  });
});

describe('AchievementService.processWrapped with a card', () => {
  function service({ card = Buffer.from('png'), text = '🎉 *wrapped*' } = {}) {
    const notificationService = { sendMessage: jest.fn(async () => {}), sendPhoto: jest.fn(async () => {}), botUsername: () => 'bot' };
    const s = new AchievementService({
      achievementRepository: { getWrappedCandidates: async () => [{ id: 5, language: 'ru', timezone: 'UTC', period_start_day: 1 }] },
      userService: { getUserCurrency: async () => 'RUB' },
      localizationService: { getText: textOf },
      notificationService,
      userNotificationRepository: { markSent: async () => true },
      chartService: { available: true, wrappedCard: jest.fn(async () => card) }
    });
    s.buildWrapped = jest.fn(async () => ({ text, period: { start: '2026-10-01' }, card: {} }));
    s.wasUnderBudget = async () => false;
    return { s, notificationService };
  }

  test('the card goes as a photo with the wrapped text as caption and a share button', async () => {
    const { s, notificationService } = service();
    expect(await s.processWrapped(new Date('2026-11-01T12:00:00Z'))).toBe(1);
    const [userId, png, extra] = notificationService.sendPhoto.mock.calls[0];
    expect(userId).toBe(5);
    expect(png.toString()).toBe('png');
    expect(extra.caption).toBe('🎉 *wrapped*');
    expect(extra.reply_markup.inline_keyboard.map(row => row[0].callback_data)).toEqual(['ach', 'achwi|-1', 'achwo']);
    expect(notificationService.sendMessage).not.toHaveBeenCalled();
  });

  test('too long for a caption or no picture — plain text as before', async () => {
    const long = service({ text: 'x'.repeat(1100) });
    await long.s.processWrapped(new Date('2026-11-01T12:00:00Z'));
    expect(long.notificationService.sendPhoto).not.toHaveBeenCalled();
    expect(long.notificationService.sendMessage).toHaveBeenCalled();
    const none = service({ card: null });
    await none.s.processWrapped(new Date('2026-11-01T12:00:00Z'));
    expect(none.notificationService.sendMessage).toHaveBeenCalled();
  });
});

describe('ChartHandlers', () => {
  function handlers({ premium = false, chart = { png: Buffer.from('png'), caption: 'cap', text: 'txt' }, wrapped = { card: {} } } = {}) {
    const chartService = {
      available: true,
      donut: jest.fn(async () => chart),
      trend: jest.fn(async () => chart),
      wrappedCard: jest.fn(async () => Buffer.from('card'))
    };
    const h = new ChartHandlers({
      chartService,
      achievementService: { buildWrapped: jest.fn(async () => wrapped) },
      premiumService: { isPremiumUser: jest.fn(async () => premium) },
      userService: { getUserLanguage: async () => 'ru' },
      localizationService: { getText: textOf }
    });
    return { h, chartService };
  }

  function ctx({ photo = false } = {}) {
    return {
      from: { id: 1 },
      botInfo: { username: 'ExpensesAssistant_bot' },
      callbackQuery: { data: 'x', message: photo ? { message_id: 3, photo: [{}] } : { message_id: 3, text: 'overview' } },
      answerCbQuery: jest.fn(async () => true),
      editMessageText: jest.fn(async () => {
        if (photo) throw new Error('Bad Request: there is no text in the message to edit');
        return true;
      }),
      editMessageMedia: jest.fn(async () => true),
      reply: jest.fn(async () => true),
      replyWithPhoto: jest.fn(async () => true)
    };
  }

  test('free: the current month donut is a new photo message with navigation', async () => {
    const { h, chartService } = handlers();
    const c = ctx();
    await h.showDonut(c, 0);
    expect(chartService.donut).toHaveBeenCalledWith(1, 'ru', 0, { botUsername: 'ExpensesAssistant_bot' });
    const [media, extra] = c.replyWithPhoto.mock.calls[0];
    expect(media.source.toString()).toBe('png');
    expect(extra.reply_markup.inline_keyboard.map(row => row.map(b => b.callback_data))).toEqual([['chp|-1'], ['cht|0'], ['ov|0']]);
  });

  test('free: past periods and trends show the premium teaser', async () => {
    const { h, chartService } = handlers();
    const c = ctx({ photo: true });
    await h.showDonut(c, -1);
    await h.showTrend(c, 0);
    await h.showTrend(c, 0, 13);
    expect(chartService.donut).not.toHaveBeenCalled();
    expect(chartService.trend).not.toHaveBeenCalled();
    // Под картинкой текст не отредактировать — тизер приходит новым сообщением
    expect(c.reply).toHaveBeenCalledTimes(3);
    expect(c.reply.mock.calls[0][0]).toBe('chart_premium_teaser');
    expect(c.reply.mock.calls[0][1].reply_markup.inline_keyboard[0][0].callback_data).toBe('premium_subscription');
  });

  test('premium: navigation under the picture swaps the image in place', async () => {
    const { h } = handlers({ premium: true });
    const c = ctx({ photo: true });
    await h.showDonut(c, -2);
    const [media, extra] = c.editMessageMedia.mock.calls[0];
    expect(media).toMatchObject({ type: 'photo', caption: 'cap', parse_mode: 'Markdown' });
    expect(extra.reply_markup.inline_keyboard[0].map(b => b.callback_data)).toEqual(['chp|-3', 'chp|-1']);
    expect(c.replyWithPhoto).not.toHaveBeenCalled();
  });

  test('premium: category trend keeps the category in navigation; text fallback without a picture', async () => {
    const { h } = handlers({ premium: true, chart: { png: null, caption: 'cap', text: '📈 text' } });
    const c = ctx();
    await h.showTrend(c, -1, 13);
    const [text, extra] = c.editMessageText.mock.calls[0];
    expect(text).toBe('📈 text');
    expect(extra.reply_markup.inline_keyboard.map(row => row.map(b => b.callback_data))).toEqual([['chc|13|-2', 'chc|13|0'], ['oc|13|-1|0'], ['ov|-1']]);
  });

  test('unknown category or render failure answer with an alert', async () => {
    const gone = handlers({ premium: true, chart: null });
    const c = ctx();
    await gone.h.showTrend(c, 0, 99);
    expect(c.answerCbQuery).toHaveBeenCalledWith('button_outdated', { show_alert: true });
    const broken = handlers();
    broken.chartService.donut.mockRejectedValue(new Error('boom'));
    const c2 = ctx();
    await broken.h.showDonut(c2, 0);
    expect(c2.answerCbQuery).toHaveBeenCalledWith('chart_unavailable', { show_alert: true });
    expect(c2.replyWithPhoto).not.toHaveBeenCalled();
  });

  test('wrapped share: free, a separate photo with only the bot link in the caption', async () => {
    const { h, chartService } = handlers();
    const c = ctx();
    await h.shareWrapped(c, -1);
    expect(chartService.wrappedCard).toHaveBeenCalled();
    const [media, extra] = c.replyWithPhoto.mock.calls[0];
    expect(media.source.toString()).toBe('card');
    expect(extra.caption).toBe('chart_card_caption:{"link":"https://t.me/ExpensesAssistant_bot?start=wrapped"}');
    expect(extra.reply_markup.inline_keyboard[0][0].url).toBe('https://t.me/ExpensesAssistant_bot?start=wrapped');
    expect(c.answerCbQuery).toHaveBeenCalledWith('chart_card_hint');
  });

  test('wrapped share without expenses — alert, no photo', async () => {
    const { h } = handlers({ wrapped: null });
    const c = ctx();
    await h.shareWrapped(c, 0);
    expect(c.answerCbQuery).toHaveBeenCalledWith('chart_empty', { show_alert: true });
    expect(c.replyWithPhoto).not.toHaveBeenCalled();
  });
});

describe('chart locale keys', () => {
  test('every language has every chart key', () => {
    const localization = new LocalizationService();
    const keys = Object.keys(require('../locales/ru')).filter(key => /^(chart_|button_chart|button_wrapped_share)/.test(key));
    expect(keys.length).toBeGreaterThanOrEqual(25);
    for (const lang of ['ru', 'en', 'es', 'fr', 'de', 'pt', 'tr', 'hi', 'ka', 'kz', 'uz', 'jp', 'zh']) {
      const locale = require(`../locales/${lang}`);
      for (const key of keys) expect([lang, key, typeof locale[key]]).toEqual([lang, key, 'string']);
    }
    expect(localization.getText('en', 'chart_other', { count: 3 })).toBe('Other (3)');
  });
});
