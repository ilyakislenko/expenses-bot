module.exports = {
    button_reminders: '🔔 Еске салу',
    reminders_enabled: '🔔 Еске салғыштар қосулы',
    reminders_disabled: 'Еске салу өшірілді. Мүлде үнсізбін 🤐',
    reminder_sample_variants: [
      '👋 Сәлем! Әмияның үнсіз болса да, оның бақытты екенін білдірмейді. Шығындарыңды жазып қой 😉',
'🤔 Бүгін бірдеңеге ақша жұмсадың ба? Есің нанға кетіп қалмай тұрып жазып қой 🧠🥖',
'💭 Егер жазбадың — босқа кеткендей есепте. Кеттік, тіркеп қояйық 💸',
'🌊 Тамшы-тамшымен бюджет байқалмай ақып кетеді. Бүгінгі шығындарыңды жазған жақсы 🌊',
'🤖 Бот ұрыспайды, тек ескертеді: шығындарды жазатын уақыт 😌',
'💡 Тиынды сақтасаң — теңгең қалады. Ескертпе жазатын уақыт!',

'💰 Ақша есеп пен тыныштықты жақсы көреді. Шығындарыңды жаз.',
'💡 Бекерге жұмсама — маңызды нәрсеге жина. Жазба жасау уақыты.',
'🏗️ Кішкентай жинақ — үлкен нәтижелер. Қазір сатып алуды қос.',
'🌱 Бүгін үнемде — ертең жеңіл демаласың. Шығындарыңды жаз.',
'🔄 Қорғалған теңге екеуін ертіп келеді. Бір минутта шығынды тірке.',
'⏰ Алдымен жина, сосын жұмса. Ескертпе жазатын уақыт!',
'🧱 Әр тиын — еркіндіктің бір кірпіші. Бір шығынды жаз.',
'🛡️ «Қара күнге» алдын ала жина. Қазір жазбаны қос.',
'📈 Ақылды шығын — ең жақсы инвестиция. Сатып алуды тірке.',
'🎯 Шығынды бақылау = уайымның азаюы. Шығындарыңды жаз.',
'🚀 Аз импульс — көп мүмкіндік. Жазба жасау уақыты.',
'💎 Алдымен өзіңе төле. Ботқа шығын қос.',
'✂️ Артық шығынды қысқарту — табыс табу. Сатып алуды тірке.',
'🎪 Бюджет — таңдау еркіндігі. Бүгінгі шығындарды жаз.',
'🌟 Жинақ — болашағыңа «ия» деу. Ескертпе жазатын уақыт!',
'⚡ Тәртіп — хаосты жеңеді. Шығынды тірке.',
'⏳ Ақша тым-тырыс кетеді — уақытында жаз. Қазір бір шығын қос.',
'🧘 Қарапайымдылық — тыныштыққа апарар жол. Сатып алуды тірке.',
'📋 Ақша тәртіпті жақсы көреді. Жазба жасау уақыты.'
    ],
    reminder_message_title: 'Еске салғыш',
    reminder_turn_on_off: (enabled) => enabled ? 'Еске салғыштарды өшіру' : 'Еске салғыштарды қосу',
    button_configure_reminder_hours: '⏰ Еске салғыш сағаттарын баптау',
    reminder_hours_info: 'Еске салғыштар үшін 3-ке дейінгі сағатты таңдаңыз (сіздің жергілікті уақыт белдеуіңіз). Ағымдағы:',
    reminder_hours_limit: 'Сіз максимум 3 сағатты таңдай аласыз',
    reminder_hours_saved: '✅ Еске салғыш сағаттары сақталды',
    button_save: 'Сақтау',
    button_clear: 'Тазалау',
    
    // Төлемге қолдау және саясаттар
    paysupport_message: '*Төлем бойынша қолдау*\n\nКомпания: {businessName}\nҚолдау: @{supportUsername} / {supportEmail}\n\nШарттар: {termsUrl}\nҚұпиялылық: {privacyUrl}\nҚайтарым саясаты: {refundPolicyUrl}\n\nStars төлемдері/қайтарымдары бойынша сұрақтар болса, алдымен қолдауға жазыңыз. Telegram Stars ережелерін сақтаймыз.',
    terms_message: '📄 Қызмет көрсету шарттары: {termsUrl}',
    privacy_message: '🔐 Құпиялылық саясаты: {privacyUrl}',
    refund_message: '↩️ Қайтарым саясаты: {refundPolicyUrl}\n\nСұрақтар: @{supportUsername} / {supportEmail}',
    
    // Қате туралы хабарламалар
    button_bug_report: '🐛 Қате туралы хабарлау / Ұсыныс білдіру',
    bug_report_prompt: '🐛 *Қате туралы хабарлау немесе ұсыныс білдіру*\n\nМәселені немесе ұсынысты сипаттаңыз (1000 таңбаға дейін):',
    bug_report_success: '✅ Рахмет! Хабарламаңыз әзірлеушілерге жіберілді.',
    bug_report_too_long: '❌ Хабарлама тым ұзын! {excess} таңбаға қысқартыңыз (ең көбі 1000).',
    bug_report_empty: '❌ Хабарлама бос. Мәселені немесе ұсынысты жазыңыз.',
    bug_report_rate_limit: '⚠️ Қате туралы хабарламалар тым жиі!\n\n10 минут сайын тек 3 хабарлама жіберуге болады',
    bug_report_suspicious: '⚠️ Хабарламада рұқсат етілмеген таңбалар немесе күдікті мазмұн бар',
    
    // Қауіпсіздік хабарламалары
    security_rate_limit: '⚠️ *Тым көп сұрау*\n\n{resetTime} секундтан кейін қайталап көріңіз\nЛимит: минутына {limit} сұрау',
    security_validation_error: '⚠️ *Тексеру қатесі*\n\n{message}',
    security_error: '❌ *Қауіпсіздік қатесі*\n\nКейінірек көріңіз немесе әкімшіге хабарласыңыз.',
    
    // Әкімші панелі
    button_admin: '👑 Әкімші панелі',
    admin_access_denied: '❌ Сізде әкімші құқықтары жоқ.',
    admin_panel_title: '👑 *Әкімші панелі*\n\nӘрекетті таңдаңыз:',
    admin_error: '❌ Әкімшілік әрекетін орындау кезінде қате.',
    
    // Әкімші статистикасы
    admin_stats_text: `📊 *Бот статистикасы*
  
  👥 **Пайдаланушылар:**
  • Барлығы: {totalUsers}
  • Premium: {activePremium}
  • Апта ішінде жаңалары: {newUsersWeek}
  • Ай ішінде жаңалары: {newUsersMonth}
  
  💰 **Шығындар:**
  • Барлық жазбалар: {totalExpenses}
  • Апта ішінде: {expensesWeek}
  • Белсенді пайдаланушылар: {activeUsers}
  
  🐛 **Қате хабарламалары:** {totalBugReports}
  
  💎 **Донаттар:**
  • Барлығы: {totalDonations}
  • Жиналған жұлдыздар: {totalStars}
  
  ⭐ **Premium транзакциялар:** {premiumTransactions}`,
  
    // Әкімші пайдаланушылар тізімі
    admin_users_title: '👥 *Пайдаланушылар* (бет {page}/{totalPages})\n\nБарлығы: {totalUsers}\n',
    
    // Қате хабарламалары тізімі
    admin_bug_reports_title: '🐛 *Қате хабарламалары*',
    bug_report_status_new: '🆕 Жаңалары',
    bug_report_status_in_progress: '🔄 Орындауда',
    bug_report_status_resolved: '✅ Шешілген',
    bug_report_status_closed: '🔒 Жабылған',
    
    // Донаттар статистикасы
    admin_donations_text: `💰 *Донат статистикасы*
  
  📊 **Жалпы:**
  • Донаттар саны: {totalDonations}
  • Аяқталған: {completedDonations}
  • Күтуде: {pendingDonations}
  
  ⭐ **Жұлдыздар:**
  • Барлығы жиналған: {totalStars}
  • Орташа донат: {avgStars} жұлдыз`,
  
    // Premium статистикасы
    admin_premium_stats: `⭐ *Premium статистикасы*
  
  📊 **Пайдаланушылар:**
  • Барлығы premium: {totalPremiumUsers}
  • Қазір белсенді: {activePremiumUsers}
  
  💳 **Транзакциялар:**
  • Барлығы: {totalTransactions}
  • Жалпы табыс: {totalRevenue} жұлдыз`,
  
    // Әкімшілер тізімі
    admin_admins_title: '👑 *Әкімшілер* ({count})\n',
    // Әкімші іздеу
    admin_search_prompt: '🔍 *Пайдаланушыны іздеу*\n\nПайдаланушы ID немесе username енгізіңіз:',
    admin_search_not_found: '❌ Пайдаланушы табылмады.',
    admin_search_results: '🔍 *Іздеу нәтижелері* "{query}"\n\nТабылғаны: {count}\n',
    
    // Әкімші пайдаланушы деректері
    admin_user_not_found: '❌ Пайдаланушы табылмады.',
    admin_user_details: `👤 *Пайдаланушы туралы ақпарат*
  
  {adminFlag}{premiumFlag} **{firstName}** (@{username})
  🆔 ID: {userId}
  🌐 Тіл: {language}
  💱 Валюта: {currency}
  🕐 Уақыт белдеуі: {timezone}
  📅 Тіркелген күні: {createdAt}
  
  📊 **Статистика:**
  • Шығын жазбалары: {totalExpenses}
  • Жалпы сома: {totalAmount}
  • Қате хабарламалары: {bugReportsCount}
  • Транзакциялар: {transactionsCount}`,
  
    // Әкімші әрекеттері
    admin_promote_success: '✅ {userId} әкімші болып тағайындалды.',
    admin_demote_success: '✅ {userId} әкімшілік құқықтарынан айырылды.',
    admin_cannot_demote_self: '❌ Өзіңізді әкімші тізімінен өшіре алмайсыз.',
    admin_grant_premium_options: '⭐ *{userId} пайдаланушысына premium беру*\n\nМерзімін таңдаңыз:',
    admin_grant_premium_success: '✅ {userId} premium {days} күнге берілді.',
    admin_revoke_premium_success: '✅ {userId} premium мәртебесінен айырылды.',
  
    // Әкімші хабар тарату
    admin_broadcast_prompt: '📢 *Жаппай хабарлама*\n\nБарлық пайдаланушыларға арналған мәтінді енгізіңіз (ең көбі 3600 таңба):',
    admin_broadcast_too_long: '❌ Хабарлама тым ұзын!\n\n📏 Ағымдағы ұзындығы: {current} таңба\n📏 Ең көбі: {max}\n📏 Қысқарту керек: {excess} таңба',
    admin_broadcast_confirm: '📢 *Жаппай хабарлама жіберуді растаңыз*\n\n📝 **Хабарлама мәтіні:**\n{message}\n\n📏 **Ұзындығы:** {length} таңба\n\n⚠️ Бұл хабарлама боттың **БАРЛЫҚ** пайдаланушыларына жіберіледі!',
    admin_broadcast_started: '📢 Хабарлама жіберу басталды...',
    admin_broadcast_result: '📢 *Жіберу аяқталды!*\n\n📊 **Статистика:**\n• Барлығы: {total}\n• Жеткізілді: {sent}\n• Қате: {failed}',
    admin_broadcast_header: '🔴🔴🔴 *Хабарландыру!* 🔴🔴🔴',
    
    // Жалпы хабарламалар
    welcome: 'Сәлем, {name}! 👋',
    main_menu_title: '🏠 *Басты мәзір*\n\nӘрекетті таңдаңыз:',
    error: 'Қате орын алды 😞',
    unknown_error: 'Күтпеген қате орын алды. Кейінірек қайталап көріңіз.',
    not_found: 'Табылған жоқ',
    error_invalid_description_format: '❌ Қате формат. Мысалы: сома сипаттама немесе сома санат сипаттама',
    expense_save_error: '❌ Шығынды сақтау кезінде қате. Қайталап көріңіз.',
    cancel: 'Бас тарту',
    back: 'Артқа',
    confirm: 'Растау',
    save: 'Сақтау',
    
    // Бастапқы хабарлама
    start_message: `Сәлем! 👋 Мен шығындар мен табыстарыңды есепке алуға көмектесемін.

*Шығын* — сома мен сипаттаманы жаз: \`250 кофе\`, \`1500 түскі ас\`.
Басқа валюта да болады: \`20 USD такси\`, немесе тек сома: \`300\`.
*Табыс* — плюспен: \`+50000 жалақы\`.

Санатты бір рет таңда — келесі жолы есте сақтаймын.
Мәзір төменде: ай шолуы, бүгінгі жазбалар, табыс, тұрақты шығындар (жалдау, жазылымдар) және «☰ Тағы».`,

    start_returning: '👋 Қайта келуіңмен! Шығынды хабарламамен жібер — `250 кофе`. Мәзір төмендегі пернетақтада.',
  help_message: `❓ *Қалай қолдану керек*

• \`250 кофе\` — шығын. Санатты бір рет таңда, есте сақтаймын
• \`20 USD такси\` — басқа валютадағы шығын, \`300\` — сипаттамасыз
• \`+50000 жалақы\` — табыс (\`+1000 USD\` — басқа валютада)
• Жаңа жазба астында: ↩️ болдырмау, 🏷 санатты өзгерту
• 📊 *Ай шолуы* — шығындар, табыс, баланс, санаттар; ◀️ — алдыңғы кезеңдер
• 📅 *Бүгін* — күннің жазбалары; жазбаны өзгерту не жою үшін нөмірді бас
• 🔁 *Тұрақты шығындар* — жалдау мен жазылымдар ай сайын автоматты түрде жазылады
• 🎯 *Бюджеттер* және 📄 кезең *Қорытындысы* — ай шолуының астындағы батырмалар (Premium)
• Валюталар, еске салғыштар (күніне 3-ке дейін) және кезең басы — ☰ Тағы → ⚙️ Баптаулар

Командалар: /stats /history /income /recurring /export /settings /menu`,
  
    // Шығындар
    expense_added: '✅ Жазылды: {amount} - {description}',
    expense_updated: '✅ Жазба жаңартылды: {amount} - {description}',
    expense_deleted: '✅ Жазба жойылды: {amount} - {description}',
    no_expenses: 'Жою үшін жазбалар жоқ 🤷‍♂️',
    expense_not_found: 'Қате: жазба табылмады.',
    expense_update_error: 'Қате: жазба табылмады немесе жаңартылмады.',
    
    // Статистика
    monthly_stats: '💰 *Ағымдағы айдың шығындары*',
    daily_stats: '💰 *Бүгінгі шығындар*',
    total_spent: 'Жалпы шығын: *{amount}*',
    records_count: 'Жазбалар саны: {count}',
    no_expenses_period: 'Бұл кезеңде шығындар жоқ.',
    by_categories: 'Санаттар бойынша:',
    no_expenses_category: 'Бұл санатта соңғы айда шығындар жоқ.',
    
    // Санаттар
    select_category: 'Санатты таңдаңыз:',
    amount_label: 'Сома',
    description_label: 'Сипаттама',
    category_label: 'Санат',
    expense_added_title: 'Шығын қосылды!',
    no_categories: 'Санаттар табылмады.',
    category_expenses: '"{category}" санаты бойынша шығындар',
    no_category_expenses: 'Соңғы айда бұл санат бойынша шығындар жоқ.',
    
    // Баптаулар
    settings_title: 'Баптаулар:',
    currency_select: 'Әдепкі валютаны таңдаңыз:',
    currency_set: 'Валюта орнатылды: {currency}',
    currency_updated: 'Валюта {currency} болып өзгертілді',
    button_change_period_start: '📅 Периодтың басталу күні',
    period_start_prompt: 'Ай басталатын күнді енгізіңіз (1-31). Қысқа айларда соңғы күн алынады.',
    period_start_invalid: '❌ Қате сан. 1-ден 31-ге дейінгі бүтін сан енгізіңіз.',
    period_start_set: '✅ Периодтың басталу күні орнатылды: {day}',
    timezone_setup: `🕐 *Уақыт белдеуін баптау*
  
  Қазір сағат қанша?
  
  *Ағымдағы UTC уақыты:* {utcTime}
  
  Өз уақытыңызды таңдаңыз:`,
    timezone_set: '✅ Уақыт белдеуі орнатылды: {timezone}',
    // Отбасылық бюджет
    button_family: '👨‍👩‍👧‍👦 Отбасы',
    // Family labels
    family_label: '🏠 *Отбасы:*',
    family_owner_label: '👑 *Иесі:*',
    family_info: '👨‍👩‍👧‍👦 *Отбасылық бюджет*\n\nМұнда сіз отбасы, әріптестер, достар және т.б.мен бірге шығындарды бірігіп басқара аласыз.\n\n- \uD83D\uDC6A Бірлескен шығындарды есепке алу үшін ортақ топ құрылады.\n- \u2795 Әрбір қатысушы шығын қос алады.\n- \uD83D\uDDD1\uFE0F Қажет болса, өз шығындарыңызды өшіре аласыз.\n- \uD83D\uDCCA Барлық қатысушыларға ортақ статистика қолжетімді.\n- \uD83D\uDCE4 Топтың барлық деректерін бір файлға экспорттауға болады.\n\nБірлескен бақылау — аздау күйбең, көбірек ашықтық.',
    family_created: '✅ "{name}" отбасы құрылды! Енді қатысушыларды шақыра аласыз.',
    family_joined: '✅ Сіз "{name}" отбасына қосылдыңыз!',
    family_left: '✅ Сіз "{name}" отбасынан шықтыңыз.',
    family_deleted: '✅ "{name}" отбасы жойылды. Барлық отбасылық шығындар жеке шығындарға ауыстырылды.',
    family_member_removed: '✅ Қатысушы отбасынан шығарылды.',
    family_member_removed_notification: '❌ Сіз *{familyName}* отбасынан шығарылдыңыз.',
    family_cannot_leave_owner: '❌ Отбасы иесі шыға алмайды. "Отбасыны жою" функциясын пайдаланыңыз.',
    
    // Отбасылық мәзір батырмалары
    create_family: '🏠 Отбасы құру',
    join_family: '🔗 Отбасына кіру',
    invite_member: '➕ Қатысушы шақыру',
    leave_family: '🚪 Отбасынан шығу',
    delete_family: '🗑️ Отбасын жою',
    family_members: '👥 Отбасы мүшелері',
    family_stats: '💰 Айлық шығындар',
    family_daily_stats: '💰 Күндік шығындар',
    family_add_expense: '💰 Отбасылық шығын қосу',
    family_menu: '👨‍👩‍👧‍👦 Отбасы мәзірі',
    family_cancel: '❌ Бас тарту',
    
    // Шақырулар
    invitation_sent: '✅ @{username} пайдаланушысына шақыру жіберілді',
    invitation_accepted: '✅ Сіз "{name}" отбасына қосылу шақыруын қабылдадыңыз!',
    invitation_rejected: '❌ Сіз "{name}" отбасына қосылу шақыруын қабылдамадыңыз.',
    invitation_not_found: '❌ Шақыру табылмады немесе мерзімі өткен.',
    invitation_expired: '❌ Шақыру мерзімі өтті.',
    invitation_already_processed: '❌ Шақыру бұрын өңделген.',
    
    // Кірістер
    enter_family_name: 'Отбасының атауын енгізіңіз (3-50 таңба):',
    enter_invite_username: 'Пайдаланушының атын енгізіңіз (без @):',
    enter_expense_amount: 'Отбасылық шығын сомасын және сипаттамасын енгізіңіз:',
    
    // Қателер
    family_name_too_short: '❌ Отбасы атауы кемінде 3 таңбадан тұруы керек.',
    family_name_too_long: '❌ Отбасы атауы 50 таңбадан аспауы керек.',
    user_not_found: '❌ Пайдаланушы табылмады.',
    user_already_in_family: '❌ Пайдаланушы қазірдің өзінде бір отбасында.',
    user_already_has_invitation: '❌ Пайдаланушыда белсенді шақыру бар.',
    user_already_in_other_family: '❌ Пайдаланушы басқа отбасында.',
    user_already_in_your_family: '❌ Пайдаланушы сіздің отбасыңыздың мүшесі.',
    user_not_premium: '❌ Пайдаланушыда premium мәртебесі жоқ.',
    only_owner_can_invite: '❌ Қатысушыларды тек отбасы иесі шақыра алады.',
    active_invitations: '📋 Белсенді шақырулар',
    no_active_invitations: '📋 Сізде белсенді шақырулар жоқ.',
    active_invitations_list: '📋 Белсенді шақырулар тізімі:',
    cancel_invitation: '❌ Шақыруды болдырмау',
    invitation_cancelled: '✅ Шақыру болдырылды.',
    not_authorized: '❌ Сізде бұл әрекетті орындауға құқық жоқ.',
    invitation_code: '🔑 Шақыру коды: `{code}`',
    family_invitation_received: '🎉 Сізді *{familyName}* отбасына шақырып жатыр\n\n👤 Шақырған: {inviterName}\n🔑 Код: `{inviteCode}`\n\nӘрекет таңдаңыз:',
    accept_invitation: '✅ Қабылдау',
    reject_invitation: '❌ Қабылдамау',
    invitation_accepted: '🎉 Құттықтаймыз! Сіз *{familyName}* отбасына қосылдыңыз',
    invitation_rejected: '❌ Сіз шақыруды қабылдамадыңыз',
    invitation_not_pending: '❌ Шақыру күту режимінде емес',
    invitation_cancelled_notification: '❌ *{familyName}* отбасына шақыру {cancelledBy} тарапынан болдырылған',
    enter_invite_code: '🔑 Шақыру кодын енгізіңіз:',
    only_owner_can_remove: '❌ Қатысушыларды тек отбасы иесі ғана өшіре алады.',
    only_owner_can_delete: '❌ Отбасын жоюды тек иесі жасай алады.',
    cannot_remove_owner: '❌ Отбасы иесін өшіруге болмайды.',
    cannot_remove_yourself: '❌ Өзіңізді өшіру мүмкін емес.',
    family_not_found: '❌ Отбасы табылмады.',
    not_family_member: '❌ Сіз бұл отбасының мүшесі емессіз.',
    not_family_owner: '❌ Сіз отбасы иесі емессіз.',
    
    // Растау хабарламалары
    confirm_delete_family: '⚠️ *Отбасын жою*\n\nБарлық қатысушылар өшіріледі, ал отбасы шығындары жеке шығындарға айналады.\n\nСіз сенімдісіз бе?',
    confirm_remove_member: '⚠️ *Қатысушыны жою*\n\nҚатысушы отбасынан жойылады.\n\nСенімдісіз бе?',
    // Отбасылық статистика
    family_monthly_stats: '👨‍👩‍👧‍👦 *Айлық отбасылық шығындар*',
    family_daily_stats: '💰 Күндік шығындар',
    family_daily_stats_title: '👨‍👩‍👧‍👦 *Күндік отбасылық шығындар*',
    family_export: '📊 Отбасылық деректерді экспорттау',
    family_total_spent: 'Жалпы шығын: *{amount}*',
    family_members_count: 'Мүшелер саны: {count}',
    family_no_expenses: 'Бұл кезеңде отбасылық шығындар жоқ.',
    
    // Мүшелер тізімі
    family_members_title: '👥 *Отбасы мүшелері*',
    family_member_info: '• {name} ({role}) - қосылған күні {date}',
    family_owner_role: 'иесі',
    family_member_role: 'мүше',
    remove_member: '❌ Өшіру',
    confirm_remove_member: '⚠️ *Қатысушыны жою*\n\nСіз {name} отбасынан өшіргіңіз келе ме?',
    member_removed: '✅ {name} отбасынан өшірілді.',
    member_removed_notification: '❌ Сіз *{familyName}* отбасынан {ownerName} арқылы өшірілдіңіз.',
    
    // Premium функциялары
    premium_required: '❌ Бұл мүмкіндік тек premium пайдаланушыларға қолжетімді.',
    upgrade_to_premium: '💎 Отбасылық бюджетті пайдалану үшін premium алыңыз!',
    
    timezone_updated: `✅ *Уақыт белдеуі жаңартылды!*
  
  🕐 Таңдалған уақыт: *{time}*
  🌍 Уақыт белдеуі: *{timezone}*
  
  Енді барлық шығындарыңыз жергілікті уақытыңызбен көрсетіледі.`,
    timezone_updated_simple: `✅ *Уақыт белдеуі жаңартылды!*
  
  🌍 Жаңа уақыт белдеуі: *{timezone}*
  
  Барлық шығындарыңыз енді дұрыс уақытта көрсетіледі.`,
    
    // Лимиттер
    limits_title: '📊 *Лимиттер туралы ақпарат*',
    status_regular: '👤 Қалыпты',
    status_premium: '💎 Premium',
    status_label: '*Мәртебе:* {status}',
    max_description_length: '<b>Сипаттаманың ең көбі:</b> {length} таңба',
    premium_benefits: `💎 <b>Premium артықшылықтары:</b>
  • 🎯 80%-да және асқанда ескертетін айлық және санат бюджеттері
  • 📄 Кезеңнің толық қорытындысы: әр санат өткен аймен салыстырмалы, бюджеттер, күндік орташа шығын
  • 5-ке дейін жеке санаттар
  • Отбасылық бюджет
  • Кез келген жазбаның сомасы мен сипаттамасын өзгерту
  • Сипаттамаға 160 таңба (80-нің орнына)

Шығындар мен кірістерді жазу тегін және шексіз.`,
    
    // Premium жазылымы
    premium_subscription_title: '⭐️ Жазылым',
    premium_status_header: '<b>Сіздің мәртебеңіз:</b>',
    premium_privileges: 'Артықшылықтар: {status}',
    premium_limits_info: 'Мұнда сіздің лимиттеріңіз: санаттар саны, жазбалар саны, отбасылық мүмкіндіктерге қолжетімділік, premium мерзімі.',
    premium_menu_title: '<b>Мәзір:</b>',
    premium_tariff_button: '⭐️ Тариф',
    premium_why_paid_button: '👀 Неге ақылы?',
    premium_donate_button: '🤝 Донат жасау',
    premium_back_button: '⬅️ Артқа',
    premium_tariffs_title: '⭐️ Тарифтер (Telegram Stars)',
    per_month: 'айына',
    premium_payment_info: '💳 Төлем Telegram-ның ішкі валютасы Telegram Stars арқылы жүргізіледі. 🔁 Айлық жоспар автоматты түрде жаңартылады; оны Telegram-да тоқтатуға болады: Баптау → Жұлдыз → Жазылымдарым. 3, 6 және 12 айлық жоспарлар бір реттік төлем.',
    premium_renewal_info: '📅 Кез келген уақытта ұзартуға болады. Уақыты қосылады.',
    premium_stars_info: '💡 Жұлдыздарды комиссиясыз [@PremiumBot] арқылы сатып алуға болады.',
    premium_why_paid_title: '👀 Неге ақылы?',
    premium_purchases_button: '🧾 Сатып алу тарихы',
    purchases_header: '🧾 Сатып алу тарихы',
    purchases_premium_title: 'Premium',
    purchases_donations_title: 'Донаттар',
    no_purchases: 'Әзірге сатып алулар жоқ',
    purchases_prev_button: '◀ Алдыңғы',
    purchases_next_button: 'Келесі ▶',
    purchases_page_indicator: 'Бет {page}/{total}',
    premium_why_paid_text: 'Бұл бот серверін ұстау айына шамамен $200 тұрады. Пайдаланушылар саны өсуде, ал мен де әзірлеуші ретінде тамақ ішуім керек :)',
    premium_payment_title: '💳 *Premium жазылымды төлеу*',
    premium_payment_description: 'Сіздікі: <b>{duration}</b>\nБағасы: <b>{stars} ⭐️</b>\n\nТөлеу үшін төмендегі батырманы басыңыз.',
    // Тариф белгілері және өнім атауы
    tariff_button_30: '1 ай',
    tariff_button_90: '3 ай',
    tariff_button_180: '6 ай',
    tariff_button_365: '1 жыл',
    tariff_item_30: '1 ай (30 күн)',
    tariff_item_90: '3 ай (90 күн)',
    tariff_item_180: '6 ай (180 күн)',
    tariff_item_365: '12 ай (365 күн)',
    premium_product: 'Premium жазылым',
    discount_save: '{percent}% үнем',
  
    payment_success: '🎉 *Төлем сәтті өтті!* Premium қосылды. Кеңейтілген функцияларды пайдаланыңыз.',
    donation_success: '🙏 *Қолдауыңыз үшін рахмет!* Бұл ботты дамытуға көмектесесіз.',
    general_payment_success: '✅ *Төлем сәтті өтті!* Ботымызды пайдаланғаныңызға рахмет.',
    premium_expires: '📅 Premium мерзімі бітетін күн: <b>{date}</b>\n⏰ Қалған күн: <b>{days}</b>',
  
    // Донаттар
    donate_prompt_title: '🤝 Жобаны қолдау',
    donate_prompt_text: 'Донат жұлдыздар санын енгізіңіз (1-ден 2500-ге дейін).\nХабарлама қосуды қаласаңыз — жаңа жолға жазыңыз (ең көбі 500 таңба).',
    donate_invalid: '❌ 1-ден 2500-ге дейін бүтін сан енгізіңіз. Хабарлама — 500 таңбаға дейін.',
    donate_created: '✅ Донат сұранысы жасалды: {stars} ⭐️. Төлем сілтемесін жіберемін.',
    donate_paid: '🙏 Қолдауыңызға рахмет! Донат алынды: {stars} ⭐️',
    
    // Тексеру қателері
    error_too_long_regular: '❌ Сипаттама тым ұзын! Қалыпты пайдаланушыларға 80 таңба.',
    error_too_long_premium: '❌ Сипаттама тым ұзын! Premium үшін 160 таңба.',
    error_no_description: '❌ Сомадан кейін сипаттама енгізу керек.',
    error_amount: '❌ Қате сома. 0.01-ден 999999-ға дейін енгізіңіз.',
    error_format: '❌ Түсінбедім. Сомадан бастаңыз: `250 кофе`, `20 USD такси` немесе жай `300`.',
    error_forbidden_content: '❌ Рұқсат етілмеген мазмұн.',
    error_premium_required: '💎 Бұл мүмкіндік тек Premium арқылы қолжетімді.\n\nPremium береді:\n• Ескертулері бар бюджеттер\n• Кезеңнің толық қорытындысы\n• Жеке санаттар\n• Отбасылық бюджет\n• Жазбаларды өзгерту',
    error_generic: '❌ Қате. Кейінірек қайталап көріңіз немесе әкімшіге жазыңыз.',
    
    // Батырмалар
    button_menu: '📋 Мәзір',
    button_expenses_month: '💰 Айлық шығындар',
    button_expenses_day: '💰 Күндік шығындар',
    button_expenses_categories: '💰 Санаттар бойынша шығындар',
    button_family: '👨‍👩‍👧‍👦 Отбасы',
    button_settings: '⚙️ Баптаулар',
    button_delete_last: '🗑️ Соңғы жазбаны жою',
    button_limits: '📊 Лимиттер',
    button_help: '❓ Көмек',
    button_edit: 'Өзгерту',
    button_delete: 'Жою',
    button_mark_as_family: '👨‍👩‍👧‍👦 Отбасыға',
    button_remove_from_family: '🚫 Отбасылық бюджеттен',
    expense_already_family: '❌ Бұл шығын қазірдің өзінде отбасылық',
    expense_converted_to_family: '✅ Шығын отбасылық бюджетке көшірілді',
    expense_removed_from_family: '✅ Шығын отбасылық бюджеттен алынды',
    not_owner: '❌ Сіз бұл шығынның авторы емессіз',
    button_cancel: '❌ Бас тарту',
    button_back: '⬅️ Артқа',
    button_change_currency: '💱 Валютаны өзгерту',
    button_change_timezone: '🌍 Уақыт белдеуі',
    button_change_language: '🌐 Тіл',
    button_custom_categories: '🏷️ Жеке санаттар',
    
    // Тілдер
    language_select: '🌍 Тілді таңдаңыз:',
    language_set: '✅ Тіл қазақ тіліне өзгертілді',
    language_not_supported: '❌ Бұл тіл қолдау таппайды',
    language_change_error: '❌ Тілді өзгерту кезінде қате',
    timezone_error: '❌ Уақыт белдеуін орнату қатесі',
    
    // Экспорт
    export_success: '📊 Деректер сәтті экспортталды!',
    export_error: 'Деректерді экспорттау сәтсіз 😞',
    keyboard_updated: '✅ Пернетақта тілі жаңартылды!',
    
    // Өңдеу
    edit_canceled: 'Өңдеу тоқтатылды.',
    edit_no_active: 'Белсенді өңдеу жоқ.',
    edit_instructions: 'Жаңа соманы және/немесе сипаттаманы енгізіңіз (мысалы: 500 кофе) немесе төмендегі батырманы басып болдырмаңыз.',
    edit_empty: 'Жаңа сома, сипаттама немесе екеуін де енгізіңіз.',
    edit_amount_error: 'Сома қате енгізілген.',
    edit_too_long: 'Сипаттама тым ұзын (ең көбі {max} таңба).',
    edit_format_error: 'Формат қатесі.',
    
    // Callback жауаптары
    callback_button_not_found: '❌ Қате: батырма табылмады',
    callback_data_not_found: '❌ Қате: деректер табылмады',
    callback_expense_added: '✅ "{category}" санатына қосылды',
    callback_expense_saved: '❌ Сақтау кезінде қате',
    callback_canceled: '❌ Болдырылды',
    callback_expense_canceled: '❌ Шығын қосу болдырылды',
    callback_deleted: 'Жазба жойылды!',
    callback_delete_error: 'Жою қатесі немесе жазба табылмады',
    callback_edit_mode: 'Өңдеу режимінен шығу:',
    callback_no_cards: 'Жазбалар табылмады... қате кетті',
    
    // Әдепкі санаттар
    category_food: 'Тамақ',
    category_transport: 'Көлік',
    category_entertainment: 'Ойын-сауық',
    category_shopping: 'Сауда',
    category_health: 'Денсаулық',
    category_other: 'Басқа',
    
    // CSV экспорт
    date_label: 'Күні',
    currency_label: 'Валюта',
    total_by_currencies: 'Валюталар бойынша жалпы:',
    total_in_currency: '{currency} бойынша жалпы',
    
    // Жеке санаттар (premium)
    custom_categories_title: '🏷️ Жеке санаттар',
    custom_categories_info: 'Мұнда сіз өзіңіздің жеке шығын санаттарыңызды жасай аласыз (тек premium).',
    custom_categories_example: '💡 Мысал: "🌍 Саяхат" немесе "🎮 Ойындар"',
    custom_categories_add: '➕ Санат қосу',
    custom_categories_manage: '🗂️ Санаттарды басқару',
    custom_categories_enter_name: 'Жаңа санат атауын енгізіңіз (1-30 таңба):',
    custom_categories_created: '✅ Санат жасалды: {name}',
    custom_categories_exists: '❌ Мұндай санат қазірдің өзінде бар.',
    custom_categories_limit_reached: '❌ Жеке санаттар лимиті: {max}',
    custom_categories_list_empty: 'Сізде жеке санаттар жоқ.',
    custom_categories_list_title: 'Сіздің жеке санаттарыңыз:',
    custom_categories_delete: '🗑️ Жою',
    custom_categories_deleted: '✅ Санат жойылды.',
    custom_categories_premium_required: '💎 Бұл мүмкіндік тек premium пайдаланушыларға.',

    button_income: '💵 Кіріс',
    button_add_income: '➕ Кіріс қосу',
    button_income_currency: '💱 Кіріс валютасы',
    income_menu_title: '💵 *Ағымдағы кезеңдегі кіріс*',
    income_menu_empty: 'Бұл кезеңде әзірге кіріс жоқ.',
    income_currency_label: 'Әдепкі кіріс валютасы: *{currency}*',
    income_hint: '💡 Жылдам тәсіл: плюстан басталатын хабарлама жіберіңіз — `+50000 жалақы` немесе `+1000 USD фриланс`',
    income_enter_prompt: 'Кіріс сомасы мен сипаттамасын енгізіңіз 👇\n\nМысал: `50000 жалақы`\nӘдепкі валюта — *{currency}*. Басқасын сомадан кейін кодпен көрсетуге болады: `1000 USD фриланс`',
    income_added: '✅ Кіріс жазылды: *{amount}* — {description}',
    income_default_description: 'Кіріс',
    income_deleted: '✅ Кіріс жойылды',
    income_not_found: '❌ Кіріс табылмады',
    income_currency_select: 'Әдетте табыс алатын валютаны таңдаңыз. Шығындар негізгі валютада қалады:',
    income_currency_set: '✅ Кіріс валютасы: {currency}',
    income_total: '💵 Кіріс: *{amount}*',
    balance_label: '⚖️ Баланс (кіріс − шығын): *{amount}*',
    income_error_format: '❌ Түсінбедім. Соманы және қаласаңыз сипаттаманы жіберіңіз: `50000 жалақы` немесе `1000 USD фриланс`',
    income_error_amount: '❌ Сома қате. 0.01-ден {max}-ге дейінгі санды енгізіңіз.',
    button_recurring: '🔁 Тұрақты шығындар',
    button_add_recurring: '➕ Тұрақты шығын қосу',
    recurring_menu_title: '🔁 *Тұрақты шығындар*',
    recurring_menu_info: 'Ай сайынғы төлемдер (жалға алу, жазылымдар, несиелер) айдың таңдалған күні автоматты түрде шығын ретінде жазылады.',
    recurring_menu_empty: 'Әзірге тұрақты шығындар жоқ.',
    recurring_item: '{icon} {description} — *{amount}*, әр айдың {day}-күні\n    Келесі жазба: {next}',
    recurring_monthly_total: 'Айына барлығы: *{amount}*',
    recurring_enter_prompt: 'Тұрақты шығынның сомасы мен сипаттамасын енгізіңіз 👇\n\nМысал: `50000 жалдау`\nСомадан кейін валютаны көрсетуге болады: `500 USD жалдау`',
    recurring_day_prompt: 'Бұл шығынды әр айдың қай күні жазайын? 1-ден 31-ге дейінгі санды енгізіңіз.\n\nЕгер ай қысқа болса, айдың соңғы күні жазамын.',
    recurring_day_invalid: '❌ 1-ден 31-ге дейінгі бүтін санды енгізіңіз.',
    recurring_select_category: 'Тұрақты шығын үшін санатты таңдаңыз:',
    recurring_added: '✅ Тұрақты шығын қосылды\n\n{description} — *{amount}*, әр айдың {day}-күні\nАлғашқы жазба: {next}',
    recurring_added_charged_now: '✅ Тұрақты шығын қосылды және осы айға жазылып қойды\n\n{description} — *{amount}*, әр айдың {day}-күні\nКелесі жазба: {next}',
    recurring_deleted: '✅ Тұрақты шығын жойылды. Бұрын жазылған шығындар тарихта қалады.',
    recurring_not_found: '❌ Тұрақты шығын табылмады',
    recurring_limit: '❌ Ең көбі {max} тұрақты шығын болуы мүмкін',
    recurring_charged_notification: '🔁 Тұрақты шығын жазылды: {icon} {description} — *{amount}*',
    recurring_error_format: '❌ Формат танылмады. Сома мен сипаттаманы жіберіңіз: `50000 жалдау` немесе `500 USD жалдау`',
    recurring_error_amount: '❌ Сома қате. 0.01-ден {max}-ге дейінгі санды енгізіңіз.',

  // Main menu and «More»
  button_overview: '📊 Ай шолуы',
  button_today: '📅 Бүгін',
  button_more: '☰ Тағы',
  more_menu_title: '☰ *Тағы*',
  button_export: '📤 CSV экспорты',
  keyboard_refreshed: '✅ Мәзір жаңартылды — енді ықшамырақ 👇',
  button_outdated: 'Бұл батырма ескірді. Бөлімді төмендегі мәзірден қайта ашыңыз.',
  overview_title: 'Шолу: {range}',
  overview_spent: '💸 Шығындар: *{amount}* · жазбалар: {count}',
  overview_upcoming: 'Алдағы тұрақты шығындар:',
  overview_income_hint: '💡 Табысты плюспен жазыңыз: `+50000 жалақы`',
  button_prev_period: '◀️ Ертерек',
  button_next_period: 'Кейінірек ▶️',
  button_back_to_overview: '⬅️ Шолуға',
  day_title_today: 'Бүгін, {date}',
  day_title_yesterday: 'Кеше, {date}',
  day_title: '{date}',
  day_entry_hint: 'Шығынды хабарламамен жіберіңіз: `250 кофе`',
  button_prev_day: '◀️ Алдыңғы күн',
  button_next_day: 'Келесі күн ▶️',
  list_tap_number: 'Жазбаны ашу үшін нөмірді басыңыз.',
  family_today_title: 'Отбасы: бүгінгі жазбалар',
  button_undo: '↩️ Болдырмау',
  button_delete_record: '🗑 Жою',
  button_change_category: '🏷 Санат',
  button_edit_record: '✏️ Өзгерту',
  expense_family_label: 'отбасы бюджетінде',
  expense_recurring_label: 'автоматты түрде жазылды (тұрақты шығын)',
  expense_category_remembered: '🏷 Санат дәл осындай сипаттамасы бар алдыңғы жазбаңыздан алынды — төмендегі батырмамен өзгертіңіз.',
  category_will_be_remembered: '💡 Таңдауыңызды есте сақтаймын: келесі жолы мұндай жазба бірден осы санатқа түседі.',
  expense_category_changed: 'Санат: {category}',
  settings_header: 'Баптаулар',
  settings_currency_line: '💱 Валюта: *{currency}* · табыс: *{incomeCurrency}*',
  settings_timezone_line: '🌍 Уақыт белдеуі: {timezone}',
  settings_language_line: '🌐 Тіл: {language}',
  settings_period_line: '📅 Кезең {day}-күні басталады',
  settings_reminders_on_line: '🔔 Еске салғыштар: қосулы ({hours})',
  settings_reminders_off_line: '🔔 Еске салғыштар: өшірулі',
  button_currencies: '💱 Валюталар',
  settings_currencies_text: '💱 *Валюталар*\n\nНегізгі — шығындар мен барлық қорытындылар осымен есептеледі: *{currency}*\nӘдепкі табыс валютасы: *{incomeCurrency}*\n\nКез келген жазба басқа валютада болуы мүмкін — кодты сомадан кейін жазыңыз: `20 USD такси`.',
  reminders_title: 'Еске салғыштар',
  reminders_info: 'Таңдалған сағатқа дейін ештеңе жазбасаңыз, еске саламын. Күніне ең көбі 3 рет.',
  button_reminders_on: '🟢 Қосулы — өшіру үшін бас',
  button_reminders_off: '⚫ Өшірулі — қосу үшін бас',
  family_teaser: '👨‍👩‍👧‍👦 *Отбасы бюджеті*\n\nЖақындарыңызбен ортақ шығындар бір жерде: әркім өзінікін жазады, статистика мен экспорт ортақ.\n\nПремиуммен қолжетімді.',
  button_try_premium: '⭐️ Премиумды байқау',

  // Subscription and premium ending
  subscription_active_info: '🔁 Айлық жазылым {date} дейін төленген және автоматты түрде жаңартылады. Тоқтату үшін: Telegram → Баптау → Жұлдыз → Жазылымдарым.',
  subscription_renewed: '🔁 Жазылым жаңартылды. Premium {date} дейін белсенді.',
  button_view_tariffs: '⭐️ Жоспарлар',
  premium_expiring_trial: '⏳ Premium сынақ кезеңі {date} аяқталады.\n\nОдан кейін бюджеттер, кезеңнің толық қорытындысы, жеке санаттар, отбасылық бюджет және жазбаларды өзгерту жұмыс істемейді. Барлық жазбаларыңыз сақталады, шығындарды есепке алу тегін.',
  premium_expiring_paid: '⏳ Premium {date} аяқталады. Алдын ала ұзартуға болады — қалған күндер сақталады.',
  premium_expired_trial: '🌙 Premium сынақ кезеңі аяқталды. Шығындар мен кірістерді есепке алу тегін болып қалады; бюджеттер, толық қорытынды, жеке санаттар, отбасы және жазбаларды өзгерту — Premium арқылы.',
  premium_expired_paid: '🌙 Premium аяқталды. Жобаны қолдағаныңыз үшін рақмет! Кез келген уақытта ұзарта аласыз.',
  premium_winback: '👋 Premium бір апта бұрын аяқталды. Бюджеттерді, толық қорытындыны, жеке санаттарды, отбасылық бюджетті және жазбаларды өзгертуді қайтарғыңыз келсе — төмендегі жоспарларды қараңыз.',
  start_reminders_note: '🔔 Күн ішінде ештеңе жазбасаңыз, еске саламын (күніне 3 реттен көп емес). Сағаттарды өзгерту немесе өшіру: ☰ Тағы → ⚙️ Баптаулар → 🔔.',

  // Budgets
  button_budgets: '🎯 Бюджеттер',
  budgets_title: 'Бюджеттер',
  budgets_empty: 'Бүкіл айға немесе санатқа лимит қойыңыз — 80%-да және лимит асқанда ескертемін.',
  budgets_teaser: '🎯 *Бюджеттер*\n\nАйға немесе санатқа лимит: прогресс шолуда көрсетіледі, 80%-да және лимит асқанда ескерту аласыз.\n\nPremium арқылы қолжетімді.',
  button_budget_total: '➕ Бүкіл ай',
  button_budget_category: '➕ Санат',
  button_budget_change: '✏️ Соманы өзгерту',
  budget_total_name: '🎯 Бүкіл ай',
  budget_left: '{amount} қалды',
  budget_over: '{amount} асты',
  budget_enter_prompt: '«{name}» үшін кезең лимитін енгізіңіз 👇\n\nМысалы: `10000` (*{currency}*) немесе `150 USD`',
  budget_amount_invalid: '❌ Тек сома керек: `10000` немесе `150 USD`.',
  budget_saved: '✅ Бюджет сақталды',
  budget_deleted: '✅ Бюджет жойылды',
  budget_not_found: '❌ Бюджет табылмады',
  budget_warning_80: '⚠️ {name}: {limit} ішінен {spent} жұмсалды ({percent}%)',
  budget_warning_100: '🚨 {name}: бюджет асып кетті — {limit} ішінен {spent} ({percent}%)',
  overview_budget_of: '{amount} бюджеттен',
  button_report: '📄 Қорытынды',
  report_title: 'Қорытынды: {range}',
  report_vs_previous: 'Алдыңғы кезеңмен салыстырғанда: {change} (болған: {amount})',
  report_change_new: 'жаңа',
  report_change_same: 'өзгеріссіз',
  report_top_categories: 'Ең көп шығын:',
  report_locked: '🔒 Толық талдау — алдыңғы кезеңмен салыстырылған барлық санаттар, бюджеттер, күндік орташа шығын және ең үлкен шығын — Premium арқылы.',
  report_categories_vs_previous: 'Санаттар (алдыңғы кезеңмен салыстырғанда):',
  report_categories_gone: 'Бұл жолы шығын болмады: {list}',
  report_more_numbers: 'Басқа сандар:',
  report_per_day: '📅 Күніне орташа: {amount}',
  report_largest: '🔝 Ең үлкен шығын: {amount} — {description} ({date})'
};
