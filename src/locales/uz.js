module.exports = {
    button_reminders: '🔔 Eslatmalar',
    reminders_enabled: '🔔 Eslatmalar yoqilgan',
    reminders_disabled: 'Eslatmalar o‘chirilgan. To‘liq jimlik 🤐',
    reminder_sample_variants: [
      '👋 Hey! Hamyoning jim bo‘lsa ham, bu uning baxtli ekanini anglatmaydi. Xarajatlaringni yozib qo‘y 😉',
'🤔 Bugun nimagadir pul sarfladingmi? Xotira non olishga chiqib ketmasidan oldin yozib qo‘y 🧠🥖',
'💭 Agar yozmagan bo‘lsang — bo‘shliqqa sarflangandek hisobla. Keling, buni qayd etamiz 💸',
'🌊 Tomchi‑tomchi qilib byudjet sezilmay oqib ketadi. Bugungi xarajatlarni yozib qo‘ygan afzal 🌊',
'🤖 Bot koyimaydi, shunchaki eslatadi: xarajatlarni yozib borish vaqti 😌',
'💡 Tiyinni asrasang — so‘ming saqlanadi. Eslatma yozish vaqti!',

'💰 Pul hisob va sukunatni yaxshi ko‘radi. Xarajatlaringni yoz.',
'💡 Bekorga sarflama — muhim narsalar uchun tejab qo‘y. Qayd qilish vaqti.',
'🏗️ Kichik tejab‑tergilar — katta natijalar. Hozir xarid qo‘sh.',
'🌱 Bugun tejab qo‘y — ertaga yengil nafas olasan. Xarajatlaringni yoz.',
'🔄 Asralgan so‘m ikkitasini olib keladi. Bir daqiqada xarajatni qayd et.',
'⏰ Avval tejab qo‘y — keyin sarfla. Eslatma yozish vaqti!',
'🧱 Har bir tiyin — erkinlik g‘ishtidan biridir. Bir xarajatni yoz.',
'🛡️ “Qora kun” uchun oldindan tejab qo‘y. Hozir qayd qo‘sh.',
'📈 Aql bilan sarflash — eng yaxshi sarmoya. Xaridni qayd et.',
'🎯 Xarajatlarni nazorat qilish = kamroq tashvish. Xarajatlaringni yoz.',
'🚀 Kamroq impuls — ko‘proq imkoniyat. Qayd qilish vaqti.',
'💎 Avval o‘zingga to‘la. Botga bir xarajat qo‘sh.',
'✂️ Ortiqcha xarajatni qisqartirish — topilgan daromad. Xaridni qayd et.',
'🎪 Byudjet — tanlash erkinligi. Bugungi xarajatlarni yoz.',
'🌟 Jamg‘arma — kelajagingga “ha” deyishdir. Eslatma yozish vaqti!',
'⚡ Intizom — tartibsizlikni yengadi. Xarajatni qayd et.',
'⏳ Pul sekin‑asta chiqib ketadi — o‘z vaqtida yoz. Hozir bir xarajat qo‘sh.',
'🧘 Tejamkorlik — xotirjamlikka eltuvchi yo‘l. Xaridni qayd et.',
'📋 Pul tartibni yaxshi ko‘radi. Qayd qilish vaqti.'
    ],
    reminder_message_title: 'Eslatma',
    reminder_turn_on_off: (enabled) => enabled ? 'Eslatmalarni o\'chirish' : 'Eslatmalarni yoqish',
    button_configure_reminder_hours: '⏰ Eslatma vaqtlarini sozlash',
    reminder_hours_info: 'Eslatmalar uchun 3 tagacha soat tanlang (sizning mahalliy vaqt mintaqangiz). Joriy:',
    reminder_hours_limit: 'Siz maksimal 3 soat tanlashingiz mumkin',
    reminder_hours_saved: '✅ Eslatma vaqtlari saqlandi',
    button_save: 'Saqlash',
    button_clear: 'Tozalash',
    
    // To'lov yordami va siyosatlar
    paysupport_message: '*To\'lov yordami*\n\nKompaniya: {businessName}\nYordam: @{supportUsername} / {supportEmail}\n\nShartlar: {termsUrl}\nMaxfiylik: {privacyUrl}\nQaytarish siyosati: {refundPolicyUrl}\n\nStars to\'lovlari va qaytarishlar uchun avval yordamga murojaat qiling. Telegram Stars qoidalariga rioya qilamiz.',
    terms_message: '📄 Foydalanish shartlari: {termsUrl}',
    privacy_message: '🔐 Maxfiylik siyosati: {privacyUrl}',
    refund_message: '↩️ Qaytarish siyosati: {refundPolicyUrl}\n\nSavollar: @{supportUsername} / {supportEmail}',
    
    // Xatolik haqida xabar
    button_bug_report: '🐛 Xato haqida xabar / Taklif',
    bug_report_prompt: '🐛 *Xato haqida xabar bering yoki taklif yozing*\n\nMuammo yoki taklifni tasvirlab bering (maks. 1000 belgi):',
    bug_report_success: '✅ Rahmat! Xabaringiz dasturchilarga yuborildi.',
    bug_report_too_long: '❌ Xabar juda uzun! Iltimos, {excess} belgiga qisqartiring (maks. 1000).',
    bug_report_empty: '❌ Xabar bo‘sh. Muammo yoki taklifni yozing.',
    bug_report_rate_limit: '⚠️ Juda ko‘p xabarlar!\n\n10 daqiqada faqat 3 ta xabar yuborish mumkin',
    bug_report_suspicious: '⚠️ Xabarda ruxsat etilmagan belgilar yoki shubhali mazmun bor',
    
    // Xavfsizlik xabarlari
    security_rate_limit: '⚠️ *Juda ko‘p so‘rov*\n\n{resetTime} soniyadan keyin yana urinib ko‘ring\nLimit: daqiqasiga {limit} ta so‘rov',
    security_validation_error: '⚠️ *Tekshiruv xatosi*\n\n{message}',
    security_error: '❌ *Xavfsizlik xatosi*\n\nKeyinroq urinib ko‘ring yoki administrator bilan bog‘laning.',
    
    // Admin paneli
    button_admin: '👑 Admin paneli',
    admin_access_denied: '❌ Sizda administrator huquqlari yo‘q.',
    admin_panel_title: '👑 *Admin paneli*\n\nAmalni tanlang:',
    admin_error: '❌ Admin amali bajarishda xatolik yuz berdi.',
    
    // Admin statistika
    admin_stats_text: `📊 *Bot statistikasi*
  
  👥 **Foydalanuvchilar:**
  • Jami: {totalUsers}
  • Premium: {activePremium}
  • Shu haftada yangilar: {newUsersWeek}
  • Shu oyda yangilar: {newUsersMonth}
  
  💰 **Xarajatlar:**
  • Jami yozuvlar: {totalExpenses}
  • Shu hafta: {expensesWeek}
  • Faol foydalanuvchilar: {activeUsers}
  
  🐛 **Xato xabarlari:** {totalBugReports}
  
  💎 **Xayriyalar:**
  • Jami: {totalDonations}
  • Yig‘ilgan yulduzlar: {totalStars}
  
  ⭐ **Premium tranzaksiyalar:** {premiumTransactions}`,
  
    // Foydalanuvchilar ro‘yxati
    admin_users_title: '👥 *Foydalanuvchilar* (Sahifa {page}/{totalPages})\n\nJami: {totalUsers}\n',
    
    // Xato xabarlari ro‘yxati
    admin_bug_reports_title: '🐛 *Xato xabarlari*',
    bug_report_status_new: '🆕 Yangi',
    bug_report_status_in_progress: '🔄 Jarayonda',
    bug_report_status_resolved: '✅ Hal qilindi',
    bug_report_status_closed: '🔒 Yopildi',
    
    // Xayriya statistikasi
    admin_donations_text: `💰 *Xayriya statistikasi*
  
  📊 **Xulosa:**
  • Jami xayriya: {totalDonations}
  • Yakunlangan: {completedDonations}
  • Kutilmoqda: {pendingDonations}
  
  ⭐ **Yulduzlar:**
  • Jami yig‘ildi: {totalStars}
  • O‘rtacha xayriya: {avgStars} yulduz`,
  
    // Premium statistikasi
    admin_premium_stats: `⭐ *Premium statistikasi*
  
  📊 **Foydalanuvchilar:**
  • Jami premium: {totalPremiumUsers}
  • Hozir faol: {activePremiumUsers}
  
  💳 **Tranzaksiyalar:**
  • Jami: {totalTransactions}
  • Umumiy daromad: {totalRevenue} yulduz`,
  
    // Adminlar ro‘yxati
    admin_admins_title: '👑 *Administratorlar* ({count})\n',
    // Foydalanuvchi qidirish (admin)
    admin_search_prompt: '🔍 *Foydalanuvchini qidirish*\n\nFoydalanuvchi ID raqamini yoki usernameni kiriting:',
    admin_search_not_found: '❌ Foydalanuvchi topilmadi.',
    admin_search_results: '🔍 *Qidiruv natijalari* "{query}"\n\nTopildi: {count}\n',
    
    // Foydalanuvchi tafsilotlari (admin)
    admin_user_not_found: '❌ Foydalanuvchi topilmadi.',
    admin_user_details: `👤 *Foydalanuvchi ma’lumotlari*
  
  {adminFlag}{premiumFlag} **{firstName}** (@{username})
  🆔 ID: {userId}
  🌐 Til: {language}
  💱 Valyuta: {currency}
  🕐 Vaqt zonasi: {timezone}
  📅 Ro‘yxatdan o‘tgan sana: {createdAt}
  
  📊 **Statistika:**
  • Xarajat yozuvlari: {totalExpenses}
  • Jami summa: {totalAmount}
  • Xato xabarlari: {bugReportsCount}
  • Tranzaksiyalar: {transactionsCount}`,
  
    // Admin amallari
    admin_promote_success: '✅ {userId} admin qilib tayinlandi.',
    admin_demote_success: '✅ {userId} admin huquqlari olib tashlandi.',
    admin_cannot_demote_self: '❌ O‘z admin huquqlaringizni olib tashlay olmaysiz.',
    admin_grant_premium_options: '⭐ *{userId} foydalanuvchisiga premium berish*\n\nMuddatni tanlang:',
    admin_grant_premium_success: '✅ {userId} foydalanuvchisiga {days} kun premium berildi.',
    admin_revoke_premium_success: '✅ {userId} foydalanuvchisidan premium olib tashlandi.',
  
    // Xabarlarni ommaviy yuborish
    admin_broadcast_prompt: '📢 *Ommaviy xabar*\n\nBarcha foydalanuvchilarga yuborish uchun xabar matnini kiriting (maks. 3600 belgi):',
    admin_broadcast_too_long: '❌ Xabar juda uzun!\n\n📏 Joriy uzunlik: {current}\n📏 Maks.: {max}\n📏 Qisqartirish kerak: {excess} belgi',
    admin_broadcast_confirm: '📢 *Ommaviy xabarni tasdiqlash*\n\n📝 **Xabar:**\n{message}\n\n📏 **Uzunlik:** {length} belgi\n\n⚠️ Ushbu xabar botning **barcha** foydalanuvchilariga yuboriladi!',
    admin_broadcast_started: '📢 Xabar jo‘natish boshlandi...',
    admin_broadcast_result: '📢 *Xabar jo‘natildi!*\n\n📊 **Statistika:**\n• Umumiy: {total}\n• Yuborildi: {sent}\n• Xatolik: {failed}',
    admin_broadcast_header: '🔴🔴🔴 *E’lon!* 🔴🔴🔴',
    
    // Umumiy xabarlar
    welcome: 'Salom, {name}! 👋',
    main_menu_title: '🏠 *Asosiy menyu*\n\nAmalni tanlang:',
    error: 'Xatolik yuz berdi 😞',
    unknown_error: 'Kutilmagan xatolik. Keyinroq yana urinib ko‘ring.',
    not_found: 'Topilmadi',
    error_invalid_description_format: '❌ Noto‘g‘ri format. Quyidagicha yozing: summa izoh yoki summa kategoriya izoh',
    expense_save_error: '❌ Xarajat yozishda xatolik yuz berdi. Qayta urinib ko‘ring.',
    cancel: 'Bekor qilish',
    back: 'Ortga',
    confirm: 'Tasdiqlash',
    save: 'Saqlash',
    
    // Boshlang‘ich xabar
    start_message: `Salom! 👋 Men xarajat va daromadlaringizni hisobga olishda yordam beraman.

*Xarajat* — summa va izohni yozing: \`250 qahva\`, \`1500 tushlik\`.
Boshqa valyuta ham bo‘ladi: \`20 USD taksi\`, yoki faqat summa: \`300\`.
*Daromad* — plyus bilan: \`+50000 maosh\`.

Kategoriyani bir marta tanlang — keyingi safar eslab qolaman.
Menyu pastda: oy sharhi, bugungi yozuvlar, daromad, doimiy xarajatlar (ijara, obunalar) va «☰ Yana».`,

    start_returning: '👋 Xush kelibsiz! Xarajatni xabar sifatida yuboring — `250 qahva`. Menyu pastdagi klaviaturada.',
  help_message: `❓ *Qanday foydalaniladi*

• \`250 qahva\` — xarajat. Kategoriyani bir marta tanlang, eslab qolaman
• \`20 USD taksi\` — boshqa valyutadagi xarajat, \`300\` — izohsiz
• \`+50000 maosh\` — daromad (\`+1000 USD\` — boshqa valyutada)
• Yangi yozuv ostida: ↩️ bekor qilish, 🏷 kategoriyani o‘zgartirish
• 📊 *Oy sharhi* — xarajatlar, daromad, balans, kategoriyalar; ◀️ — oldingi davrlar
• 📅 *Bugun* — kun yozuvlari; yozuvni tahrirlash yoki o‘chirish uchun raqamni bosing
• 🔁 *Doimiy xarajatlar* — ijara va obunalar har oy avtomatik yoziladi
• 🎯 *Byudjetlar* va 📄 davr *Xulosasi* — oy sharhi ostidagi tugmalar (Premium)
• Valyutalar, eslatmalar (kuniga 3 tagacha) va davr boshi — ☰ Yana → ⚙️ Sozlamalar

Buyruqlar: /stats /history /income /recurring /export /settings /menu`,
  
    // Xarajatlar
    expense_added: '✅ Yozildi: {amount} - {description}',
    expense_updated: '✅ Yozuv yangilandi: {amount} - {description}',
    expense_deleted: '✅ Yozuv o‘chirildi: {amount} - {description}',
    no_expenses: 'O‘chirish uchun yozuv yo‘q 🤷‍♂️',
    expense_not_found: 'Xato: Yozuv topilmadi.',
    expense_update_error: 'Xato: Yozuv topilmadi yoki yangilanmadi.',
    
    // Statistika
    monthly_stats: '💰 *Bu oyda sarflanganlar*',
    daily_stats: '💰 *Bugun sarflanganlar*',
    total_spent: 'Jami sarf: *{amount}*',
    records_count: 'Yozuvlar soni: {count}',
    no_expenses_period: 'Bu davrda xarajatlar yo‘q.',
    by_categories: 'Kategoriyalar bo\'yicha:',
    no_expenses_category: 'Bu kategoriyada o\'tgan oyda xarajatlar yo\'q.',
    
    // Kategoriyalar
    select_category: 'Kategoriyani tanlang:',
    amount_label: 'Summa',
    description_label: 'Izoh',
    category_label: 'Kategoriya',
    expense_added_title: 'Xarajat qo‘shildi!',
    no_categories: 'Kategoriyalar topilmadi.',
    category_expenses: '"{category}" kategoriyasidagi xarajatlar',
    no_category_expenses: 'Oxirgi bir oyda bu kategoriyada xarajat yo‘q.',
    
    // Sozlamalar
    settings_title: 'Sozlamalar:',
    currency_select: 'Asosiy valyutani tanlang:',
    currency_set: 'Valyuta o‘rnatildi: {currency}',
    currency_updated: 'Valyuta {currency} ga o‘zgartirildi',
    button_change_period_start: '📅 Davr boshlanish sanasi',
    period_start_prompt: 'Yangi davr boshlanish kunini kiriting (1-31). Qisqa oylarda oxirgi kun olinadi.',
    period_start_invalid: '❌ Noto‘g‘ri raqam. 1 dan 31 gacha butun son kiriting.',
    period_start_set: '✅ Davr boshlanish kuni: {day} qilib o‘rnatildi',
    timezone_setup: `🕐 *Vaqt zonasini sozlash*
  
  Hozir sizning soatingiz nechchi?
  
  *Hozirgi UTC vaqt:* {utcTime}
  
  O‘z vaqtingizni tanlang:`,
    timezone_set: '✅ Vaqt zonasi o‘rnatildi: {timezone}',
    // Oilaviy byudjet
    button_family: '👨‍👩‍👧‍👦 Oila',
    // Family labels
    family_label: '🏠 *Oila:*',
    family_owner_label: '👑 *Egas:*',
    family_info: '👨‍👩‍👧‍👦 *Oila byudjeti*\n\nBu yerda siz oila a’zolari, hamkasblar, do‘stlar va h.k. bilan birga xarajatlarni birgalikda boshqarishingiz mumkin.\n\n- \uD83D\uDC6A Qo‘shma xarajatlarni hisobga olish uchun umumiy guruh yaratiladi.\n- \u2795 Har bir a’zo xarajat qo‘shishi mumkin.\n- \uD83D\uDDD1\uFE0F Zarur bo‘lsa, o‘z xarajatlaringizni o‘chirishingiz mumkin.\n- \uD83D\uDCCA Barcha a’zolar uchun umumiy statistika mavjud.\n- \uD83D\uDCE4 Butun guruh ma’lumotlarini yagona faylga eksport qilish mumkin.\n\nBirgalikda nazorat — kamroq tartibsizlik va ko‘proq oshkoralik demakdir.',
    family_created: '✅ "{name}" nomli oila yaratildi! Endi a’zolarni taklif qilishingiz mumkin.',
    family_joined: '✅ "{name}" oilasiga qo‘shildingiz!',
    family_left: '✅ "{name}" oilasidan chiqdingiz.',
    family_deleted: '✅ "{name}" oilasi o‘chirildi. Barcha oilaviy xarajatlar shaxsiy xarajatlarga o‘tkazildi.',
    family_member_removed: '✅ A’zo oiladan olib tashlandi.',
    family_member_removed_notification: '❌ Siz *{familyName}* oilasidan chiqarildingiz.',
    family_cannot_leave_owner: '❌ Oila egasi oiladan chiqa olmaydi. "Oilani o‘chirish" funksiyasini ishlating.',
    
    // Oila menyu tugmalari
    create_family: '🏠 Oila yaratish',
    join_family: '🔗 Oilaga qo‘shilish',
    invite_member: '➕ A’zo taklif qilish',
    leave_family: '🚪 Oiladan chiqish',
    delete_family: '🗑️ Oilani o‘chirish',
    family_members: '👥 Oila a’zolari',
    family_stats: '💰 Oylik xarajatlar',
    family_daily_stats: '💰 Kundalik xarajatlar',
    family_add_expense: '💰 Oilaviy xarajat qo‘shish',
    family_menu: '👨‍👩‍👧‍👦 Oila menyusi',
    family_cancel: '❌ Bekor qilish',
    
    // Takliflar
    invitation_sent: '✅ @{username} foydalanuvchisiga taklif yuborildi',
    invitation_accepted: '✅ "{name}" oilasiga qo‘shilish taklifini qabul qildingiz!',
    invitation_rejected: '❌ "{name}" oilasiga qo‘shilish taklifini rad qildingiz.',
    invitation_not_found: '❌ Taklif topilmadi yoki muddati o‘tgan.',
    invitation_expired: '❌ Taklif muddati tugagan.',
    invitation_already_processed: '❌ Taklif allaqachon ko‘rib chiqilgan.',
    
    // Kiritish so‘rovlari
    enter_family_name: 'Oila nomini kiriting (3–50 belgidan):',
    enter_invite_username: 'Foydalanuvchi nomini kiriting (@siz)',
    enter_expense_amount: 'Oilaviy xarajat summasi va izohini kiriting:',
    
    // Xatoliklar
    family_name_too_short: '❌ Oila nomi kamida 3 belgi bo‘lishi kerak.',
    family_name_too_long: '❌ Oila nomi 50 belgidan oshmasligi kerak.',
    user_not_found: '❌ Foydalanuvchi topilmadi.',
    user_already_in_family: '❌ Foydalanuvchi allaqachon bir oilada.',
    user_already_has_invitation: '❌ Foydalanuvchi faol taklifga ega.',
    user_already_in_other_family: '❌ Foydalanuvchi boshqa oilada.',
    user_already_in_your_family: '❌ Foydalanuvchi sizning oilangiz a’zosi.',
    user_not_premium: '❌ Foydalanuvchi premium emas.',
    only_owner_can_invite: '❌ Faqat oila egasi a’zo taklif qilishi mumkin.',
    active_invitations: '📋 Faol takliflar',
    no_active_invitations: '📋 Faol takliflaringiz yo‘q.',
    active_invitations_list: '📋 Faol takliflar ro‘yxati:',
    cancel_invitation: '❌ Taklifni bekor qilish',
    invitation_cancelled: '✅ Taklif bekor qilindi.',
    not_authorized: '❌ Ushbu amalni bajarishga ruxsatingiz yo‘q.',
    invitation_code: '🔑 Taklif kodi: `{code}`',
    family_invitation_received: '🎉 Siz *{familyName}* oilasiga taklif qilindingiz\n\n👤 Taklif qilgan: {inviterName}\n🔑 Kod: `{inviteCode}`\n\nAmalni tanlang:',
    accept_invitation: '✅ Qabul qilish',
    reject_invitation: '❌ Rad etish',
    invitation_accepted: '🎉 Tabriklaymiz! *{familyName}* oilasiga qo‘shildingiz',
    invitation_rejected: '❌ Taklifni rad etdingiz',
    invitation_not_pending: '❌ Bu taklif kutilayotgan holatda emas',
    invitation_cancelled_notification: '❌ *{familyName}* oilasiga qo‘shilish taklifi {cancelledBy} tomonidan bekor qilindi',
    enter_invite_code: '🔑 Taklif kodini kiriting:',
    only_owner_can_remove: '❌ A’zo chiqarish huquqi faqat oila egasida bor.',
    only_owner_can_delete: '❌ Oilani faqat egasi o‘chirishi mumkin.',
    cannot_remove_owner: '❌ Egani o‘chira olmaysiz.',
    cannot_remove_yourself: '❌ O‘zingizni o‘chira olmaysiz.',
    family_not_found: '❌ Oila topilmadi.',
    not_family_member: '❌ Siz bu oila a’zosi emassiz.',
    not_family_owner: '❌ Siz bu oila egasi emassiz.',
    
    // Tasdiqlash xabarlari
    confirm_delete_family: '⚠️ *Oilani o‘chirish*\n\nBarcha a’zolar o‘chiriladi, xarajatlar shaxsiy holatga o‘tkaziladi.\n\nDavom etasizmi?',
    confirm_remove_member: '⚠️ *A’zoni o‘chirish*\n\nA’zo oiladan chiqariladi.\n\nDavom etasizmi?',
    // Oilaviy statistika
    family_monthly_stats: '👨‍👩‍👧‍👦 *Bu oygi oilaviy xarajatlar*',
    family_daily_stats: '💰 Kundalik xarajatlar',
    family_daily_stats_title: '👨‍👩‍👧‍👦 *Bugungi oilaviy xarajatlar*',
    family_export: '📊 Oila ma’lumotlarini eksport qilish',
    family_total_spent: 'Jami: *{amount}*',
    family_members_count: 'A’zolar soni: {count}',
    family_no_expenses: 'Bu davr uchun oilaviy xarajatlar mavjud emas.',
    
    // A’zolar ro‘yxati
    family_members_title: '👥 *Oila a’zolari*',
    family_member_info: '• {name} ({role}) - {date} kuni qo‘shilgan',
    family_owner_role: 'Ega',
    family_member_role: 'A’zo',
    remove_member: '❌ O‘chirish',
    confirm_remove_member: '⚠️ *A’zoni o‘chirish*\n\n{name} oiladan chiqarilsinmi?',
    member_removed: '✅ {name} oiladan chiqarildi.',
    member_removed_notification: '❌ Siz *{familyName}* oilasidan {ownerName} tomonidan chiqarildingiz.',
    
    // Premium funksiyalar
    premium_required: '❌ Bu funksiya faqat Premium foydalanuvchilar uchun.',
    upgrade_to_premium: '💎 Oilaviy byudjetdan foydalanish uchun Premiumga o‘ting!',
    
    timezone_updated: `✅ *Vaqt zonasi yangilandi!*
  
  🕐 Tanlangan vaqt: *{time}*
  🌍 Vaqt zonasi: *{timezone}*
  
  Endi barcha xarajatlaringiz mahalliy vaqt bo‘yicha ko‘rsatiladi.`,
    timezone_updated_simple: `✅ *Vaqt zonasi yangilandi!*
  
  🌍 Yangi vaqt zonasi: *{timezone}*
  
  Endi barcha xarajatlaringiz to‘g‘ri vaqt bilan ko‘rsatiladi.`,
    
    // Limitlar
    limits_title: '📊 *Limitlar haqida ma’lumot*',
    status_regular: '👤 Oddiy',
    status_premium: '💎 Premium',
    status_label: '*Holat:* {status}',
    max_description_length: '<b>Izoh uzunligi limiti:</b> {length} belgi',
    premium_benefits: `💎 <b>Premium afzalliklari:</b>
  • 🎯 80% da va oshganda ogohlantiruvchi oylik va kategoriya byudjetlari
  • 📄 Davrning to‘liq xulosasi: har bir kategoriya o‘tgan oy bilan taqqoslab, byudjetlar, kunlik o‘rtacha xarajat
  • 5 tagacha maxsus kategoriya
  • Oilaviy byudjet
  • Har qanday yozuvning summasi va izohini tahrirlash
  • Izoh 160 belgi (oddiyda 80 belgi)

Xarajat va daromadlarni yozish bepul va cheklanmagan.`,
    
    // Premium obuna
    premium_subscription_title: '⭐️ Obuna',
    premium_status_header: '<b>Holatingiz:</b>',
    premium_privileges: 'Afzalliklar: {status}',
    premium_limits_info: 'Bu yerda kategoriya soni, yozuvlar, oila funksiyalari va Premium muddati ko‘rsatiladi.',
    premium_menu_title: '<b>Menyu:</b>',
    premium_tariff_button: '⭐️ Tariflar',
    premium_why_paid_button: '👀 Nega pullik?',
    premium_donate_button: '🤝 Xayriya',
    premium_back_button: '⬅️ Orqaga',
    premium_tariffs_title: '⭐️ Tariflar (Telegram Stars)',
    per_month: 'oyiga',
    premium_payment_info: '💳 To‘lov Telegram’ning ichki valyutasi Telegram Stars orqali amalga oshiriladi. 🔁 Oylik tarif avtomatik uzaytiriladi; uni Telegram’da bekor qilish mumkin: Sozlamalar → Yulduzlarim → Obunalarim. 3, 6 va 12 oylik tariflar bir martalik to‘lovdir.',
    premium_renewal_info: '📅 Istalgan vaqtda yangilash mumkin. Vaqt ustiga qo‘shiladi.',
    premium_stars_info: '💡 Yulduzlarni komissiyasiz [@PremiumBot] orqali sotib olish mumkin.',
    premium_why_paid_title: '👀 Nega pullik?',
    premium_purchases_button: '🧾 Sotib olish tarixi',
    purchases_header: '🧾 Sotib olish tarixi',
    purchases_premium_title: 'Premium',
    purchases_donations_title: 'Xayriyalar',
    no_purchases: 'Hozircha xaridlar yo‘q',
    purchases_prev_button: '◀ Oldingi',
    purchases_next_button: 'Keyingi ▶',
    purchases_page_indicator: 'Sahifa {page}/{total}',
    premium_why_paid_text: 'Ushbu botni saqlash xarajati oyiga ~$200. Foydalanuvchilar soni oshib bormoqda va men xizmatni yaxshilash uchun daromadga muhtojman :)',
    premium_payment_title: '💳 *Premium obuna to‘lovi*',
    premium_payment_description: 'Tanlangan: <b>{duration}</b>\nNarxi: <b>{stars} ⭐️</b>\n\nTo‘lash uchun pastdagi tugmani bosing.',
    // Tarif yorliqlari va mahsulot nomi
    tariff_button_30: '1 Oy',
    tariff_button_90: '3 Oy',
    tariff_button_180: '6 Oy',
    tariff_button_365: '1 Yil',
    tariff_item_30: '1 oy (30 kun)',
    tariff_item_90: '3 oy (90 kun)',
    tariff_item_180: '6 oy (180 kun)',
    tariff_item_365: '12 oy (365 kun)',
    premium_product: 'Premium obuna',
    discount_save: '{percent}% tejash',
  
    payment_success: '🎉 *To‘lov muvaffaqiyatli!* Premium faollashtirildi. Kengaytirilgan funksiyalardan foydalaning.',
    donation_success: '🙏 *Qo‘llab-quvvatlaganingiz uchun rahmat!* Xayriyangiz botni rivojlantirishga yordam beradi.',
    general_payment_success: '✅ *To‘lov muvaffaqiyatli!* Botdan foydalanganingiz uchun rahmat.',
    premium_expires: '📅 Premium tugash sanasi: <b>{date}</b>\n⏰ Qolgan kunlar: <b>{days}</b>',
  
    // Xayriya
    donate_prompt_title: '🤝 Loyihani qo‘llab-quvvatlash',
    donate_prompt_text: 'Xayriya yulduzlar sonini kiriting (1–2500).\nKeyingi qatorda (ixtiyoriy) xabaringizni yozishingiz mumkin (maks. 500 belgi).',
    donate_invalid: '❌ Iltimos, 1–2500 oralig‘ida butun son kiriting. Xabar 500 belgidan oshmasligi kerak.',
    donate_created: '✅ Xayriya so‘rovi yaratildi: {stars} ⭐️. To‘lov havolasini yuboraman.',
    donate_paid: '🙏 Qo‘llab-quvvatlaganingiz uchun rahmat! Qabul qilingan: {stars} ⭐️',
    
    // Tekshirish xatolari
    error_too_long_regular: '❌ Izoh juda uzun! Oddiy foydalanuvchilar uchun 80 belgi limit.',
    error_too_long_premium: '❌ Izoh juda uzun! Premium foydalanuvchilar uchun 160 belgi limit.',
    error_no_description: '❌ Summadan keyin izoh kiritilish kerak.',
    error_amount: '❌ Noto‘g‘ri summa. 0,01 va 999999 oralig‘ida bo‘lishi kerak.',
    error_format: '❌ Tushunmadim. Summadan boshlang: `250 qahva`, `20 USD taksi` yoki shunchaki `300`.',
    error_forbidden_content: '❌ Ruxsat etilmagan kontent.',
    error_premium_required: '💎 Bu funksiya faqat Premium bilan mavjud.\n\nPremium beradi:\n• Ogohlantirishli byudjetlar\n• Davrning to‘liq xulosasi\n• Maxsus kategoriyalar\n• Oilaviy byudjet\n• Yozuvlarni tahrirlash',
    error_generic: '❌ Xatolik yuz berdi. Keyinroq urinib ko‘ring yoki administratorga murojaat qiling.',
    
    // Tugmalar
    button_menu: '📋 Menyu',
    button_expenses_month: '💰 Oylik xarajatlar',
    button_expenses_day: '💰 Kunlik xarajatlar',
    button_expenses_categories: '💰 Kategoriyalar bo‘yicha',
    button_family: '👨‍👩‍👧‍👦 Oila',
    button_settings: '⚙️ Sozlamalar',
    button_delete_last: '🗑️ Oxirgi yozuvni o‘chirish',
    button_limits: '📊 Limitlar',
    button_help: '❓ Yordam',
    button_edit: 'Tahrirlash',
    button_delete: 'O‘chirish',
    button_mark_as_family: '👨‍👩‍👧‍👦 Oilaga qo‘shish',
    button_remove_from_family: '🚫 Oilaviy byudjetdan chiqarish',
    expense_already_family: '❌ Bu xarajat allaqachon oilaviy byudjetda',
    expense_converted_to_family: '✅ Xarajat oilaviy byudjetga qo‘shildi',
    expense_removed_from_family: '✅ Xarajat oilaviy byudjetdan chiqarildi',
    not_owner: '❌ Siz bu xarajat egasi emassiz',
    button_cancel: '❌ Bekor qilish',
    button_back: '⬅️ Orqaga',
    button_change_currency: '💱 Valyutani o‘zgartirish',
    button_change_timezone: '🌍 Vaqt zonasi',
    button_change_language: '🌐 Til',
    button_custom_categories: '🏷️ Maxsus kategoriyalar',
    
    // Tillar
    language_select: '🌍 Tilni tanlang:',
    language_set: '✅ Til o‘zbek tiliga o‘zgartirildi',
    language_not_supported: '❌ Bu til qo‘llab-quvvatlanmaydi',
    language_change_error: '❌ Tilni o‘zgartirishda xatolik yuz berdi',
    timezone_error: '❌ Vaqt zonasini o‘rnatishda xatolik yuz berdi',
    
    // Eksport
    export_success: '📊 Ma’lumotlar muvaffaqiyatli eksport qilindi!',
    export_error: 'Ma’lumotlarni eksport qilishda xato 😞',
    keyboard_updated: '✅ Klaviatura tilingizga mos yangilandi!',
    
    // Tahrirlash
    edit_canceled: 'Tahrirlash bekor qilindi.',
    edit_no_active: 'Faol tahrirlash yo‘q.',
    edit_instructions: 'Yangi summa va/yoki izoh kiriting (masalan: 500 qahva) yoki bekor qilish tugmasini bosing.',
    edit_empty: 'Iltimos, yangi summa, izoh yoki ikkisini birden kiriting.',
    edit_amount_error: 'Noto‘g‘ri summa.',
    edit_too_long: 'Izoh juda uzun (maks. {max} belgi).',
    edit_format_error: 'Format xatosi.',
    
    // Callback javoblari
    callback_button_not_found: '❌ Xato: Tugma topilmadi',
    callback_data_not_found: '❌ Xato: Ma’lumot topilmadi',
    callback_expense_added: '✅ "{category}" kategoriyasiga qo‘shildi',
    callback_expense_saved: '❌ Saqlashda xato',
    callback_canceled: '❌ Bekor qilindi',
    callback_expense_canceled: '❌ Xarajat qo‘shish bekor qilindi',
    callback_deleted: 'Yozuv o‘chirildi!',
    callback_delete_error: 'O‘chirish xatosi yoki yozuv topilmadi',
    callback_edit_mode: 'Tahrirlash rejimidan chiqildi:',
    callback_no_cards: 'Yozuv topilmadi... Xato yuz berdi',
    
    // Standart kategoriyalar
    category_food: 'Oziq-ovqat',
    category_transport: 'Transport',
    category_entertainment: 'Ko‘ngilochar',
    category_shopping: 'Xarid',
    category_health: 'Sog‘liq',
    category_other: 'Boshqa',
    
    // CSV eksport
    date_label: 'Sana',
    currency_label: 'Valyuta',
    total_by_currencies: 'Valyutalar bo\'yicha jami:',
    total_in_currency: '{currency} bo\'yicha jami',
    
    // Maxsus kategoriyalar (Premium)
    custom_categories_title: '🏷️ Maxsus kategoriyalar',
    custom_categories_info: 'Siz o‘zingizning xarajat kategoriyalaringizni yaratishingiz mumkin (faqat Premium).',
    custom_categories_add: '➕ Kategoriya qo‘shish',
    custom_categories_manage: '🗂️ Kategoriyalarni boshqarish',
    custom_categories_enter_name: 'Yangi kategoriya nomini kiriting (1–30 belgi):',
    custom_categories_created: '✅ Kategoriya yaratildi: {name}',
    custom_categories_exists: '❌ Bu kategoriya allaqachon mavjud.',
    custom_categories_limit_reached: '❌ Kategoriya cheklovi: {max}',
    custom_categories_list_empty: 'Sizda maxsus kategoriyalar mavjud emas.',
    custom_categories_list_title: 'Sizning maxsus kategoriyalaringiz:',
    custom_categories_delete: '🗑️ O‘chirish',
    custom_categories_deleted: '✅ Kategoriya o‘chirildi.',
    custom_categories_premium_required: '💎 Ushbu funksiya faqat Premium foydalanuvchilar uchun.',
    
    // Maxsus kategoriya misollari
    custom_categories_example: '💡 Misol: "🌍 Sayohat" yoki "🎮 O\'yinlar"',

    button_income: '💵 Daromad',
    button_add_income: '➕ Daromad qo‘shish',
    button_income_currency: '💱 Daromad valyutasi',
    income_menu_title: '💵 *Joriy davr daromadi*',
    income_menu_empty: 'Bu davr uchun hali daromad yo‘q.',
    income_currency_label: 'Standart daromad valyutasi: *{currency}*',
    income_hint: '💡 Tezkor usul: plyus bilan boshlanadigan xabar yuboring — `+50000 maosh` yoki `+1000 USD frilans`',
    income_enter_prompt: 'Daromad summasi va izohini kiriting 👇\n\nMisol: `50000 maosh`\nStandart valyuta — *{currency}*. Boshqasini summadan keyin kod bilan ko‘rsatish mumkin: `1000 USD frilans`',
    income_added: '✅ Daromad yozildi: *{amount}* — {description}',
    income_default_description: 'Daromad',
    income_deleted: '✅ Daromad o‘chirildi',
    income_not_found: '❌ Daromad topilmadi',
    income_currency_select: 'Odatda maosh oladigan valyutani tanlang. Xarajatlar asosiy valyutada qoladi:',
    income_currency_set: '✅ Daromad valyutasi: {currency}',
    income_total: '💵 Daromad: *{amount}*',
    balance_label: '⚖️ Balans (daromad − xarajat): *{amount}*',
    income_error_format: '❌ Tushunmadim. Summa va ixtiyoriy izoh yuboring: `50000 maosh` yoki `1000 USD frilans`',
    income_error_amount: '❌ Noto‘g‘ri summa. 0.01 dan {max} gacha son kiriting.',
    button_recurring: '🔁 Doimiy xarajatlar',
    button_add_recurring: '➕ Doimiy xarajat qo‘shish',
    recurring_menu_title: '🔁 *Doimiy xarajatlar*',
    recurring_menu_info: 'Oylik to‘lovlar (ijara, obunalar, kreditlar) oyning tanlangan kunida avtomatik ravishda xarajat sifatida yoziladi.',
    recurring_menu_empty: 'Hali doimiy xarajatlar yo‘q.',
    recurring_item: '{icon} {description} — *{amount}*, har oyning {day}-kuni\n    Keyingi yozuv: {next}',
    recurring_monthly_total: 'Oyiga jami: *{amount}*',
    recurring_enter_prompt: 'Doimiy xarajat summasi va izohini kiriting 👇\n\nMisol: `50000 ijara`\nSummadan keyin valyutani ko‘rsatish mumkin: `500 USD ijara`',
    recurring_day_prompt: 'Bu xarajatni har oyning qaysi kunida yozay? 1 dan 31 gacha son kiriting.\n\nAgar oy qisqaroq bo‘lsa, oyning oxirgi kunida yozaman.',
    recurring_day_invalid: '❌ 1 dan 31 gacha butun son kiriting.',
    recurring_select_category: 'Doimiy xarajat uchun kategoriyani tanlang:',
    recurring_added: '✅ Doimiy xarajat qo‘shildi\n\n{description} — *{amount}*, har oyning {day}-kuni\nBirinchi yozuv: {next}',
    recurring_added_charged_now: '✅ Doimiy xarajat qo‘shildi va bu oy uchun allaqachon yozildi\n\n{description} — *{amount}*, har oyning {day}-kuni\nKeyingi yozuv: {next}',
    recurring_deleted: '✅ Doimiy xarajat o‘chirildi. Avval yozilgan xarajatlar tarixda qoladi.',
    recurring_not_found: '❌ Doimiy xarajat topilmadi',
    recurring_limit: '❌ Ko‘pi bilan {max} ta doimiy xarajat bo‘lishi mumkin',
    recurring_charged_notification: '🔁 Doimiy xarajat yozildi: {icon} {description} — *{amount}*',
    recurring_error_format: '❌ Format tanilmadi. Summa va izoh yuboring: `50000 ijara` yoki `500 USD ijara`',
    recurring_error_amount: '❌ Noto‘g‘ri summa. 0.01 dan {max} gacha son kiriting.',

  // Main menu and «More»
  button_overview: '📊 Oy sharhi',
  button_today: '📅 Bugun',
  button_more: '☰ Yana',
  more_menu_title: '☰ *Yana*',
  button_export: '📤 CSV eksport',
  keyboard_refreshed: '✅ Menyu yangilandi — endi ixchamroq 👇',
  button_outdated: 'Bu tugma eskirgan. Bo‘limni pastdagi menyudan qayta oching.',
  overview_title: 'Sharh: {range}',
  overview_spent: '💸 Xarajatlar: *{amount}* · yozuvlar: {count}',
  overview_upcoming: 'Yaqinlashayotgan doimiy xarajatlar:',
  overview_income_hint: '💡 Daromadni plyus bilan yozing: `+50000 maosh`',
  button_prev_period: '◀️ Oldinroq',
  button_next_period: 'Keyinroq ▶️',
  button_back_to_overview: '⬅️ Sharhga',
  day_title_today: 'Bugun, {date}',
  day_title_yesterday: 'Kecha, {date}',
  day_title: '{date}',
  day_entry_hint: 'Xarajatni xabar sifatida yuboring: `250 qahva`',
  button_prev_day: '◀️ Oldingi kun',
  button_next_day: 'Keyingi kun ▶️',
  list_tap_number: 'Yozuvni ochish uchun raqamni bosing.',
  family_today_title: 'Oila: bugungi yozuvlar',
  button_undo: '↩️ Bekor qilish',
  button_delete_record: '🗑 O‘chirish',
  button_change_category: '🏷 Kategoriya',
  button_edit_record: '✏️ Tahrirlash',
  expense_family_label: 'oila byudjetida',
  expense_recurring_label: 'avtomatik yozildi (doimiy xarajat)',
  expense_category_remembered: '🏷 Kategoriya xuddi shu izohli oldingi yozuvingizdan olindi — pastdagi tugma bilan o‘zgartiring.',
  category_will_be_remembered: '💡 Tanlovingizni eslab qolaman: keyingi safar bunday yozuv darhol shu kategoriyaga tushadi.',
  expense_category_changed: 'Kategoriya: {category}',
  settings_header: 'Sozlamalar',
  settings_currency_line: '💱 Valyuta: *{currency}* · daromad: *{incomeCurrency}*',
  settings_timezone_line: '🌍 Vaqt mintaqasi: {timezone}',
  settings_language_line: '🌐 Til: {language}',
  settings_period_line: '📅 Davr oyning {day}-kunidan boshlanadi',
  settings_reminders_on_line: '🔔 Eslatmalar: yoqilgan ({hours})',
  settings_reminders_off_line: '🔔 Eslatmalar: o‘chirilgan',
  button_currencies: '💱 Valyutalar',
  settings_currencies_text: '💱 *Valyutalar*\n\nAsosiy — xarajatlar va barcha jamlar shu valyutada hisoblanadi: *{currency}*\nDaromadning standart valyutasi: *{incomeCurrency}*\n\nHar qanday yozuv boshqa valyutada bo‘lishi mumkin — kodni summadan keyin yozing: `20 USD taksi`.',
  reminders_title: 'Eslatmalar',
  reminders_info: 'Tanlangan soatgacha hech narsa yozmagan bo‘lsangiz, eslataman. Kuniga ko‘pi bilan 3 marta.',
  button_reminders_on: '🟢 Yoniq — o‘chirish uchun bosing',
  button_reminders_off: '⚫ O‘chiq — yoqish uchun bosing',
  family_teaser: '👨‍👩‍👧‍👦 *Oila byudjeti*\n\nYaqinlaringiz bilan umumiy xarajatlar bir joyda: har kim o‘zinikini yozadi, statistika va eksport umumiy.\n\nPremium bilan mavjud.',
  button_try_premium: '⭐️ Premiumni sinab ko‘ring',

  // Subscription and premium ending
  subscription_active_info: '🔁 Oylik obuna {date} gacha to‘langan va avtomatik uzaytiriladi. Bekor qilish: Telegram → Sozlamalar → Yulduzlarim → Obunalarim.',
  subscription_renewed: '🔁 Obuna uzaytirildi. Premium {date} gacha faol.',
  button_view_tariffs: '⭐️ Tariflar',
  premium_expiring_trial: '⏳ Premium sinov muddati {date} da tugaydi.\n\nShundan so‘ng byudjetlar, davrning to‘liq xulosasi, maxsus kategoriyalar, oilaviy byudjet va yozuvlarni tahrirlash ishlamaydi. Barcha yozuvlaringiz saqlanadi, xarajatlarni hisobga olish esa bepul.',
  premium_expiring_paid: '⏳ Premium {date} da tugaydi. Oldindan uzaytirishingiz mumkin — qolgan kunlar saqlanadi.',
  premium_expired_trial: '🌙 Premium sinov muddati tugadi. Xarajat va daromadlarni hisobga olish bepul qoladi; byudjetlar, to‘liq xulosa, maxsus kategoriyalar, oila va yozuvlarni tahrirlash — Premium bilan.',
  premium_expired_paid: '🌙 Premium tugadi. Loyihani qo‘llab-quvvatlaganingiz uchun rahmat! Istalgan vaqtda uzaytirishingiz mumkin.',
  premium_winback: '👋 Premium bir hafta oldin tugadi. Byudjetlar, to‘liq xulosa, maxsus kategoriyalar, oilaviy byudjet va yozuvlarni tahrirlashni qaytarmoqchi bo‘lsangiz — quyidagi tariflarni ko‘ring.',
  start_reminders_note: '🔔 Kun davomida hech narsa yozmasangiz, eslatib qo‘yaman (kuniga 3 martagacha). Soatlarni o‘zgartirish yoki o‘chirish: ☰ Yana → ⚙️ Sozlamalar → 🔔.',

  // Budgets
  button_budgets: '🎯 Byudjetlar',
  budgets_title: 'Byudjetlar',
  budgets_empty: 'Butun oy yoki kategoriya uchun limit qo‘ying — 80% da va limit oshganda ogohlantiraman.',
  budgets_teaser: '🎯 *Byudjetlar*\n\nOy yoki kategoriya uchun limit: jarayon sharhda ko‘rsatiladi, 80% da va limit oshganda ogohlantirish olasiz.\n\nPremium bilan mavjud.',
  button_budget_total: '➕ Butun oy',
  button_budget_category: '➕ Kategoriya',
  button_budget_change: '✏️ Summani o‘zgartirish',
  budget_total_name: '🎯 Butun oy',
  budget_left: '{amount} qoldi',
  budget_over: '{amount} oshdi',
  budget_enter_prompt: '“{name}” uchun davr limitini kiriting 👇\n\nMasalan: `10000` (*{currency}* da) yoki `150 USD`',
  budget_amount_invalid: '❌ Faqat summa kerak: `10000` yoki `150 USD`.',
  budget_saved: '✅ Byudjet saqlandi',
  budget_deleted: '✅ Byudjet o‘chirildi',
  budget_not_found: '❌ Byudjet topilmadi',
  budget_warning_80: '⚠️ {name}: {limit} dan {spent} sarflandi ({percent}%)',
  budget_warning_100: '🚨 {name}: byudjet oshib ketdi — {limit} dan {spent} ({percent}%)',
  overview_budget_of: '{amount} byudjetdan',
  button_report: '📄 Xulosa',
  report_title: 'Xulosa: {range}',
  report_vs_previous: 'Oldingi davrga nisbatan: {change} ({amount} edi)',
  report_change_new: 'yangi',
  report_change_same: 'o‘zgarishsiz',
  report_top_categories: 'Eng ko‘p xarajat:',
  report_locked: '🔒 To‘liq tahlil — oldingi davr bilan taqqoslangan barcha kategoriyalar, byudjetlar, kunlik o‘rtacha xarajat va eng katta xarajat — Premium bilan.',
  report_categories_vs_previous: 'Kategoriyalar (oldingi davrga nisbatan):',
  report_categories_gone: 'Bu safar xarajat yo‘q: {list}',
  report_more_numbers: 'Boshqa raqamlar:',
  report_per_day: '📅 Kuniga o‘rtacha: {amount}',
  report_largest: '🔝 Eng katta xarajat: {amount} — {description} ({date})'
};
