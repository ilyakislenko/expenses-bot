const respond = require('../utils/respond');
const logger = require('../utils/logger');
const split = require('../utils/groupSplit');
const { parseEntries } = require('../utils/multiEntry');
const { generateCurrencyKeyboard } = require('../utils/constants');
const EditThrottle = require('../utils/editThrottle');
const ReceiptHandlers = require('./ReceiptHandlers');

// Команды, которые работают в группе; остальные (личные: /stats, /history, /savings, /invite…) — «личное — в личке»
const GROUP_COMMANDS = new Set(['start', 'help', 'spent', 's', 'split', 'balance', 'settle', 'undo', 'group', 'cancel']);
const ITEMS_PER_PAGE = 16;
const MAX_AMOUNT = 99999999;
const MAX_DESCRIPTION = 100;
const MAX_TRANSFER_BUTTONS = 8;
const PERSONAL_HINT_INTERVAL_MS = 10 * 60 * 1000; // «личное — в личке» одному человеку в чате — не чаще раза в 10 минут
const NAME_IN_BUTTON = 18;
const NAME_IN_LIST = 40;

const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Ошибка Telegram 429: через сколько секунд можно снова
function retryAfterOf(error) {
  return Number(error && (error.parameters?.retry_after || error.response?.parameters?.retry_after)) || 0;
}

function notModified(error) {
  return String(error && (error.description || error.response?.description || error.message)).includes('message is not modified');
}

// Групповой режим: общие расходы чата (privacy mode включён — бот видит только команды, ответы себе и упоминания),
// делёж чека по фото, «🎫 Пропуск для группы». В группе — только это; личное не показывается никогда.
// В личке — ссылки на делёж (split_<код>), покупка пропуска (gpass_<код>), «👥 Разделить с друзьями» у чека.
class GroupHandlers {
  constructor({ groupService, userService, localizationService, formatter, validator, receiptService, receiptHandlers, paymentService, throttle = null }) {
    this.groupService = groupService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.validator = validator;
    this.receiptService = receiptService;
    this.receiptHandlers = receiptHandlers;
    this.paymentService = paymentService;
    this.throttle = throttle || new EditThrottle();
    this.username = null;
    this.botId = null;
    this.telegram = null; // для фоновых правок (троттлинг, перерисовка после перезапуска)
    this.personalHints = new Map(); // `${chatId}:${userId}` → время последней подсказки «личное — в личке»
    this.tasks = new Set(); // фоновые распознавания чеков
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  money(cents, currency) {
    return this.formatter.formatAmount(split.fromCents(cents), currency);
  }

  remember(ctx) {
    if (ctx.botInfo) {
      this.username = ctx.botInfo.username || this.username;
      this.botId = ctx.botInfo.id || this.botId;
    }
    if (ctx.telegram) this.telegram = ctx.telegram;
  }

  setTelegram(telegram) {
    this.telegram = telegram;
  }

  botLink(start = null) {
    if (!this.username) return '';
    return `https://t.me/${this.username}${start ? `?start=${start}` : ''}`;
  }

  // Язык того, кто нажал: его язык в боте, иначе язык Telegram, иначе язык группы
  async langOf(from, fallback = 'en') {
    const user = await this.userService.getUserById(from.id).catch(() => null);
    return (user && user.language) || this.localizationService.resolveTelegramLanguage(from.language_code) || fallback;
  }

  async alert(ctx, text) {
    await ctx.answerCbQuery(String(text).slice(0, 200), { show_alert: true }).catch(() => {});
  }

  // Ответ в группе на сообщение, которое его вызвало
  async replyHtml(ctx, text, keyboard = null, extra = {}) {
    const options = { parse_mode: 'HTML', disable_web_page_preview: true, ...extra };
    if (keyboard) options.reply_markup = { inline_keyboard: keyboard };
    if (ctx.message) options.reply_parameters = { message_id: ctx.message.message_id, allow_sending_without_reply: true };
    return ctx.telegram.sendMessage(ctx.chat.id, text, options);
  }

  async editHtml(ctx, text, keyboard = []) {
    await respond(ctx, text, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: keyboard } });
  }

  // ====================================================================
  // Группа: разбор апдейта
  // ====================================================================

  // Middleware: апдейты групп (privateChatOnly отметил ctx.state.groupChat) обрабатываются здесь и дальше не идут
  middleware(errorHandler) {
    const handle = errorHandler ? errorHandler((ctx) => this.handleGroup(ctx)) : (ctx) => this.handleGroup(ctx);
    return (ctx, next) => (ctx.state && ctx.state.groupChat ? handle(ctx) : next());
  }

  // Команда в начале текста или подписи к фото: { name, args } | { foreign } (команда другому боту) | null
  commandOf(message) {
    const text = message.text ?? message.caption ?? '';
    const entity = (message.entities || message.caption_entities || [])[0];
    if (!entity || entity.type !== 'bot_command' || entity.offset !== 0) return null;
    const [name, mention] = text.slice(1, entity.length).split('@');
    if (mention && this.username && mention.toLowerCase() !== this.username.toLowerCase()) return { foreign: true };
    return { name: name.toLowerCase(), args: text.slice(entity.length).trim() };
  }

  mentionsBot(message) {
    if (!this.username) return false;
    const text = message.text || '';
    return (message.entities || []).some(entity => entity.type === 'mention'
      && text.slice(entity.offset + 1, entity.offset + entity.length).toLowerCase() === this.username.toLowerCase());
  }

  async handleGroup(ctx) {
    this.remember(ctx);
    if (ctx.myChatMember) return this.onMembership(ctx);
    if (ctx.callbackQuery) return this.onGroupCallback(ctx);
    const message = ctx.message;
    if (!message) return undefined; // правки сообщений, реакции и прочее — молча
    if (message.migrate_to_chat_id) return this.groupService.migrateChat(ctx.chat.id, message.migrate_to_chat_id);
    if (message.new_chat_title) return this.groupService.setTitle(ctx.chat.id, message.new_chat_title);
    const command = this.commandOf(message);
    if (command && command.foreign) return undefined;
    if (command) return this.onGroupCommand(ctx, command);
    const replyTo = message.reply_to_message;
    if (replyTo && replyTo.from && Number(replyTo.from.id) === Number(this.botId)) return this.onReplyToBot(ctx, replyTo);
    if (this.mentionsBot(message)) return this.onMention(ctx);
    return undefined; // обычная переписка группы — не нам
  }

  // Бота добавили: короткое знакомство с кнопкой «➕ Вести общие расходы»; вернули — учёт продолжается; удалили — пауза
  async onMembership(ctx) {
    const update = ctx.myChatMember;
    const status = update.new_chat_member && update.new_chat_member.status;
    const before = update.old_chat_member && update.old_chat_member.status;
    const joined = (value) => value === 'member' || value === 'administrator';
    if (status === 'left' || status === 'kicked') {
      await this.groupService.setActive(ctx.chat.id, false);
      return;
    }
    if (!joined(status) || joined(before)) return;
    const ledger = await this.groupService.ledgerForChat(ctx.chat.id);
    if (ledger) {
      await this.groupService.setActive(ctx.chat.id, true);
      const view = await this.homeView(ledger);
      await ctx.telegram.sendMessage(ctx.chat.id, view.text, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: view.keyboard } });
      return;
    }
    const lang = this.localizationService.resolveTelegramLanguage(ctx.from && ctx.from.language_code) || 'en';
    await this.sendIntro(ctx, lang);
  }

  async sendIntro(ctx, lang) {
    await ctx.telegram.sendMessage(ctx.chat.id, this.t(lang, 'grp_intro', { link: this.botLink() }), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'grp_button_enable'), callback_data: 'gon' }]] }
    });
  }

  // Учёт чата. null — учёт не включён (ответ уже отправлен). Апдейт из чата, где учёт на паузе, значит, бот снова там
  async requireLedger(ctx, lang = null) {
    const ledger = await this.groupService.ledgerForChat(ctx.chat.id);
    if (ledger) {
      if (!ledger.active) await this.groupService.setActive(ctx.chat.id, true);
      return { ...ledger, active: true };
    }
    const language = lang || await this.langOf(ctx.from);
    if (ctx.callbackQuery) {
      await this.alert(ctx, this.t(language, 'grp_not_enabled'));
      return null;
    }
    await this.replyHtml(ctx, this.t(language, 'grp_not_enabled'), [[{ text: this.t(language, 'grp_button_enable'), callback_data: 'gon' }]]);
    return null;
  }

  async requireMember(ctx, ledger) {
    const member = await this.groupService.member(ledger.id, ctx.from.id);
    if (member && !member.via_link) return member;
    const lang = await this.langOf(ctx.from, ledger.lang);
    if (ctx.callbackQuery) {
      await this.alert(ctx, this.t(lang, 'grp_not_member'));
    } else {
      await this.replyHtml(ctx, esc(this.t(lang, 'grp_not_member')), [[{ text: this.t(ledger.lang, 'grp_button_join'), callback_data: 'gj' }]]);
    }
    return null;
  }

  // «Личное — в личке» с прямой ссылкой; одному человеку в чате — не чаще раза в 10 минут
  async personalOnly(ctx) {
    const key = `${ctx.chat.id}:${ctx.from.id}`;
    const now = Date.now();
    const last = this.personalHints.get(key);
    if (last && now - last < PERSONAL_HINT_INTERVAL_MS) return;
    if (this.personalHints.size > 10000) this.personalHints.clear();
    this.personalHints.set(key, now);
    const lang = await this.langOf(ctx.from);
    await this.replyHtml(ctx, this.t(lang, 'grp_personal_only', { link: this.botLink() }));
  }

  async onGroupCommand(ctx, { name, args }) {
    if (!GROUP_COMMANDS.has(name)) return this.personalOnly(ctx);
    if (name === 'cancel') return undefined;
    const ledger = await this.groupService.ledgerForChat(ctx.chat.id);
    if (name === 'start' || name === 'group') {
      if (!ledger) return this.sendIntro(ctx, await this.langOf(ctx.from));
      return this.sendHome(ctx, ledger);
    }
    if (name === 'help') return this.replyHtml(ctx, this.t(ledger ? ledger.lang : await this.langOf(ctx.from), 'grp_help'));
    const active = await this.requireLedger(ctx);
    if (!active || !(await this.requireMember(ctx, active))) return undefined;
    if (name === 'spent' || name === 's') return args ? this.recordFromText(ctx, active, args) : this.askAmount(ctx, active);
    if (name === 'balance' || name === 'settle') return this.sendBalances(ctx, active);
    if (name === 'undo') return this.askUndo(ctx, active);
    if (name === 'split') return this.onSplitCommand(ctx, active);
    return undefined;
  }

  // Ответ на сообщение бота: на вопрос (сумма, точные доли, фото чека) или трата «1200 пицца» ответом
  async onReplyToBot(ctx, replyTo) {
    const prompt = await this.groupService.getPrompt(ctx.chat.id, replyTo.message_id);
    const message = ctx.message;
    if (prompt && prompt.kind === 'split') {
      if (!this.photoOf(message)) return undefined;
      const ledger = await this.requireLedger(ctx);
      if (!ledger || !(await this.requireMember(ctx, ledger))) return undefined;
      return this.startGroupSplit(ctx, ledger, message);
    }
    if (!message.text) return undefined;
    const ledger = await this.groupService.ledgerForChat(ctx.chat.id);
    if (!ledger) return undefined;
    if (prompt && prompt.kind === 'exact') {
      if (Number(prompt.user_id) !== Number(ctx.from.id)) return undefined;
      return this.applyExact(ctx, ledger, prompt);
    }
    const parsed = this.parseAmount(message.text);
    if (parsed.error) {
      if (prompt) await this.replyHtml(ctx, this.t(ledger.lang, 'grp_amount_error'));
      return undefined;
    }
    if (!(await this.requireMember(ctx, ledger))) return undefined;
    if (prompt) await this.groupService.deletePrompt(ctx.chat.id, replyTo.message_id);
    return this.recordParsed(ctx, { ...ledger, active: true }, parsed);
  }

  // «@бот 1200 пицца» — трата; просто «@бот» — меню группы
  async onMention(ctx) {
    const text = String(ctx.message.text || '').replace(new RegExp(`@${this.username}`, 'ig'), ' ').trim();
    const ledger = await this.groupService.ledgerForChat(ctx.chat.id);
    if (!ledger) return this.sendIntro(ctx, await this.langOf(ctx.from));
    if (!text) return this.sendHome(ctx, ledger);
    const parsed = this.parseAmount(text);
    if (parsed.error) return undefined;
    if (!(await this.requireMember(ctx, ledger))) return undefined;
    return this.recordParsed(ctx, ledger, parsed);
  }

  // ====================================================================
  // Кнопки в группе
  // ====================================================================

  groupRoutes() {
    return [
      [/^gon$/, (ctx) => this.enable(ctx)],
      [/^gj$/, (ctx) => this.join(ctx)],
      [/^gm$/, (ctx) => this.showHome(ctx)],
      [/^ga$/, (ctx) => this.askAmountButton(ctx)],
      [/^gb$/, (ctx) => this.showBalances(ctx)],
      [/^gh\|(\d+)$/, (ctx) => this.showHistory(ctx, Number(ctx.match[1]))],
      [/^gc$/, (ctx) => this.showCurrency(ctx)],
      [/^gcs\|([A-Z]{3})$/, (ctx) => this.setCurrency(ctx, ctx.match[1])],
      [/^gp$/, (ctx) => this.showPass(ctx)],
      [/^gsp$/, (ctx) => this.askSplitPhoto(ctx)],
      [/^gl$/, (ctx) => this.leave(ctx)],
      [/^gep\|(\d+)$/, (ctx) => this.showParticipants(ctx, Number(ctx.match[1]))],
      [/^get\|(\d+)\|(\d+)$/, (ctx) => this.toggleParticipant(ctx, Number(ctx.match[1]), Number(ctx.match[2]))],
      [/^gev\|(\d+)$/, (ctx) => this.showExpense(ctx, Number(ctx.match[1]))],
      [/^gee\|(\d+)$/, (ctx) => this.askExact(ctx, Number(ctx.match[1]))],
      ...this.sharedRoutes()
    ];
  }

  // Кнопки, которые работают и в группе, и в личке (в личке — через botRoutes)
  sharedRoutes() {
    const routes = [
      [/^gex\|(\d+)$/, (ctx) => this.undo(ctx, Number(ctx.match[1]))],
      [/^gcp\|(\d+)$/, (ctx) => this.copyShare(ctx, Number(ctx.match[1]))],
      [/^gsu\|(\d+)\|(\d+)\|(\d+)$/, (ctx) => this.settle(ctx, Number(ctx.match[1]), Number(ctx.match[2]), Number(ctx.match[3]))],
      [/^gb\|(\d+)$/, (ctx) => this.showBalancesPrivate(ctx, Number(ctx.match[1]))],
      [/^gsi\|(\d+)\|(\d+)$/, (ctx) => this.toggleClaim(ctx, Number(ctx.match[1]), Number(ctx.match[2]))],
      [/^gsg\|(\d+)\|(\d+)$/, (ctx) => this.splitPage(ctx, Number(ctx.match[1]), Number(ctx.match[2]))],
      [/^gsc\|(\d+)$/, (ctx) => this.closeSplit(ctx, Number(ctx.match[1]))],
      [/^gsx\|(\d+)$/, (ctx) => this.cancelSplit(ctx, Number(ctx.match[1]))]
    ];
    return routes.map(([pattern, handler]) => [pattern, (ctx) => {
      this.remember(ctx);
      return handler(ctx);
    }]);
  }

  async onGroupCallback(ctx) {
    const data = ctx.callbackQuery.data || '';
    if (data === 'noop') return ctx.answerCbQuery().catch(() => {});
    for (const [pattern, handler] of this.groupRoutes()) {
      const match = data.match(pattern);
      if (match) {
        ctx.match = match;
        return handler(ctx);
      }
    }
    // Кнопка личного раздела (старое сообщение или пересланное в группу) — только alert нажавшему
    return this.alert(ctx, this.t(await this.langOf(ctx.from), 'grp_personal_only_alert'));
  }

  // ====================================================================
  // Учёт группы: включение, участники, меню
  // ====================================================================

  async enable(ctx) {
    const lang = await this.langOf(ctx.from);
    const ledger = await this.groupService.enable(ctx.chat, ctx.from, lang);
    await ctx.answerCbQuery(this.t(ledger.lang, 'grp_joined')).catch(() => {});
    const view = await this.homeView(ledger);
    await this.editHtml(ctx, view.text, view.keyboard);
  }

  async join(ctx) {
    const ledger = await this.requireLedger(ctx);
    if (!ledger) return;
    const lang = await this.langOf(ctx.from, ledger.lang);
    const before = await this.groupService.member(ledger.id, ctx.from.id);
    if (before && !before.via_link) {
      await ctx.answerCbQuery(this.t(lang, 'grp_already_member')).catch(() => {});
      return;
    }
    await this.groupService.join(ledger.id, ctx.from, { lang });
    await ctx.answerCbQuery(this.t(lang, 'grp_joined')).catch(() => {});
    // Меню с кнопкой — перерисовать список участников (правки сообщения реже раза в 3 с); у дележа — его вид
    const message = ctx.callbackQuery.message;
    const splitId = this.splitIdOfKeyboard(message);
    if (splitId) {
      this.scheduleSplitRender(splitId, ctx.chat.id, message.message_id, null);
      return;
    }
    if (this.isHomeKeyboard(message)) this.scheduleHomeRender(ledger.id, ctx.chat.id, message.message_id);
  }

  isHomeKeyboard(message) {
    const rows = (message && message.reply_markup && message.reply_markup.inline_keyboard) || [];
    return rows.some(row => row.some(button => button.callback_data === 'gb'));
  }

  splitIdOfKeyboard(message) {
    const rows = (message && message.reply_markup && message.reply_markup.inline_keyboard) || [];
    for (const row of rows) {
      for (const button of row) {
        const match = /^gs[icx]\|(\d+)/.exec(button.callback_data || '');
        if (match) return Number(match[1]);
      }
    }
    return null;
  }

  scheduleHomeRender(groupId, chatId, messageId) {
    this.throttle.schedule(`${chatId}:${messageId}`, async () => {
      const ledger = await this.groupService.getLedger(groupId);
      const view = await this.homeView(ledger);
      return this.editMessage(chatId, messageId, view.text, view.keyboard);
    });
  }

  // Правка сообщения в фоне. → retry_after (секунды) при 429, иначе 0
  async editMessage(chatId, messageId, text, keyboard) {
    try {
      await this.telegram.editMessageText(chatId, messageId, undefined, text, {
        parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: keyboard }
      });
      return 0;
    } catch (error) {
      if (notModified(error)) return 0;
      const retryAfter = retryAfterOf(error);
      logger.warn('Group message edit failed', { chatId, messageId, error: error.message, retryAfter });
      if (retryAfter) return retryAfter;
      throw error;
    }
  }

  async leave(ctx) {
    const ledger = await this.requireLedger(ctx);
    if (!ledger) return;
    const lang = await this.langOf(ctx.from, ledger.lang);
    const result = await this.groupService.leave(ledger, ctx.from.id);
    const key = result === 'left' ? 'grp_left' : result === 'has_balance' ? 'grp_leave_balance' : 'grp_not_member';
    await this.alert(ctx, this.t(lang, key));
    if (result === 'left') this.scheduleHomeRender(ledger.id, ctx.chat.id, ctx.callbackQuery.message.message_id);
  }

  limitsLine(ledger, limits, owner) {
    const lang = ledger.lang;
    if (limits.reason === 'pass') return this.t(lang, 'grp_limits_pass', { date: this.date(limits.passUntil) });
    if (limits.reason === 'premium') return this.t(lang, 'grp_limits_premium', { name: esc(owner) });
    return this.t(lang, 'grp_limits_free', {
      expenses: limits.used.expenses, expensesCap: limits.caps.expenses, splits: limits.used.splits, splitsCap: limits.caps.splits,
      date: this.date(limits.resetsAt)
    });
  }

  date(value) {
    const d = new Date(value);
    return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
  }

  nameOf(members, userId) {
    const member = members.find(item => Number(item.user_id) === Number(userId));
    return member ? member.name : String(userId);
  }

  async homeView(ledger) {
    const lang = ledger.lang;
    const [members, limits] = await Promise.all([this.groupService.members(ledger.id), this.groupService.limits(ledger)]);
    const inChat = members.filter(member => !member.via_link);
    const owner = (await this.groupService.members(ledger.id, { includeLeft: true })).find(member => Number(member.user_id) === Number(ledger.created_by));
    const lines = [
      this.t(lang, 'grp_home_title', { title: esc(ledger.title || '') }),
      this.t(lang, 'grp_home_members', { currency: ledger.currency, count: inChat.length, names: esc(inChat.map(member => member.name).join(', ')) }),
      '',
      this.t(lang, 'grp_home_howto'),
      '',
      this.limitsLine(ledger, limits, owner ? owner.name : '')
    ];
    const keyboard = [
      [{ text: this.t(lang, 'grp_button_join'), callback_data: 'gj' }, { text: this.t(lang, 'grp_button_add'), callback_data: 'ga' }],
      [{ text: this.t(lang, 'grp_button_balances'), callback_data: 'gb' }, { text: this.t(lang, 'grp_button_history'), callback_data: 'gh|0' }],
      [{ text: this.t(lang, 'grp_button_split'), callback_data: 'gsp' }, { text: this.t(lang, 'grp_button_currency'), callback_data: 'gc' }],
      [{ text: this.t(lang, 'grp_button_pass'), callback_data: 'gp' }],
      [{ text: this.t(lang, 'grp_button_leave'), callback_data: 'gl' }]
    ];
    return { text: lines.join('\n'), keyboard };
  }

  async sendHome(ctx, ledger) {
    if (!ledger.active) await this.groupService.setActive(ctx.chat.id, true);
    const view = await this.homeView(ledger);
    await this.replyHtml(ctx, view.text, view.keyboard);
  }

  async showHome(ctx) {
    const ledger = await this.requireLedger(ctx);
    if (!ledger) return;
    await ctx.answerCbQuery().catch(() => {});
    const view = await this.homeView(ledger);
    await this.editHtml(ctx, view.text, view.keyboard);
  }

  // ====================================================================
  // Траты группы
  // ====================================================================

  // «1200 пицца», «20 USD такси», «пицца 1200» — разбор как у личной записи (валюта — код, символ или слово)
  parseAmount(text) {
    const input = String(text || '').trim();
    const money = this.validator.parseMoneyInput(input, { maxAmount: MAX_AMOUNT, maxDescriptionLength: MAX_DESCRIPTION, requireDescription: false });
    if (money.isValid) return { amount: money.amount, currency: money.currency, description: money.description || null };
    if (money.error !== 'format') return { error: money.error };
    const entries = parseEntries(input);
    if (entries && entries.length === 1 && entries[0].kind === 'expense' && entries[0].amount >= 0.01 && entries[0].amount <= MAX_AMOUNT) {
      const description = entries[0].description ? this.validator.sanitizeText(entries[0].description, MAX_DESCRIPTION) : null;
      return { amount: entries[0].amount, currency: entries[0].currency, description };
    }
    return { error: 'format' };
  }

  async recordFromText(ctx, ledger, text) {
    const parsed = this.parseAmount(text);
    if (parsed.error) return this.replyHtml(ctx, this.t(ledger.lang, 'grp_amount_error'));
    return this.recordParsed(ctx, ledger, parsed);
  }

  async capReached(ctx, ledger, kind, limits) {
    const lang = ledger.lang;
    const text = this.t(lang, kind === 'splits' ? 'grp_cap_splits' : 'grp_cap_expenses', {
      used: limits.used[kind], cap: limits.caps[kind], date: this.date(limits.resetsAt),
      days: this.groupService.pass.days, stars: this.groupService.pass.stars
    });
    const keyboard = [[{ text: this.t(lang, 'grp_button_pass'), callback_data: 'gp' }]];
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {});
      return ctx.telegram.sendMessage(ctx.chat.id, text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
    return this.replyHtml(ctx, text, keyboard);
  }

  async recordParsed(ctx, ledger, parsed) {
    const allowed = await this.groupService.allow(ledger, 'expenses');
    if (!allowed.ok) return this.capReached(ctx, ledger, 'expenses', allowed.limits);
    const expenseId = await this.groupService.recordExpense(ledger, {
      payerId: ctx.from.id, amount: parsed.amount, currency: parsed.currency || ledger.currency, description: parsed.description
    });
    const view = await this.expenseView(expenseId);
    const sent = await this.replyHtml(ctx, view.text, view.keyboard);
    if (sent && sent.message_id) await this.groupService.setExpenseMessage(expenseId, sent.message_id);
    return sent;
  }

  sharesLine(members, shares, currency) {
    return shares.map(share => `${esc(this.nameOf(members, share.user_id))} ${esc(this.formatter.formatAmount(Number(share.share), currency))}`).join(' · ');
  }

  async expenseSummary(expense, ledger, members) {
    const amount = this.formatter.formatAmount(Number(expense.amount_group), ledger.currency);
    if (expense.kind === 'settle') {
      const to = expense.shares[0] ? this.nameOf(members, expense.shares[0].user_id) : '';
      return this.t(ledger.lang, 'grp_settled', { from: esc(this.nameOf(members, expense.payer_id)), to: esc(to), amount });
    }
    const description = expense.description ? ` — ${esc(expense.description)}` : '';
    return `${esc(this.nameOf(members, expense.payer_id))} · ${amount}${description}`;
  }

  // Сообщение траты: сумма, кто платит, доли; кнопки участников, точных сумм, «в личные» и отмены
  async expenseView(expenseId) {
    const expense = await this.groupService.getExpense(expenseId);
    const ledger = await this.groupService.getLedger(expense.group_id);
    const lang = ledger.lang;
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    if (expense.deleted_at) {
      return { text: this.t(lang, 'grp_expense_undone', { summary: await this.expenseSummary(expense, ledger, members) }), keyboard: [] };
    }
    if (expense.kind === 'settle') {
      return {
        text: await this.expenseSummary(expense, ledger, members),
        keyboard: [[{ text: this.t(lang, 'grp_button_undo'), callback_data: `gex|${expense.id}` }]]
      };
    }
    const lines = [];
    // Трата в другой валюте: рядом с суммой — сколько было в чеке
    const converted = expense.currency !== ledger.currency
      ? ` ${this.t(lang, 'grp_expense_converted', { original: this.formatter.formatAmount(Number(expense.amount), expense.currency) })}` : '';
    lines.push(this.t(lang, 'grp_expense_line', {
      amount: `${this.formatter.formatAmount(Number(expense.amount_group), ledger.currency)}${converted}`,
      description: expense.description ? ` — ${esc(expense.description)}` : '',
      payer: esc(this.nameOf(members, expense.payer_id))
    }));
    const shares = expense.shares.filter(share => Number(share.share) > 0);
    const key = expense.split_mode === 'equal' ? 'grp_split_equal' : 'grp_split_exact';
    lines.push(this.t(lang, key, { count: shares.length, shares: this.sharesLine(members, shares, ledger.currency) }));
    const keyboard = [];
    if (expense.split_mode !== 'receipt') {
      keyboard.push([
        { text: this.t(lang, 'grp_button_participants'), callback_data: `gep|${expense.id}` },
        { text: this.t(lang, 'grp_button_exact'), callback_data: `gee|${expense.id}` }
      ]);
    }
    keyboard.push([{ text: this.t(lang, 'grp_button_copy'), callback_data: `gcp|${expense.id}` }]);
    keyboard.push([{ text: this.t(lang, 'grp_button_undo'), callback_data: `gex|${expense.id}` }]);
    return { text: lines.join('\n'), keyboard };
  }

  // Трата этого чата (кнопка из другого чата не трогает чужую трату). null — ответ уже дан
  async expenseOfChat(ctx, expenseId) {
    const expense = await this.groupService.getExpense(expenseId);
    const ledger = expense ? await this.groupService.getLedger(expense.group_id) : null;
    const lang = await this.langOf(ctx.from, ledger ? ledger.lang : 'en');
    if (!expense || !ledger || (ledger.chat_id !== null && String(ledger.chat_id) !== String(ctx.chat.id) && ctx.chat.type !== 'private')) {
      await this.alert(ctx, this.t(lang, 'grp_record_gone'));
      return null;
    }
    if (expense.deleted_at) {
      await this.alert(ctx, this.t(lang, 'grp_record_gone'));
      if (ctx.callbackQuery.message) {
        const view = await this.expenseView(expense.id);
        await this.editHtml(ctx, view.text, view.keyboard);
      }
      return null;
    }
    return { expense, ledger, lang };
  }

  async authorOnly(ctx, expenseId) {
    const found = await this.expenseOfChat(ctx, expenseId);
    if (!found) return null;
    if (Number(found.expense.created_by) !== Number(ctx.from.id)) {
      await this.alert(ctx, this.t(found.lang, 'grp_only_author'));
      return null;
    }
    return found;
  }

  async showExpense(ctx, expenseId) {
    const found = await this.expenseOfChat(ctx, expenseId);
    if (!found) return;
    await ctx.answerCbQuery().catch(() => {});
    const view = await this.expenseView(expenseId);
    await this.editHtml(ctx, view.text, view.keyboard);
  }

  // «👥 Кто участвует»: имена участников учёта ✅/▫️, нажатие сразу делит поровну между отмеченными
  async participantsView(expense, ledger) {
    const lang = ledger.lang;
    const members = await this.groupService.members(ledger.id);
    const chosen = new Set(expense.shares.filter(share => Number(share.share) > 0).map(share => Number(share.user_id)));
    const candidates = members.filter(member => !member.via_link || chosen.has(Number(member.user_id)));
    const text = this.t(lang, 'grp_participants_title', {
      description: esc(expense.description || ''), amount: this.formatter.formatAmount(Number(expense.amount_group), ledger.currency)
    });
    const buttons = candidates.map(member => ({
      text: `${chosen.has(Number(member.user_id)) ? '✅' : '▫️'} ${this.formatter.shorten(member.name, NAME_IN_BUTTON)}`,
      callback_data: `get|${expense.id}|${member.user_id}`
    }));
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) keyboard.push(buttons.slice(i, i + 2));
    keyboard.push([{ text: this.t(lang, 'grp_button_done'), callback_data: `gev|${expense.id}` }]);
    return { text, keyboard };
  }

  async showParticipants(ctx, expenseId) {
    const found = await this.authorOnly(ctx, expenseId);
    if (!found) return;
    await ctx.answerCbQuery().catch(() => {});
    const view = await this.participantsView(found.expense, found.ledger);
    await this.editHtml(ctx, view.text, view.keyboard);
  }

  async toggleParticipant(ctx, expenseId, userId) {
    const found = await this.authorOnly(ctx, expenseId);
    if (!found) return;
    const { expense, ledger, lang } = found;
    if (!(await this.groupService.member(ledger.id, userId))) {
      await this.alert(ctx, this.t(lang, 'grp_not_member'));
      return;
    }
    const chosen = new Set(expense.shares.filter(share => Number(share.share) > 0).map(share => Number(share.user_id)));
    if (chosen.has(userId)) chosen.delete(userId);
    else chosen.add(userId);
    if (!chosen.size) {
      await this.alert(ctx, this.t(lang, 'grp_need_one'));
      return;
    }
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    const order = members.map(member => Number(member.user_id)).filter(id => chosen.has(id));
    await this.groupService.setParticipants(expense, order);
    await ctx.answerCbQuery().catch(() => {});
    const view = await this.participantsView(await this.groupService.getExpense(expenseId), ledger);
    await this.editHtml(ctx, view.text, view.keyboard);
  }

  // «🔢 Точные суммы»: вопрос с ответом-реплаем (privacy mode: бот видит ответы себе), участники — текущие
  async askExact(ctx, expenseId) {
    const found = await this.authorOnly(ctx, expenseId);
    if (!found) return;
    const { expense, ledger } = found;
    await ctx.answerCbQuery().catch(() => {});
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    const ids = this.participantOrder(expense, members);
    const example = this.exampleAmounts(split.toCents(expense.amount), ids.length);
    const text = this.t(ledger.lang, 'grp_ask_exact', {
      name: `<a href="tg://user?id=${ctx.from.id}">${esc(this.nameOf(members, ctx.from.id))}</a>`,
      description: esc(expense.description || ''),
      amount: this.formatter.formatAmount(Number(expense.amount), expense.currency),
      list: ids.map((id, index) => `${index + 1}. ${esc(this.nameOf(members, id))}`).join('\n'),
      example
    });
    const sent = await ctx.telegram.sendMessage(ctx.chat.id, text, {
      parse_mode: 'HTML',
      reply_markup: { force_reply: true, selective: true },
      reply_parameters: { message_id: ctx.callbackQuery.message.message_id, allow_sending_without_reply: true }
    });
    await this.groupService.addPrompt(ctx.chat.id, sent.message_id, ctx.from.id, 'exact', expense.id);
  }

  // Участники траты в порядке вступления в учёт
  participantOrder(expense, members) {
    const chosen = new Set(expense.shares.filter(share => Number(share.share) > 0).map(share => Number(share.user_id)));
    return members.map(member => Number(member.user_id)).filter(id => chosen.has(id));
  }

  exampleAmounts(totalCents, count) {
    const parts = [...split.splitEqual(totalCents, Array.from({ length: count }, (_, i) => i + 1), 1).values()];
    return parts.map(cents => String(split.fromCents(cents))).join(' ');
  }

  async applyExact(ctx, ledger, prompt) {
    const expense = await this.groupService.getExpense(prompt.ref_id);
    if (!expense || expense.deleted_at) return this.replyHtml(ctx, this.t(ledger.lang, 'grp_record_gone'));
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    const ids = this.participantOrder(expense, members);
    const cents = split.parseExactAmounts(ctx.message.text, ids.length);
    const example = this.exampleAmounts(split.toCents(expense.amount), ids.length);
    if (!cents) return this.replyHtml(ctx, this.t(ledger.lang, 'grp_exact_count', { count: ids.length, example }));
    const status = await this.groupService.setExactShares(expense, ids, cents);
    if (status === 'sum_mismatch') {
      return this.replyHtml(ctx, this.t(ledger.lang, 'grp_exact_mismatch', {
        sum: this.money(cents.reduce((acc, value) => acc + value, 0), expense.currency),
        amount: this.formatter.formatAmount(Number(expense.amount), expense.currency)
      }));
    }
    if (status === 'deleted') return this.replyHtml(ctx, this.t(ledger.lang, 'grp_record_gone'));
    await this.groupService.deletePrompt(ctx.chat.id, prompt.message_id);
    if (expense.message_id) {
      const view = await this.expenseView(expense.id);
      await this.editMessage(ctx.chat.id, expense.message_id, view.text, view.keyboard).catch(() => {});
    }
    return this.replyHtml(ctx, this.t(ledger.lang, 'grp_exact_saved'));
  }

  // «➕ Трата» и /spent без суммы: вопрос, ответ на него — трата ответившего
  async askAmount(ctx, ledger) {
    const members = await this.groupService.members(ledger.id);
    const text = this.t(ledger.lang, 'grp_ask_amount', {
      name: `<a href="tg://user?id=${ctx.from.id}">${esc(this.nameOf(members, ctx.from.id))}</a>`
    });
    const options = { parse_mode: 'HTML', reply_markup: { force_reply: true, selective: true, input_field_placeholder: '1200 …' } };
    if (ctx.message) options.reply_parameters = { message_id: ctx.message.message_id, allow_sending_without_reply: true };
    const sent = await ctx.telegram.sendMessage(ctx.chat.id, text, options);
    await this.groupService.addPrompt(ctx.chat.id, sent.message_id, ctx.from.id, 'spent');
  }

  async askAmountButton(ctx) {
    const ledger = await this.requireLedger(ctx);
    if (!ledger || !(await this.requireMember(ctx, ledger))) return;
    await ctx.answerCbQuery().catch(() => {});
    await this.askAmount(ctx, ledger);
  }

  // ↩️ — только автор записи (трата, «рассчитались», итог чека)
  async undo(ctx, expenseId) {
    const found = await this.authorOnly(ctx, expenseId);
    if (!found) return;
    const deleted = await this.groupService.undo(expenseId, ctx.from.id);
    if (!deleted) {
      await this.alert(ctx, this.t(found.lang, 'grp_record_gone'));
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    const view = await this.expenseView(expenseId);
    await this.editHtml(ctx, view.text, view.keyboard);
  }

  // /undo — последняя своя запись группы с кнопкой отмены
  async askUndo(ctx, ledger) {
    const record = await this.groupService.lastOwnRecord(ledger, ctx.from.id);
    if (!record) return this.replyHtml(ctx, this.t(ledger.lang, 'grp_undo_none'));
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    return this.replyHtml(ctx, this.t(ledger.lang, 'grp_undo_confirm', { summary: await this.expenseSummary(record, ledger, members) }),
      [[{ text: this.t(ledger.lang, 'grp_button_undo'), callback_data: `gex|${record.id}` }]]);
  }

  // «📥 Моя доля → в личные»: по умолчанию выключено — каждый решает сам; ответ видит только нажавший
  async copyShare(ctx, expenseId) {
    const expense = await this.groupService.getExpense(expenseId);
    const ledger = expense ? await this.groupService.getLedger(expense.group_id) : null;
    const lang = await this.langOf(ctx.from, ledger ? ledger.lang : 'en');
    if (!expense || !ledger) {
      await this.alert(ctx, this.t(lang, 'grp_record_gone'));
      return;
    }
    // Чек из лички уже записан у плательщика целиком
    if (expense.split_id && Number(expense.payer_id) === Number(ctx.from.id)) {
      const splitRow = await this.groupService.getSplit(expense.split_id);
      if (splitRow && splitRow.source_receipt_id) {
        await this.alert(ctx, this.t(lang, 'grp_copy_receipt_owner'));
        return;
      }
    }
    const result = await this.groupService.copyShare(expenseId, ctx.from.id, { label: this.t(lang, 'grp_copy_label') });
    const keys = { already: 'grp_copy_already', no_share: 'grp_copy_no_share', not_registered: 'grp_copy_not_registered', deleted: 'grp_record_gone' };
    if (result.status !== 'ok') {
      await this.alert(ctx, this.t(lang, keys[result.status], { link: this.botLink() }));
      return;
    }
    await this.alert(ctx, this.t(lang, 'grp_copy_done', {
      amount: this.formatter.formatAmount(result.amount, result.currency), description: result.description
    }));
  }

  // ====================================================================
  // Балансы, «рассчитались», история, валюта
  // ====================================================================

  async balancesView(ledger, { viewerId = null, privateChat = false } = {}) {
    const lang = ledger.lang;
    const { balances, transfers, members } = await this.groupService.balances(ledger);
    const lines = [this.t(lang, 'grp_balances_title', { currency: ledger.currency })];
    const keyboard = [];
    const shown = members.filter(member => balances.get(Number(member.user_id)) || (!member.left_at && !member.via_link));
    for (const member of shown) {
      const cents = balances.get(Number(member.user_id)) || 0;
      const sign = cents > 0 ? '+' : cents < 0 ? '−' : '';
      lines.push(`${esc(member.name)}: ${sign}${esc(this.money(Math.abs(cents), ledger.currency))}`);
    }
    lines.push('');
    if (!transfers.length) {
      lines.push(this.t(lang, 'grp_balances_settled'));
    } else {
      lines.push(this.t(lang, 'grp_balances_transfers'));
      for (const transfer of transfers) {
        lines.push(`${esc(this.nameOf(members, transfer.from))} → ${esc(this.nameOf(members, transfer.to))}: ${esc(this.money(transfer.cents, ledger.currency))}`);
      }
      lines.push('', this.t(lang, 'grp_settle_hint'));
      const visible = transfers.filter(item => !privateChat || !viewerId || [item.from, item.to].includes(Number(viewerId)) || Number(viewerId) === Number(ledger.created_by));
      for (const transfer of visible.slice(0, MAX_TRANSFER_BUTTONS)) {
        keyboard.push([{
          text: this.t(lang, 'grp_settle_button', {
            from: this.formatter.shorten(this.nameOf(members, transfer.from), NAME_IN_BUTTON),
            to: this.formatter.shorten(this.nameOf(members, transfer.to), NAME_IN_BUTTON),
            amount: this.money(transfer.cents, ledger.currency)
          }),
          callback_data: `gsu|${ledger.id}|${transfer.from}|${transfer.to}`
        }]);
      }
    }
    if (!privateChat) keyboard.push([{ text: this.t(lang, 'grp_button_menu'), callback_data: 'gm' }]);
    return { text: lines.join('\n'), keyboard };
  }

  async sendBalances(ctx, ledger) {
    const view = await this.balancesView(ledger);
    await this.replyHtml(ctx, view.text, view.keyboard);
  }

  async showBalances(ctx) {
    const ledger = await this.requireLedger(ctx);
    if (!ledger) return;
    await ctx.answerCbQuery().catch(() => {});
    const view = await this.balancesView(ledger);
    await this.editHtml(ctx, view.text, view.keyboard);
  }

  // gb|<id> — балансы в личке (счёт «по ссылке» или группа): только участнику, новым сообщением
  async showBalancesPrivate(ctx, groupId) {
    const ledger = await this.groupService.getLedger(groupId);
    const lang = await this.langOf(ctx.from, ledger ? ledger.lang : 'en');
    if (!ledger || !(await this.groupService.member(ledger.id, ctx.from.id))) {
      await this.alert(ctx, this.t(lang, 'grp_not_member'));
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    const view = await this.balancesView(ledger, { viewerId: ctx.from.id, privateChat: true });
    await ctx.reply(view.text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: view.keyboard } });
  }

  // gsu|<учёт>|<кто отдал>|<кому>: нажимает один из двоих; сумма — текущий упрощённый долг
  async settle(ctx, groupId, fromId, toId) {
    const ledger = await this.groupService.getLedger(groupId);
    const lang = await this.langOf(ctx.from, ledger ? ledger.lang : 'en');
    const inThisChat = ledger && (ctx.chat.type === 'private' ? true : String(ledger.chat_id) === String(ctx.chat.id));
    if (!inThisChat || !(await this.groupService.member(ledger.id, ctx.from.id))) {
      await this.alert(ctx, this.t(lang, 'grp_not_member'));
      return;
    }
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    const result = await this.groupService.settle(ledger, fromId, toId, ctx.from.id);
    if (result.status === 'forbidden') {
      await this.alert(ctx, this.t(lang, 'grp_settle_forbidden', { from: this.nameOf(members, fromId), to: this.nameOf(members, toId) }));
      return;
    }
    if (result.status === 'nothing') await this.alert(ctx, this.t(lang, 'grp_settle_nothing'));
    else await ctx.answerCbQuery().catch(() => {});
    const privateChat = ctx.chat.type === 'private';
    const view = await this.balancesView(ledger, { viewerId: ctx.from.id, privateChat });
    await this.editHtml(ctx, view.text, view.keyboard);
    if (result.status !== 'ok') return;
    const record = await this.expenseView(result.expenseId);
    const sent = await ctx.telegram.sendMessage(ctx.chat.id, record.text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: record.keyboard } });
    if (sent && sent.message_id) await this.groupService.setExpenseMessage(result.expenseId, sent.message_id);
  }

  async showHistory(ctx, page) {
    const ledger = await this.requireLedger(ctx);
    if (!ledger) return;
    await ctx.answerCbQuery().catch(() => {});
    const lang = ledger.lang;
    const history = await this.groupService.history(ledger, page);
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    const lines = [this.t(lang, 'grp_history_title', { page: history.page + 1, pages: history.pages })];
    if (!history.rows.length) lines.push('', this.t(lang, 'grp_history_empty'));
    for (const row of history.rows) {
      const date = this.date(row.created_at).slice(0, 5);
      const amount = this.formatter.formatAmount(Number(row.amount_group), ledger.currency);
      if (row.kind === 'settle') {
        lines.push(this.t(lang, 'grp_history_settle', { date, from: esc(this.nameOf(members, row.payer_id)), to: esc(this.nameOf(members, row.first_share_user)), amount }));
      } else {
        lines.push(this.t(lang, 'grp_history_expense', {
          date, payer: esc(this.nameOf(members, row.payer_id)), amount,
          description: row.description ? ` — ${esc(this.formatter.shorten(row.description, NAME_IN_LIST))}` : '',
          count: row.share_count
        }));
      }
    }
    const keyboard = [];
    if (history.pages > 1) {
      keyboard.push([
        history.page > 0 ? { text: '‹', callback_data: `gh|${history.page - 1}` } : { text: ' ', callback_data: 'noop' },
        { text: `${history.page + 1}/${history.pages}`, callback_data: 'noop' },
        history.page < history.pages - 1 ? { text: '›', callback_data: `gh|${history.page + 1}` } : { text: ' ', callback_data: 'noop' }
      ]);
    }
    keyboard.push([{ text: this.t(lang, 'grp_button_menu'), callback_data: 'gm' }]);
    await this.editHtml(ctx, lines.join('\n'), keyboard);
  }

  async showCurrency(ctx) {
    const ledger = await this.requireLedger(ctx);
    if (!ledger || !(await this.requireMember(ctx, ledger))) return;
    await ctx.answerCbQuery().catch(() => {});
    const keyboard = generateCurrencyKeyboard(this.localizationService, ledger.lang, 'gcs', 'gm');
    await this.editHtml(ctx, this.t(ledger.lang, 'grp_currency_title', { currency: ledger.currency }), keyboard);
  }

  async setCurrency(ctx, currency) {
    const ledger = await this.requireLedger(ctx);
    if (!ledger || !(await this.requireMember(ctx, ledger))) return;
    await this.groupService.setCurrency(ledger, currency);
    const updated = await this.groupService.getLedger(ledger.id);
    await ctx.answerCbQuery(this.t(ledger.lang, 'grp_currency_set', { currency: updated.currency })).catch(() => {});
    const view = await this.homeView(updated);
    await this.editHtml(ctx, view.text, view.keyboard);
  }

  // ====================================================================
  // «🎫 Пропуск для группы»
  // ====================================================================

  async showPass(ctx) {
    const ledger = await this.requireLedger(ctx);
    if (!ledger) return;
    await ctx.answerCbQuery().catch(() => {});
    const lang = ledger.lang;
    const limits = await this.groupService.limits(ledger);
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    const pass = this.groupService.pass;
    const lines = [this.t(lang, 'grp_pass_title', {
      days: pass.days, stars: pass.stars, expensesCap: limits.caps.expenses, splitsCap: limits.caps.splits,
      expenses: limits.used.expenses, splits: limits.used.splits, owner: esc(this.nameOf(members, ledger.created_by))
    })];
    if (limits.reason === 'pass') lines.push('', this.t(lang, 'grp_pass_active_line', { date: this.date(limits.passUntil) }));
    const keyboard = [];
    if (this.username) keyboard.push([{ text: this.t(lang, 'grp_pass_buy', { stars: pass.stars }), url: this.botLink(`gpass_${ledger.token}`) }]);
    keyboard.push([{ text: this.t(lang, 'grp_button_menu'), callback_data: 'gm' }]);
    await this.editHtml(ctx, lines.join('\n'), keyboard);
  }

  // /start gpass_<код> в личке: счёт на оплату пропуска (any member)
  async startPass(ctx, token) {
    const lang = await this.langOf(ctx.from);
    const ledger = await this.groupService.ledgerByToken(token);
    if (!ledger || ledger.chat_id === null) {
      await ctx.reply(this.t(lang, 'grp_pass_link_outdated'));
      return;
    }
    if (!(await this.groupService.member(ledger.id, ctx.from.id))) {
      await ctx.reply(this.t(lang, 'grp_pass_not_member'));
      return;
    }
    const pass = this.groupService.pass;
    const limits = await this.groupService.limits(ledger);
    const status = limits.reason === 'pass' ? this.t(lang, 'grp_pass_active_line', { date: this.date(limits.passUntil) }) : '';
    let link;
    try {
      link = await this.paymentService.createGroupPassInvoiceLink(ctx.from.id, ledger, lang);
    } catch (error) {
      logger.error('Group pass invoice link failed', { userId: ctx.from.id, groupId: ledger.id, error: error.message });
      await ctx.reply(this.t(lang, 'grp_pass_invoice_error'));
      return;
    }
    await ctx.reply(this.t(lang, 'grp_pass_private', { title: esc(ledger.title), days: pass.days, stars: pass.stars, status }).replace(/\n\n+/g, '\n\n'), {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'grp_pass_pay_button', { stars: pass.stars }), url: link }]] }
    });
  }

  // successful_payment по пропуску: сообщение покупателю и в группу
  async passPaid(ctx, result) {
    const lang = await this.langOf(ctx.from);
    if (result.status !== 'completed') return;
    const date = this.date(result.passUntil);
    await ctx.reply(this.t(lang, 'grp_pass_paid_private', { title: result.ledger.title, date }));
    if (result.ledger.chat_id !== null) {
      const members = await this.groupService.members(result.ledger.id, { includeLeft: true });
      await ctx.telegram.sendMessage(result.ledger.chat_id, this.t(result.ledger.lang, 'grp_pass_paid_group', {
        name: esc(this.nameOf(members, ctx.from.id)), date
      }), { parse_mode: 'HTML' }).catch((error) => logger.warn('Group pass announcement failed', { groupId: result.ledger.id, error: error.message }));
    }
  }

  // ====================================================================
  // «🧾 Разделить чек»
  // ====================================================================

  photoOf(message) {
    if (!message) return null;
    if (message.photo && message.photo.length) {
      const size = ReceiptHandlers.pickPhotoSize(message.photo);
      return { fileId: size.file_id, fileSize: size.file_size, mimeType: 'image/jpeg' };
    }
    if (message.document && ReceiptHandlers.isImageDocument(message.document)) {
      return { fileId: message.document.file_id, fileSize: message.document.file_size, mimeType: message.document.mime_type || 'image/jpeg' };
    }
    return null;
  }

  // /split с фото (подпись) или ответом на фото; без фото — вопрос «пришли фото ответом»
  async onSplitCommand(ctx, ledger) {
    const message = ctx.message;
    if (this.photoOf(message)) return this.startGroupSplit(ctx, ledger, message);
    if (this.photoOf(message.reply_to_message)) return this.startGroupSplit(ctx, ledger, message.reply_to_message);
    return this.askSplitPhoto(ctx, ledger);
  }

  async askSplitPhoto(ctx, ledgerArg = null) {
    const ledger = ledgerArg || await this.requireLedger(ctx);
    if (!ledger || (!ledgerArg && !(await this.requireMember(ctx, ledger)))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const members = await this.groupService.members(ledger.id);
    const options = { parse_mode: 'HTML', reply_markup: { force_reply: true, selective: true } };
    if (ctx.message) options.reply_parameters = { message_id: ctx.message.message_id, allow_sending_without_reply: true };
    const sent = await ctx.telegram.sendMessage(ctx.chat.id, this.t(ledger.lang, 'grp_split_ask_photo', {
      name: `<a href="tg://user?id=${ctx.from.id}">${esc(this.nameOf(members, ctx.from.id))}</a>`
    }), options);
    await this.groupService.addPrompt(ctx.chat.id, sent.message_id, ctx.from.id, 'split');
  }

  // Фото чека в группе: лимит группы, личный лимит распознаваний того, кто прислал, «один чек за раз»; распознавание —
  // в фоне тем же конвейером, что в личке; статус «Распознаю чек…» становится сообщением дележа
  async startGroupSplit(ctx, ledger, photoMessage) {
    const userId = ctx.from.id;
    const lang = await this.langOf(ctx.from, ledger.lang);
    const photo = this.photoOf(photoMessage);
    if (!this.receiptService.configured) return this.replyHtml(ctx, this.t(ledger.lang, 'grp_split_not_configured'));
    const user = await this.userService.getUserById(userId);
    if (!user) return this.replyHtml(ctx, this.t(lang, 'grp_split_need_start', { link: this.botLink() }));
    const allowed = await this.groupService.allow(ledger, 'splits');
    if (!allowed.ok) return this.capReached(ctx, ledger, 'splits', allowed.limits);
    const busy = this.receiptHandlers.busyUsers;
    if (busy.has(userId)) return this.replyHtml(ctx, esc(this.t(lang, 'receipt_busy')));
    busy.add(userId);
    let started = false;
    try {
      const timezone = user.timezone || 'UTC';
      const limit = await this.receiptService.checkLimit(userId, timezone);
      if (!limit.remaining) return this.replyHtml(ctx, this.t(lang, 'grp_split_personal_limit', { used: limit.used, limit: limit.limit }));
      if (photo.fileSize > ReceiptHandlers.MAX_FILE_BYTES) return this.replyHtml(ctx, esc(this.t(lang, 'receipt_file_too_big')));
      let image;
      try {
        image = await this.receiptHandlers.download(ctx, photo.fileId);
      } catch (error) {
        logger.warn('Group receipt download failed', { userId, error: error.message });
        return this.replyHtml(ctx, esc(this.t(lang, 'import_download_error')));
      }
      const status = await this.replyHtml(ctx, esc(this.t(lang, 'receipt_recognizing')));
      await this.receiptHandlers.startJob(ctx, userId, status.message_id);
      const task = this.recognizeForSplit(ctx, { ledger, user, lang, image, mimeType: photo.mimeType, statusId: status.message_id, timezone });
      this.receiptHandlers.track(userId, task);
      this.tasks.add(task);
      task.finally(() => this.tasks.delete(task));
      started = true;
      return undefined;
    } finally {
      if (!started) busy.delete(userId);
    }
  }

  async recognizeForSplit(ctx, { ledger, user, lang, image, mimeType, statusId, timezone }) {
    const userId = user.id;
    const chatId = ctx.chat.id;
    const stopTyping = ReceiptHandlers.keepTyping(ctx);
    const edit = (text, keyboard = []) => this.editMessage(chatId, statusId, text, keyboard).catch(() => {});
    let statusText = null;
    const onStatus = ({ position, local }) => {
      const text = position ? this.t(lang, 'receipt_queued', { position }) : this.t(lang, local ? 'receipt_recognizing_slow' : 'receipt_recognizing');
      if (text !== statusText) {
        statusText = text;
        edit(esc(text));
      }
    };
    try {
      const result = await this.receiptService.recognizePhoto(Number(userId), {
        image, mimeType, lang, currency: user.currency || ledger.currency, timezone, onStatus,
        onRetry: () => edit(esc(this.t(lang, 'receipt_retrying')))
      });
      stopTyping();
      if (result.error) {
        logger.warn('Group receipt not recognized', { userId, code: result.error.code });
        if (result.error.code === 'unreadable') {
          await this.receiptService.addAttempt(Number(userId), statusId, 'unreadable');
          await edit(this.t(ledger.lang, 'grp_split_unreadable'));
        } else {
          await edit(this.t(ledger.lang, 'grp_split_failed'));
        }
        return;
      }
      const receipt = { ...result.receipt, attemptId: await this.receiptService.addAttempt(Number(userId), statusId, 'draft') };
      if (receipt.lowConfidence && await this.sendDraftToPrivate(ctx, user, lang, receipt, timezone, ledger)) {
        const members = await this.groupService.members(ledger.id);
        await edit(this.t(ledger.lang, 'grp_split_check_private', { name: esc(this.nameOf(members, userId)) }));
        return;
      }
      const created = await this.groupService.createSplit(ledger, {
        payerId: Number(userId), receipt, warn: Boolean(receipt.lowConfidence), extraLabel: this.t(ledger.lang, 'grp_split_extra_line')
      });
      if (!created) {
        await edit(this.t(ledger.lang, 'grp_split_empty'));
        return;
      }
      await this.groupService.setSplitMessage(created.id, chatId, statusId);
      const view = await this.splitView(created.id, { chatId });
      await edit(view.text, view.keyboard);
    } catch (error) {
      logger.error('Group receipt split failed', { userId, error: error.message, stack: error.stack });
      await edit(this.t(ledger.lang, 'grp_split_failed'));
    } finally {
      stopTyping();
      await this.receiptHandlers.finishJob(ctx, statusId);
    }
  }

  // Неуверенный чек из группы: черновик в личку плательщику (правка как обычно) с кнопкой «👥 Разделить в «группе»»
  // (группа — в самом черновике, кнопка остаётся после правок). false — в личку написать нельзя (не открывал бота) —
  // тогда делёж сразу в группе с пометкой «сверьте»
  async sendDraftToPrivate(ctx, user, lang, receipt, timezone, ledger) {
    try {
      const draft = { ...receipt, splitGroupId: ledger.id, splitGroupTitle: ledger.title };
      const view = await this.receiptHandlers.buildDraftView(user.id, lang, draft, { timezone });
      const sent = await ctx.telegram.sendMessage(user.id, view.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: view.keyboard } });
      await this.receiptService.saveDraft(user.id, sent.message_id, { receipt: draft, timezone });
      return true;
    } catch (error) {
      logger.warn('Receipt draft not sent to private chat', { userId: user.id, error: error.message });
      return false;
    }
  }

  // Вид дележа. viewerId — личное сообщение участника (его отметки ✅); chatId — где сообщение (группа или личка)
  async splitView(splitId, { viewerId = null, chatId = null, page = null } = {}) {
    const row = await this.groupService.getSplit(splitId);
    const ledger = await this.groupService.getLedger(row.group_id);
    const lang = viewerId ? await this.langOf({ id: viewerId }, ledger.lang) : ledger.lang;
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    const claims = await this.groupService.claims(splitId);
    const summary = this.groupService.summarize(row, claims);
    const currency = row.currency;
    const merchant = esc(row.merchant || this.t(lang, 'grp_split_default_merchant'));
    const totalsLine = summary.participants
      .map(id => `${esc(this.nameOf(members, id))} ${esc(this.money(summary.totals.get(id) || 0, currency))}`).join(' · ');
    if (row.status === 'canceled') return { text: this.t(lang, 'grp_split_canceled', { merchant }), keyboard: [] };
    if (row.status === 'closed') {
      const expense = row.expense_id ? await this.groupService.getExpense(row.expense_id) : null;
      if (expense && expense.deleted_at) return { text: this.t(lang, 'grp_expense_undone', { summary: `${merchant} · ${esc(this.money(summary.totalCents, currency))}` }), keyboard: [] };
      const shares = expense ? this.sharesLine(members, expense.shares, ledger.currency) : totalsLine;
      const keyboard = [];
      keyboard.push([{ text: this.t(lang, 'grp_button_balances'), callback_data: ledger.chat_id !== null && !viewerId && String(chatId) === String(ledger.chat_id) ? 'gb' : `gb|${ledger.id}` }]);
      if (expense) {
        keyboard.push([{ text: this.t(lang, 'grp_button_copy'), callback_data: `gcp|${expense.id}` }]);
        if (!viewerId || Number(viewerId) === Number(row.payer_id)) keyboard.push([{ text: this.t(lang, 'grp_button_undo'), callback_data: `gex|${expense.id}` }]);
      }
      return {
        text: this.t(lang, 'grp_split_closed', {
          merchant, total: esc(this.money(summary.totalCents, currency)), payer: esc(this.nameOf(members, row.payer_id)), totals: shares
        }),
        keyboard
      };
    }
    const claimers = new Map();
    for (const claim of claims) {
      if (!claimers.has(claim.itemId)) claimers.set(claim.itemId, []);
      claimers.get(claim.itemId).push(claim.userId);
    }
    const items = summary.items;
    const pages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
    const current = Math.min(Math.max(page === null ? row.page : page, 0), pages - 1);
    const slice = items.slice(current * ITEMS_PER_PAGE, (current + 1) * ITEMS_PER_PAGE);
    const lines = [this.t(lang, 'grp_split_title', { merchant, total: esc(this.money(summary.totalCents, currency)), payer: esc(this.nameOf(members, row.payer_id)) })];
    if (row.warn) lines.push(this.t(lang, 'grp_split_warn'));
    if (viewerId && Number(viewerId) !== Number(row.payer_id)) {
      lines.push(this.t(lang, 'grp_split_private_intro', { payer: esc(this.nameOf(members, row.payer_id)) }));
    }
    lines.push(this.t(lang, 'grp_split_howto'), '');
    for (const item of slice) {
      const who = item.extra
        ? this.t(lang, 'grp_split_extra_mark')
        : ((claimers.get(item.id) || []).map(id => esc(this.nameOf(members, id))).join(', ') || this.t(lang, 'grp_split_nobody'));
      lines.push(`${item.id}. ${esc(this.formatter.shorten(item.name, NAME_IN_LIST))} — ${esc(this.formatter.formatAmount(item.amount, currency))} · ${who}`);
    }
    lines.push('', this.t(lang, 'grp_split_totals', { totals: totalsLine }));
    if (summary.unclaimed.length) lines.push(this.t(lang, 'grp_split_unclaimed', { count: summary.unclaimed.length }));
    if (this.username) lines.push(this.t(lang, 'grp_split_link', { link: this.botLink(`split_${row.token}`) }));

    const buttons = slice.filter(item => !item.extra).map((item) => {
      const mine = viewerId && (claimers.get(item.id) || []).includes(Number(viewerId));
      const count = (claimers.get(item.id) || []).length;
      const label = `${mine ? '✅ ' : ''}${item.id}. ${this.formatter.shorten(item.name, NAME_IN_BUTTON)} · ${this.formatter.formatAmount(item.amount, currency)}${!viewerId && count ? ` ·${count}` : ''}`;
      return { text: label, callback_data: `gsi|${row.id}|${item.id}` };
    });
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) keyboard.push(buttons.slice(i, i + 2));
    if (pages > 1) {
      keyboard.push([
        current > 0 ? { text: '‹', callback_data: `gsg|${row.id}|${current - 1}` } : { text: ' ', callback_data: 'noop' },
        { text: `${current + 1}/${pages}`, callback_data: 'noop' },
        current < pages - 1 ? { text: '›', callback_data: `gsg|${row.id}|${current + 1}` } : { text: ' ', callback_data: 'noop' }
      ]);
    }
    const inGroup = ledger.chat_id !== null && String(chatId) === String(ledger.chat_id);
    if (inGroup) keyboard.push([{ text: this.t(lang, 'grp_button_join'), callback_data: 'gj' }]);
    if (!viewerId || Number(viewerId) === Number(row.payer_id)) {
      keyboard.push([
        { text: this.t(lang, 'grp_split_close', { payer: this.formatter.shorten(this.nameOf(members, row.payer_id), NAME_IN_BUTTON) }), callback_data: `gsc|${row.id}` },
        { text: this.t(lang, 'grp_split_cancel'), callback_data: `gsx|${row.id}` }
      ]);
    }
    if (!inGroup && this.username && ledger.chat_id === null && (!viewerId || Number(viewerId) === Number(row.payer_id))) {
      const share = `https://t.me/share/url?url=${encodeURIComponent(this.botLink(`split_${row.token}`))}&text=${encodeURIComponent(this.t(lang, 'grp_split_share_text', { merchant: row.merchant || this.t(lang, 'grp_split_default_merchant') }))}`;
      keyboard.push([{ text: this.t(lang, 'grp_split_share_button'), url: share }]);
    }
    return { text: lines.join('\n'), keyboard };
  }

  // Главное сообщение дележа (в группе или личное сообщение плательщика у счёта «по ссылке»): правка не чаще раза
  // в 3 с; отметка «перерисовать» снимается до чтения отметок — нажатие во время правки снова её поставит
  scheduleSplitRender(splitId, chatId, messageId, viewerId) {
    return this.throttle.schedule(`${chatId}:${messageId}`, async () => {
      const row = await this.groupService.getSplit(splitId);
      const main = row && String(row.chat_id) === String(chatId) && Number(row.message_id) === Number(messageId);
      if (main) await this.groupService.setDirty(splitId, false);
      try {
        // Главное сообщение в личке — у плательщика (счёт «по ссылке»): его отметки ✅ и кнопки закрытия
        const view = await this.splitView(splitId, { viewerId: main && Number(chatId) > 0 ? row.payer_id : viewerId, chatId });
        return await this.editMessage(chatId, messageId, view.text, view.keyboard);
      } catch (error) {
        if (main) await this.groupService.setDirty(splitId, true).catch(() => {});
        throw error;
      }
    });
  }

  renderMain(row) {
    if (row && row.chat_id && row.message_id) this.scheduleSplitRender(row.id, row.chat_id, row.message_id, null);
  }

  // После перезапуска: сообщения дележей, отметки которых не успели перерисовать (botInfo — для ссылок t.me/<бот>)
  async flushDirtySplits(telegram, botInfo = null) {
    if (telegram) this.telegram = telegram;
    if (botInfo) this.remember({ botInfo });
    const rows = await this.groupService.dirtySplits();
    for (const row of rows) this.renderMain(row);
    if (rows.length) logger.info('Dirty receipt splits re-rendered', { count: rows.length });
    return rows.length;
  }

  // Делёж из кнопки этого чата: в группе — только её делёж; в личке — любой (по ссылке). null — ответ дан
  async splitOfChat(ctx, splitId) {
    const row = await this.groupService.getSplit(splitId);
    const ledger = row ? await this.groupService.getLedger(row.group_id) : null;
    const lang = await this.langOf(ctx.from, ledger ? ledger.lang : 'en');
    const privateChat = ctx.chat.type === 'private';
    if (!row || !ledger || (!privateChat && String(ledger.chat_id) !== String(ctx.chat.id))) {
      await this.alert(ctx, this.t(lang, 'grp_split_outdated'));
      await Promise.resolve().then(() => ctx.editMessageReplyMarkup({ inline_keyboard: [] })).catch(() => {});
      return null;
    }
    return { row, ledger, lang, privateChat };
  }

  // Отметить позицию: в группе — участник учёта; в личке по ссылке — участие начинается с первого нажатия
  async toggleClaim(ctx, splitId, itemId) {
    const found = await this.splitOfChat(ctx, splitId);
    if (!found) return;
    const { row, ledger, lang, privateChat } = found;
    const member = await this.groupService.member(ledger.id, ctx.from.id);
    if (!privateChat && (!member || member.via_link)) {
      await this.alert(ctx, this.t(lang, 'grp_not_member'));
      return;
    }
    const item = (row.items || []).find(candidate => Number(candidate.id) === itemId);
    if (!item) {
      await this.alert(ctx, this.t(lang, 'grp_split_outdated'));
      return;
    }
    if (item.extra) {
      await this.alert(ctx, this.t(lang, 'grp_split_extra_alert'));
      return;
    }
    if (row.status !== 'open') return this.staleSplit(ctx, row, lang);
    if (privateChat && !member) await this.groupService.join(ledger.id, ctx.from, { lang, viaLink: true });
    const result = await this.groupService.toggleClaim(splitId, itemId, ctx.from.id);
    if (result.status !== 'claimed' && result.status !== 'unclaimed') return this.staleSplit(ctx, row, lang);
    const summary = this.groupService.summarize(row, await this.groupService.claims(splitId));
    const mine = summary.totals.get(Number(ctx.from.id)) || 0;
    await ctx.answerCbQuery(this.t(lang, result.status === 'claimed' ? 'grp_split_claimed' : 'grp_split_unclaimed_alert', {
      item: this.formatter.shorten(item.name, NAME_IN_LIST), total: this.money(mine, row.currency)
    })).catch(() => {});
    const message = ctx.callbackQuery.message;
    this.renderMain(row);
    const isMain = message && String(row.chat_id) === String(ctx.chat.id) && Number(row.message_id) === Number(message.message_id);
    if (message && !isMain) this.scheduleSplitRender(splitId, ctx.chat.id, message.message_id, ctx.from.id);
  }

  // Кнопка закрытого или отменённого дележа: alert и итоговый вид
  async staleSplit(ctx, row, lang) {
    await this.alert(ctx, this.t(lang, row.status === 'canceled' ? 'grp_split_outdated' : 'grp_split_already_closed'));
    const message = ctx.callbackQuery.message;
    if (message) this.scheduleSplitRender(row.id, ctx.chat.id, message.message_id, ctx.chat.type === 'private' ? ctx.from.id : null);
  }

  async splitPage(ctx, splitId, page) {
    const found = await this.splitOfChat(ctx, splitId);
    if (!found) return;
    await ctx.answerCbQuery().catch(() => {});
    const message = ctx.callbackQuery.message;
    const isMain = String(found.row.chat_id) === String(ctx.chat.id) && Number(found.row.message_id) === Number(message.message_id);
    if (isMain) await this.groupService.setSplitPage(splitId, page);
    const view = await this.splitView(splitId, { viewerId: found.privateChat ? ctx.from.id : null, chatId: ctx.chat.id, page });
    await this.editHtml(ctx, view.text, view.keyboard);
  }

  // «✅ Закрыть»: только плательщик; доли → долги в общий счёт, участникам по ссылке — личное сообщение с долей
  async closeSplit(ctx, splitId) {
    const found = await this.splitOfChat(ctx, splitId);
    if (!found) return;
    const { row, ledger, lang } = found;
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    const result = await this.groupService.closeSplit(splitId, ctx.from.id);
    if (result.status === 'forbidden') {
      await this.alert(ctx, this.t(lang, 'grp_split_only_payer', { payer: this.nameOf(members, row.payer_id) }));
      return;
    }
    if (result.status !== 'closed') return this.staleSplit(ctx, result.split || row, lang);
    await ctx.answerCbQuery().catch(() => {});
    this.renderMain(result.split);
    const message = ctx.callbackQuery.message;
    if (message && !(String(row.chat_id) === String(ctx.chat.id) && Number(row.message_id) === Number(message.message_id))) {
      this.scheduleSplitRender(splitId, ctx.chat.id, message.message_id, ctx.from.id);
    }
    await this.notifyShares(ctx, result.split, ledger, result.expenseId);
  }

  // Доля — личным сообщением тем, кто не видит сообщение группы: пришедшим по ссылке и всем у счёта «по ссылке»
  async notifyShares(ctx, row, ledger, expenseId) {
    const expense = await this.groupService.getExpense(expenseId);
    const members = await this.groupService.members(ledger.id, { includeLeft: true });
    for (const share of expense.shares) {
      const userId = Number(share.user_id);
      if (userId === Number(row.payer_id) || Number(share.share) <= 0) continue;
      const member = members.find(item => Number(item.user_id) === userId);
      if (ledger.chat_id !== null && member && !member.via_link) continue;
      const lang = (member && member.lang) || ledger.lang;
      const text = this.t(lang, 'grp_split_your_share', {
        merchant: esc(row.merchant || this.t(lang, 'grp_split_default_merchant')),
        amount: esc(this.formatter.formatAmount(Number(share.share), ledger.currency)),
        payer: esc(this.nameOf(members, row.payer_id))
      });
      await ctx.telegram.sendMessage(userId, text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'grp_button_balances'), callback_data: `gb|${ledger.id}` }], [{ text: this.t(lang, 'grp_button_copy'), callback_data: `gcp|${expense.id}` }]] }
      }).catch((error) => logger.warn('Split share not sent', { userId, error: error.message }));
    }
  }

  async cancelSplit(ctx, splitId) {
    const found = await this.splitOfChat(ctx, splitId);
    if (!found) return;
    const { row, ledger, lang } = found;
    if (Number(row.payer_id) !== Number(ctx.from.id)) {
      const members = await this.groupService.members(ledger.id, { includeLeft: true });
      await this.alert(ctx, this.t(lang, 'grp_split_only_payer', { payer: this.nameOf(members, row.payer_id) }));
      return;
    }
    const canceled = await this.groupService.cancelSplit(splitId, ctx.from.id);
    if (!canceled) return this.staleSplit(ctx, row, lang);
    await ctx.answerCbQuery().catch(() => {});
    this.renderMain(canceled);
    const message = ctx.callbackQuery.message;
    if (message && !(String(row.chat_id) === String(ctx.chat.id) && Number(row.message_id) === Number(message.message_id))) {
      this.scheduleSplitRender(splitId, ctx.chat.id, message.message_id, ctx.from.id);
    }
  }

  // /start split_<код> в личке: делёж с отметками этого человека (по ссылке — и не из группы)
  async startSplitLink(ctx, token) {
    const lang = await this.langOf(ctx.from);
    const row = await this.groupService.splitByToken(token);
    if (!row) {
      await ctx.reply(this.t(lang, 'grp_split_outdated'));
      return;
    }
    const view = await this.splitView(row.id, { viewerId: ctx.from.id, chatId: ctx.chat.id });
    await ctx.reply(view.text, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: view.keyboard } });
  }

  // /start в личке с кодом группового режима. true — обработано (онбординг не нужен)
  async handlePrivateStart(ctx) {
    const text = (ctx.message && ctx.message.text) || '';
    const match = /^\/start(?:@\w+)?\s+(split|gpass)_([a-z0-9]{6,16})$/.exec(text.trim());
    if (!match) return false;
    this.remember(ctx);
    if (match[1] === 'split') await this.startSplitLink(ctx, match[2]);
    else await this.startPass(ctx, match[2]);
    return true;
  }

  // ---------- «👥 Разделить с друзьями» из лички ----------

  // Куда делить: группы пользователя или «по ссылке». source — `r<id>` записанный чек или `d` черновик этого сообщения
  async showSplitTargets(ctx, source) {
    const lang = await this.langOf(ctx.from);
    await ctx.answerCbQuery().catch(() => {});
    const ledgers = await this.groupService.userChatLedgers(ctx.from.id);
    const keyboard = ledgers.map(ledger => [{ text: `👥 ${this.formatter.shorten(ledger.title || '—', 30)}`, callback_data: `gst|${source}|${ledger.id}` }]);
    keyboard.push([{ text: this.t(lang, 'grp_split_pick_link'), callback_data: `gst|${source}|0` }]);
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: source === 'd' ? 'rdp|0' : `rv|${source.slice(1)}|0` }]);
    await this.editHtml(ctx, this.t(lang, 'grp_split_pick_title'), keyboard);
  }

  // gst|<r<id>|d>|<учёт или 0>: делёж записанного чека или черновика (правки черновика сохраняются)
  async startPrivateSplit(ctx, source, groupId) {
    this.remember(ctx);
    const userId = ctx.from.id;
    const lang = await this.langOf(ctx.from);
    const messageId = ctx.callbackQuery.message && ctx.callbackQuery.message.message_id;
    let ledger;
    if (groupId) {
      ledger = await this.groupService.getLedger(groupId);
      if (!ledger || ledger.chat_id === null || !ledger.active || !(await this.groupService.member(ledger.id, userId))) {
        await this.alert(ctx, this.t(lang, 'grp_not_member'));
        return;
      }
    } else {
      ledger = await this.groupService.linkLedger(ctx.from, lang, this.t(lang, 'grp_link_ledger_title'));
    }
    const allowed = await this.groupService.allow(ledger, 'splits');
    if (!allowed.ok) {
      await ctx.answerCbQuery().catch(() => {});
      const limits = allowed.limits;
      await ctx.reply(this.t(lang, 'grp_cap_splits', {
        used: limits.used.splits, cap: limits.caps.splits, date: this.date(limits.resetsAt), days: this.groupService.pass.days, stars: this.groupService.pass.stars
      }), { parse_mode: 'HTML' });
      return;
    }
    let receipt;
    let sourceReceiptId = null;
    if (source === 'd') {
      const taken = await this.receiptService.takeDraft(userId, messageId);
      if (taken.status !== 'ok') {
        await this.receiptHandlers.expireButtons(ctx, lang, taken.status === 'busy' ? 'receipt_draft_busy' : 'receipt_draft_outdated');
        return;
      }
      receipt = taken.receipt;
    } else {
      sourceReceiptId = Number(source.slice(1));
      const stored = await this.receiptService.getReceipt(userId, sourceReceiptId);
      const expenses = stored && stored.status !== 'undone' ? await this.receiptService.getExpenses(userId, sourceReceiptId) : [];
      if (!expenses.length) {
        await this.alert(ctx, this.t(lang, 'receipt_already_undone'));
        return;
      }
      receipt = {
        merchant: stored.merchant, currency: expenses[0].currency,
        total: stored.printed_total !== null ? Number(stored.printed_total) : null,
        items: expenses.map(expense => ({ name: expense.description, amount: Number(expense.amount) }))
      };
    }
    const created = await this.groupService.createSplit(ledger, {
      payerId: userId, receipt, sourceReceiptId, warn: false, extraLabel: this.t(ledger.lang, 'grp_split_extra_line')
    });
    if (!created) {
      if (source === 'd') await this.receiptService.releaseDraft(userId, messageId).catch(() => {});
      await this.alert(ctx, this.t(lang, 'grp_split_empty'));
      return;
    }
    if (source === 'd') await this.receiptService.deleteDraft(userId, messageId);
    await ctx.answerCbQuery().catch(() => {});
    if (ledger.chat_id !== null) {
      const view = await this.splitView(created.id, { chatId: ledger.chat_id });
      let sent;
      try {
        sent = await ctx.telegram.sendMessage(ledger.chat_id, view.text, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: view.keyboard } });
      } catch (error) {
        logger.warn('Split not posted to group', { groupId: ledger.id, error: error.message });
        await this.groupService.cancelSplit(created.id, userId);
        await ctx.reply(this.t(lang, 'grp_split_send_failed'));
        return;
      }
      await this.groupService.setSplitMessage(created.id, ledger.chat_id, sent.message_id);
      await this.editHtml(ctx, this.t(lang, 'grp_split_sent', { title: esc(ledger.title) }), []);
      return;
    }
    // Счёт «по ссылке»: это сообщение становится дележом плательщика, ссылка — друзьям
    await this.groupService.setSplitMessage(created.id, ctx.chat.id, messageId);
    const view = await this.splitView(created.id, { viewerId: userId, chatId: ctx.chat.id });
    await this.editHtml(ctx, view.text, view.keyboard);
    await ctx.reply(this.t(lang, 'grp_split_link_ready', { link: this.botLink(`split_${created.token}`) }), { disable_web_page_preview: true });
  }

  // Команды группового режима в личке: подсказка, как ими пользоваться
  async groupOnlyCommand(ctx) {
    const lang = await this.langOf(ctx.from);
    await ctx.reply(this.t(lang, 'grp_only_in_groups'), { parse_mode: 'HTML' });
  }

  async idle() {
    await Promise.all([...this.tasks]);
    await this.throttle.idle();
  }
}

module.exports = GroupHandlers;
module.exports.GROUP_COMMANDS = GROUP_COMMANDS;
