// Профиль бота в Telegram на всех языках интерфейса: описание (до /start), короткое описание и меню команд
// (в личке и отдельно в группах).
// Тексты — в src/locales (bot_description, bot_short_description, command_*).
// Запускать после изменения этих текстов или списка команд: node scripts/set-bot-profile.js
require('dotenv').config();
const LocalizationService = require('../src/services/LocalizationService');

// Команды в меню (порядок важен). Все обрабатываются в src/botRoutes.js
const COMMANDS = [
  'start', 'stats', 'ask', 'history', 'income', 'recurring', 'savings', 'achievements', 'coins', 'tags', 'roast', 'quiz', 'export', 'import', 'family',
  'settings', 'setup', 'limits', 'invite', 'help', 'cancel', 'paysupport', 'terms', 'privacy'
];
// Меню команд в группах (scope all_group_chats): только общие расходы — личные команды в группе не работают.
// Тексты — command_group_<команда>
const GROUP_COMMANDS = ['spent', 'split', 'balance', 'undo', 'group', 'help'];
// Коды языков бота, которые в Telegram называются иначе
const TELEGRAM_LANGUAGE = { jp: 'ja', kz: 'kk' };
const DEFAULT_LANGUAGE = 'en'; // для языков Telegram, которых нет в боте (как и в онбординге)

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN is not set');

async function call(method, params) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} (${params.language_code || 'default'}): ${json.description}`);
}

async function setProfile(localization, lang, languageCode) {
  const t = (key) => localization.getText(lang, key);
  const scope = languageCode ? { language_code: languageCode } : {};
  await call('setMyDescription', { description: t('bot_description'), ...scope });
  await call('setMyShortDescription', { short_description: t('bot_short_description'), ...scope });
  await call('setMyCommands', {
    commands: COMMANDS.map(command => ({ command, description: t(`command_${command}`) })),
    ...scope
  });
  await call('setMyCommands', {
    commands: GROUP_COMMANDS.map(command => ({ command, description: t(`command_group_${command}`) })),
    scope: { type: 'all_group_chats' },
    ...scope
  });
  console.log(`${languageCode || 'default'} (${lang}): ok`);
}

(async () => {
  const localization = new LocalizationService();
  await setProfile(localization, DEFAULT_LANGUAGE, null);
  for (const lang of Object.keys(localization.supportedLanguages)) {
    await setProfile(localization, lang, TELEGRAM_LANGUAGE[lang] || lang);
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
