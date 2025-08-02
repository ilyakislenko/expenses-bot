module.exports = {
  // General messages
  welcome: 'Hello, {name}! 👋',
  error: 'An error occurred 😞',
  unknown_error: 'An unexpected error occurred. Please try again later.',
  not_found: 'Not found',
  cancel: 'Cancel',
  back: 'Back',
  confirm: 'Confirm',
  save: 'Save',
  
  // Commands
  start_message: `I'll help you track your expenses.

*How to add an expense:*
Just write the amount and description separated by a space:
-  \`200 groceries at the store\`
-  \`1500 lunch at restaurant\`
-  \`50 transportation\`

After entering, a menu with category buttons will appear - choose the appropriate one! 🏷️

*Commands:*
/start - restart the bot
/menu - open interactive menu (Recommended)
/history - recent entries for the day
/stats - detailed statistics
/export - download data (CSV)
/undo - cancel last entry
/categories - list of categories
/currency - set base currency
/settings - open settings
/help - show help

Start entering your expenses! 💰`,

  help_message: `📋 *Command Help*

*Adding expenses:*
Write amount and description:
\`200 groceries\` - a menu with category buttons will appear

*Commands:*
/start - restart the bot
/menu - open interactive menu (Recommended)
/history - recent entries for the day
/stats - detailed statistics
/export - download data (CSV)
/undo - cancel last entry
/categories - list of categories
/currency - set base currency
/settings - open settings
/help - this help

*Tips:*
-  You can use comma: \`150.50 coffee\`
-  After entering, choose a category from the buttons
-  Description helps you remember what you spent on
-  Use /stats to analyze your spending

Happy tracking! 💰`,

  // Expenses
  expense_added: '✅ Recorded: {amount} - {description}',
  expense_updated: '✅ Entry updated: {amount} - {description}',
  expense_deleted: '✅ Deleted entry: {amount} - {description}',
  no_expenses: 'No entries to delete 🤷‍♂️',
  expense_not_found: 'Error: entry not found.',
  expense_update_error: 'Error: entry not found or not updated.',
  
  // Statistics
  monthly_stats: '💰 *Expenses for current month*',
  daily_stats: '💰 *Expenses for today*',
  total_spent: 'Spent: *{amount}*',
  records_count: 'Records: {count}',
  no_expenses_period: 'No expenses for this period.',
  
  // Categories
  select_category: 'Select category:',
  amount_label: 'Amount',
  description_label: 'Description',
  category_label: 'Category',
  expense_added_title: 'Expense added!',
  no_categories: 'Categories not found.',
  category_expenses: 'Expenses for category "{category}"',
  no_category_expenses: 'No expenses for this category in the last month.',
  
  // Settings
  settings_title: 'Settings:',
  currency_select: 'Select the currency that will be used by default:',
  currency_set: 'Currency set: {currency}',
  currency_updated: 'Currency successfully changed to {currency}',
  timezone_setup: `🕐 *Timezone Setup*

What time is it for you now?

*Current UTC time:* {utcTime}

Select your current time:`,
  timezone_set: '✅ Timezone set: {timezone}',
  timezone_updated: `✅ *Timezone updated!*

🕐 Selected time: *{time}*
🌍 Calculated timezone: *{timezone}*

Now all your expenses will be correctly displayed in your local time.`,
  timezone_updated_simple: `✅ *Timezone updated!*

🌍 New timezone: *{timezone}*

Now all your expenses will be correctly displayed in your local time.`,
  
  // Limits
  limits_title: '📊 *Limits Information*',
  status_regular: '👤 Regular',
  status_premium: '💎 Premium',
  status_label: '*Status:* {status}',
  records_usage: '*Records:* {current}/{max} ({percentage}%)',
  records_remaining: '*Remaining:* {remaining} records',
  max_description_length: '*Max description length:* {length} characters',
  near_limit_warning: '⚠️ *Warning:* You are close to the record limit!',
  limit_reached: '❌ *Record limit reached!*',
  premium_benefits: `💎 *Premium benefits:*
• 160 characters in description (instead of 80)
• 300 records (instead of 100)
• Custom categories
• Extended statistics`,
  
  // Validation errors
  error_too_long_regular: '❌ Description is too long!\nMaximum 80 characters for regular users.',
  error_too_long_premium: '❌ Description is too long!\nMaximum 160 characters for premium users.',
  error_no_description: '❌ You need to specify a description after the amount.',
  error_amount: '❌ Invalid amount. Enter a number from 0.01 to 999999.',
  error_format: '❌ I don\'t understand the format. Write the amount and description separated by a space.\nFor example: `200 groceries` or `1500 lunch at cafe`',
  error_limit_reached: '❌ Record limit reached!\nRegular users: 100 records\nPremium users: 300 records\n\n💎 Upgrade to premium to increase limits!',
  error_premium_required: '💎 This feature is only available for premium users!\n\nPremium benefits:\n• 160 characters in description (instead of 80)\n• 300 records (instead of 100)\n• Custom categories\n• Extended statistics',
  error_generic: '❌ An error occurred. Please try again later or contact the administrator.',
  
  // Buttons
  button_menu: '📋 Menu',
  button_expenses_month: '💰 Monthly Expenses',
  button_expenses_day: '💰 Daily Expenses',
  button_expenses_categories: '💰 Expenses by Category',
  button_settings: '⚙️ Settings',
  button_delete_last: '🗑️ Delete Last Entry',
  button_limits: '📊 Limits',
  button_help: '❓ Help',
  button_edit: 'Edit',
  button_delete: 'Delete',
  button_cancel: '❌ Cancel',
  button_back: '⬅️ Back',
  button_change_currency: '💱 Change Currency',
  button_change_timezone: '🌍 Timezone',
  button_change_language: '🌐 Language',
  
  // Main menu
  main_menu_title: '🏠 *Main Menu*\n\nChoose an action:',
  
  // Languages
  language_select: '🌍 Select language:',
  language_set: '✅ Language changed to English',
  language_not_supported: '❌ Language not supported',
  language_change_error: '❌ Error occurred while changing language',
  timezone_error: '❌ Error occurred while setting timezone',
  
  // Export
  export_success: '📊 Data exported successfully!',
  export_error: 'An error occurred while exporting data 😞',
  expense_save_error: 'An error occurred while saving the expense 😞',
  keyboard_updated: '✅ Keyboard updated to your language!',
  
  // Editing
  edit_canceled: 'Editing canceled.',
  edit_no_active: 'No active editing.',
  edit_instructions: 'Enter a new amount and/or description for this expense (for example: 500 coffee).\n\nOr click the button below to cancel.',
  edit_empty: 'Enter a new amount, description, or both values.',
  edit_amount_error: 'Invalid amount.',
  edit_too_long: 'Description is too long (maximum {max} characters).',
  edit_format_error: 'Format error.',
  
  // Callback responses
  callback_limit_reached: '❌ Record limit reached',
  callback_button_not_found: '❌ Error: button not found',
  callback_data_not_found: '❌ Error: data not found',
  callback_expense_added: '✅ Added to category "{category}"',
  callback_expense_saved: '❌ An error occurred while saving',
  callback_canceled: '❌ Canceled',
  callback_expense_canceled: '❌ Adding expense canceled',
  callback_deleted: 'Entry deleted!',
  callback_delete_error: 'Delete error or entry not found',
  callback_edit_mode: 'Exit edit mode:',
  callback_no_cards: 'somehow there are no cards...an error occurred',
  
  // Statistics
  by_categories: 'By categories:',
  no_expenses_category: 'No expenses for this category for the last month.',
  select_category: 'Select category:',
  
  // Formatting
  amount_format: '{amount} {currency}',
  date_format: '{month}/{day}/{year}',
  time_format: '{hour}:{minute}',
  
  // CSV Export
  date_label: 'Date',
  currency_label: 'Currency',
  total_by_currencies: 'Total by currencies:',
  total_in_currency: 'Total in {currency}',
  
  // Default categories
  category_food: 'Food',
  category_transport: 'Transport',
  category_entertainment: 'Entertainment',
  category_shopping: 'Shopping',
  category_health: 'Health',
  category_other: 'Other'
}; 