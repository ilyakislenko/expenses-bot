const CallbackHandlers = require('./src/handlers/callbacks');
const ExpenseService = require('./src/services/ExpenseService');
const Formatter = require('./src/utils/formatter');
const db = require('./src/database');
const createCurrencyUtils = require('./src/utils/currency');
const currencyUtils = createCurrencyUtils(db);
const formatter = new Formatter(currencyUtils);

module.exports = new CallbackHandlers({
  expenseService: ExpenseService,
  formatter: formatter
}); 