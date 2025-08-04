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
  button_family: '👨‍👩‍👧‍👦 Family',
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
  category_other: 'Other',
  
  // Family Budget
  family_info: '👨‍👩‍👧‍👦 *Family Budget*\n\nHere you can manage family expenses together with your loved ones.',
  family_created: '✅ Family "{name}" created! Now you can invite members.',
  family_joined: '✅ You joined family "{name}"!',
  family_left: '✅ You left family "{name}".',
  family_deleted: '✅ Family "{name}" deleted. All family expenses became personal.',
  family_member_removed: '✅ Member removed from family.',
  family_member_removed_notification: '❌ You were removed from family "{name}".',
  family_cannot_leave_owner: '❌ Family owner cannot leave family. Use "Delete Family" instead.',
  
  // Family menu buttons
  create_family: '🏠 Create Family',
  join_family: '🔗 Join Family',
  invite_member: '➕ Invite Member',
  leave_family: '🚪 Leave Family',
  delete_family: '🗑️ Delete Family',
  family_members: '👥 Family Members',
  family_stats: '📊 Family Statistics',
  family_daily_stats: '📈 Daily Expenses',
  family_add_expense: '💰 Add Family Expense',
  family_menu: '👨‍👩‍👧‍👦 Family Menu',
  family_cancel: '❌ Cancel',
  
  // Invitations
  invitation_sent: '✅ Invitation sent to user @{username}',
  invitation_accepted: '✅ You accepted invitation to family "{name}"!',
  invitation_rejected: '❌ You rejected invitation to family "{name}".',
  invitation_not_found: '❌ Invitation not found or expired.',
  invitation_expired: '❌ Invitation expired.',
  invitation_already_processed: '❌ Invitation already processed.',
  
  // Input messages
  enter_family_name: 'Enter family name (3-50 characters):',
  enter_invite_username: 'Enter username (without @):',
  enter_expense_amount: 'Enter amount and description for family expense:',
  
  // Errors
  family_name_too_short: '❌ Family name must be at least 3 characters.',
  family_name_too_long: '❌ Family name must not exceed 50 characters.',
  user_not_found: '❌ User not found.',
  user_already_in_family: '❌ User is already in a family.',
  user_already_has_invitation: '❌ User already has an active invitation.',
  only_owner_can_invite: '❌ Only family owner can invite members.',
  active_invitations: '📋 Active Invitations',
  no_active_invitations: '📋 You have no active invitations.',
  active_invitations_list: '📋 Active Invitations:',
  cancel_invitation: '❌ Cancel Invitation',
  invitation_cancelled: '✅ Invitation cancelled.',
  invitation_not_found: '❌ Invitation not found.',
  not_authorized: '❌ You are not authorized to perform this action.',
  invitation_code: '🔑 Invitation code: `{code}`',
  family_invitation_received: '🎉 You are invited to family *{familyName}*\n\n👤 Invited by: {inviterName}\n🔑 Code: `{inviteCode}`\n\nChoose action:',
  accept_invitation: '✅ Accept',
  reject_invitation: '❌ Reject',
  invitation_accepted: '🎉 Congratulations! You joined family *{familyName}*',
  invitation_rejected: '❌ You rejected the family invitation',
  invitation_not_pending: '❌ Invitation is not pending',
  invitation_expired: '❌ Invitation has expired',
  invitation_cancelled_notification: '❌ Invitation to family *{familyName}* was cancelled by {cancelledBy}',
  enter_invite_code: '🔑 Enter invitation code:',
  only_owner_can_remove: '❌ Only family owner can remove members.',
  only_owner_can_delete: '❌ Only family owner can delete family.',
  cannot_remove_owner: '❌ Cannot remove family owner.',
  cannot_remove_yourself: '❌ Cannot remove yourself.',
  family_not_found: '❌ Family not found.',
  not_family_member: '❌ You are not a family member.',
  not_family_owner: '❌ You are not a family owner.',
  
  // Confirmations
  confirm_delete_family: '⚠️ *Delete Family*\n\nAll members will be removed and family expenses will become personal.\n\nAre you sure?',
  confirm_remove_member: '⚠️ *Remove Member*\n\nMember will be removed from family.\n\nAre you sure?',
  
  // Family statistics
  family_monthly_stats: '👨‍👩‍👧‍👦 *Family Expenses for Month*',
  family_daily_stats_title: '👨‍👩‍👧‍👦 *Family Expenses for Day*',
  family_total_spent: 'Spent: *{amount}*',
  family_members_count: 'Members: {count}',
  family_no_expenses: 'No family expenses for this period.',
  
  // Member list
  family_members_title: '👥 *Family Members*',
  family_member_info: '• {name} ({role}) - joined {date}',
  family_owner_role: 'owner',
  family_member_role: 'member',
  
  // Premium features
  premium_required: '❌ This feature is only available for premium users.',
  upgrade_to_premium: '💎 Upgrade to premium for access to family budget!'
}; 