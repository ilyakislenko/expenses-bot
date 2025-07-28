const CommandHandlers = require('./src/handlers/commands');
const ExpenseService = require('./src/services/ExpenseService');
const UserService = require('./src/services/UserService');
const Formatter = require('./src/utils/formatter');

module.exports = new CommandHandlers({
  expenseService: ExpenseService,
  userService: UserService,
  formatter: Formatter
}); 