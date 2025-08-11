module.exports = {
  button_reminders: '🔔 Remind me',
  reminders_enabled: 'Reminders are ON. If you haven’t recorded anything by 18:00 — I’ll poke you with some humor 😉',
  reminders_disabled: 'Reminders are OFF. I’ll be quiet 🤐',
  reminder_sample_variants: [
    "Hey! If your wallet is silent, it doesn't mean it’s happy. Log your expenses 😉",
    'Spent anything today? Write it down before your memory goes shopping 🧠🥖',
    'If you didn’t track it — you basically threw it away. Let’s fix that 💸',
    'Drop by drop — the budget becomes a river. Log today’s expenses 🌊',
    'Not nagging, just reminding: time to record your spending 😌'
  ],
  reminder_message_title: 'Reminder',
  reminder_turn_on_off: (enabled) => enabled ? 'Turn reminders OFF' : 'Turn reminders ON',
  
  // Bug reports
  button_bug_report: '🐛 Report Bug / Suggest Improvement',
  bug_report_prompt: '🐛 *Report a Bug or Suggest Improvement*\n\nDescribe the issue or suggest an improvement (up to 1000 characters):',
  bug_report_success: '✅ Thank you! Your message has been sent to developers.',
  bug_report_too_long: '❌ Message too long! Please reduce by {excess} characters (maximum 1000).',
  bug_report_empty: '❌ Empty message. Please describe the issue or suggestion.',
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
  button_change_period_start: '📅 Period start day',
  period_start_prompt: 'Enter the day from which each month your new period will start 👇🏼\n\nIt must be a number from 1 to 31. For shorter months, the last day will be used.',
  period_start_invalid: '❌ Invalid number. Please enter an integer from 1 to 31.',
  period_start_set: '✅ Period start day set: {day}',
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
  status_regular: '👤 Standard',
  status_premium: '💎 Premium',
  status_label: '*Status:* {status}',
  records_usage: '<b>Records:</b> {current}/{max} ({percentage}%)',
  records_remaining: '<b>Remaining:</b> {remaining} records',
  max_description_length: '<b>Max description length:</b> {length} characters',
  near_limit_warning: '⚠️ *Warning:* You are close to the record limit!',
  limit_reached: '❌ *Record limit reached!*',
  premium_benefits: `💎 <b>Premium benefits:</b>
• 160 characters in description (instead of 80)
• 300 records (instead of 100)
 • Up to 5 custom categories
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
  button_custom_categories: '🏷️ Custom Categories',
  
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
  family_member_removed_notification: '❌ You were removed from family *{familyName}*.',
  family_cannot_leave_owner: '❌ Family owner cannot leave family. Use "Delete Family" instead.',
  
  // Family menu buttons
  create_family: '🏠 Create Family',
  join_family: '🔗 Join Family',
  invite_member: '➕ Invite Member',
  leave_family: '🚪 Leave Family',
  delete_family: '🗑️ Delete Family',
  family_members: '👥 Family Members',
  family_stats: '💰 Monthly Expenses',
  family_daily_stats: '💰 Daily Expenses',
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
  user_already_in_other_family: '❌ User is already in another family.',
  user_already_in_your_family: '❌ User is already a member of your family.',
  user_not_premium: '❌ User does not have premium status.',
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
  family_daily_stats: '💰 Daily Expenses',
  family_daily_stats_title: '👨‍👩‍👧‍👦 *Family Expenses for Day*',
  family_export: '📊 Family Export',
  family_total_spent: 'Spent: *{amount}*',
  family_members_count: 'Members: {count}',
  family_no_expenses: 'No family expenses for this period.',
  
  // Member list
  family_members_title: '👥 *Family Members*',
  family_member_info: '• {name} ({role}) - joined {date}',
  family_owner_role: 'owner',
  family_member_role: 'member',
  remove_member: '❌ Remove',
  confirm_remove_member: '⚠️ *Remove Member*\n\nAre you sure you want to remove {name} from the family?',
  member_removed: '✅ Member {name} has been removed from the family.',
  member_removed_notification: '❌ You have been removed from family *{familyName}* by {ownerName}.',
  
  // Premium features
  premium_required: '❌ This feature is only available for premium users.',
  upgrade_to_premium: '💎 Upgrade to premium for access to family budget!',
  
  // Premium subscription
  premium_subscription_title: '⭐️ Subscription',
  premium_status_header: '<b>Your Status:</b>',
  premium_privileges: 'Privileges: {status}',
  premium_limits_info: 'Here your limits are displayed, for example: number of categories, expenses, access to family features, current premium period or its absence.',
  premium_menu_title: '<b>Menu:</b>',
  premium_tariff_button: '⭐️ Tariff',
  premium_why_paid_button: '👀 Why is the service paid?',
  premium_donate_button: '🤝 Donate',
  premium_back_button: '⬅️ Back',
  premium_tariffs_title: '⭐️ Tariffs (Telegram Stars)',
  premium_payment_info: '💳 Payment is made using Telegram Stars — Telegram\'s internal currency for convenient and secure payment within the messenger. <b>No automatic renewal.</b>',
  premium_renewal_info: '📅 You can renew your subscription at any time. The corresponding number of days will be added to the remaining period.',
  premium_stars_info: '💡 You can purchase stars without Apple / Google commission in the official bot [@PremiumBot].',
  premium_why_paid_title: '👀 Why is the service paid?',
  premium_why_paid_text: 'Keeping the server running for this bot costs about 13,000₽ a month — and that\'s even without accounting for the rapidly growing number of users. And as the developer, I also need to eat so I have the energy to keep building this service for you :)',
  premium_payment_title: '💳 *Premium Subscription Payment*',
  premium_payment_description: 'You selected tariff: <b>{duration}</b>\nCost: <b>{stars} ⭐️</b>\n\nClick the button below to proceed to payment via Telegram Stars.',

  payment_success: '🎉 *Payment successful!*\n\nYour premium subscription has been activated. You now have access to all advanced bot features!',
  premium_expires: '📅 Premium subscription valid until: <b>{date}</b>\n⏰ Days remaining: <b>{days}</b>'
  ,
  // Donations
  donate_prompt_title: '🤝 Support the project',
  donate_prompt_text: 'Enter the number of stars (Telegram Stars) you want to donate.\n\n(You can send from 1 to 2500 stars at a time)\n\nYou may add a letter up to 500 characters — just write it after the number on a new line.',
  donate_invalid: '❌ Enter an integer from 1 to 2500. Letter up to 500 characters.',
  donate_created: '✅ Donation request created: {stars} ⭐️. I will send a payment link now.',
  donate_paid: '🙏 Thanks for your support! Donation received: {stars} ⭐️',
  // Custom categories (premium)
  custom_categories_title: '🏷️ Custom Categories',
  custom_categories_info: 'Here you can create your own expense categories (premium only).',
  custom_categories_add: '➕ Add Category',
  custom_categories_manage: '🗂️ Manage Categories',
  custom_categories_enter_name: 'Enter the new category name (1-30 characters):',
  custom_categories_created: '✅ Category created: {name}',
  custom_categories_exists: '❌ This category already exists.',
  custom_categories_limit_reached: '❌ Custom categories limit reached: {max}',
  custom_categories_list_empty: 'You have no custom categories.',
  custom_categories_list_title: 'Your custom categories:',
  custom_categories_delete: '🗑️ Delete',
  custom_categories_deleted: '✅ Category deleted.',
  custom_categories_premium_required: '💎 This feature is only available for premium users.'
}; 