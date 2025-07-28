const MessageHandlers = require('./src/handlers/messages');
const ExpenseService = require('./src/services/ExpenseService');
const UserService = require('./src/services/UserService');
const Formatter = require('./src/utils/formatter');
const db = require('./src/database');
const createCurrencyUtils = require('./src/utils/currency');
const currencyUtils = createCurrencyUtils(db);
const formatter = new Formatter(currencyUtils);

module.exports = new MessageHandlers({
  expenseService: ExpenseService,
  userService: UserService,
  formatter: formatter
}); 