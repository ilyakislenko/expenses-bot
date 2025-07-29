require('dotenv').config();

// Валидация переменных окружения
if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN is required');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const { Telegraf } = require('telegraf');
const db = require('./database');
const createCurrencyUtils = require('./utils/currency');
const currencyUtils = createCurrencyUtils(db);
const cron = require('node-cron');
const userEditState = require('./utils/userEditState');
const ExpenseService = require('./services/ExpenseService');
const UserService = require('./services/UserService');
const errorHandler = require('./middleware/errorHandler');

const commandHandlers = require('../commandHandlersInstance');
const messageHandlers = require('../messageHandlersInstance');
const callbackHandlers = require('../callbackHandlersInstance');

const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = {
  bot,
  db,
  currencyUtils,
  cron,
  userEditState,
  ExpenseService,
  UserService,
  errorHandler,
  commandHandlers,
  messageHandlers,
  callbackHandlers
}; 