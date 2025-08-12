module.exports = {
    button_reminders: '🔔 შეხსენება',
    reminders_enabled: 'შეხსენებები ჩართულია. თუ 18:00-მდე არაფერს ჩაიწერ, ცოტა იუმორით შეგახსენებ 😉',
    reminders_disabled: 'შეხსენებები გამორთულია. სრული სიჩუმე 🤐',
    reminder_sample_variants: [
      'ჰეი! საფულე ჩუმად რომაა, ეს არ ნიშნავს რომ ბედნიერია. ჩაიწერე შენი ხარჯები 😉',
      'დღეს რამე დახარჯე? ჩაიწერე, სანამ მეხსიერება პურის საყიდლად წავა 🧠🥖',
      'თუ არ ჩაიწერე, ფულია ჰაერში გაფანტული. მოდი, ჩავწეროთ 💸',
      'წვეთ-წვეთობით ბიუჯეტი ზღვაში გაიდინება. ჩაწერე დღევანდელი ხარჯი 🌊',
      'ბოტი არ აბრაზებს, უბრალოდ გახსენებს: დროა ხარჯის ჩაწერის 😌'
    ],
    reminder_message_title: 'შეხსენება',
    reminder_turn_on_off: (enabled) => enabled ? 'შეხსენებების გამორთვა' : 'შეხსენებების ჩართვა',
  
    // შეცდომის ანგარიში
    button_bug_report: '🐛 შეცდომის ანგარიში / წინადადება',
    bug_report_prompt: '🐛 *შეცდომის ანგარიში ან გაუმჯობესების წინადადება*\n\nაღწერე პრობლემა ან იდეა (მაქს. 1000 სიმბოლო):',
    bug_report_success: '✅ გმადლობ! შენი შეტყობინება გადაეგზავნა დეველოპერს.',
    bug_report_too_long: '❌ შეტყობინება ძალიან გრძელია! შეამცირე {excess} სიმბოლოთი (მაქს. 1000).',
    bug_report_empty: '❌ შეტყობინება ცარიელია. აღწერე პრობლემა ან წინადადება.',
    bug_report_rate_limit: '⚠️ შეცდომის ანგარიშები ძალიან ხშირია!\n\nყოველ 10 წუთში მაქსიმუმ 3 ანგარიშის გაგზავნა შეიძლება',
    bug_report_suspicious: '⚠️ შეტყობინებაში დაუშვებელი სიმბოლოები ან საეჭვო შინაარსია',
  
    // უსაფრთხოება
    security_rate_limit: '⚠️ *მეტისმეტად ბევრი მოთხოვნა*\n\nსცადე ხელახლა {resetTime} წამში\nლიმიტი: {limit} მოთხოვნა წუთში',
    security_validation_error: '⚠️ *ვალიდაციის შეცდომა*\n\n{message}',
    security_error: '❌ *უსაფრთხოების შეცდომა*\n\nსცადე მოგვიანებით ან დაუკავშირდი അഡმინს.',
  
    // ადმინის პანელი
    button_admin: '👑 ადმინ პანელი',
    admin_access_denied: '❌ არ გაქვს അഡმინის უფლებები.',
    admin_panel_title: '👑 *ადმინ პანელი*\n\nაირჩიე მოქმედება:',
    admin_error: '❌ ადმინ ოპერაციის შესრულებისას მოხდა შეცდომა.',
  
    // ადმინის სტატისტიკა
    admin_stats_text: `📊 *ბოტის სტატისტიკა*
  
    👥 **მომხმარებლები:**
    • სულ: {totalUsers}
    • პრემიუმი: {activePremium}
    • ახალი ამ კვირაში: {newUsersWeek}
    • ახალი ამ თვეში: {newUsersMonth}
  
    💰 **ხარჯები:**
    • ჩანაწერები სულ: {totalExpenses}
    • ამ კვირაში: {expensesWeek}
    • აქტიური მომხმარებლები: {activeUsers}
  
    🐛 **შეცდომის ანგარიშები:** {totalBugReports}
  
    💎 **დონაციები:**
    • სულ: {totalDonations}
    • შეგროვილი ვარსკვლავები: {totalStars}
  
    ⭐ **პრემიუმ ტრანზაქციები:** {premiumTransactions}`,
  
    // მომხმარებელთა სია
    admin_users_title: '👥 *მომხმარებლები* (გვ. {page}/{totalPages})\n\nსულ: {totalUsers}\n',
  
    // შეცდომის ანგარიშები
    admin_bug_reports_title: '🐛 *შეცდომის ანგარიშები*',
    bug_report_status_new: '🆕 ახალი',
    bug_report_status_in_progress: '🔄 პროცესში',
    bug_report_status_resolved: '✅ გადაწყვეტილი',
    bug_report_status_closed: '🔒 დახურული',
  
    // დონაციის სტატისტიკა
    admin_donations_text: `💰 *დონაციების სტატისტიკა*
  
    📊 **შეჯამება:**
    • დონაციები სულ: {totalDonations}
    • დასრულებული: {completedDonations}
    • მოლოდინში: {pendingDonations}
  
    ⭐ **ვარსკვლავები:**
    • სულ შეგროვილი: {totalStars}
    • საშუალო დონაცია: {avgStars} ვარსკვლავი`,
  
    // პრემიუმ სტატისტიკა
    admin_premium_stats: `⭐ *პრემიუმ სტატისტიკა*
  
    📊 **მომხმარებლები:**
    • სულ პრემიუმი: {totalPremiumUsers}
    • აქტიური ახლა: {activePremiumUsers}
  
    💳 **ტრანზაქციები:**
    • სულ: {totalTransactions}
    • შემოსავალი სულ: {totalRevenue} ვარსკვლავი`,
  
    // ადმინების სია
    admin_admins_title: '👑 *ადმინები* ({count})\n',
      // მომხმარებლის ძიება (ადმინი)
      admin_search_prompt: '🔍 *მომხმარებლის ძიება*\n\nშეიყვანე მომხმარებლის ID ან სახელი:',
      admin_search_not_found: '❌ მომხმარებელი ვერ მოიძებნა.',
      admin_search_results: '🔍 *ძებნის შედეგები* "{query}"\n\nნაპოვნია: {count}\n',
      
      // მომხმარებლის დეტალები (ადმინი)
      admin_user_not_found: '❌ მომხმარებელი ვერ მოიძებნა.',
      admin_user_details: `👤 *მომხმარებლის ინფორმაცია*
    
    {adminFlag}{premiumFlag} **{firstName}** (@{username})
    🆔 ID: {userId}
    🌐 ენა: {language}
    💱 ვალუტა: {currency}
    🕐 დროის სარტყელი: {timezone}
    📅 რეგისტრაციის თარიღი: {createdAt}
    
    📊 **სტატისტიკა:**
    • ხარჯების ჩანაწერები: {totalExpenses}
    • საერთო თანხა: {totalAmount}
    • შეცდომის ანგარიშები: {bugReportsCount}
    • ტრანზაქციების რაოდენობა: {transactionsCount}`,
    
      // ადმინის ქმედებები
      admin_promote_success: '✅ {userId} ადმინისტრად დაყენდა.',
      admin_demote_success: '✅ {userId}–ს ადმინისტრის უფლებები მოეხსნა.',
      admin_cannot_demote_self: '❌ საკუთარ უფლებებს ვერ მოიცილებ.',
      admin_grant_premium_options: '⭐ *პრემიუმ მიანიჭე {userId} მომხმარებელს*\n\nაირჩიე ვადა:',
      admin_grant_premium_success: '✅ {userId}–ს მიენიჭა {days} დღით პრემიუმი.',
      admin_revoke_premium_success: '✅ {userId}–ს პრემიუმი გაუქმდა.',
    
      // მასიური გაგზავნა
      admin_broadcast_prompt: '📢 *მასიური შეტყობინება*\n\nშეიყვანე ტექსტი, რომელიც გაიგზავნება ყველა მომხმარებელთან (მაქს. 3600 სიმბოლო):',
      admin_broadcast_too_long: '❌ შეტყობინება ძალიან გრძელია!\n\n📏 ამჟამინდელი სიგრძე: {current}\n📏 მაქსიმუმი: {max}\n📏 შეამცირე: {excess} სიმბოლო',
      admin_broadcast_confirm: '📢 *დაადასტურე მასიური გაგზავნა*\n\n📝 **ტექსტი:**\n{message}\n\n📏 **სიგრძე:** {length} სიმბოლო\n\n⚠️ ეს შეტყობინება გაეგზავნება **ყველა** მომხმარებელს!',
      admin_broadcast_started: '📢 გაგზავნა დაიწყო...',
      admin_broadcast_result: '📢 *გაგზავნა დასრულდა!*\n\n📊 **სტატისტიკა:**\n• სულ: {total}\n• წარმატებით: {sent}\n• შეცდომა: {failed}',
      admin_broadcast_header: '🔴🔴🔴 *შეტყობინება!* 🔴🔴🔴',
      
      // ზოგადი შეტყობინებები
      welcome: 'გამარჯობა, {name}! 👋',
      main_menu_title: '🏠 *მთავარი მენიუ*\n\nაირჩიე მოქმედება:',
      error: 'გამოჩნდა შეცდომა 😞',
      unknown_error: 'მოულოდნელი შეცდომა. სცადე მოგვიანებით.',
      not_found: 'ვერ მოიძებნა',
      error_invalid_description_format: '❌ არასწორი ფორმატი. გამოიყენე: თანხა აღწერა ან თანხა კატეგორია აღწერა',
      expense_save_error: '❌ ხარჯის შენახვისას მოხდა შეცდომა. სცადე ხელახლა.',
      cancel: 'გაუქმება',
      back: 'უკან',
      confirm: 'დადასტურება',
      save: 'შენახვა',
      
      // საწყისი შეტყობინება
      start_message: `გამარჯობა! 👋 მოგეხმარები ხარჯების აღრიცხვასა და ბიუჯეტის მართვაში.
    
    *როგორ დაამატო ხარჯი:*
    შეიყვანე თანხა და აღწერა:
    -  \`200 პროდუქტები\`
    -  \`1500 ლანჩი რესტორანში\`
    -  \`50 მგზავრობა\`
    -  \`150.50 ყავა\`
    
    შემდეგ გამოგიჩნდება კატეგორიების მენიუ — აირჩიე შესაფერისი 🏷️
    
    *მთავარი ბრძანებები:*
    /start - ბოტის რესტარტი
    /menu - მენიუს გახსნა
    /history - დღევანდელი ჩანაწერები
    /stats - ამ თვის სტატისტიკა კატეგორიებით
    
    /export - CSV ფაილის ჩამოტვირთვა
    /undo - ბოლო ჩანაწერის წაშლა
    
    *პარამეტრები:*
    /settings - პარამეტრების მენიუ
    /currency - ძირითადი ვალუტის შეცვლა
    /timezone - დროის სარტყლის დაყენება
    /categories - კატეგორიების მართვა
    
    *სხვა ფუნქციები:*
    /family - საოჯახო ბიუჯეტი
    /limits - ლიმიტები და პრემიუმი
    /help - დეტალური დახმარება
    
    დაიწყე ხარჯების ჩაწერა დღესვე! 💰`,
    help_message: `📋 *ბრძანებების დეტალური დახმარება*
  
  *ხარჯის დამატება:*
  თანხასა და აღწერას შორის დატოვე სიცარიელე:
  \`200 ყიდვა\` — გამოაჩენს კატეგორიების მენიუს
  \`150.50 ყავა\` — მუშაობს ათწილადის ფორმატიც
  
  *მთავარი ბრძანებები:*
  /start - ბოტის რესტარტი და მისალმების ჩვენება
  /menu - ყველა ფუნქციის მენიუს გახსნა
  /history - დღევანდელი ჩანაწერების ნახვა
  /stats - თვის სტატისტიკა კატეგორიების მიხედვით
  
  /export - ყველა მონაცემის ჩამოტვირთვა CSV-ში
  /undo - ბოლო ჩანაწერის წაშლა
  
  *პარამეტრები და მართვა:*
  /settings - პარამეტრების მთავარ მენიუში შესვლა
  /currency - ძირითადი ვალუტის შეცვლა (RUB, USD, EUR, KZT, CNY, THB)
  /timezone - დროის სარტყლის დაყენება
  /categories - პერსონალური კატეგორიების მართვა (პრემიუმი)
  
  *საოჯახო ბიუჯეტი:*
  /family - საოჯახო ჯგუფისა და საერთო ხარჯების მართვა
  - ოჯახის შექმნა, წევრების მოწვევა
  - საერთო ბიუჯეტის სტატისტიკა
  - საოჯახო მონაცემების ექსპორტი
  
  *პრემიუმის ფუნქციები:*
  /limits - ლიმიტები და პრემიუმის ინფორმაცია
  - პერსონალური კატეგორიები
  - გაფართოებული სტატისტიკა
  - საოჯახო ბიუჯეტი
  - პრიორიტეტული მხარდაჭერა
  
  *რჩევები:*
  • ხარჯებში დაამატე აღწერა უკეთესი ანალიზისთვის
  • /stats-ის გამოყენებით პერიოდულად ნახე სტატისტიკა
  • დააყენე სწორი დროის სარტყელი
  • /menu უფრო სწრაფი წვდომისთვის
  • /export მონაცემთა გადასატანად
  
  *ჩანაწერების ჩასწორება:*
  • /history-ში ჩანაწერების წაშლა ან ჩასწორება
  • "👨‍👩‍👧‍👦 ოჯახის ბიუჯეტში დამატება" გადაიყვანს საერთო ბიუჯეტში
  • "🚫 საოჯახო ბიუჯეტიდან წაშლა" დააბრუნებს პირად ბიუჯეტში
  • მხოლოდ საკუთარი ჩანაწერების შეცვლა/წაშლა
  
  *შეხსენებები:*
  • ბოტი შეგახსენებს 18:00-ზე
  • მხოლოდ იმ შემთხვევაში, თუ დღეს ჩანაწერი არ გაქვს
  • პარამეტრებიდან შეგიძლია ჩართო/გამორთო
  • დღეში მაქსიმუმ ერთი შეხსენება
  
  *დახმარება:*
  /start ბრუნდება მთავარ მენიუში.
  
  წარმატებულ ბიუჯეტირებას გისურვებ! 💰📊`,
  
    // ხარჯები
    expense_added: '✅ ჩაწერილია: {amount} - {description}',
    expense_updated: '✅ ჩანაწერი განახლდა: {amount} - {description}',
    expense_deleted: '✅ ჩანაწერი წაიშალა: {amount} - {description}',
    no_expenses: 'წასაშლელად ჩანაწერი არაა 🤷‍♂️',
    expense_not_found: 'შეცდომა: ჩანაწერი ვერ მოიძებნა.',
    expense_update_error: 'შეცდომა: ჩანაწერი ვერ მოიძებნა ან განახლდა.',
    
    // სტატისტიკა
    monthly_stats: '💰 *ამ თვის ხარჯები*',
    daily_stats: '💰 *დღევანდელი ხარჯები*',
    total_spent: 'სულ: *{amount}*',
    records_count: 'ჩანაწერების რაოდენობა: {count}',
    no_expenses_period: 'ამ პერიოდში ხარჯი არ დაფიქსირებულა.',
    
    // კატეგორიები
    select_category: 'აირჩიე კატეგორია:',
    amount_label: 'თანხა',
    description_label: 'აღწერა',
    category_label: 'კატეგორია',
    expense_added_title: 'ხარჯი დამატებულია!',
    no_categories: 'კატეგორიები ვერ მოიძებნა.',
    category_expenses: '"{category}" კატეგორიის ხარჯები',
    no_category_expenses: 'ბოლო თვეში ამ კატეგორიაში ხარჯი არ იყო.',
    
    // პარამეტრები
    settings_title: 'პარამეტრები:',
    currency_select: 'აირჩიე ძირითადი ვალუტა:',
    currency_set: 'ვალუტა დაყენებულია: {currency}',
    currency_updated: 'ვალუტა შეცვლილია: {currency}',
    button_change_period_start: '📅 პერიოდის დაწყების დღე',
    period_start_prompt: 'შეიყვანე ახალი პერიოდის დაწყების თარიღი (1-31). მოკლე თვეებში ბოლო დღე აირჩევა.',
    period_start_invalid: '❌ არასწორი რიცხვი. შეიყვანე მთელი რიცხვი 1-დან 31-მდე.',
    period_start_set: '✅ პერიოდის დაწყების დღედ დაყენდა: {day}',
    timezone_setup: `🕐 *დროის სარტყელის დაყენება*
  
  ახლა რომელი დროა შენთან?
  
  *მიმდინარე UTC დრო:* {utcTime}
  
  აირჩიე შენი ადგილობრივი დრო:`,
    timezone_set: '✅ დროის სარტყელი დაყენებულია: {timezone}',
    // საოჯახო ბიუჯეტი
    button_family: '👨‍👩‍👧‍👦 ოჯახი',
    family_info: '👨‍👩‍👧‍👦 *საოჯახო ბიუჯეტი*\n\nაქ შეგიძლია ოჯახთან ერთად მართო საერთო ხარჯები.',
    family_created: '✅ "{name}" ოჯახი შეიქმნა! ახლა შეგიძლია წევრები მოიწვიო.',
    family_joined: '✅ შენ შეუერთდი "{name}" ოჯახს!',
    family_left: '✅ შენ გადი "{name}" ოჯახიდან.',
    family_deleted: '✅ "{name}" ოჯახი წაიშალა. ყველა საოჯახო ხარჯი პირად ხარჯებად გარდაიქმნა.',
    family_member_removed: '✅ წევრი ოჯახიდან ამოშლილია.',
    family_member_removed_notification: '❌ შენ ამოშლილი ხარ *{familyName}* ოჯახიდან.',
    family_cannot_leave_owner: '❌ ოჯახის მფლობელი ვერ გაივლის. გამოიყენე „ოჯახის წაშლა" დახმარება.',
    
    // ოჯახის მენიუს ღილაკები
    create_family: '🏠 ოჯახის შექმნა',
    join_family: '🔗 ოჯახში შესვლა',
    invite_member: '➕ წევრის მოწვევა',
    leave_family: '🚪 ოჯახიდან გასვლა',
    delete_family: '🗑️ ოჯახის წაშლა',
    family_members: '👥 ოჯახის წევრები',
    family_stats: '💰 თვის ხარჯები',
    family_daily_stats: '💰 დღევანდელი ხარჯები',
    family_add_expense: '💰 საოჯახო ხარჯის დამატება',
    family_menu: '👨‍👩‍👧‍👦 ოჯახის მენიუ',
    family_cancel: '❌ გაუქმება',
    
    // მიწვევები
    invitation_sent: '✅ მოწვევა გაეგზავნა @{username}',
    invitation_accepted: '✅ შენ მიიღო "{name}" ოჯახში შესვლის მოწვევა!',
    invitation_rejected: '❌ შენ უარი თქვი "{name}" ოჯახში შესვლის მოწვევაზე.',
    invitation_not_found: '❌ მოწვევა ვერ მოიძებნა ან ვადა გაუვიდა.',
    invitation_expired: '❌ მოწვევის ვადა გასულია.',
    invitation_already_processed: '❌ მოწვევა უკვე დამუშავებულია.',
    
    // შეყვანის მოთხოვნები
    enter_family_name: 'შეიყვანე ოჯახის სახელი (3-50 სიმბოლო):',
    enter_invite_username: 'შეიყვანე მომხმარებლის სახელი (@-ს გარეშე):',
    enter_expense_amount: 'შეიყვანე საოჯახო ხარჯის თანხა და აღწერა:',
    
    // შეცდომები
    family_name_too_short: '❌ ოჯახის სახელი მინიმუმ 3 სიმბოლო უნდა იყოს.',
    family_name_too_long: '❌ ოჯახის სახელი მაქსიმუმ 50 სიმბოლო უნდა იყოს.',
    user_not_found: '❌ მომხმარებელი ვერ მოიძებნა.',
    user_already_in_family: '❌ მომხმარებელი უკვე არის ოჯახში.',
    user_already_has_invitation: '❌ ამ მომხმარებელს უკვე აქვს მოქმედი მოწვევა.',
    user_already_in_other_family: '❌ მომხმარებელი სხვა ოჯახშია.',
    user_already_in_your_family: '❌ მომხმარებელი უკვე შენს ოჯახშია.',
    user_not_premium: '❌ მომხმარებელს არ აქვს პრემიუმ სტატუსი.',
    only_owner_can_invite: '❌ მხოლოდ ოჯახის მფლობელს შეუძლია წევრების მიწვევა.',
    active_invitations: '📋 აქტიური მოწვევები',
    no_active_invitations: '📋 შენ არ გაქვს აქტიური მოწვევები.',
    active_invitations_list: '📋 აქტიური მოწვევების სია:',
    cancel_invitation: '❌ მოწვევის გაუქმება',
    invitation_cancelled: '✅ მოწვევა გაუქმდა.',
    not_authorized: '❌ არ გაქვს ამ ქმედების შესრულების უფლება.',
    invitation_code: '🔑 მოწვევის კოდი: `{code}`',
    family_invitation_received: '🎉 შენ მოწვეული ხარ *{familyName}* ოჯახში\n\n👤 შემმოწვეველი: {inviterName}\n🔑 კოდი: `{inviteCode}`\n\nაირჩიე მოქმედება:',
    accept_invitation: '✅ მიღება',
    reject_invitation: '❌ უარყოფა',
    invitation_accepted: '🎉 გილოცავ! შენ შეუერთდი *{familyName}* ოჯახს',
    invitation_rejected: '❌ შენ უარი თქვი მოწვევაზე',
    invitation_not_pending: '❌ ეს მოწვევა აღარ არის მოლოდინის სტატუსში',
    invitation_cancelled_notification: '❌ *{familyName}* ოჯახში შესვლის შენი მოწვევა გაუქმდა {cancelledBy} მიერ',
    enter_invite_code: '🔑 შეიყვანე მოწვევის კოდი:',
    only_owner_can_remove: '❌ მხოლოდ ოჯახის მფლობელს შეუძლია წევრების ამოღება.',
    only_owner_can_delete: '❌ მხოლოდ ოჯახის მფლობელს შეუძლია ოჯახის წაშლა.',
    cannot_remove_owner: '❌ მფლობელის ამოშლა შეუძლებელია.',
    cannot_remove_yourself: '❌ საკუთარ თავს ვერ ამოშლი.',
    family_not_found: '❌ ოჯახი ვერ მოიძებნა.',
    not_family_member: '❌ შენ არ ხარ ამ ოჯახის წევრი.',
    not_family_owner: '❌ შენ არ ხარ ოჯახის მფლობელი.',
    
    // დადასტურება
    confirm_delete_family: '⚠️ *ოჯახის წაშლა*\n\nყველა წევრი წაიშლება, საოჯახო ხარჯები პირად ხარჯებად გადაიქცევა.\n\nგინდა გაგრძელება?',
    confirm_remove_member: '⚠️ *წევრის ამოღება*\n\nწევრი ოჯახიდან ამოიშლება.\n\nგინდა გაგრძელება?',
    // საოჯახო სტატისტიკა
    family_monthly_stats: '👨‍👩‍👧‍👦 *ამ თვის საოჯახო ხარჯები*',
    family_daily_stats: '💰 დღევანდელი ხარჯები',
    family_daily_stats_title: '👨‍👩‍👧‍👦 *დღევანდელი საოჯახო ხარჯები*',
    family_export: '📊 საოჯახო მონაცემების ექსპორტი',
    family_total_spent: 'სულ: *{amount}*',
    family_members_count: 'წევრთა რაოდენობა: {count}',
    family_no_expenses: 'ამ პერიოდში საოჯახო ხარჯები არაა.',
    
    // წევრთა სია
    family_members_title: '👥 *ოჯახის წევრები*',
    family_member_info: '• {name} ({role}) — შემოუერთდა {date}',
    family_owner_role: 'მფლობელი',
    family_member_role: 'წევრი',
    remove_member: '❌ ამოშლა',
    confirm_remove_member: '⚠️ *წევრის ამოშლა*\n\nგინდა {name} ოჯახის ამოღება?',
    member_removed: '✅ {name} ამოღებულია ოჯახიდან.',
    member_removed_notification: '❌ შენ ამოღებული ხარ *{familyName}* ოჯახიდან {ownerName} მიერ.',
    
    // პრემიუმ ფუნქციები
    premium_required: '❌ ეს ფუნქცია ხელმისაწვდომია მხოლოდ პრემიუმ მომხმარებლებისთვის.',
    upgrade_to_premium: '💎 საოჯახო ბიუჯეტის გამოსაყენებლად გადადი პრემიუმ პაკეტზე!',
    
    timezone_updated: `✅ *დროის სარტყელი განახლდა!*
  
  🕐 არჩეული დრო: *{time}*
  🌍 დროის სარტყელი: *{timezone}*
  
  აქედან მოყოლებული, ხარჯები გამოჩნდება ადგილობრივი დროით.`,
    timezone_updated_simple: `✅ *დროის სარტყელი განახლდა!*
  
  🌍 ახალი დროის სარტყელი: *{timezone}*
  
  ხარჯები გამოჩნდება სწორ დროში.`,
    
    // ლიმიტები
    limits_title: '📊 *ლიმიტების შესახებ ინფორმაცია*',
    status_regular: '👤 სტანდარტული',
    status_premium: '💎 პრემიუმი',
    status_label: '*სტატუსი:* {status}',
    records_usage: '<b>ჩანაწერები:</b> {current}/{max} ({percentage}%)',
    records_remaining: '<b>დარჩენილი:</b> {remaining} ჩანაწერი',
    max_description_length: '<b>აღწერის მაქს. სიგრძე:</b> {length} სიმბოლო',
    near_limit_warning: '⚠️ *ყურადღება:* მიუახლოვდი ჩანაწერების ლიმიტს!',
    limit_reached: '❌ *ჩანაწერების ლიმიტი ამოიწურა!*',
    premium_benefits: `💎 <b>პრემიუმ უპირატესობები:</b>
  • აღწერა — 160 სიმბოლო (სტანდარტულზე 80)
  • 300 ჩანაწერი (სტანდარტულზე 100)
  • 5-მდე პერსონალური კატეგორია
  • გაფართოებული სტატისტიკა
  • საოჯახო ბიუჯეტი
  • ნებისმიერი ჩანაწერის რედაქტირება/წაშლა (არა მხოლოდ უკანასკნელის)`,
    
    // პრემიუმ გამოწერა
    premium_subscription_title: '⭐️ გამოწერა',
    premium_status_header: '<b>შენი სტატუსი:</b>',
    premium_privileges: 'უპირატესობები: {status}',
    premium_limits_info: 'აქ შეგიძლიათ ნახოთ ლიმიტები: კატეგორიების რაოდენობა, ჩანაწერები, საოჯახო ფუნქციები, პრემიუმ ვადა.',
    premium_menu_title: '<b>მენიუ:</b>',
    premium_tariff_button: '⭐️ ტარიფები',
    premium_why_paid_button: '👀 რატომ ფასიანი?',
    premium_donate_button: '🤝 დონაცია',
    premium_back_button: '⬅️ უკან',
    premium_tariffs_title: '⭐️ ტარიფები (Telegram Stars)',
    premium_payment_info: '💳 გადახდა ხდება Telegram Stars-ის მეშვეობით. <b>ავტომატური განახლება არ ხდება.</b>',
    premium_renewal_info: '📅 ყოველთვის შეგიძლია გაახანგრძლივო, დრო დაემატება მოქმედ ვადას.',
    premium_stars_info: '💡 ვარსკვლავების ყიდვა შეგიძლია საკომისიოს გარეშე [@PremiumBot]-ით.',
    premium_why_paid_title: '👀 რატომ ფასიანი?',
    premium_why_paid_text: 'ბოტის სერვერის შენახვა თვეში დაახლოებით $200 ჯდება. მომხმარებელთა რაოდენობა იზრდება და როგორც დეველოპერს, სჭირდება შემოსავალი სერვისის გასაუმჯობესებლად :)',
    premium_payment_title: '💳 *პრემიუმ გამოწერის გადახდა*',
    premium_payment_description: 'არჩეულია: <b>{duration}</b>\nფასი: <b>{stars} ⭐️</b>\n\nგადახდისთვის დააჭირე ქვემოთ ღილაკს.',
  
    payment_success: '🎉 *გადახდა წარმატებით დასრულდა!* პრემიუმი გააქტიურდა. ისარგებლე ყველა ფუნქციით.',
    donation_success: '🙏 *გმადლობ მხარდაჭერისთვის!* შენს დონაციას ბოტის გაუმჯობესებისთვის გამოვიყენებთ.',
    general_payment_success: '✅ *გადახდა წარმატებით სრულდა!* გმადლობ, რომ იყენებ ჩვენს ბოტს.',
    premium_expires: '📅 პრემიუმის მოქმედების ვადა: <b>{date}</b>\n⏰ დარჩენილი დღეები: <b>{days}</b>',
  
    // დონაციები
    donate_prompt_title: '🤝 პროექტის მხარდაჭერა',
    donate_prompt_text: 'შეიყვანეთ ვარსკვლავების რაოდენობა (1–2500).\nშემდეგ ხაზზე (სურვილისამებრ) შეგიძლიათ დაწეროთ შეტყობინება (მაქს. 500 სიმბოლო).',
    donate_invalid: '❌ შეიყვანეთ მთელი რიცხვი 1-დან 2500-მდე. შეტყობინება მაქს. 500 სიმბოლო.',
    donate_created: '✅ დონაციის მოთხოვნა შექმნილია: {stars} ⭐️. გადმოგიგზავნით ბმულს გადახდისთვის.',
    donate_paid: '🙏 გმადლობთ მხარდაჭერისთვის! მიღებულია: {stars} ⭐️',
    
    // ვალიდაციის შეცდომები
    error_too_long_regular: '❌ აღწერა ძალიან გრძელია! სტანდარტისთვის მაქს. 80 სიმბოლო.',
    error_too_long_premium: '❌ აღწერა ძალიან გრძელია! პრემიუმისთვის მაქს. 160 სიმბოლო.',
    error_no_description: '❌ თანხის შემდეგ უნდა დაიწეროს აღწერა.',
    error_amount: '❌ არასწორი თანხა. შეიყვანე რიცხვი 0.01–დან 999999-მდე.',
    error_format: '❌ არასწორი ფორმატი. შეიყვანე თანხა და აღწერა.\nმაგ: `200 ყიდვა` ან `1500 ლანჩი`',
    error_limit_reached: '❌ ლიმიტი ამოიწურა!\nსტანდარტი: 100 ჩანაწერი\nპრემიუმი: 300 ჩანაწერი\n\n💎 ლიმიტის გასაზრდელად გამოიყენე პრემიუმი!',
    error_premium_required: '💎 ეს ფუნქცია მხოლოდ პრემიუმისთვისაა!\n\nუპირატესობები:\n• აღწერა 160 სიმბოლო\n• 300 ჩანაწერი\n• პერსონალური კატეგორიები\n• გაფართოებული სტატისტიკა',
    error_generic: '❌ მოხდა შეცდომა. სცადე მოგვიანებით ან დაუკავშირდი ადმინისტრაციას.',
    
    // ღილაკები
    button_menu: '📋 მენიუ',
    button_expenses_month: '💰 თვის ხარჯები',
    button_expenses_day: '💰 დღევანდელი ხარჯები',
    button_expenses_categories: '💰 კატეგორიების მიხედვით',
    button_family: '👨‍👩‍👧‍👦 ოჯახი',
    button_settings: '⚙️ პარამეტრები',
    button_delete_last: '🗑️ ბოლო ჩანაწერის წაშლა',
    button_limits: '📊 ლიმიტები',
    button_help: '❓ დახმარება',
    button_edit: 'რედაქტირება',
    button_delete: 'წაშლა',
    button_mark_as_family: '👨‍👩‍👧‍👦 საოჯახოში გადატანა',
    button_remove_from_family: '🚫 საოჯახოდან წაშლა',
    expense_already_family: '❌ ეს ხარჯი უკვე საოჯახო ბიუჯეტშია',
    expense_converted_to_family: '✅ ხარჯი საოჯახო ბიუჯეტში გადატანილია',
    expense_removed_from_family: '✅ ხარჯი საოჯახო ბიუჯეტიდან ამოშლილია',
    not_owner: '❌ შენ არ ხარ ამ ხარჯის ავტორი',
    button_cancel: '❌ გაუქმება',
    button_back: '⬅️ უკან',
    button_change_currency: '💱 ვალუტის შეცვლა',
    button_change_timezone: '🌍 დროის სარტყელი',
    button_change_language: '🌐 ენა',
    button_custom_categories: '🏷️ პერსონალური კატეგორიები',
    
    // ენები
    language_select: '🌍 აირჩიე ენა:',
    language_set: '✅ ენა შეიცვალა ქართულად',
    language_not_supported: '❌ ეს ენა არ არის მხარდაჭერილი',
    language_change_error: '❌ ენის შეცვლისას მოხდა შეცდომა',
    timezone_error: '❌ დროის სარტყელის დაყენებისას მოხდა შეცდომა',
    
    // ექსპორტი
    export_success: '📊 მონაცემები წარმატებით გაეგზავნა!',
    export_error: 'მონაცემების ექსპორტის შეცდომა 😞',
    keyboard_updated: '✅ კლავიატურა განახლდა შენი ენის მიხედვით!',
    
    // რედაქტირება
    edit_canceled: 'რედაქტირება გაუქმდა.',
    edit_no_active: 'აქტიური რედაქტირება არ არის.',
    edit_instructions: 'შეიყვანე ახალი თანხა და/ან აღწერა (მაგ: 500 ყავა) ან დააჭირე გაუქმებას.',
    edit_empty: 'შეიყვანე თანხა, აღწერა ან ორივე.',
    edit_amount_error: 'თანხა არასწორია.',
    edit_too_long: 'აღწერა ძალიან გრძელია (მაქს. {max} სიმბოლო).',
    edit_format_error: 'ფორმატის შეცდომა.',
    
    // Callback პასუხები
    callback_limit_reached: '❌ ჩანაწერების ლიმიტი ამოიწურა',
    callback_button_not_found: '❌ შეცდომა: ღილაკი ვერ მოიძებნა',
    callback_data_not_found: '❌ შეცდომა: მონაცემები ვერ მოიძებნა',
    callback_expense_added: '✅ დაემატა კატეგორიას "{category}"',
    callback_expense_saved: '❌ შენახვის შეცდომა',
    callback_canceled: '❌ გაუქმებულია',
    callback_expense_canceled: '❌ ხარჯის დამატება გაუქმდა',
    callback_deleted: 'ჩანაწერი წაიშალა!',
    callback_delete_error: 'წაშლის შეცდომა ან ჩანაწერი ვერ მოიძებნა',
    callback_edit_mode: 'რედაქტირების რეჟიმიდან გასვლა:',
    callback_no_cards: 'ჩანაწერები არ მოიძებნა... შეცდომა',
    
    // ნაგულისხმევი კატეგორიები
    category_food: 'საკვები',
    category_transport: 'ტრანსპორტი',
    category_entertainment: 'გართობა',
    category_shopping: 'შოპინგი',
    category_health: 'ჯანმრთელობა',
    category_other: 'სხვა',
    
    // CSV ექსპორტი
    date_label: 'თარიღი',
    currency_label: 'ვალუტა',
    total_by_currencies: 'სულ ვალუტების მიხედვით:',
    total_in_currency: 'სულ {currency}-ში',
    
    // პერსონალური კატეგორიები (პრემიუმი)
    custom_categories_title: '🏷️ პერსონალური კატეგორიები',
    custom_categories_info: 'შეგიძლია შექმნა საკუთარი ხარჯების კატეგორიები (მხოლოდ პრემიუმისთვის).',
    custom_categories_add: '➕ კატეგორიის დამატება',
    custom_categories_manage: '🗂️ კატეგორიების მართვა',
    custom_categories_enter_name: 'შეიყვანე ახალი კატეგორიის სახელი (1-30 სიმბოლო):',
    custom_categories_created: '✅ კატეგორია შეიქმნა: {name}',
    custom_categories_exists: '❌ ასეთი კატეგორია უკვე არსებობს.',
    custom_categories_limit_reached: '❌ მაქს. კატეგორიების ლიმიტი: {max}',
    custom_categories_list_empty: 'შენ არ გაქვს პერსონალური კატეგორიები.',
    custom_categories_list_title: 'შენი პერსონალური კატეგორიები:',
    custom_categories_delete: '🗑️ წაშლა',
    custom_categories_deleted: '✅ კატეგორია წაიშალა.',
    custom_categories_premium_required: '💎 ეს ფუნქცია მხოლოდ პრემიუმ მომხმარებლებისთვისაა.',
    // სტატისტიკა
    by_categories: 'კატეგორიების მიხედვით:',
    no_expenses_category: 'ამ კატეგორიაში ბოლო თვეში ხარჯები არ არის.'
};
  