module.exports = {
  button_reminders: '🔔 Remind me',
  reminders_enabled: 'Reminders are ON. If you haven’t recorded anything by 18:00 — I’ll poke you with some humor 😉',
  reminders_disabled: 'Reminders are OFF. I’ll be quiet 🤐',
  button_configure_reminder_hours: '⏰ Configure reminder hours',
  reminder_hours_info: 'Select up to 3 hours for reminders (your local timezone). Current:',
  reminder_hours_limit: 'You can select up to 3 hours',
  reminder_hours_saved: '✅ Reminder hours saved',
  button_save: 'Save',
  button_clear: 'Clear',
  reminder_sample_variants: [
   '👋 Hey! If your wallet is silent, it doesn’t mean it’s happy. Record your expenses 😉',
'🤔 Spent anything today? Write it down before your memory goes out for bread 🧠🥖',
'💭 If you didn’t record it — consider it spent into the void. Let’s log it 💸',
'🌊 Drop by drop — and the budget slips away unnoticed. Better record today’s expenses 🌊',
'🤖 The bot doesn’t nag, it just reminds: time to record expenses 😌',
'💡 Take care of a penny — and a ruble will be saved. Time to make a note!',

'💰 Money loves counting and quiet. Record your expenses.',

'💡 Don’t waste in vain — save for what matters. Time to make an entry.',

'🏗️ Small savings — big results. Add a purchase now.',

'🌱 Save today — breathe easier tomorrow. Record your expenses.',

'🔄 A guarded ruble brings two. Log an expense in a minute.',

'⏰ Save first — spend later. Time to make a note!',

'🧱 Every penny is a brick of freedom. Record an expense.',

'🛡️ Save for a rainy day in advance. Add an entry now.',

'📈 Smart spending is the best investment. Log the purchase.',

'🎯 Expense control = fewer worries. Record your expenses.',

'🚀 Fewer impulses — more opportunities. Time to make an entry.',

'💎 Pay yourself first. Add an expense in the bot.',

'✂️ A cut unnecessary expense is a gained income. Log the purchase.',

'🎪 A budget is freedom of choice. Record today’s expenses.',

'🌟 Savings are a “yes” to your future. Time to make a note!',

'⚡ Discipline beats chaos. Log the expense.',

'⏳ Money slips away quietly — record in time. Add an expense now.',

'🧘 Frugality is the path to peace. Record the purchase.',

'📋 Money loves order. Time to make an entry.'
  ],
  reminder_message_title: 'Reminder',
  reminder_turn_on_off: (enabled) => enabled ? 'Turn reminders OFF' : 'Turn reminders ON',
  
  // Bug reports
  button_bug_report: '🐛 Report Bug / Suggest Improvement',
  bug_report_prompt: '🐛 *Report a Bug or Suggest Improvement*\n\nDescribe the issue or suggest an improvement (up to 1000 characters):',
  bug_report_success: '✅ Thank you! Your message has been sent to developers.',
  bug_report_too_long: '❌ Message too long! Please reduce by {excess} characters (maximum 1000).',
  bug_report_empty: '❌ Empty message. Please describe the issue or suggestion.',
  bug_report_rate_limit: '⚠️ Too many bug reports!\n\nYou can only send 3 reports per 10 minutes',
  bug_report_suspicious: '⚠️ Message contains forbidden characters or suspicious content',
  
  // Security messages
  security_rate_limit: '⚠️ *Too many requests*\n\nTry again in {resetTime} seconds\nLimit: {limit} requests per minute',
  security_validation_error: '⚠️ *Validation error*\n\n{message}',
  security_error: '❌ *Security error*\n\nPlease try again later or contact administrator.',
  
  // Admin panel
  button_admin: '👑 Admin Panel',
  admin_access_denied: '❌ You do not have administrator rights.',
  admin_panel_title: '👑 *Administrator Panel*\n\nChoose an action:',
  admin_error: '❌ An error occurred while performing administrator action.',
  
  // Admin stats
  admin_stats_text: `📊 *Bot Statistics*

👥 **Users:**
• Total: {totalUsers}
• Premium: {activePremium}
• New this week: {newUsersWeek}
• New this month: {newUsersMonth}

💰 **Expenses:**
• Total records: {totalExpenses}
• This week: {expensesWeek}
• Active users: {activeUsers}

🐛 **Bug reports:** {totalBugReports}

💎 **Donations:**
• Total: {totalDonations}
• Stars collected: {totalStars}

⭐ **Premium transactions:** {premiumTransactions}`,

  // Admin users
  admin_users_title: '👥 *Users* (page {page}/{totalPages})\n\nTotal: {totalUsers}\n',
  
  // Admin bug reports
  admin_bug_reports_title: '🐛 *Bug Reports*',
  bug_report_status_new: '🆕 New',
  bug_report_status_in_progress: '🔄 In Progress',
  bug_report_status_resolved: '✅ Resolved',
  bug_report_status_closed: '🔒 Closed',
  
  // Admin donations
  admin_donations_text: `💰 *Donation Statistics*

📊 **Overall statistics:**
• Total donations: {totalDonations}
• Completed: {completedDonations}
• Pending: {pendingDonations}

⭐ **Stars:**
• Total collected: {totalStars}
• Average donation: {avgStars} stars`,

  // Admin premium 
  admin_premium_stats: `⭐ *Premium Statistics*

📊 **Users:**
• Total premium: {totalPremiumUsers}
• Currently active: {activePremiumUsers}

💳 **Transactions:**
• Total operations: {totalTransactions}
• Total revenue: {totalRevenue} stars`,

  // Admin admins
  admin_admins_title: '👑 *Administrators* ({count})\n',
  
  // Admin search
  admin_search_prompt: '🔍 *User Search*\n\nEnter user ID or username:',
  admin_search_not_found: '❌ User not found.',
  admin_search_results: '🔍 *Search results* "{query}"\n\nFound: {count}\n',
  
  // Admin user details
  admin_user_not_found: '❌ User not found.',
  admin_user_details: `👤 *User Information*

{adminFlag}{premiumFlag} **{firstName}** (@{username})
🆔 ID: {userId}
🌐 Language: {language}
💱 Currency: {currency}
🕐 Timezone: {timezone}
📅 Registered: {createdAt}

📊 **Statistics:**
• Expense records: {totalExpenses}
• Total amount: {totalAmount}
• Bug reports: {bugReportsCount}
• Transactions: {transactionsCount}`,

  // Admin actions
  admin_promote_success: '✅ User {userId} has been promoted to administrator.',
  admin_demote_success: '✅ Administrator rights removed from user {userId}.',
  admin_cannot_demote_self: '❌ Cannot remove administrator rights from yourself.',
  admin_grant_premium_options: '⭐ *Grant premium to user {userId}*\n\nSelect period:',
  admin_grant_premium_success: '✅ Premium granted to user {userId} for {days} days.',
  admin_revoke_premium_success: '✅ Premium revoked from user {userId}.',

  // Admin broadcast
  admin_broadcast_prompt: '📢 *Broadcast Message*\n\nEnter notification text for all users (up to 3600 characters):',
  admin_broadcast_too_long: '❌ Message too long!\n\n📏 Current length: {current} characters\n📏 Maximum: {max} characters\n📏 Need to remove: {excess} characters',
  admin_broadcast_confirm: '📢 *Confirm broadcast message*\n\n📝 **Message text:**\n{message}\n\n📏 **Length:** {length} characters\n\n⚠️ This message will be sent to **ALL** bot users!',
  admin_broadcast_started: '📢 Broadcast started...',
  admin_broadcast_result: '📢 *Broadcast completed!*\n\n📊 **Statistics:**\n• Total users: {total}\n• Successfully sent: {sent}\n• Errors: {failed}',
  admin_broadcast_header: '🔴🔴🔴 *Notification!* 🔴🔴🔴',
  
  // General messages
  welcome: 'Hello, {name}! 👋',
  main_menu_title: '🏠 *Main Menu*\n\nChoose an action:',
  error: 'An error occurred 😞',
  unknown_error: 'An unexpected error occurred. Please try again later.',
  not_found: 'Not found',
  error_invalid_description_format: '❌ Invalid expense format. Use: amount description or amount category description',
  expense_save_error: '❌ Error saving expense. Please try again.',
  cancel: 'Cancel',
  back: 'Back',
  confirm: 'Confirm',
  save: 'Save',
  
  // Commands
  start_message: `Hello! 👋 I'll help you track your expenses and control your budget.

*How to add an expense:*
Just write the amount and description separated by a space:
-  \`200 groceries at the store\`
-  \`1500 lunch at restaurant\`
-  \`50 transportation\`
-  \`150.50 coffee\`

After entering, a menu with category buttons will appear - choose the appropriate one! 🏷️

*Main commands:*
/start - restart the bot
/menu - open interactive menu (Recommended)
/history - recent entries for the day
/stats - detailed statistics by categories

/export - download data in CSV
/undo - cancel last entry

*Settings:*
/settings - open settings
/currency - set base currency
/timezone - configure timezone
/categories - manage categories

*Additional features:*
/family - manage family budget
/limits - limits and premium features
/help - show detailed help

Start entering your expenses! 💰`,

  help_message: `📋 *Detailed Command Help*

*Adding expenses:*
Write amount and description separated by a space:
\`200 groceries\` - a menu with category buttons will appear
\`150.50 coffee\` - decimal numbers are supported

*Main commands:*
/start - restart the bot and show welcome message
/menu - open interactive menu with all functions
/history - show recent entries for today
/stats - detailed statistics by categories for the month

/export - download all data in CSV format
/undo - cancel last added entry

*Settings and management:*
/settings - open main settings menu
/currency - change base currency (RUB, USD, EUR, KZT, CNY, THB)
/timezone - configure timezone for accurate tracking
/categories - manage custom categories (premium)

*Family budget:*
/family - manage family groups and shared expenses
- Create family, invite members
- Shared expenses and statistics
- Export family data

*Premium features:*
/limits - information about limits and premium capabilities
- Custom categories
- Extended statistics
- Family budget
- Priority support

*Usage tips:*
• Use descriptions for better expense understanding
• Regularly check statistics via /stats
• Set timezone for accurate tracking
• Use /menu for quick access to functions
• Export data via /export for analysis

*Editing expenses:*
• In edit mode (/history) you can delete and edit entries
• Button "👨‍👩‍👧‍👦 To Family" allows moving personal expenses to family budget
• Button "🚫 From Family Budget" returns family expenses to personal
• You can only edit and delete your own expenses

*Reminders:*
• Bot automatically reminds you to record expenses at 18:00 your local time
• Reminders are sent only if you haven't recorded expenses for the day
• Reminders can be enabled/disabled in settings
• Maximum one reminder is sent per day

*Support:*
If you have questions or issues, use /start to return to the main menu.

Happy expense tracking! 💰📊`,

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
  button_notifications_management: '🔔 Notifications management',
  notifications_management_title: '🔔 Notifications management',
  // Category limits
  button_category_limits: '🏷️ Category limits',
  category_limits_title: '🏷️ Category limits',
  category_limits_enabled: '✅ Category limits enabled',
  category_limits_disabled: '✅ Category limits disabled',
  // Global limits and management
  button_limits_management: '⚙️ Manage limits',
  limits_management_title: '⚙️ Manage limits',
  limits_overview_title: '📊 Limits overview',
  button_daily_summary: '🗓️ Daily summary',
  button_configure_daily_summary: '🕒 Set summary time',
  daily_summary_title: 'Day summary',
  daily_summary_enabled: '✅ Daily summary enabled',
  daily_summary_disabled: '✅ Daily summary disabled',
  daily_total_spent: 'Spent today',
  daily_summary_hour_info: 'Choose the local hour for the daily summary:',
  daily_summary_hour_set: 'Summary time saved',
  button_toggle_category_limits: '📦 Category limits',
  button_toggle_global_limits: '🧩 Global limits (day/month)',
  global_limits_enabled: '✅ Global limits enabled',
  global_limits_disabled: '✅ Global limits disabled',
  button_set_daily_limit: '📅 Daily limit',
  button_set_monthly_limit: '📆 Monthly limit',
  enter_daily_limit: 'Enter daily limit amount (empty or 0 to clear):',
  enter_monthly_limit: 'Enter monthly limit amount (empty or 0 to clear):',
  daily_limit_saved: '✅ Daily limit saved',
  monthly_limit_saved: '✅ Monthly limit saved',
  limit_cleared: 'Cleared',
  daily_limit: 'Daily limit',
  monthly_limit: 'Monthly limit',
  daily_limit_exceeded: 'Daily limit exceeded',
  monthly_limit_exceeded: 'Monthly limit exceeded',
  category_limit_enter_amount: 'Enter the limit amount for the selected category (in your currency):',
  category_limit_saved: '✅ Category limit saved',
  category_limit_exceeded: '⚠️ Category limit exceeded',
  category_limits_exceeded_info: 'Category limits exceeded',
  invalid_limit_amount: '❌ Invalid amount. Enter a positive number.',
  no_limits_set: 'No limits set',
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
• Extended statistics
• Family budget
• Ability to edit and delete expenses(not only the last one)`,
  
  // Validation errors
  error_too_long_regular: '❌ Description is too long!\nMaximum 80 characters for regular users.',
  error_too_long_premium: '❌ Description is too long!\nMaximum 160 characters for premium users.',
  error_no_description: '❌ You need to specify a description after the amount.',
  error_amount: '❌ Invalid amount. Enter a number from 0.01 to 999999.',
  error_format: '❌ I don\'t understand the format. Write the amount and description separated by a space.\nFor example: `200 groceries` or `1500 lunch at cafe`',
  error_forbidden_content: '❌ Forbidden content.',
  error_limit_reached: '❌ Record limit reached!\nRegular users: 100 records\nPremium users: 300 records\n\n💎 Upgrade to premium to increase limits!',
  error_premium_required: '💎 This feature is only available for premium users!\n\nPremium benefits:\n• 160 characters in description (instead of 80)\n• 300 records (instead of 100)\n• Custom categories\n• Extended statistics',
  error_generic: '❌ An error occurred. Please try again later or contact the administrator.',
  
  // Buttons
  button_menu: '📋 Menu',
  button_expenses_month: '💰 Monthly Expenses',
  button_expenses_day: '💰 Daily Expenses',
  button_expenses_categories: '💰 Expenses by Category',
  button_export: '📊 Export',
  button_family: '👨‍👩‍👧‍👦 Family',
  button_settings: '⚙️ Settings',
  button_delete_last: '🗑️ Delete Last Entry',
  button_limits: '📊 Limits',
  button_help: '❓ Help',
  button_edit: 'Edit',
  button_delete: 'Delete',
  button_mark_as_family: '👨‍👩‍👧‍👦 To Family',
  button_remove_from_family: '🚫 From Family Budget',
  expense_already_family: '❌ This expense is already family',
  expense_converted_to_family: '✅ Expense moved to family budget',
  expense_removed_from_family: '✅ Expense removed from family budget',
  not_owner: '❌ You are not the owner of this expense',
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
  export_title: '📊 Export expenses',
  export_period_day: '📅 Today',
  export_period_week: '📅 This week',
  export_period_month: '📅 This month',
  export_period_all: '📅 All time',
  export_period_range: '📅 Select dates...',
  export_filter_categories: '🔽 Filter by categories',
  export_select_categories: 'Select categories to export:',
  export_select_all: '✅ Select all',
  export_deselect_all: '❌ Deselect all',
  export_done: '✅ Done',
  export_no_categories: 'Select at least one category',
  export_enter_dates: '📅 Enter date range in format:\n\n`01.03-15.03` or `01.03.2025-15.03.2025`',
  export_invalid_date_format: '❌ Invalid date format. Use: `01.03-15.03` or `01.03.2025-15.03.2025`',
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
  family_label: '🏠 *Family:*',
  family_owner_label: '👑 *Owner:*',
  family_info: '👨‍👩‍👧‍👦 *Family Budget*\n\nHere you can manage expenses together with family, colleagues, friends, etc.\n\n- \uD83D\uDC6A A shared group is created to track joint expenses.\n- \u2795 Each member can add expenses.\n- \uD83D\uDDD1\uFE0F You can delete your own expenses if needed.\n- \uD83D\uDCCA Shared statistics are available for all members.\n- \uD83D\uDCE4 Export the entire group’s data into a single file.\n\nShared control means less chaos and more transparency.',
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
  button_mark_as_family: '👨‍👩‍👧‍👦 Mark as family',
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
  per_month: '/ month',
  premium_payment_info: '💳 Payment is made using Telegram Stars — Telegram\'s internal currency for convenient and secure payment within the messenger. <b>No automatic renewal.</b>',
  premium_renewal_info: '📅 You can renew your subscription at any time. The corresponding number of days will be added to the remaining period.',
  premium_stars_info: '💡 You can purchase stars without Apple / Google commission in the official bot [@PremiumBot].',
  premium_why_paid_title: '👀 Why is the service paid?',
  premium_purchases_button: '🧾 Purchase history',
  purchases_header: '🧾 Purchase history',
  purchases_premium_title: 'Premium',
  purchases_donations_title: 'Donations',
  no_purchases: 'No purchases yet',
  purchases_prev_button: '◀ Previous',
  purchases_next_button: 'Next ▶',
  purchases_page_indicator: 'Page {page}/{total}',
  premium_why_paid_text: 'Keeping the server running for this bot costs about $200 a month — and that\'s even without accounting for the rapidly growing number of users. And as the developer, I also need to eat to have the strength to improve the service :)',
  premium_payment_title: '💳 *Premium Subscription Payment*',
  premium_payment_description: 'You selected tariff: <b>{duration}</b>\nCost: <b>{stars} ⭐️</b>\n\nClick the button below to proceed to payment via Telegram Stars.',
  // Tariff labels and product name
  tariff_button_30: '1 Month',
  tariff_button_90: '3 Months',
  tariff_button_180: '6 Months',
  tariff_button_365: '1 Year',
  tariff_item_30: '1 month (30 days)',
  tariff_item_90: '3 months (90 days)',
  tariff_item_180: '6 months (180 days)',
  tariff_item_365: '12 months (365 days)',
  premium_product: 'Premium subscription',
  discount_save: 'save {percent}%',

  payment_success: '🎉 *Payment successful!*\n\nYour premium subscription has been activated. You now have access to all advanced bot features!',
  donation_success: '🙏 *Thank you for supporting the project!*\n\nYour donation will help develop the bot and add new features.',
  general_payment_success: '✅ *Payment successful!*\n\nThank you for using our bot.',
  premium_expires: '📅 Premium subscription valid until: <b>{date}</b>\n⏰ Days remaining: <b>{days}</b>',

  // Payment support & policies
  paysupport_message: 'Payment support\n\nBusiness: {businessName}\nSupport: @{supportUsername} / {supportEmail}\n\nTerms: {termsUrl}\nPrivacy: {privacyUrl}\nRefunds: {refundPolicyUrl}\n\nFor Stars payments, issues or refunds, contact support first. We comply with Telegram Stars policies.',
  terms_message: '📄 Terms of Service: {termsUrl}',
  privacy_message: '🔐 Privacy Policy: {privacyUrl}',
  refund_message: '↩️ Refund Policy: {refundPolicyUrl}\n\nIf you have any questions: @{supportUsername} / {supportEmail}'
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
  custom_categories_example: '💡 Example: "🌍 Travel" or "🎮 Games"',
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