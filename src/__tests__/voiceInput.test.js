const fs = require('fs');
const os = require('os');
const path = require('path');
const { WhisperStt, createSttFromEnv, audioContext } = require('../services/voice/whisper');
const VoiceService = require('../services/VoiceService');
const EntryBatchService = require('../services/EntryBatchService');
const MultiEntryHandlers = require('../handlers/MultiEntryHandlers');
const LocalizationService = require('../services/LocalizationService');
const EnhancedValidator = require('../utils/enhancedValidator');
const Formatter = require('../utils/formatter');

const localization = new LocalizationService();
const t = (key, params) => localization.getText('ru', key, params);

// Поддельные ffmpeg и whisper-cli: проверяем настоящий запуск процессов, аргументы, таймаут и уборку файлов
function fakeTools(transcript, { sleep = 0 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-stt-'));
  const argsLog = path.join(dir, 'args.log');
  const ffmpeg = path.join(dir, 'ffmpeg');
  const whisper = path.join(dir, 'whisper-cli');
  const model = path.join(dir, 'model.bin');
  fs.writeFileSync(model, 'model');
  // ffmpeg: последний аргумент — WAV; копируем вход, чтобы whisper видел файл
  fs.writeFileSync(ffmpeg, '#!/bin/sh\nin=""; prev=""; for a in "$@"; do [ "$prev" = "-i" ] && in="$a"; prev="$a"; out="$a"; done\ncp "$in" "$out"\n', { mode: 0o755 });
  fs.writeFileSync(whisper, `#!/bin/sh
echo "$@" >> "${argsLog}"
of=""; f=""; prev=""; for a in "$@"; do [ "$prev" = "-of" ] && of="$a"; [ "$prev" = "-f" ] && f="$a"; prev="$a"; done
ls "$(dirname "$f")" >> "${argsLog}"
sleep ${sleep}
printf '%s\\n' "${transcript}" > "$of.txt"
`, { mode: 0o755 });
  return { dir, ffmpeg, whisper, model, args: () => fs.readFileSync(argsLog, 'utf8') };
}

describe('whisper STT wrapper', () => {
  it('converts, runs whisper-cli with the language and audio context, returns the text and removes temp files', async () => {
    const tools = fakeTools(' Кофе 250 и такси 400. ');
    const stt = new WhisperStt({ binary: tools.whisper, model: tools.model, ffmpeg: tools.ffmpeg, threads: 3 });
    const before = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('voice-')).length;
    const text = await stt.transcribe(Buffer.from('OggS'), { language: 'ru', durationSec: 3 });
    expect(text).toBe('Кофе 250 и такси 400.');
    const args = tools.args();
    expect(args).toContain('-l ru');
    expect(args).toContain('-t 3');
    expect(args).toContain('-ac 512');
    expect(args).toContain('-nt -np -otxt');
    expect(args).toMatch(/in\.ogg/); // файлы лежат в своей временной папке…
    expect(fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('voice-')).length).toBe(before); // …и удалены
  });

  it('kills a hung whisper after the timeout', async () => {
    const tools = fakeTools('late', { sleep: 5 });
    const stt = new WhisperStt({ binary: tools.whisper, model: tools.model, ffmpeg: tools.ffmpeg, timeoutMs: 300 });
    const started = Date.now();
    await expect(stt.transcribe(Buffer.from('OggS'), { language: 'auto' })).rejects.toMatchObject({ code: 'timeout' });
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it('runs one recognition at a time and reports the queue', async () => {
    const tools = fakeTools('ok', { sleep: 0.3 });
    const stt = new WhisperStt({ binary: tools.whisper, model: tools.model, ffmpeg: tools.ffmpeg });
    const positions = [];
    const first = stt.transcribe(Buffer.from('a'), { language: 'ru' });
    const second = stt.transcribe(Buffer.from('b'), { language: 'ru', onQueued: position => positions.push(position) });
    await Promise.all([first, second]);
    expect(positions).toEqual([1, 0]);
  });

  it('audio context covers the clip: at least 512, full window (0) from 30 s', () => {
    expect(audioContext(0)).toBe(0);
    expect(audioContext(3)).toBe(512);
    expect(audioContext(12)).toBe(650);
    expect(audioContext(29)).toBe(0); // 29 × 50 + 50 = 1500 — уже полное окно
    expect(audioContext(60)).toBe(0);
  });

  it('is not configured without VOICE_STT_BIN / VOICE_STT_MODEL or when the files are missing', () => {
    const tools = fakeTools('x');
    expect(createSttFromEnv({})).toBeNull();
    expect(createSttFromEnv({ VOICE_STT_BIN: tools.whisper })).toBeNull();
    expect(createSttFromEnv({ VOICE_STT_BIN: tools.whisper, VOICE_STT_MODEL: '/nope/model.bin' })).toBeNull();
    const stt = createSttFromEnv({ VOICE_STT_BIN: tools.whisper, VOICE_STT_MODEL: tools.model, VOICE_STT_THREADS: '2', VOICE_STT_TIMEOUT_MS: '5000' });
    expect(stt).toMatchObject({ threads: 2, timeoutMs: 5000, configured: true });
  });
});

// Партии записей и счётчик голосовых в памяти вместо БД
function memoryRepository() {
  const batches = [];
  const expenses = [];
  const incomes = [];
  const usage = new Map();
  let nextId = 1;
  const categories = { 1: { name: 'Кафе', icon: '☕' }, 6: { name: 'Другое', icon: '📦' } };
  return {
    batches, expenses, incomes, usage,
    create: jest.fn(async (userId, { source, familyId, expenses: items, incomes: incomeItems }) => {
      const id = batches.length + 1;
      batches.push({ id, user_id: userId, source, status: 'active', item_count: items.length + incomeItems.length });
      for (const item of items) {
        expenses.push({ id: nextId++, batch_id: id, user_id: userId, amount: String(item.amount), currency: item.currency, description: item.description, category_id: item.categoryId, family_id: familyId, category_name: categories[item.categoryId].name, category_icon: categories[item.categoryId].icon });
      }
      for (const item of incomeItems) incomes.push({ id: nextId++, batch_id: id, user_id: userId, amount: String(item.amount), currency: item.currency, description: item.description });
      return id;
    }),
    getById: async (userId, id) => batches.find(b => b.id === id && b.user_id === userId),
    getExpenses: async (userId, id) => expenses.filter(e => e.batch_id === id && e.user_id === userId),
    getIncomes: async (userId, id) => incomes.filter(e => e.batch_id === id && e.user_id === userId),
    undo: async (userId, id) => {
      const batch = batches.find(b => b.id === id && b.user_id === userId && b.status !== 'undone');
      if (!batch) return null;
      batch.status = 'undone';
      const removed = { expenses: 0, incomes: 0 };
      for (const [list, key] of [[expenses, 'expenses'], [incomes, 'incomes']]) {
        for (let i = list.length - 1; i >= 0; i--) if (list[i].batch_id === id) { list.splice(i, 1); removed[key]++; }
      }
      return removed;
    },
    getVoiceCount: async (userId, day) => usage.get(`${userId}:${day}`) || 0,
    incrementVoiceCount: async (userId, day) => {
      const key = `${userId}:${day}`;
      usage.set(key, (usage.get(key) || 0) + 1);
      return usage.get(key);
    }
  };
}

function setup({ transcripts = ['Кофе 250 и такси 400.'], configured = true, isPremium = false, used = 0 } = {}) {
  const repo = memoryRepository();
  const stt = {
    configured: true,
    transcribe: jest.fn(async () => {
      const next = transcripts.length > 1 ? transcripts.shift() : transcripts[0];
      if (next instanceof Error) throw next;
      return next;
    })
  };
  const premiumService = {
    isPremiumUser: jest.fn(async () => isPremium),
    getUserLimits: async () => ({ MAX_DESCRIPTION_LENGTH: isPremium ? 160 : 80 })
  };
  const voiceService = new VoiceService({ stt: configured ? stt : null, entryBatchRepository: repo, premiumService });
  if (used) repo.usage.set(`7:${new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date())}`, used);
  const expenseService = {
    getCategories: async () => [{ id: 1, name: 'Кафе', icon: '☕' }, { id: 6, name: 'Другое', icon: '📦' }],
    getDefaultCategory: async () => ({ id: 6, name: 'Другое', icon: '📦' }),
    getRememberedCategory: async (userId, description, categories) => (description && description.toLowerCase() === 'кофе' ? categories[0] : null)
  };
  const incomeService = { getIncomeCurrency: async () => 'USD' };
  const userService = {
    getUserLanguage: async () => 'ru',
    getUserTimezone: async () => 'Europe/Moscow',
    getUserCurrency: async () => 'RUB'
  };
  const funnelService = { track: jest.fn(async () => {}) };
  const entryBatchService = new EntryBatchService({ entryBatchRepository: repo, expenseService, incomeService, userService, funnelService });
  const expenseHandlers = {
    registerBackView: jest.fn(),
    familyModeTarget: jest.fn(async () => null),
    handleExpenseInput: jest.fn(async () => true),
    sendBudgetWarnings: jest.fn(async () => {}),
    roastNote: jest.fn(async () => ''),
    inputErrorText: async (userId, lang, error) => (error === 'amount' ? t('error_amount', { max: '99 999 999' }) : t('error_format'))
  };
  const incomeHandlers = { handleIncomeInput: jest.fn(async () => {}) };
  const handlers = new MultiEntryHandlers({
    entryBatchService, voiceService, expenseHandlers, incomeHandlers, expenseService, incomeService, premiumService, userService,
    localizationService: localization,
    formatter: new Formatter({ convert: async (amount) => amount }),
    validator: new EnhancedValidator()
  });
  handlers.download = jest.fn(async () => Buffer.from('OggS'));
  let messageId = 100;
  const ctx = {
    chat: { id: 7, type: 'private' },
    from: { id: 7 },
    message: { voice: { file_id: 'v1', duration: 4, file_size: 9000 } },
    reply: jest.fn(async () => ({ message_id: ++messageId })),
    sendChatAction: jest.fn(async () => true),
    telegram: { editMessageText: jest.fn(async () => true) }
  };
  const lastEdit = () => {
    const call = ctx.telegram.editMessageText.mock.calls[ctx.telegram.editMessageText.mock.calls.length - 1];
    return { messageId: call[1], text: call[3], extra: call[4] || {} };
  };
  return { handlers, repo, stt, ctx, expenseHandlers, incomeHandlers, funnelService, lastEdit };
}

const buttons = (extra) => (extra.reply_markup ? extra.reply_markup.inline_keyboard.flat().map(b => b.callback_data) : []);

describe('voice messages → records (fake STT)', () => {
  it('returns before recognition; the status message becomes the transcript + one summary card for several records', async () => {
    const { handlers, repo, ctx, stt, lastEdit, funnelService, expenseHandlers } = setup();
    await handlers.handleVoice(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(t('voice_recognizing'));
    await handlers.idle();
    expect(stt.transcribe).toHaveBeenCalledWith(Buffer.from('OggS'), expect.objectContaining({ language: 'ru', durationSec: 4 }));
    const { messageId, text, extra } = lastEdit();
    expect(messageId).toBe(101);
    expect(text).toContain(t('voice_heard', { text: 'Кофе 250 и такси 400.' }));
    expect(text).toContain(t('multi_recorded_title', { count: 2 }));
    expect(text).toMatch(/1\. Кофе — \*250\s₽\* · ☕ Кафе/);
    expect(text).toMatch(/2\. такси — \*400\s₽\* · 📦 Другое/);
    expect(text).toContain(t('multi_default_category_hint', { category: 'Другое' }));
    expect(buttons(extra)).toEqual(['ex|1|v.1', 'ex|2|v.1', 'vcx|1']);
    expect(repo.batches[0]).toMatchObject({ source: 'voice', item_count: 2 });
    // «такси» записано в категорию по умолчанию — она помечена как угаданная и не запомнится для описания
    expect(repo.create.mock.calls[0][1].expenses.map(e => [e.description, e.categoryId, e.guessed])).toEqual([['Кофе', 1, false], ['такси', 6, true]]);
    expect([...repo.usage.values()]).toEqual([1]);
    expect(funnelService.track).toHaveBeenCalledWith(7, 'first_expense');
    expect(expenseHandlers.sendBudgetWarnings).toHaveBeenCalledWith(ctx, 7, 'ru', ['Кафе', 'Другое']);
    expect(handlers.busyUsers.size).toBe(0);
  });

  it('number words, income and currencies: «плюс пятьдесят тысяч зарплата, обед шестьсот рублей»', async () => {
    const { handlers, repo, ctx, lastEdit } = setup({ transcripts: ['плюс пятьдесят тысяч зарплата, обед шестьсот рублей'] });
    await handlers.handleVoice(ctx);
    await handlers.idle();
    expect(repo.expenses.map(e => [e.amount, e.currency, e.description])).toEqual([['600', 'RUB', 'обед']]);
    expect(repo.incomes.map(e => [e.amount, e.currency, e.description])).toEqual([['50000', 'USD', 'зарплата']]);
    expect(buttons(lastEdit().extra)).toEqual(['ex|1|v.1', 'in|2', 'vcx|1']);
  });

  it('a single record goes through the usual input (category picker), with the transcript above it', async () => {
    const { handlers, repo, ctx, lastEdit, expenseHandlers, incomeHandlers } = setup({ transcripts: ['Двести пятьдесят рублей кофе.'] });
    await handlers.handleVoice(ctx);
    await handlers.idle();
    expect(lastEdit().text).toBe(t('voice_heard', { text: 'Двести пятьдесят рублей кофе.' }));
    expect(expenseHandlers.handleExpenseInput).toHaveBeenCalledWith(ctx, '250 RUB кофе', 'ru');
    expect(incomeHandlers.handleIncomeInput).not.toHaveBeenCalled();
    expect(repo.batches).toHaveLength(0);
  });

  it('a single income goes to the usual income input', async () => {
    const { handlers, ctx, incomeHandlers } = setup({ transcripts: ['плюс 1000 долларов фриланс'] });
    await handlers.handleVoice(ctx);
    await handlers.idle();
    expect(incomeHandlers.handleIncomeInput).toHaveBeenCalledWith(ctx, '+1000 USD фриланс', 'ru');
  });

  it('nothing parseable: transcript + hint; the user language is retried with language detection once', async () => {
    const { handlers, ctx, stt, lastEdit, repo } = setup({ transcripts: ['Привет, как дела?', 'Hello, how are you?'] });
    await handlers.handleVoice(ctx);
    await handlers.idle();
    expect(stt.transcribe.mock.calls.map(call => call[1].language)).toEqual(['ru', 'auto']);
    expect(lastEdit().text).toBe(`${t('voice_heard', { text: 'Привет, как дела?' })}\n\n${t('voice_no_amount')}`);
    expect(repo.batches).toHaveLength(0);
    expect([...repo.usage.values()]).toEqual([1]); // один голосовой — одна единица лимита
  });

  it('the detection retry wins when the user spoke another language', async () => {
    const { handlers, ctx, repo } = setup({ transcripts: ['Кофи файв доларс', 'Coffee 5 dollars and taxi 12 dollars.'] });
    await handlers.handleVoice(ctx);
    await handlers.idle();
    expect(repo.expenses.map(e => [e.amount, e.currency, e.description])).toEqual([['5', 'USD', 'Coffee'], ['12', 'USD', 'taxi']]);
  });

  it('silence and whisper hallucinations count as «nothing heard» without a retry', async () => {
    const { handlers, ctx, stt, lastEdit } = setup({ transcripts: ['[BLANK_AUDIO] Продолжение следует...'] });
    await handlers.handleVoice(ctx);
    await handlers.idle();
    expect(stt.transcribe).toHaveBeenCalledTimes(1);
    expect(lastEdit().text).toBe(t('voice_empty'));
  });

  it('STT failure: error text in the status message, not counted in the daily limit', async () => {
    const error = Object.assign(new Error('whisper-cli timed out'), { code: 'timeout' });
    const { handlers, ctx, lastEdit, repo } = setup({ transcripts: [error] });
    await handlers.handleVoice(ctx);
    await handlers.idle();
    expect(lastEdit().text).toBe(t('voice_error'));
    expect(repo.usage.size).toBe(0);
    expect(handlers.busyUsers.size).toBe(0);
  });

  it('daily limit: free users get the premium button, nothing is downloaded or recognized', async () => {
    const { handlers, ctx, stt } = setup({ used: 20 });
    await handlers.handleVoice(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(t('voice_limit_regular', { used: 20, limit: 20, premium: 300 }), expect.objectContaining({
      reply_markup: { inline_keyboard: [[{ text: t('button_premium'), callback_data: 'premium_subscription' }]] }
    }));
    expect(handlers.download).not.toHaveBeenCalled();
    expect(stt.transcribe).not.toHaveBeenCalled();
  });

  it('daily limit: premium gets 300 and no upsell', async () => {
    const below = setup({ isPremium: true, used: 20 });
    await below.handlers.handleVoice(below.ctx);
    await below.handlers.idle();
    expect(below.stt.transcribe).toHaveBeenCalled();
    const over = setup({ isPremium: true, used: 300 });
    await over.handlers.handleVoice(over.ctx);
    expect(over.ctx.reply).toHaveBeenCalledWith(t('voice_limit_premium', { used: 300, limit: 300, premium: 300 }), expect.objectContaining({ reply_markup: { inline_keyboard: [] } }));
  });

  it('not configured, too long, one voice at a time per user, groups ignored', async () => {
    const off = setup({ configured: false });
    await off.handlers.handleVoice(off.ctx);
    expect(off.ctx.reply).toHaveBeenCalledWith(t('voice_not_configured'), { parse_mode: 'Markdown' });

    const long = setup();
    long.ctx.message.voice.duration = 61;
    await long.handlers.handleVoice(long.ctx);
    expect(long.ctx.reply).toHaveBeenCalledWith(t('voice_too_long', { max: 60 }), { parse_mode: 'Markdown' });

    const busy = setup();
    let release;
    busy.stt.transcribe.mockImplementation(() => new Promise(resolve => { release = () => resolve('кофе 250, такси 400'); }));
    await busy.handlers.handleVoice(busy.ctx);
    await busy.handlers.handleVoice(busy.ctx);
    expect(busy.ctx.reply).toHaveBeenLastCalledWith(t('voice_busy'));
    await new Promise(resolve => setImmediate(resolve));
    release();
    await busy.handlers.idle();
    expect(busy.stt.transcribe).toHaveBeenCalledTimes(1);

    const group = setup();
    group.ctx.chat.type = 'group';
    await group.handlers.handleVoice(group.ctx);
    expect(group.ctx.reply).not.toHaveBeenCalled();
  });
});

describe('several records in one text message', () => {
  it('records all at once with one summary card; a single record goes to the usual flow as «250 кофе»', async () => {
    const { handlers, repo, ctx, expenseHandlers, incomeHandlers } = setup();
    expect(await handlers.handleText(ctx, '250 кофе', 'ru')).toBe(false);
    expect(await handlers.handleText(ctx, 'привет', 'ru')).toBe(false);
    expect(expenseHandlers.handleExpenseInput).not.toHaveBeenCalled();
    // Сумма в конце — одна запись обычным вводом, как если бы её написали «250 кофе»
    expect(await handlers.handleText(ctx, 'кофе 250', 'ru')).toBe(true);
    expect(expenseHandlers.handleExpenseInput).toHaveBeenLastCalledWith(ctx, '250 кофе', 'ru');
    expect(await handlers.handleText(ctx, 'хлеб, молоко 300', 'ru')).toBe(true);
    expect(expenseHandlers.handleExpenseInput).toHaveBeenLastCalledWith(ctx, '300 хлеб, молоко', 'ru');
    expect(await handlers.handleText(ctx, '$20 кофе', 'ru')).toBe(true);
    expect(expenseHandlers.handleExpenseInput).toHaveBeenLastCalledWith(ctx, '20 USD кофе', 'ru');
    expect(await handlers.handleText(ctx, 'зарплата +50000', 'ru')).toBe(true);
    expect(incomeHandlers.handleIncomeInput).toHaveBeenLastCalledWith(ctx, '+50000 зарплата', 'ru');
    expect(repo.batches).toHaveLength(0);
    ctx.reply.mockClear();

    expect(await handlers.handleText(ctx, 'кофе 250, такси 400, обед 600', 'ru')).toBe(true);
    const [text, extra] = ctx.reply.mock.calls[0];
    expect(text).toContain(t('multi_recorded_title', { count: 3 }));
    expect(text).toContain(t('multi_expenses_total', { total: new Formatter().formatAmount(1250, 'RUB') }));
    expect(buttons(extra)).toEqual(['ex|1|v.1', 'ex|2|v.1', 'ex|3|v.1', 'vcx|1']);
    expect(repo.batches[0]).toMatchObject({ source: 'text', item_count: 3 });
  });

  it('refuses amounts over the column limit and more than 20 records without writing anything', async () => {
    const { handlers, repo, ctx } = setup();
    await handlers.handleText(ctx, 'кофе 250, машина 100000000', 'ru');
    expect(ctx.reply).toHaveBeenLastCalledWith(t('error_amount', { max: '99 999 999' }), { parse_mode: 'Markdown' });
    await handlers.handleText(ctx, Array.from({ length: 21 }, (_, i) => `кофе ${i + 1}`).join('\n'), 'ru');
    expect(ctx.reply).toHaveBeenLastCalledWith(t('multi_too_many', { max: 20 }), { parse_mode: 'Markdown' });
    expect(repo.batches).toHaveLength(0);
  });

  it('cuts descriptions to the user limit and escapes Markdown in the card', async () => {
    const { handlers, repo, ctx } = setup();
    await handlers.handleText(ctx, `кофе_*латте* 250, ${'а'.repeat(120)} 400`, 'ru');
    expect(repo.expenses[1].description).toHaveLength(80);
    expect(ctx.reply.mock.calls[0][0]).toContain('кофе\\_\\*латте\\*');
  });

  it('«Undo all» deletes what is left, a second tap says it is already undone; the card back view re-renders the batch', async () => {
    const { handlers, repo, ctx } = setup();
    await handlers.handleText(ctx, 'кофе 250\nтакси 400\n+100 кэшбэк', 'ru');
    const cb = { ...ctx, callbackQuery: { message: { message_id: 101 } }, answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true) };

    repo.expenses.splice(0, 1); // одну запись удалили из карточки
    await handlers.showBatch(cb, 1);
    const [text, extra] = cb.editMessageText.mock.calls[0];
    expect(text).toContain(t('multi_recorded_title', { count: 2 }));
    expect(buttons(extra)).toEqual(['ex|2|v.1', 'in|3', 'vcx|1']);

    await handlers.undo(cb, 1);
    expect(cb.editMessageText).toHaveBeenLastCalledWith(t('multi_undone', { count: 2 }), { reply_markup: { inline_keyboard: [] } });
    expect(repo.expenses).toHaveLength(0);
    expect(repo.incomes).toHaveLength(0);
    await handlers.undo(cb, 1);
    expect(cb.answerCbQuery).toHaveBeenLastCalledWith(t('multi_already_undone'), { show_alert: true });
    await handlers.showBatch(cb, 1);
    expect(cb.editMessageText).toHaveBeenLastCalledWith(t('multi_already_undone'), expect.anything());
  });
});

describe('voice helpers', () => {
  it('cleans whisper marks and subtitle hallucinations but keeps real speech', () => {
    expect(VoiceService.cleanTranscript('[BLANK_AUDIO]')).toBe('');
    expect(VoiceService.cleanTranscript(' (музыка) Кофе 250. Субтитры сделал DimaTorzok')).toBe('Кофе 250.');
    expect(VoiceService.cleanTranscript('Thanks for watching!')).toBe('');
    expect(VoiceService.cleanTranscript('Редактор 300, такси 400')).toBe('Редактор 300, такси 400');
  });

  it('a single spoken record becomes the usual input text', () => {
    const currencyToken = (token) => new EnhancedValidator().resolveCurrencyToken(token);
    expect(MultiEntryHandlers.entryText({ amount: 250, currency: null, description: 'кофе', kind: 'expense' }, currencyToken, 'RUB')).toBe('250 кофе');
    expect(MultiEntryHandlers.entryText({ amount: 1.5, currency: 'EUR', description: null, kind: 'expense' }, currencyToken, 'RUB')).toBe('1.5 EUR');
    expect(MultiEntryHandlers.entryText({ amount: 50000, currency: null, description: 'зарплата', kind: 'income' }, currencyToken, 'RUB')).toBe('+50000 зарплата');
    // Описание начинается со слова-валюты — валюта пишется явно, иначе описание стало бы валютой
    expect(MultiEntryHandlers.entryText({ amount: 300, currency: null, description: 'gel для душа', kind: 'expense' }, currencyToken, 'RUB')).toBe('300 RUB gel для душа');
  });
});
