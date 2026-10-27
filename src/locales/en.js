module.exports = {
  button_reminders: '🔔 Remind me',
  reminders_enabled: '🔔 Reminders are on',
  reminders_disabled: 'Reminders are OFF. I’ll be quiet 🤐',
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
  security_error: '❌ *Security error*\n\nPlease try again later or contact administrator.',
  
  // Admin panel
  button_admin: '👑 Admin Panel',
  admin_access_denied: '❌ You do not have administrator rights.',
  admin_panel_title: '👑 *Administrator Panel*\n\nChoose an action:',
  admin_error: '❌ An error occurred while performing administrator action.',
  
  // Admin stats
  admin_stats_text: `📊 *Bot Statistics*

👥 *Users:*
• Total: {totalUsers}
• Premium: {activePremium}
• New this week: {newUsersWeek}
• New this month: {newUsersMonth}

💰 *Expenses:*
• Total records: {totalExpenses}
• This week: {expensesWeek}
• Active users: {activeUsers}

🐛 *Bug reports:* {totalBugReports}

💎 *Donations:*
• Total: {totalDonations}
• Stars collected: {totalStars}

⭐ *Premium transactions:* {premiumTransactions}`,

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

📊 *Overall statistics:*
• Total donations: {totalDonations}
• Completed: {completedDonations}
• Pending: {pendingDonations}

⭐ *Stars:*
• Total collected: {totalStars}
• Average donation: {avgStars} stars`,

  // Admin premium 
  admin_premium_stats: `⭐ *Premium Statistics*

📊 *Users:*
• Total premium: {totalPremiumUsers}
• Currently active: {activePremiumUsers}

💳 *Transactions:*
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

{adminFlag}{premiumFlag} {firstName} (@{username})
🆔 ID: {userId}
🌐 Language: {language}
💱 Currency: {currency}
🕐 Timezone: {timezone}
📅 Registered: {createdAt}

📊 *Statistics:*
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
  admin_broadcast_confirm: '📢 Confirm broadcast message\n\n📝 Message text:\n{message}\n\n📏 Length: {length} characters\n\n⚠️ This message will be sent to ALL bot users!',
  admin_broadcast_started: '📢 Broadcast started...',
  admin_broadcast_result: '📢 *Broadcast completed!*\n\n📊 *Statistics:*\n• Total users: {total}\n• Successfully sent: {sent}\n• Errors: {failed}',
  admin_broadcast_header: '🔴🔴🔴 Notification! 🔴🔴🔴',
  
  // General messages
  error: 'An error occurred 😞',
  not_found: 'Not found',
  cancel: 'Cancel',
  back: 'Back',
  confirm: 'Confirm',
  
  // Commands
  start_message: `Hello! 👋 I'll help you track your expenses and income.

*Expense* — just write the amount and description: \`250 coffee\`, \`1500 lunch\`.
Another currency works too: \`20 USD taxi\`, or just an amount: \`300\`.
*Income* — with a plus: \`+50000 salary\`.

Pick a category once — I'll remember it next time.
The menu is at the bottom: month overview, today's records, income, recurring expenses (rent, subscriptions) and «☰ More».`,

  start_returning: '👋 Welcome back! Send an expense as a message — `250 coffee`. The menu is on the keyboard below.',

  help_message: `❓ *How to use*

• \`250 coffee\` — expense. Pick a category once, I'll remember it
• \`20 USD taxi\` — expense in another currency, \`300\` — without description
• \`+50000 salary\` — income (\`+1000 USD\` — in another currency)
• \`coffee 250, taxi 400\` — several records in one message (or one per line)
• Under a new record: ↩️ undo, 🏷 change category
• 📊 *Month overview* — expenses, income, balance, categories; ◀️ — previous periods
• 📅 *Today* — records for the day; tap a number to edit or delete a record
• 🔁 *Recurring expenses* — rent and subscriptions are recorded automatically every month
• 🎯 *Budgets* and 📄 period *Summary* — buttons under the month overview (premium)
• Currencies, reminders (up to 3 a day) and period start — in ☰ More → ⚙️ Settings

Commands: /stats /history /income /recurring /export /settings /menu`,

  // Expenses
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
  amount_label: 'Amount',
  description_label: 'Description',
  category_label: 'Category',
  expense_added_title: 'Expense added!',
  
  // Settings
  currency_select: 'Select the currency that will be used by default:',
  currency_set: 'Currency set: {currency}',
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
  
  // Limits
  status_regular: '👤 Standard',
  status_premium: '💎 Premium',
  max_description_length: '<b>Max description length:</b> {length} characters',
  premium_benefits: '💎 <b>Premium benefits:</b>\n• 🎯 Monthly and per-category budgets with alerts at 80% and when exceeded\n• 📄 Full period summary: every category vs last month, budgets, average spending per day\n• Up to 5 custom categories\n• Family budget\n• Up to 10 savings goals (1 without premium)\n• 160 characters in description (instead of 80)\n\nRecording expenses and income is free and unlimited.',
  
  // Validation errors
  error_too_long_regular: '❌ Description is too long!\nMaximum 80 characters for regular users.',
  error_too_long_premium: '❌ Description is too long!\nMaximum 160 characters for premium users.',
  error_amount: '❌ Invalid amount. Enter a number from 0.01 to {max}.',
  error_format: '❌ I did not get it. Start with an amount: `250 coffee`, `20 USD taxi` or just `300`.',
  error_generic: '❌ An error occurred. Please try again later or contact the administrator.',
  
  // Buttons
  button_menu: '📋 Menu',
  button_expenses_month: '💰 Monthly Expenses',
  button_expenses_day: '💰 Daily Expenses',
  button_expenses_categories: '💰 Expenses by Category',
  button_family: '👨‍👩‍👧‍👦 Family',
  button_settings: '⚙️ Settings',
  button_delete_last: '🗑️ Delete Last Entry',
  button_help: '❓ Help',
  button_edit: 'Edit',
  button_remove_from_family: '🚫 From Family Budget',
  expense_already_family: '❌ This expense is already family',
  expense_converted_to_family: '✅ Expense moved to family budget',
  expense_removed_from_family: '✅ Expense removed from family budget',
  button_cancel: '❌ Cancel',
  button_back: '⬅️ Back',
  button_change_currency: '💱 Change Currency',
  button_change_timezone: '🌍 Timezone',
  button_change_language: '🌐 Language',
  button_custom_categories: '🏷️ Custom Categories',
  
  // Main menu
  
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
  callback_data_not_found: '❌ Error: data not found',
  callback_expense_added: '✅ Added to category "{category}"',
  callback_canceled: '❌ Canceled',
  callback_expense_canceled: '❌ Adding expense canceled',
  callback_deleted: 'Entry deleted!',
  callback_delete_error: 'Delete error or entry not found',
  
  // Statistics
  by_categories: 'By categories:',
  select_category: 'Select category:',
  
  // Formatting
  
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
  family_left: '✅ You left family "{name}". Your expenses in this family are now personal.',
  family_deleted: '✅ Family "{name}" deleted. All family expenses became personal.',
  family_member_removed_notification: '❌ You were removed from family "{familyName}". Your expenses in this family are now personal.',
  
  // Family menu buttons
  create_family: '🏠 Create Family',
  join_family: '🔗 Join Family',
  invite_member: '➕ Invite Member',
  leave_family: '🚪 Leave Family',
  delete_family: '🗑️ Delete Family',
  family_members: '👥 Family Members',
  family_stats: '💰 Monthly Expenses',
  family_add_expense: '💰 Add Family Expense',
  button_personal_expense: '👤 Personal Expense',
  enter_personal_expense: 'Enter amount and description for personal expense:',
  family_mode_button_on: '🟢 All expenses to family — tap to turn off',
  family_mode_button_off: '⚪ All expenses to family — tap to turn on',
  family_mode_line_on: '🟢 New expenses are recorded to the family',
  family_mode_line_off: '⚪ New expenses are personal',
  family_mode_enabled: '✅ All new expenses are now recorded to the family.\n\nFor a personal one, use «{personalButton}» below or «{removeButton}» on the expense card.',
  family_mode_disabled: '✅ New expenses are personal again.\n\nFor a family one, use «{familyButton}» below or «{addButton}» on the expense card.',
  family_menu: '👨‍👩‍👧‍👦 Family Menu',
  family_cancel: '❌ Cancel',
  
  // Invitations
  invitation_sent: '✅ Invitation sent to user @{username}',
  
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
  family_invitation_received: '🎉 You are invited to family "{familyName}"\n\n👤 Invited by: {inviterName}\n🔑 Code: `{inviteCode}`\n\nChoose action:',
  accept_invitation: '✅ Accept',
  reject_invitation: '❌ Reject',
  invitation_accepted: '🎉 Congratulations! You joined the family "{familyName}"',
  invitation_rejected: '❌ You rejected the family invitation',
  invitation_not_pending: '❌ Invitation is not pending',
  invitation_expired: '❌ Invitation has expired',
  button_mark_as_family: '👨‍👩‍👧‍👦 Mark as family',
  invitation_cancelled_notification: '❌ Invitation to family "{familyName}" was cancelled by {cancelledBy}',
  enter_invite_code: '🔑 Enter invitation code:',
  not_family_member: '❌ You are not a family member.',
  not_family_owner: '❌ You are not a family owner.',
  
  // Confirmations
  confirm_delete_family: '⚠️ *Delete Family*\n\nAll members will be removed and family expenses will become personal.\n\nAre you sure?',
  
  // Family statistics
  family_daily_stats: '💰 Daily Expenses',
  family_export: '📊 Family Export',
  
  // Member list
  family_members_title: '👥 *Family Members*',
  family_owner_role: 'owner',
  family_member_role: 'member',
  remove_member: '❌ Remove',
  confirm_remove_member: '⚠️ *Remove Member*\n\nAre you sure you want to remove {name} from the family? Their family expenses will become their personal ones, and the family will no longer see them.',
  member_removed: '✅ Member {name} has been removed from the family.',
  
  // Premium features
  premium_required: '❌ This feature is only available for premium users.',
  
  // Premium subscription
  premium_subscription_title: '⭐️ Subscription',
  premium_status_header: '<b>Your Status:</b>',
  premium_privileges: 'Privileges: {status}',
  premium_menu_title: '<b>Menu:</b>',
  premium_tariff_button: '⭐️ Tariff',
  premium_why_paid_button: '👀 Why is the service paid?',
  premium_donate_button: '🤝 Donate',
  premium_back_button: '⬅️ Back',
  premium_tariffs_title: '⭐️ Tariffs (Telegram Stars)',
  per_month: '/ month',
  premium_payment_info: '💳 Payment is made with Telegram Stars, Telegram\'s internal currency. 🔁 The monthly plan renews automatically; cancel it in Telegram: Settings → My Stars → My subscriptions. The 3, 6 and 12 month plans are one-time payments.',
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
  premium_why_paid_text: 'Keeping the server running for this bot costs about $200 a month — and that\'s even without accounting for the rapidly growing number of users. And as the developer, I also need to eat to have the strength to improve the service :)',
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
  custom_categories_premium_required: '💎 This feature is only available for premium users.',

  // Income
  button_income: '💵 Income',
  button_add_income: '➕ Add income',
  button_income_currency: '💱 Income currency',
  income_menu_title: '💵 *Income for the current period*',
  income_menu_empty: 'No income for this period yet.',
  income_currency_label: 'Default income currency: *{currency}*',
  income_hint: '💡 Quick way: send a message starting with plus — `+50000 salary` or `+1000 USD freelance`',
  income_enter_prompt: 'Enter the income amount and description 👇\n\nExample: `50000 salary`\nDefault currency — *{currency}*. Another one can be set with a code after the amount: `1000 USD freelance`',
  income_added: '✅ Income recorded: *{amount}* — {description}',
  income_default_description: 'Income',
  income_deleted: '✅ Income deleted',
  income_edit_prompt: '✏️ Now: {current}\n\nSend the new amount and/or description 👇\nFor example: `60000 salary`, just the amount `60000` or just the description `advance`.\nThe currency can be changed with a code after the amount: `1000 USD`',
  income_updated: '✅ Income updated',
  button_savings: '🏦 Savings',
  command_savings: 'Savings and goals',
  savings_title: '🏦 *Savings*',
  savings_intro: 'Track savings, goals and debts — I\'ll show how much you\'ll have in a year and when you\'ll reach a goal.\n\nStart with one total or add an account: cash, deposit, crypto 👇',
  savings_general: 'General savings',
  savings_general_short: 'General',
  savings_monthly_manual: '📥 You save {amount}/mo (set manually)',
  savings_monthly_unknown: '📥 How much you save per month — unknown yet',
  savings_monthly_negative: '📉 Spending exceeds income by ~{amount}/mo — savings aren\'t growing',
  savings_monthly_auto: '📥 You save ~{amount}/mo — income minus expenses over {n} mo',
  savings_button_set_current: '✏️ Enter my savings total',
  savings_button_forecast: '📈 Forecast',
  savings_button_settings: '⚙️ Settings',
  savings_button_back: '⬅️ Savings',
  savings_not_found: '❌ Couldn\'t find this savings pot — maybe it\'s already been deleted.',
  savings_recent_operations: 'Recent changes:',
  savings_button_deposit: '➕ Add money',
  savings_button_withdraw: '➖ Withdraw',
  savings_button_transfer: '🔄 Transfer',
  savings_button_goal_target: '🎯 Goal amount',
  savings_button_goal_date: '📅 Deadline',
  savings_button_mode_own: '🔀 Mode: own pot',
  savings_button_mode_total: '🔀 Mode: from all savings',
  savings_button_goal_delete: '🗑 Delete goal',
  savings_mode_own_line: '🐷 Own pot',
  savings_mode_total_line: '🏦 Counted from all savings',
  savings_goal_progress: 'Saved: *{current}* of {target}',
  savings_goal_left: '{amount} to go',
  savings_goal_deadline: '📅 Deadline: {date} · {left}',
  savings_deadline_left: '{duration} left',
  savings_deadline_soon: 'less than a month',
  savings_deadline_passed: 'deadline passed',
  savings_goal_achieved: '🎉 Goal achieved!',
  savings_goal_unreachable: '📥 At {amount}/mo the goal isn\'t reached',
  savings_goal_eta: '📥 At {amount}/mo — in ≈ {duration} ({date})',
  savings_goal_eta_real: '🔥 With inflation — in ≈ {duration}',
  savings_goal_eta_real_never: '🔥 With inflation it\'s out of reach: prices grow faster than your savings',
  savings_goal_own_assumption: '_Assuming your whole monthly saving goes here._',
  savings_goal_required: '🎯 To make the deadline: {amount}/mo',
  savings_goal_required_real: '(with inflation {amount})',
  savings_prompt_deposit: 'How much to add to “{name}”? It currently holds {amount}.\n\nFor example: `10000` or `100 USD` — I\'ll convert it to the pot\'s currency.',
  savings_prompt_withdraw: 'How much to withdraw from “{name}”? It currently holds {amount}.',
  savings_prompt_set: 'How much is in “{name}” now? For example `350000`.\n\nRecorded now: {amount}.',
  savings_transfer_choose: 'Where to transfer from “{name}”? Available: {amount}.',
  savings_prompt_transfer: 'How much to transfer from “{from}” to “{to}”? Available: {amount}.',
  savings_prompt_goal: '🎯 How much and what for? For example: `15000 car` or `3000 USD vacation`. Default currency — *{currency}*.',
  savings_goal_limit_regular: '🎯 The free version allows {limit} goal. With Premium — up to 10 goals at once.',
  savings_goal_limit_premium: '🎯 You already have {limit} goals — that\'s the maximum. Delete one to add a new one.',
  savings_prompt_goal_target: 'New amount for “{name}” (currently {amount}). You can add a new name too: `2 000 000 new car`.',
  savings_prompt_goal_date: 'By when do you want to save for “{name}”? Send month and year `12.2027` or a date `31.12.2027`.',
  savings_button_no_deadline: '♾ No deadline',
  savings_deadline_removed: '✅ Deadline removed',
  savings_mode_set_own: '✅ The goal now has its own pot — top it up separately.',
  savings_mode_set_total: '✅ The goal is now counted from all savings.',
  savings_moved_to_general: '💰 {amount} moved to general savings.',
  savings_button_account_name: '✏️ Name',
  savings_button_account_yield_default: '↩️ As in settings',
  savings_prompt_account: '💼 What should the account be called? For example: `Cash`, `Deposit`, `Crypto`.\n\nYou can add a currency and rate right away: `Deposit USD 4%`.',
  savings_prompt_account_yield: 'Rate for “{name}”, % a year: for example `16` for a deposit or `0` for cash (up to {max}).',
  savings_prompt_account_name: 'New name for “{name}”:',
  savings_account_delete_confirm: 'Delete account “{name}”?',
  savings_account_deleted: '✅ Account “{name}” deleted.',
  savings_account_created: '✅ Account “{name}” created.',
  savings_account_limit: '💼 You already have {limit} accounts — that\'s the maximum. Delete one you don\'t need to add a new one.',
  savings_error_account: '❌ Send the account name, for example `Cash`.',
  savings_error_name: '❌ The name must be 1 to {max} characters.',
  savings_goal_delete_confirm: 'Delete goal “{name}”?',
  savings_goal_delete_moves: 'The saved {amount} will move to general savings — the money won\'t be lost.',
  savings_button_goal_delete_yes: '🗑 Yes, delete',
  savings_goal_deleted: '✅ Goal “{name}” deleted.',
  savings_forecast_title: '📈 *Savings forecast*',
  savings_now: 'Now: *{amount}*',
  savings_rates_not_set: '⚙️ No rates set — forecast without interest and inflation',
  savings_rate_yield_short: 'rate {value}%',
  savings_rate_inflation_short: 'inflation {value}%',
  savings_rate_growth_short: 'contribution growth {value}% a year',
  savings_horizon_6: 'In 6 months',
  savings_horizon_12: 'In a year',
  savings_horizon_36: 'In 3 years',
  savings_horizon_60: 'In 5 years',
  savings_horizon_120: 'In 10 years',
  savings_forecast_depleted: '⚠️ At this rate, your savings will run out in {duration}.',
  savings_forecast_legend: '💡 Includes rates and contribution growth from settings; “today” — at current prices.',
  savings_settings_title: '⚙️ *Forecast settings*',
  savings_settings_hint: '💡 Contribution — how much you save per month (auto: income − expenses). Rates are % a year; an account\'s own rate is in its settings.',
  savings_button_monthly_auto: '🔄 Calculate automatically',
  savings_monthly_auto_set: '✅ Contribution is calculated automatically: income minus spending.',
  savings_prompt_monthly: 'How much do you save per month? For example: `30000` ({currency}).',
  savings_prompt_inflation: 'Inflation in percent per year, e.g. `8` or `7.5` (up to {max}). `0` — don\'t count it.',
  savings_prompt_yield: 'Default rate — for accounts without their own rate and for new savings, % a year, for example `16` (up to {max}). `0` — ignore.',
  savings_prompt_growth: 'By how many percent per year your contribution grows, e.g. `5` (up to {max}). `0` — don\'t count it.',
  savings_monthly_set: '✅ Saving: {amount}/mo',
  savings_setting_saved: '✅ Saved',
  savings_error_amount: '❌ I didn\'t get the amount. Send a number, e.g. `15000`.',
  savings_error_insufficient: '❌ Not enough: the pot has {amount}.',
  savings_error_rate: '❌ I need a number from 0 to {max}, e.g. `8` or `7.5`.',
  savings_error_date: '❌ I didn\'t get the deadline. Send month and year `12.2027` or a date `31.12.2027` — in the future.',
  savings_error_goal: '❌ Send the amount and the goal name, e.g. `1 500 000 car`.',
  savings_deposited: '✅ Added {amount}',
  savings_withdrawn: '✅ Withdrew {amount}',
  savings_balance_set: '✅ Amount updated: {amount}',
  savings_transferred: '✅ Transferred {amount} to “{name}”',
  savings_goal_created: '✅ Goal created — progress counts all your savings. Add a deadline with «📅 Deadline».',
  savings_goal_updated: '✅ Goal updated',
  savings_deadline_set: '✅ Deadline: {date}',
  savings_goal_achieved_notice: '🎉 Goal “{name}” achieved!',
  savings_months: '{n} mo',
  savings_years: '{y} yr',
  savings_years_months: '{y} yr {m} mo',
  savings_compact_thousand: '{n}K',
  savings_compact_million: '{n}M',
  savings_button_add_account: '➕ Add account',
  savings_header: '🏦 *Savings — {amount}*',
  savings_header_debts: '💳 Debts — {debts} · net worth {net}',
  savings_section_accounts: 'Accounts',
  savings_section_goals: 'Goals',
  savings_section_debts: 'Debts',
  savings_debt_until: 'until {date}',
  savings_main_year: '📈 In a year ≈ {amount} (you save ~{monthly}/mo)',
  savings_main_year_negative: '📉 In a year ≈ {amount} (spending exceeds income by ~{monthly}/mo)',
  savings_button_set_monthly: '📥 Set how much I save',
  savings_button_update: '🔄 Update balances',
  savings_button_add: '➕ Add',
  savings_add_title: '➕ *What to add?*\n\n💼 *Account* — where the money is: cash, deposit, crypto\n🎯 *Goal* — what you\'re saving for\n💳 *Debt* — loan, mortgage, installments, money owed to a friend',
  savings_button_add_kind_account: '💼 Account',
  savings_button_add_kind_goal: '🎯 Goal',
  savings_button_add_kind_debt: '💳 Debt',
  savings_rate_default: 'Rate from settings ({value}%)',
  savings_rate_none: 'No interest',
  savings_rate_own: '{value}% a year',
  savings_updated: 'updated {date}',
  savings_button_new_amount: '✏️ New amount',
  savings_button_configure: '⚙️ Configure',
  savings_button_rate: '📈 Rate',
  savings_button_delete: '🗑 Delete',
  savings_button_back_to_account: '⬅️ To account',
  savings_button_back_to_goal: '⬅️ To goal',
  savings_button_back_to_debt: '⬅️ To debt',
  savings_mode_hint: '“From all savings” — progress counts every account. “Own pot” — a separate amount you top up yourself.',
  savings_update_step: '{icon} {name} ({i}/{n}) — now {amount}. How much is it now?',
  savings_update_step_debt: '{icon} {name} ({i}/{n}) — {amount} left to repay. How much now?',
  savings_button_no_change: '✅ No change',
  savings_button_stop: '⏹ Enough',
  savings_update_stale: '⏳ This is out of date',
  savings_update_done: 'Done: savings {before} → {after} ({delta})',
  savings_update_done_capital: 'Net worth: {before} → {after}',
  savings_prompt_account_currency: 'What currency is this account in?',
  savings_button_other_currency: '🌐 Other',
  savings_error_currency: '❌ Pick a currency with a button or send a code, for example `USD`.',
  savings_prompt_debt_name: '💳 What should the debt be called? For example: `Mortgage`, `Credit card`, `Loan to Mike`.\n\nOr all in one line: `Mortgage 350 000 6,5%`.',
  savings_prompt_debt_amount: 'How much is left to repay on “{name}”? For example `3000` ({currency}) or `1200 USD`. If there\'s interest, add the rate: `3000 18%`.',
  savings_error_debt_amount: '❌ I didn\'t get the amount. For example `3000` or `3000 18%`.',
  savings_debts_capital: 'debts {debts} · net worth {net}',
  savings_forecast_debts_only: 'debts {debts}',
  savings_forecast_today: 'today ≈ {amount}',
  savings_button_monthly_value: '📥 Saving: {amount}',
  savings_button_monthly_auto_value: '📥 Saving: ~{amount} · auto',
  savings_button_monthly_unknown: '📥 Saving: unknown',
  savings_button_yield_value: '📈 Default rate: {value}',
  savings_button_inflation_value: '🔥 Inflation: {value}',
  savings_button_growth_value: '⬆️ Contribution growth: {value}',
  savings_debt_rate: '📈 {value}% a year',
  savings_debt_no_rate: '📈 Interest-free',
  savings_debt_payment: '💵 Payment {amount}/mo',
  savings_debt_payment_not_set: '💵 Payment not set',
  savings_debt_payoff: '📅 Paid off in {duration} ({date})',
  savings_debt_total_interest: '💸 Total interest: ~{amount}',
  savings_debt_too_long: '⚠️ With this payment the debt takes more than 50 years to repay — try paying more.',
  savings_debt_below_interest: '⚠️ The payment doesn\'t cover the interest — the debt isn\'t shrinking. To pay it off, pay more than {amount} a month.',
  savings_debt_no_payment: '💡 Set a monthly payment and I\'ll work out when the debt is paid off.',
  savings_debt_no_payment_interest: '💡 Set a monthly payment and I\'ll work out when the debt is paid off and how much goes to interest. Right now interest adds ~{amount} a month.',
  savings_debt_paid_off: '🎉 Debt paid off!',
  savings_button_debt_pay: '➖ Repay',
  savings_button_debt_increase: '➕ Increase debt',
  savings_button_debt_payment: '💵 Monthly payment',
  savings_button_debt_delete: '🗑 Delete debt',
  savings_button_debt_no_payment: '🚫 No payment',
  savings_button_skip: '⏭ Skip',
  savings_prompt_debt_payment: 'How much do you pay on “{name}” a month? For example `500` ({currency}). From the payment I\'ll work out when the debt is paid off. `0` — no payment.',
  savings_prompt_debt_pay: 'How much to repay on “{name}”? Left: {amount}.\n\n_No expense is recorded — debt payments are usually already in your expenses._',
  savings_prompt_debt_increase: 'How much to add to the debt “{name}”? Now {amount}.',
  savings_prompt_debt_set: 'How much is left to repay on “{name}”? Send the exact amount, `0` — paid off.\n\nRecorded now: {amount}.',
  savings_prompt_debt_rate: 'Rate on “{name}” in percent a year, for example `12` or `29,9` (up to {max}). `0` — interest-free.',
  savings_debt_created: '✅ Debt “{name}” added.',
  savings_debt_limit: '💳 You already have {limit} debts — that\'s the maximum. Delete a paid-off one to add a new one.',
  savings_debt_error_overpay: '❌ The debt is only {amount} — you can\'t repay more.',
  savings_debt_paid: '✅ Repaid {amount}',
  savings_debt_increased: '✅ Debt increased by {amount}',
  savings_debt_set: '✅ Debt amount updated: {amount}',
  savings_debt_delete_confirm: 'Delete the debt “{name}”? No money moves anywhere — the debt just disappears from the list.',
  savings_debt_deleted: '✅ Debt “{name}” deleted.',
  savings_forecast_debts_note: '💳 Debts follow planned payments; the payments are already in your expenses, so they don\'t reduce the monthly saving.',
  income_not_found: '❌ Income not found',
  income_currency_select: 'Choose the currency you usually get paid in. Expenses stay in your main currency:',
  income_currency_set: '✅ Income currency: {currency}',
  income_total: '💵 Income: *{amount}*',
  balance_label: '⚖️ Balance (income − expenses): *{amount}*',
  income_error_format: '❌ I did not get it. Send an amount and an optional description: `50000 salary` or `1000 USD freelance`',
  income_error_amount: '❌ Invalid amount. Enter a number from 0.01 to {max}.',

  // Recurring expenses
  button_recurring: '🔁 Recurring expenses',
  button_add_recurring: '➕ Add recurring expense',
  recurring_menu_title: '🔁 *Recurring expenses*',
  recurring_menu_info: 'Monthly payments (rent, subscriptions, loans) are recorded as expenses automatically on the chosen day of the month.',
  recurring_menu_empty: 'No recurring expenses yet.',
  recurring_item: '{icon} {description} — *{amount}*, on day {day} of every month\n    Next record: {next}',
  recurring_monthly_total: 'Total per month: *{amount}*',
  recurring_enter_prompt: 'Enter the amount and description of the recurring expense 👇\n\nExample: `50000 rent`\nYou can set a currency after the amount: `500 USD rent`',
  recurring_day_prompt: 'On which day of every month should I record this expense? Enter a number from 1 to 31.\n\nIf a month is shorter, I will record it on the last day of the month.',
  recurring_day_invalid: '❌ Enter a whole number from 1 to 31.',
  recurring_select_category: 'Choose a category for the recurring expense:',
  recurring_added: '✅ Recurring expense added\n\n{description} — *{amount}*, on day {day} of every month\nFirst record: {next}',
  recurring_added_charged_now: '✅ Recurring expense added and already recorded for this month\n\n{description} — *{amount}*, on day {day} of every month\nNext record: {next}',
  recurring_deleted: '✅ Recurring expense deleted. Already recorded expenses stay in history.',
  recurring_not_found: '❌ Recurring expense not found',
  recurring_limit: '❌ You can have at most {max} recurring expenses',
  recurring_charged_notification: '🔁 Recorded a recurring expense: {icon} {description} — *{amount}*',
  recurring_error_format: '❌ Unrecognized format. Send an amount and a description: `50000 rent` or `500 USD rent`',
  recurring_error_amount: '❌ Invalid amount. Enter a number from 0.01 to {max}.',

  // Main menu and «More»
  button_overview: '📊 Month overview',
  button_today: '📅 Today',
  button_more: '☰ More',
  more_menu_title: '☰ *More*',
  button_export: '📤 Export CSV',
  keyboard_refreshed: '✅ The menu is updated — it is more compact now 👇',
  button_outdated: 'This button is outdated. Open the section again from the menu below.',

  // Period overview and record lists
  overview_title: 'Overview: {range}',
  overview_spent: '💸 Expenses: *{amount}* · records: {count}',
  overview_upcoming: 'Upcoming recurring:',
  overview_income_hint: '💡 Record income with a plus: `+50000 salary`',
  button_prev_period: '◀️ Earlier',
  button_next_period: 'Later ▶️',
  button_back_to_overview: '⬅️ To overview',
  day_title_today: 'Today, {date}',
  day_title_yesterday: 'Yesterday, {date}',
  day_title: '{date}',
  day_entry_hint: 'Send an expense as a message: `250 coffee`',
  button_prev_day: '◀️ Previous day',
  button_next_day: 'Next day ▶️',
  list_tap_number: 'Tap a number to open the record.',
  family_today_title: 'Family: today\'s records',

  // Record card
  button_undo: '↩️ Undo',
  button_delete_record: '🗑 Delete',
  button_change_category: '🏷 Category',
  button_edit_record: '✏️ Edit',
  expense_family_label: 'in the family budget',
  expense_recurring_label: 'recorded automatically (recurring expense)',
  expense_category_remembered: '🏷 The category was picked from your previous record with the same description — change it with the button below.',
  category_will_be_remembered: '💡 I will remember your choice: next time such a record goes to this category right away.',
  expense_category_changed: 'Category: {category}',

  // Settings
  settings_header: 'Settings',
  settings_currency_line: '💱 Currency: *{currency}* · income: *{incomeCurrency}*',
  settings_timezone_line: '🌍 Time zone: {timezone}',
  settings_language_line: '🌐 Language: {language}',
  settings_period_line: '📅 The period starts on day {day}',
  settings_reminders_on_line: '🔔 Reminders: on ({hours})',
  settings_reminders_off_line: '🔔 Reminders: off',
  button_currencies: '💱 Currencies',
  settings_currencies_text: '💱 *Currencies*\n\nMain — expenses and all totals are counted in it: *{currency}*\nDefault income currency: *{incomeCurrency}*\n\nAny record can be in another currency — put the code after the amount: `20 USD taxi`.',
  reminders_title: 'Reminders',
  reminders_info: 'If you have not recorded anything by the chosen hour, I will remind you. At most 3 times a day.',
  button_reminders_on: '🟢 On — tap to turn off',
  button_reminders_off: '⚫ Off — tap to turn on',

  // Family without premium
  family_teaser: '👨‍👩‍👧‍👦 *Family budget*\n\nShared expenses with your close ones in one place: everyone records their own, statistics and export are shared.\n\nAvailable with premium.',
  button_premium: '⭐️ Premium',

  // Subscription and premium ending
  subscription_active_info: '🔁 The monthly subscription is paid until {date} and renews automatically. To cancel: Telegram → Settings → My Stars → My subscriptions.',
  subscription_renewed: '🔁 Subscription renewed. Premium is active until {date}.',
  button_view_tariffs: '⭐️ Plans',
  premium_expiring_trial: '⏳ Your premium trial ends on {date}.\n\nAfter that budgets, the full period summary, custom categories and the family budget will stop working. Everything you recorded stays, and expense tracking is free.',
  premium_expiring_paid: '⏳ Premium ends on {date}. You can renew in advance — the remaining days are kept.',
  premium_expired_trial: '🌙 Your premium trial has ended. Tracking expenses and income stays free; budgets, the full summary, custom categories and family come with premium.',
  premium_expired_paid: '🌙 Premium has ended. Thank you for supporting the project! You can renew any time.',
  premium_winback: '👋 Your premium ended a week ago. If you want budgets, the full summary, custom categories and the family budget back — see the plans below.',
  start_reminders_note: '🔔 If you record nothing during the day, I will remind you (up to 3 times a day). Change hours or turn off: ☰ More → ⚙️ Settings → 🔔.',

  // Budgets
  button_budgets: '🎯 Budgets',
  budgets_title: 'Budgets',
  budgets_empty: 'Set a limit for the whole month or for a category — I will warn you at 80% and when the limit is exceeded.',
  budgets_teaser: '🎯 *Budgets*\n\nA limit for the month or for a category: progress is shown in the overview, and you get an alert at 80% and when the limit is exceeded.\n\nAvailable with premium.',
  button_budget_total: '➕ Whole month',
  button_budget_category: '➕ Category',
  button_budget_change: '✏️ Change amount',
  budget_total_name: '🎯 Whole month',
  budget_left: '{amount} left',
  budget_over: 'over by {amount}',
  budget_enter_prompt: 'Enter the period limit for «{name}» 👇\n\nFor example: `10000` (in *{currency}*) or `150 USD`',
  budget_amount_invalid: '❌ Only an amount is needed: `10000` or `150 USD`.',
  budget_saved: '✅ Budget saved',
  budget_deleted: '✅ Budget deleted',
  budget_not_found: '❌ Budget not found',
  budget_warning_80: '⚠️ {name}: spent {spent} of {limit} ({percent}%)',
  budget_warning_100: '🚨 {name}: budget exceeded — {spent} of {limit} ({percent}%)',
  overview_budget_of: 'of the {amount} budget',

  // Period summary
  button_report: '📄 Summary',
  report_title: 'Summary: {range}',
  report_vs_previous: 'Compared to the previous period: {change} (was {amount})',
  report_change_new: 'new',
  report_change_same: 'no change',
  report_top_categories: 'Top spending:',
  report_locked: '🔒 The full breakdown — every category compared to the previous period, budgets, average spending per day and the largest expense — comes with premium.',
  report_categories_vs_previous: 'Categories (vs previous period):',
  report_categories_gone: 'No spending this time: {list}',
  report_more_numbers: 'More numbers:',
  report_per_day: '📅 Average per day: {amount}',
  report_largest: '🔝 Largest expense: {amount} — {description} ({date})',
  overview_budget_limit: 'limit {amount}',
  report_title_current: 'Summary so far: {range}',
  input_canceled: '✅ Canceled. You can record expenses as usual.',
  no_active_state: 'Nothing to cancel right now.',
  daily_summary_title: 'Day summary',
  daily_summary_info: 'Daily summary: in the evening I will send how much you spent today and on what. Only on days with expenses.',
  daily_summary_enabled: '✅ Daily summary enabled',
  daily_summary_disabled: '⚫ Daily summary disabled',
  daily_summary_hour_info: 'Choose the local hour for the daily summary:',
  daily_summary_hour_set: 'Summary time saved',
  button_daily_summary_on: '🗓 Summary: on',
  button_daily_summary_off: '🗓 Summary: off',
  settings_daily_summary_on_line: '🗓 Daily summary: at {time}',
  settings_daily_summary_off_line: '🗓 Daily summary: off',
  weekly_insight_info: 'Weekly insight: on Mondays at 10:00 — how much you spent last week compared to usual, which categories grew and your pace in the current period.',
  settings_weekly_insight_on_line: '📈 Weekly insight: Mondays at 10:00',
  settings_weekly_insight_off_line: '📈 Weekly insight: off',
  button_weekly_insight_on: '📈 Week: on',
  button_weekly_insight_off: '📈 Week: off',
  button_weekly_insight_now: '👀 Show now',
  button_weekly_insight_overview: '📊 Overview',
  button_weekly_insight_disable: '🔕 Turn off weekly insight',
  weekly_insight_enabled: '✅ Weekly insight enabled',
  weekly_insight_disabled: '⚫ Weekly insight disabled',
  weekly_insight_turned_off: '🔕 Weekly insight turned off. To turn it back on: Settings → Reminders.',
  weekly_insight_no_data: 'No expenses in the last 5 weeks — nothing to summarize yet.',
  weekly_insight_title: 'Week {range}',
  weekly_insight_spent: 'Spent this week: *{amount}*',
  weekly_insight_no_history: 'Not enough history yet — comparison with usual weeks will appear in a couple of weeks.',
  weekly_insight_same: '≈ As usual ({weeks}-week average: {amount})',
  weekly_insight_more: '↑ {percent}% more than usual: +{amount} vs the {weeks}-week average',
  weekly_insight_less: '↓ {percent}% less than usual: −{amount} vs the {weeks}-week average',
  weekly_insight_overspend: '📈 Grew the most: {category} (+{amount})',
  weekly_insight_improvement: '👍 Less than usual: {category} (−{amount})',
  weekly_insight_period: 'Period {range}',
  weekly_insight_period_spent: 'Spent: {amount} in {days} of {total} days',
  weekly_insight_projection: 'At this pace by the end of the period: *≈{amount}*',
  weekly_insight_projection_vs: 'At this pace by the end of the period: *≈{amount}* (previous — {previous}, {change})',
  weekly_insight_budget_ok: '🎯 Budget {limit}: on track, ≈{amount} to spare',
  weekly_insight_budget_over: '🚨 Budget {limit}: at this pace you will exceed it by ≈{amount}',
  export_title: '📤 Export to CSV\n\nChoose the period for the file.',
  export_categories_all: '🗂 Categories: all',
  export_categories_selected: '🗂 Categories: {categories}',
  export_period_day: '📅 Today',
  export_period_week: '📅 Last 7 days',
  export_period_current: '📅 Current period',
  export_period_previous: '📅 Previous period',
  export_period_all: '♾ All time',
  export_period_range: '🗓 Choose dates…',
  export_filter_categories: '🔽 Filter by categories',
  export_select_categories: 'Select the categories to export:',
  export_select_all: '✅ Select all',
  export_deselect_all: '❌ Deselect all',
  export_done: '✅ Done',
  export_no_categories: 'Select at least one category',
  export_enter_dates: '🗓 Enter a date range:\n`01.03.2026 - 15.03.2026`\n\nor a single date: `01.03.2026`',
  export_dates_invalid: '❌ Couldn\'t read the dates. Enter them as `01.03.2026 - 15.03.2026` or a single date `01.03.2026`.',
  export_dates_order: '❌ The start date is later than the end date. Example: `01.03.2026 - 15.03.2026`.',
  total_by_categories: 'Total by categories:',

  // Bot profile in Telegram (scripts/set-bot-profile.js): description before /start, short description, command menu
  bot_short_description: 'Track spending in a couple of taps: type "250 coffee". Income, budgets, monthly summary, family budget.',
  bot_description: 'Expense and income tracking in Telegram.\n\nType "250 coffee" — saved, and the category is remembered.\n\n• Month overview by category and period summary\n• Income and balance: "+50000 salary"\n• Recurring expenses: rent and subscriptions added automatically\n• Bank statement import: T-Bank, Sber, Kaspi, CSV\n• Savings, goals, debts, forecast with inflation\n• Budgets with alerts, daily and weekly summaries, reminders\n• Family budget, currencies, CSV export\n\nThe basics are free. New users get 14 days of premium.',
  command_start: 'Main menu',
  command_stats: 'Month overview',
  command_history: 'Today\'s records',
  command_income: 'Income and balance',
  command_recurring: 'Recurring expenses',
  command_export: 'Export to CSV',
  button_import: '📥 Import statement',
  command_import: 'Import a bank statement',
  import_intro: '📥 *Import a bank statement*\n\nSend the statement file to this chat — I\'ll show what I found and won\'t record anything until you confirm.\n\n*Supported:*\n• *T-Bank* — CSV. On the website: "Operations" → choose a period → "Export" → CSV.\n• *Sber* — PDF "Card account statement": SberBank Online → card → "Statements and certificates".\n• *Kaspi Gold* — PDF statement: Kaspi.kz → Kaspi Gold → "Statement".\n• *Any CSV* with a header row: date, amount (or debit and credit), description; currency and category if present.\n\nUp to 20 MB and 5000 operations per file. Importing the same statement again won\'t create duplicates, and operations you already entered manually are skipped. The file itself isn\'t stored — only the operations.',
  import_unsupported_file: '📎 I can import bank statements in CSV and PDF (T-Bank, Sber, Kaspi Gold or any CSV). More — /import',
  import_file_too_big: '❌ The file is larger than 20 MB. Export a shorter period.',
  import_download_error: '❌ Couldn\'t download the file. Please send it again.',
  import_pdf_error: '❌ Couldn\'t read the PDF. If it\'s password-protected or a scan, export the statement as CSV.',
  import_unknown_format: '❌ I don\'t recognize this statement format. Supported: CSV (T-Bank or any with a header row) and PDF statements from Sber and Kaspi Gold. More — /import',
  import_csv_columns: '❌ Couldn\'t find date and amount columns in the CSV. It needs a header row, for example: `Date,Amount,Description`.',
  import_empty: '🤷 There are no operations to import in this file.',
  import_too_many: '❌ The file has more than {max} operations. Export a shorter period.',
  import_source_tbank: 'T-Bank',
  import_source_sber: 'Sber',
  import_source_kaspi: 'Kaspi Gold',
  import_source_csv: 'CSV',
  import_preview_title: '📥 *Statement: {source}*',
  import_preview_expenses: '💸 Expenses: {count} · {total}',
  import_preview_incomes: '💰 Income: {count} · {total}',
  import_preview_top: '*Top categories:*',
  import_preview_transfers: '🔁 Transfers, top-ups and withdrawals: {count} (out {out}, in {in})',
  import_preview_transfers_ask: 'Count them as expenses and income? Transfers between your own accounts are better skipped.',
  import_preview_transfers_on: '✅ Transfers will be counted.',
  import_preview_transfers_off: '🚫 Transfers will be skipped.',
  import_preview_skipped: '*Will skip:*',
  import_skip_duplicates: '• already imported: {count}',
  import_skip_manual: '• already entered manually: {count}',
  import_skip_transfers: '• transfers: {count}',
  import_skip_failed: '• failed operations: {count}',
  import_skip_currency: '• unsupported currency: {count}',
  import_skip_invalid: '• unrecognized rows: {count}',
  import_preview_footer: 'Nothing has been recorded yet.',
  import_nothing_new: '✅ No new operations — everything from this statement is already recorded.',
  button_import_transfers_on: '✅ Count transfers ({count})',
  button_import_transfers_off: '🚫 Skip transfers',
  button_import_confirm: '✅ Import',
  import_canceled: 'Import canceled, nothing was recorded.',
  import_outdated: '⌛ This statement has expired. Send the file again.',
  import_done_title: '✅ *Import complete*',
  import_done_expenses: '💸 Expenses added: {count}',
  import_done_incomes: '💰 Income added: {count}',
  import_done_skipped: '*Skipped:*',
  button_import_undo: '↩️ Undo import',
  import_undone: '↩️ Import undone: removed {expenses} expenses and {incomes} income records.',
  import_undo_missing: 'This import has already been undone.',
  import_error: '❌ Couldn\'t record the operations — nothing was saved. Please try again.',
  receipt_recognizing: '🔍 Reading the receipt…',
  receipt_not_configured: '🧾 Receipt recognition isn\'t set up yet. Record expenses with a message: `250 coffee`.',
  multi_recorded_title: 'Recorded: {count}',
  multi_income_label: 'income',
  multi_expenses_total: 'Total spent: *{total}*',
  multi_tap_number: 'Tap a number to edit a record, change its category or delete it.',
  multi_default_category_hint: '🏷 New descriptions went to “{category}” — change the category in the card and I\'ll remember it next time.',
  button_multi_undo_all: '↩️ Undo all',
  multi_undone: '↩️ Undone: {count} records deleted.',
  multi_already_undone: 'These records have already been undone.',
  multi_all_deleted: 'All records from here have been deleted.',
  multi_not_found: 'Records not found.',
  multi_too_many: '❌ Up to {max} records at once. Split them into several messages.',
  voice_not_configured: '🎙 Voice input isn\'t set up yet. Write expenses in a message: `coffee 250, taxi 400`.',
  voice_too_long: '🎙 The voice message is longer than {max} s. Record a shorter one or type it: `coffee 250, taxi 400`.',
  voice_busy: '⏳ Please wait, I\'m still recognizing your previous voice message.',
  voice_limit_regular: '🎙 You\'ve used up today\'s voice messages: {used} of {limit}. With premium — up to {premium} a day. Typing is unlimited: `coffee 250, taxi 400`.',
  voice_limit_premium: '🎙 You\'ve used up today\'s voice messages: {used} of {limit}. The limit resets tomorrow — for now, just type it: `coffee 250, taxi 400`.',
  voice_recognizing: '🎙 Recognizing your voice…',
  voice_queued: '🎙 Recognizing your voice… You\'re in line: {position}',
  voice_heard: '🎙 I heard: “{text}”',
  voice_no_amount: 'I couldn\'t find an amount. Try saying: “coffee two hundred fifty and taxi four hundred”.',
  voice_empty: '🎙 I didn\'t catch anything. Try again — closer to the mic and without background noise.',
  voice_error: '❌ Couldn\'t recognize the voice message. Try again or type it: `coffee 250`.',
  help_voice: '🎙 Say “coffee two hundred fifty and taxi four hundred” in a voice message — I\'ll record both expenses. Voice is recognized on our server and isn\'t stored.',
  receipt_limit_regular: '🧾 This month\'s receipt recognition limit is used up: {used} of {limit}. With premium — up to {premium} receipts a month. You can still record expenses with a message: `250 coffee`.',
  receipt_limit_premium: '🧾 This month\'s receipt recognition limit is used up: {used} of {limit}. It resets next month; meanwhile record expenses with a message: `250 coffee`.',
  receipt_send_as_photo: '🖼 I can\'t read this file. Send the receipt as a photo, not as a file — Telegram will compress it.',
  receipt_unreadable: '😕 Couldn\'t read the receipt. Take the photo straight, with the whole receipt and good light.',
  receipt_not_receipt: '🤔 This doesn\'t look like a receipt. Send a photo of a shop receipt and I\'ll record every item.',
  receipt_currency_unsupported: '💱 The receipt is in {currency}, which the bot doesn\'t support yet. Record the expense with a message.',
  receipt_error_quota: '⏳ The recognition service\'s limit for today is used up, please try later. This receipt didn\'t count toward your limit.',
  receipt_error_unavailable: '⚠️ The recognition service is unavailable right now, please try later. This receipt didn\'t count toward your limit.',
  receipt_title_default: 'Receipt',
  receipt_items_count: 'items: {count}',
  receipt_total_mismatch: '⚠️ Check the sums: receipt total {printed}, items {items}.',
  receipt_family_note: '👨‍👩‍👧‍👦 Recorded to the family budget.',
  receipt_all_deleted: 'All items of this receipt have been deleted.',
  receipt_tap_number: '✅ Each item is recorded as a separate expense. Tap a number to change the amount or category, or delete it.',
  button_receipt_ok: '✅ All correct',
  button_receipt_undo: '↩️ Undo receipt',
  receipt_confirmed: '✅ Receipt recorded.',
  receipt_undo_confirm: 'Undo the receipt? I\'ll delete {count} expenses totaling {total}.',
  button_receipt_undo_confirm: '🗑 Yes, undo',
  receipt_undone: '↩️ Receipt undone: {count} expenses deleted.',
  receipt_already_undone: 'This receipt has already been undone.',
  receipt_not_found: 'Receipt not found.',
  help_receipt: '🧾 Send a photo of a receipt — I\'ll record every item as a separate expense with a category.',
  import_receipt_hint: '🧾 You can also just send a photo of a shop receipt — I\'ll record every item.',
  receipt_busy: '⏳ Please wait, I\'m still reading your previous receipt.',
  receipt_queued: '🔍 Reading the receipt… You are in the queue: {position}.',
  receipt_recognizing_slow: '🔍 Reading the receipt… This may take 1–2 minutes.',
  receipt_low_confidence: '⚠️ I\'m not sure about the numbers: the items don\'t match the total ({total}) or the prices. Check the list and record it as is — or send a sharper photo.',
  button_receipt_record_draft: '✅ Record as is',
  receipt_draft_canceled: 'The receipt was not recorded.',
  receipt_draft_outdated: '⌛ This draft has expired. Send the receipt photo again.',
  receipt_retrying: '🔄 Rotating and trying again…',
  receipt_photo_tips: '📸 Lay the receipt flat and shoot closer so it fills the frame. A small or long receipt is better sent as a file — it arrives in full quality.',
  receipt_small_photo_tip: '🔎 The receipt is small in the photo, and Telegram compresses photos. Send it as a file (📎 → File) to keep full resolution.',
  button_receipt_rotate: '🔄 Rotate 90° and try',
  receipt_rotate_outdated: '⌛ This photo is no longer available. Please send it again.',
  receipt_heic_unsupported: '🖼 I can\'t read HEIC. Send the receipt as a photo or as a JPEG file.',
  receipt_file_too_big: '🖼 The file is larger than 20 MB. Send the receipt as a photo or a smaller file.',
  command_family: 'Family budget',
  command_settings: 'Settings',
  command_limits: 'Subscription and premium',
  command_help: 'Help',
  command_cancel: 'Cancel input',
  command_paysupport: 'Payment support',
  command_terms: 'Terms of Service',
  command_privacy: 'Privacy Policy',
  payment_outdated: '⚠️ This invoice is outdated: the price has changed. Open the plans again — /limits',
  security_validation_error: '⚠️ Couldn\'t process this request. Try again or open the menu with /start.',
  expense_draft_outdated: '⌛ This draft is outdated. Send the expense again.',
  family_invitation_hours_left: '⏰ {hours} h left',
  family_no_members: 'No members',
  family_already_member: '❌ You are already in a family.',
  admin_bug_reports_all_title: '📝 All bug reports (latest {count})',
  admin_bug_reports_new_title: '🆕 New bug reports (latest {count})',
  admin_bug_reports_empty: 'No reports.',
  payment_subscription_already_active: '🔁 You already have an active monthly subscription — no need for a second one. To extend premium in advance, pick a one-time plan: /limits',
  payment_foreign_payer: '⚠️ This payment link was created for another user. Open the plans in the bot yourself — /limits',
  premium_expired_granted: '🌙 Your premium has ended. Tracking expenses and income stays free; budgets, the full summary, custom categories and family come with premium. You can extend it any time.',
}; 