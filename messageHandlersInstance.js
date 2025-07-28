const MessageHandlers = require('./src/handlers/messages');
const ExpenseService = require('./src/services/ExpenseService');
const UserService = require('./src/services/UserService');
const Formatter = require('./src/utils/formatter');

module.exports = new MessageHandlers({
  expenseService: ExpenseService,
  userService: UserService,
  formatter: Formatter
}); 