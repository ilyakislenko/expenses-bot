module.exports = {
    button_reminders: '🔔 मुझे याद दिलाओ',
    reminders_enabled: 'रिमाइंडर चालू हैं। यदि आप 18:00 बजे से पहले कुछ भी दर्ज नहीं करते — मैं आपको मज़ाकिया अंदाज़ में याद दिलाऊँगा 😉',
    reminders_disabled: 'रिमाइंडर बंद हैं। बिल्कुल चुप 🤐',
    reminder_sample_variants: [
      '👋 हेय! अगर तुम्हारा बटुआ चुप है, तो इसका मतलब यह नहीं कि वह खुश है। खर्चे दर्ज करो 😉',
'🤔 आज कुछ खर्च किया? याददाश्त रोटी लेने निकलने से पहले लिख लो 🧠🥖',
'💭 अगर दर्ज नहीं किया — मानो हवा में खर्च हो गया। चलो इसे दर्ज करते हैं 💸',
'🌊 बूंद-बूंद करके बजट चुपचाप बह जाता है। बेहतर है आज के खर्चे दर्ज कर लो 🌊',
'🤖 बॉट डाँटता नहीं, बस याद दिलाता है: खर्चे दर्ज करने का समय है 😌',
'💡 पैसे का एक-एक पैसा बचाओ — रुपया अपने आप बचेगा। नोट बनाने का समय!',

'💰 पैसा गिनती और सन्नाटा पसंद करता है। अपने खर्चे दर्ज करो।',

'💡 बेवजह मत खर्च करो — ज़रूरी चीज़ों के लिए बचाओ। एंट्री करने का समय है।',

'🏗️ छोटी बचत — बड़े काम। अभी एक खरीद जोड़ो।',

'🌱 आज बचाओ — कल सुकून से सांस लो। अपने खर्चे दर्ज करो।',

'🔄 बचाया हुआ रुपया दो लेकर आता है। एक मिनट में खर्च दर्ज करो।',

'⏰ पहले बचाओ — फिर खर्च करो। नोट बनाने का समय!',

'🧱 हर पैसा आज़ादी की एक ईंट है। एक खर्च दर्ज करो।',

'🛡️ बुरे दिनों के लिए पहले से बचत करो। अभी एक एंट्री जोड़ो।',

'📈 समझदारी से खर्च करना सबसे अच्छा निवेश है। खरीद दर्ज करो।',

'🎯 खर्च पर नियंत्रण = कम चिंताएँ। अपने खर्चे दर्ज करो।',

'🚀 कम आवेग — ज़्यादा मौके. एंट्री करने का समय है।',

'💎 सबसे पहले खुद को भुगतान करो। बॉट में एक खर्च जोड़ो।',

'✂️ काटा हुआ फालतू खर्च = कमाया हुआ आय। खरीद दर्ज करो।',

'🎪 बजट मतलब पसंद की आज़ादी। आज के खर्चे दर्ज करो।',

'🌟 बचत तुम्हारे भविष्य के लिए “हाँ” है। नोट बनाने का समय!',

'⚡ अनुशासन अव्यवस्था को मात देता है। खर्च दर्ज करो।',

'⏳ पैसा चुपचाप निकल जाता है — समय पर दर्ज करो। अभी एक खर्च जोड़ो।',

'🧘 मितव्ययिता शांति का रास्ता है। खरीद दर्ज करो।',

'📋 पैसे को व्यवस्था पसंद है। एंट्री करने का समय है।'
    ],
    reminder_message_title: 'रिमाइंडर',
    reminder_turn_on_off: (enabled) => enabled ? 'रिमाइंडर बंद करें' : 'रिमाइंडर चालू करें',
    button_configure_reminder_hours: '⏰ रिमाइंडर के घंटे सेट करें',
    reminder_hours_info: 'रिमाइंडर के लिए 3 घंटे तक चुनें (आपका स्थानीय समय क्षेत्र)। वर्तमान:',
    reminder_hours_limit: 'आप अधिकतम 3 घंटे चुन सकते हैं',
    reminder_hours_saved: '✅ रिमाइंडर के घंटे सहेजे गए',
    button_save: 'सहेजें',
    button_clear: 'साफ़ करें',
    
    // भुगतान समर्थन और नीतियां
    paysupport_message: '*भुगतान सहायता*\n\nव्यवसाय: {businessName}\nसपोर्ट: @{supportUsername} / {supportEmail}\n\nशर्तें: {termsUrl}\nगोपनीयता: {privacyUrl}\nरिफंड: {refundPolicyUrl}\n\nStars भुगतान/रिफंड से जुड़ी समस्याओं के लिए पहले सपोर्ट से संपर्क करें। हम Telegram Stars नीतियों का पालन करते हैं।',
    terms_message: '📄 सेवा की शर्तें: {termsUrl}',
    privacy_message: '🔐 गोपनीयता नीति: {privacyUrl}',
    refund_message: '↩️ रिफंड नीति: {refundPolicyUrl}\n\nप्रश्न: @{supportUsername} / {supportEmail}',
    
    // बग रिपोर्ट
    button_bug_report: '🐛 बग रिपोर्ट करें / सुधार सुझाएँ',
    bug_report_prompt: '🐛 *बग रिपोर्ट करें या सुधार सुझाव दें*\n\nसमस्या या सुझाव लिखें (अधिकतम 1000 अक्षर):',
    bug_report_success: '✅ धन्यवाद! आपका संदेश डेवलपर्स को भेज दिया गया है।',
    bug_report_too_long: '❌ संदेश बहुत लंबा है! {excess} अक्षर कम करें (अधिकतम 1000)।',
    bug_report_empty: '❌ संदेश खाली है। कृपया समस्या या सुझाव लिखें।',
    bug_report_rate_limit: '⚠️ बहुत अधिक बग रिपोर्ट!\n\nआप केवल 10 मिनट में 3 रिपोर्ट भेज सकते हैं',
    bug_report_suspicious: '⚠️ संदेश में अस्वीकार्य अक्षर या संदिग्ध सामग्री है',
    
    // सुरक्षा संदेश
    security_rate_limit: '⚠️ *बहुत अधिक अनुरोध*\n\n{resetTime} सेकंड में पुनः प्रयास करें\nसीमा: एक मिनट में {limit} अनुरोध',
    security_validation_error: '⚠️ *मान्यता त्रुटि*\n\n{message}',
    security_error: '❌ *सुरक्षा त्रुटि*\n\nबाद में प्रयास करें या व्यवस्थापक से संपर्क करें।',
    
    // एडमिन पैनल
    button_admin: '👑 एडमिन पैनल',
    admin_access_denied: '❌ आपके पास एडमिन अधिकार नहीं हैं।',
    admin_panel_title: '👑 *एडमिन पैनल*\n\nकार्य चुनें:',
    admin_error: '❌ एडमिन कार्य करते समय त्रुटि हुई।',
    
    // एडमिन आँकड़े
    admin_stats_text: `📊 *बॉट आँकड़े*
  
  👥 **उपयोगकर्ता:**
  • कुल: {totalUsers}
  • प्रीमियम: {activePremium}
  • इस सप्ताह नए: {newUsersWeek}
  • इस महीने नए: {newUsersMonth}
  
  💰 **खर्च:**
  • कुल प्रविष्टियाँ: {totalExpenses}
  • इस सप्ताह: {expensesWeek}
  • सक्रिय उपयोगकर्ता: {activeUsers}
  
  🐛 **बग रिपोर्ट:** {totalBugReports}
  
  💎 **दान:**
  • कुल: {totalDonations}
  • एकत्रित सितारे: {totalStars}
  
  ⭐ **प्रीमियम लेनदेन:** {premiumTransactions}`,
  
    // उपयोगकर्ता सूची
    admin_users_title: '👥 *उपयोगकर्ता* (पृष्ठ {page}/{totalPages})\n\nकुल: {totalUsers}\n',
    
    // बग रिपोर्ट स्थिति
    admin_bug_reports_title: '🐛 *बग रिपोर्ट*',
    bug_report_status_new: '🆕 नए',
    bug_report_status_in_progress: '🔄 प्रगति में',
    bug_report_status_resolved: '✅ हल किए गए',
    bug_report_status_closed: '🔒 बंद',
    
    // दान आँकड़े
    admin_donations_text: `💰 *दान आँकड़े*
  
  📊 **सारांश:**
  • कुल दान: {totalDonations}
  • पूर्ण: {completedDonations}
  • लंबित: {pendingDonations}
  
  ⭐ **सितारे:**
  • कुल एकत्रित: {totalStars}
  • औसत दान: {avgStars} सितारे`,
  
    // प्रीमियम आँकड़े
    admin_premium_stats: `⭐ *प्रीमियम आँकड़े*
  
  📊 **उपयोगकर्ता:**
  • कुल प्रीमियम: {totalPremiumUsers}
  • अभी सक्रिय: {activePremiumUsers}
  
  💳 **लेनदेन:**
  • कुल संचालन: {totalTransactions}
  • कुल राजस्व: {totalRevenue} सितारे`,
  
    // एडमिन सूची
    admin_admins_title: '👑 *एडमिन* ({count})\n',
    // एडमिन खोज
    admin_search_prompt: '🔍 *उपयोगकर्ता खोजें*\n\nउपयोगकर्ता ID या username दर्ज करें:',
    admin_search_not_found: '❌ उपयोगकर्ता नहीं मिला।',
    admin_search_results: '🔍 *खोज परिणाम* "{query}"\n\nमिले: {count}\n',
    
    // एडमिन उपयोगकर्ता विवरण
    admin_user_not_found: '❌ उपयोगकर्ता नहीं मिला।',
    admin_user_details: `👤 *उपयोगकर्ता जानकारी*
  
  {adminFlag}{premiumFlag} **{firstName}** (@{username})
  🆔 ID: {userId}
  🌐 भाषा: {language}
  💱 मुद्रा: {currency}
  🕐 समय क्षेत्र: {timezone}
  📅 पंजीकरण: {createdAt}
  
  📊 **आँकड़े:**
  • खर्च प्रविष्टियाँ: {totalExpenses}
  • कुल राशि: {totalAmount}
  • बग रिपोर्ट: {bugReportsCount}
  • लेनदेन: {transactionsCount}`,
  
    // एडमिन क्रियाएँ
    admin_promote_success: '✅ उपयोगकर्ता {userId} को एडमिन बनाया गया।',
    admin_demote_success: '✅ उपयोगकर्ता {userId} के एडमिन अधिकार हटा दिए गए।',
    admin_cannot_demote_self: '❌ आप अपने एडमिन अधिकार नहीं हटा सकते।',
    admin_grant_premium_options: '⭐ *उपयोगकर्ता {userId} को प्रीमियम दें*\n\nअवधि चुनें:',
    admin_grant_premium_success: '✅ उपयोगकर्ता {userId} को {days} दिनों के लिए प्रीमियम दिया गया।',
    admin_revoke_premium_success: '✅ उपयोगकर्ता {userId} का प्रीमियम हटाया गया।',
  
    // मास ब्रॉडकास्ट
    admin_broadcast_prompt: '📢 *सामूहिक संदेश*\n\nसभी उपयोगकर्ताओं के लिए संदेश लिखें (अधिकतम 3600 अक्षर):',
    admin_broadcast_too_long: '❌ संदेश बहुत लंबा है!\n\n📏 वर्तमान लंबाई: {current}\n📏 अधिकतम: {max}\n📏 हटाएँ: {excess} अक्षर',
    admin_broadcast_confirm: '📢 *सामूहिक संदेश की पुष्टि करें*\n\n📝 **संदेश:**\n{message}\n\n📏 **लंबाई:** {length} अक्षर\n\n⚠️ यह संदेश बॉट के **सभी** उपयोगकर्ताओं को भेजा जाएगा!',
    admin_broadcast_started: '📢 संदेश भेजना शुरू हुआ...',
    admin_broadcast_result: '📢 *संदेश भेजना समाप्त!*\n\n📊 **आँकड़े:**\n• कुल उपयोगकर्ता: {total}\n• सफल: {sent}\n• विफल: {failed}',
    admin_broadcast_header: '🔴🔴🔴 *अधिसूचना!* 🔴🔴🔴',
    
    // सामान्य संदेश
    welcome: 'नमस्ते, {name}! 👋',
    main_menu_title: '🏠 *मुख्य मेनू*\n\nकृपया एक क्रिया चुनें:',
    error: 'कोई त्रुटि हुई 😞',
    unknown_error: 'अप्रत्याशित त्रुटि। बाद में पुनः प्रयास करें।',
    not_found: 'नहीं मिला',
    error_invalid_description_format: '❌ गलत प्रारूप। उपयोग करें: राशि विवरण या राशि श्रेणी विवरण',
    expense_save_error: '❌ खर्च सहेजते समय त्रुटि। पुनः प्रयास करें।',
    cancel: 'रद्द करें',
    back: 'वापस',
    confirm: 'पुष्टि करें',
    save: 'सहेजें',
    
    // स्टार्ट संदेश
    start_message: `नमस्ते! 👋 मैं आपकी खर्चों को रिकॉर्ड करने और बजट को नियंत्रित करने में मदद करूँगा।
  
  *खर्च कैसे जोड़ें:*
  बस राशि और विवरण लिखें:
  -  \`200 किराना\`
  -  \`1500 होटल का बिल\`
  -  \`50 बस किराया\`
  -  \`150,50 कॉफ़ी\`
  
  इसके बाद श्रेणियों का मेनू दिखाई देगा — उपयुक्त चुनें 🏷️
  
  *मुख्य कमांड:*
  /start - बॉट को पुनः आरंभ करें
  /menu - इंटरैक्टिव मेनू खोलें
  /history - आज की ताज़ा प्रविष्टियाँ
  /stats - श्रेणी-वार आँकड़े
  
  /export - CSV में डेटा डाउनलोड करें
  /undo - अंतिम प्रविष्टि हटाएँ
  
  *सेटिंग्स:*
  /settings - सेटिंग्स खोलें
  /currency - डिफ़ॉल्ट मुद्रा बदलें
  /timezone - समय क्षेत्र सेट करें
  /categories - श्रेणियों का प्रबंधन करें
  
  *अतिरिक्त सुविधाएँ:*
  /family - पारिवारिक बजट
  /limits - सीमाएँ और प्रीमियम सुविधाएँ
  /help - विस्तृत सहायता
  
  अपने खर्च दर्ज करना शुरू करें! 💰`,
  help_message: `📋 *कमांड्स की विस्तृत सहायता*
  
  *खर्च जोड़ना:*
  राशि और विवरण के बीच एक स्पेस देकर लिखें:
  \`200 किराना\` - श्रेणियों का मेनू दिखेगा
  \`150,50 कॉफ़ी\` - दशमलव संख्या भी मान्य
  
  *मुख्य कमांड:*
  /start - बॉट पुनः प्रारंभ करें और स्वागत संदेश दिखाएँ
  /menu - सभी सुविधाओं के साथ इंटरैक्टिव मेनू खोलें
  /history - आज का इतिहास दिखाएँ
  /stats - महीने की श्रेणी अनुसार आँकड़े
  
  /export - सभी डेटा CSV में डाउनलोड करें
  /undo - अंतिम जोड़ी गई प्रविष्टि हटाएँ
  
  *सेटिंग और प्रबंधन:*
  /settings - मुख्य सेटिंग मेनू खोलें
  /currency - डिफ़ॉल्ट मुद्रा बदलें (RUB, USD, EUR, KZT, CNY, THB)
  /timezone - सही समय रिकॉर्डिंग के लिए समय क्षेत्र सेट करें
  /categories - कस्टम श्रेणियाँ प्रबंधित करें (प्रीमियम)
  
  *पारिवारिक बजट:*
  /family - परिवार समूह और सामूहिक खर्च प्रबंधित करें
  - परिवार बनाएं, सदस्यों को आमंत्रित करें
  - सामूहिक ख़र्च और आँकड़े
  - पारिवारिक डेटा एक्सपोर्ट करें
  
  *प्रीमियम सुविधाएँ:*
  /limits - सीमाओं और प्रीमियम के बारे में जानकारी
  - कस्टम श्रेणियाँ
  - विस्तृत आँकड़े
  - पारिवारिक बजट
  - प्राथमिकता समर्थन
  
  *उपयोग सुझाव:*
  • बेहतर समझ के लिए विवरण जोड़ें  
  • /stats से आँकड़े नियमित रूप से देखें  
  • सही समय के लिए समय क्षेत्र सेट करें  
  • जल्दी पहुंच के लिए /menu का उपयोग करें  
  • डेटा विश्लेषण के लिए /export का उपयोग करें
  
  *खर्च संपादन:*
  • /history में रिकॉर्ड हटाएँ या संपादित करें  
  • "👨‍👩‍👧‍👦 परिवार में जोड़ें" बटन खर्च को पारिवारिक बजट में ले जाता है  
  • "🚫 परिवार के बजट से हटाएँ" बटन उसे निजी बजट में लौटाता है  
  • केवल अपने खर्च संपादित/हटा सकते हैं  
  
  *रिमाइंडर:*
  • बॉट हर दिन 18:00 बजे खर्च दर्ज करने की याद दिलाएगा  
  • केवल अगर आपने उस दिन कुछ दर्ज नहीं किया है  
  • सेटिंग्स में रिमाइंडर ऑन/ऑफ कर सकते हैं  
  • अधिकतम एक रिमाइंडर प्रति दिन
  
  *सपोर्ट:*
  /start का उपयोग करके मुख्य मेनू पर वापस जा सकते हैं।
  
  बजट प्रबंधन के लिए शुभकामनाएँ! 💰📊`,
  
    // खर्च
    expense_added: '✅ दर्ज किया गया: {amount} - {description}',
    expense_updated: '✅ प्रविष्टि अपडेट की गई: {amount} - {description}',
    expense_deleted: '✅ प्रविष्टि हटाई गई: {amount} - {description}',
    no_expenses: 'हटाने के लिए कोई प्रविष्टि नहीं 🤷‍♂️',
    expense_not_found: 'त्रुटि: प्रविष्टि नहीं मिली।',
    expense_update_error: 'त्रुटि: प्रविष्टि नहीं मिली या अपडेट नहीं हुई।',
    
    // आँकड़े
    monthly_stats: '💰 *इस महीने के खर्च*',
    daily_stats: '💰 *आज के खर्च*',
    total_spent: 'कुल खर्च: *{amount}*',
    records_count: 'प्रविष्टियाँ: {count}',
    no_expenses_period: 'इस अवधि के लिए कोई खर्च नहीं।',
    
    // श्रेणियों के अनुसार
    by_categories: 'श्रेणियों के अनुसार:',
    no_expenses_category: 'इस श्रेणी में पिछले महीने कोई खर्च नहीं है।',
    
    // श्रेणियाँ
    select_category: 'श्रेणी चुनें:',
    amount_label: 'राशि',
    description_label: 'विवरण',
    category_label: 'श्रेणी',
    expense_added_title: 'खर्च जोड़ा गया!',
    no_categories: 'कोई श्रेणी नहीं मिली।',
    category_expenses: '"{category}" श्रेणी के खर्च',
    no_category_expenses: 'पिछले महीने इस श्रेणी में कोई खर्च नहीं।',
    
    // सेटिंग्स
    settings_title: 'सेटिंग्स:',
    currency_select: 'डिफ़ॉल्ट मुद्रा चुनें:',
    currency_set: 'मुद्रा सेट की गई: {currency}',
    currency_updated: 'मुद्रा बदली गई: {currency}',
    button_change_period_start: '📅 अवधि शुरू होने की तारीख',
    period_start_prompt: 'नया महीना शुरू होने का दिन दर्ज करें (1-31)। छोटे महीनों में अंतिम दिन लिया जाएगा।',
    period_start_invalid: '❌ अमान्य संख्या। 1 से 31 के बीच पूर्णांक दर्ज करें।',
    period_start_set: '✅ अवधि शुरू होने का दिन सेट किया गया: {day}',
    timezone_setup: `🕐 *समय क्षेत्र सेटिंग*
  
  अभी कितने बजे हैं?
  
  *वर्तमान UTC समय:* {utcTime}
  
  अपना वर्तमान समय चुनें:`,
    timezone_set: '✅ समय क्षेत्र सेट किया गया: {timezone}',
    // पारिवारिक बजट
    button_family: '👨‍👩‍👧‍👦 परिवार',
    // Family labels
    family_label: '🏠 *परिवार:*',
    family_owner_label: '👑 *मालिक:*',
    family_info: '👨‍👩‍👧‍👦 परिवार बजट\n\nयहाँ आप परिवार, सहकर्मियों, दोस्तों आदि के साथ मिलकर खर्चों का प्रबंधन कर सकते हैं।\n\n- \uD83D\uDC6A संयुक्त खर्चों का रिकॉर्ड रखने के लिए एक साझा समूह बनाया जाता है।\n- \u2795 हर सदस्य खर्च जोड़ सकता है।\n- \uD83D\uDDD1\uFE0F आवश्यकता होने पर आप अपने खर्चों को हटा सकते हैं।\n- \uD83D\uDCCA सभी सदस्यों के लिए साझा आँकड़े उपलब्ध हैं।\n- \uD83D\uDCE4 पूरे समूह के डेटा को एक ही फ़ाइल में निर्यात किया जा सकता है।\n\nसाझा नियंत्रण का मतलब है कम अव्यवस्था और अधिक पारदर्शिता।',
    family_created: '✅ परिवार "{name}" बनाया गया! अब आप सदस्य आमंत्रित कर सकते हैं।',
    family_joined: '✅ आप परिवार "{name}" में शामिल हो गए हैं!',
    family_left: '✅ आपने परिवार "{name}" छोड़ दिया है।',
    family_deleted: '✅ परिवार "{name}" हटा दिया गया। सभी पारिवारिक खर्च निजी खर्च में बदल गए।',
    family_member_removed: '✅ सदस्य को परिवार से हटाया गया।',
    family_member_removed_notification: '❌ आपको *{familyName}* परिवार से हटा दिया गया है।',
    family_cannot_leave_owner: '❌ परिवार का मालिक परिवार नहीं छोड़ सकता। "परिवार हटाएँ" का उपयोग करें।',
    
    // पारिवारिक मेन्यू बटन
    create_family: '🏠 परिवार बनाएँ',
    join_family: '🔗 परिवार से जुड़ें',
    invite_member: '➕ सदस्य आमंत्रित करें',
    leave_family: '🚪 परिवार छोड़ें',
    delete_family: '🗑️ परिवार हटाएँ',
    family_members: '👥 परिवार के सदस्य',
    family_stats: '💰 महीने का खर्च',
    family_daily_stats: '💰 दिन का खर्च',
    family_add_expense: '💰 पारिवारिक खर्च जोड़ें',
    family_menu: '👨‍👩‍👧‍👦 पारिवारिक मेनू',
    family_cancel: '❌ रद्द करें',
    
    // आमंत्रण
    invitation_sent: '✅ @{username} को आमंत्रण भेजा गया',
    invitation_accepted: '✅ आपने "{name}" परिवार से जुड़ने का आमंत्रण स्वीकार किया!',
    invitation_rejected: '❌ आपने "{name}" परिवार से जुड़ने का आमंत्रण अस्वीकार किया।',
    invitation_not_found: '❌ आमंत्रण नहीं मिला या समाप्त हो गया।',
    invitation_expired: '❌ आमंत्रण समाप्त हो गया।',
    invitation_already_processed: '❌ आमंत्रण पहले ही संसाधित हो चुका है।',
    
    // इनपुट संदेश
    enter_family_name: 'परिवार का नाम दर्ज करें (3-50 अक्षर):',
    enter_invite_username: 'उपयोगकर्ता नाम दर्ज करें (@ के बिना):',
    enter_expense_amount: 'पारिवारिक खर्च की राशि और विवरण दर्ज करें:',
    
    // त्रुटियाँ
    family_name_too_short: '❌ परिवार का नाम कम से कम 3 अक्षर का होना चाहिए।',
    family_name_too_long: '❌ परिवार का नाम 50 अक्षरों से अधिक नहीं हो सकता।',
    user_not_found: '❌ उपयोगकर्ता नहीं मिला।',
    user_already_in_family: '❌ उपयोगकर्ता पहले से किसी परिवार में है।',
    user_already_has_invitation: '❌ उपयोगकर्ता के पास पहले से सक्रिय आमंत्रण है।',
    user_already_in_other_family: '❌ उपयोगकर्ता किसी अन्य परिवार में है।',
    user_already_in_your_family: '❌ उपयोगकर्ता पहले से आपके परिवार का सदस्य है।',
    user_not_premium: '❌ उपयोगकर्ता के पास प्रीमियम सदस्यता नहीं है।',
    only_owner_can_invite: '❌ केवल परिवार का मालिक सदस्य आमंत्रित कर सकता है।',
    active_invitations: '📋 सक्रिय आमंत्रण',
    no_active_invitations: '📋 आपके पास कोई सक्रिय आमंत्रण नहीं है।',
    active_invitations_list: '📋 सक्रिय आमंत्रणों की सूची:',
    cancel_invitation: '❌ आमंत्रण रद्द करें',
    invitation_cancelled: '✅ आमंत्रण रद्द किया गया।',
    not_authorized: '❌ आपके पास यह कार्रवाई करने की अनुमति नहीं है।',
    invitation_code: '🔑 आमंत्रण कोड: `{code}`',
    family_invitation_received: '🎉 आपको *{familyName}* परिवार में आमंत्रित किया गया है\n\n👤 आमंत्रण भेजा: {inviterName}\n🔑 कोड: `{inviteCode}`\n\nकृपया कार्रवाई चुनें:',
    accept_invitation: '✅ स्वीकार करें',
    reject_invitation: '❌ अस्वीकार करें',
    invitation_accepted: '🎉 बधाई! आप *{familyName}* परिवार में शामिल हो गए हैं',
    invitation_rejected: '❌ आपने आमंत्रण अस्वीकार कर दिया',
    invitation_not_pending: '❌ आमंत्रण लंबित नहीं है',
    invitation_cancelled_notification: '❌ आपको *{familyName}* परिवार से जाने का आमंत्रण {cancelledBy} ने रद्द किया',
    enter_invite_code: '🔑 आमंत्रण कोड दर्ज करें:',
    only_owner_can_remove: '❌ केवल परिवार का मालिक सदस्य हटा सकता है।',
    only_owner_can_delete: '❌ केवल मालिक परिवार हटा सकता है।',
    cannot_remove_owner: '❌ मालिक को हटाया नहीं जा सकता।',
    cannot_remove_yourself: '❌ आप स्वयं को नहीं हटा सकते।',
    family_not_found: '❌ परिवार नहीं मिला।',
    not_family_member: '❌ आप इस परिवार के सदस्य नहीं हैं।',
    not_family_owner: '❌ आप परिवार के मालिक नहीं हैं।',
    
    // पुष्टिकरण
    confirm_delete_family: '⚠️ *परिवार हटाना*\n\nसभी सदस्य हटा दिए जाएंगे और पारिवारिक खर्च निजी खर्च बन जाएंगे।\n\nक्या आप सुनिश्चित हैं?',
    confirm_remove_member: '⚠️ *सदस्य हटाना*\n\nसदस्य को परिवार से हटाया जाएगा।\n\nक्या आप सुनिश्चित हैं?',
    // पारिवारिक आँकड़े
    family_monthly_stats: '👨‍👩‍👧‍👦 *इस महीने के पारिवारिक खर्च*',
    family_daily_stats: '💰 दिन का खर्च',
    family_daily_stats_title: '👨‍👩‍👧‍👦 *आज के पारिवारिक खर्च*',
    family_export: '📊 पारिवारिक डेटा एक्सपोर्ट',
    family_total_spent: 'कुल खर्च: *{amount}*',
    family_members_count: 'सदस्य: {count}',
    family_no_expenses: 'इस अवधि के लिए कोई पारिवारिक खर्च नहीं।',
    
    // सदस्य सूची
    family_members_title: '👥 *परिवार के सदस्य*',
    family_member_info: '• {name} ({role}) - {date} को शामिल हुए',
    family_owner_role: 'मालिक',
    family_member_role: 'सदस्य',
    remove_member: '❌ हटाएँ',
    confirm_remove_member: '⚠️ *सदस्य हटाना*\n\nक्या आप सुनिश्चित हैं कि {name} को परिवार से हटाना चाहते हैं?',
    member_removed: '✅ {name} को परिवार से हटा दिया गया।',
    member_removed_notification: '❌ आपको *{familyName}* परिवार से {ownerName} ने हटा दिया।',
    
    // प्रीमियम सुविधाएँ
    premium_required: '❌ यह सुविधा केवल प्रीमियम उपयोगकर्ताओं के लिए उपलब्ध है।',
    upgrade_to_premium: '💎 पारिवारिक बजट का उपयोग करने के लिए प्रीमियम में अपग्रेड करें!',
    
    timezone_updated: `✅ *समय क्षेत्र अपडेट किया गया!*
  
  🕐 चुना गया समय: *{time}*
  🌍 समय क्षेत्र: *{timezone}*
  
  अब आपके सभी खर्च आपके स्थानीय समय पर प्रदर्शित होंगे।`,
    timezone_updated_simple: `✅ *समय क्षेत्र अपडेट किया गया!*
  
  🌍 नया समय क्षेत्र: *{timezone}*
  
  अब सभी खर्च सही समय पर दिखाए जाएँगे।`,
    
    // सीमाएँ
    limits_title: '📊 *सीमाओं की जानकारी*',
    status_regular: '👤 सामान्य',
    status_premium: '💎 प्रीमियम',
    status_label: '*स्थिति:* {status}',
    records_usage: '<b>रिकॉर्ड:</b> {current}/{max} ({percentage}%)',
    records_remaining: '<b>शेष:</b> {remaining} रिकॉर्ड',
    max_description_length: '<b>विवरण की अधिकतम लंबाई:</b> {length} अक्षर',
    near_limit_warning: '⚠️ *ध्यान दें:* आप रिकॉर्ड सीमा के करीब हैं!',
    limit_reached: '❌ *रिकॉर्ड सीमा पूरी हो गई है!*',
    premium_benefits: `💎 <b>प्रीमियम लाभ:</b>
  • विवरण में 160 अक्षर (80 के बजाय)
  • 300 रिकॉर्ड (100 के बजाय)
  • 5 कस्टम श्रेणियाँ तक
  • विस्तृत आँकड़े
  • पारिवारिक बजट
  • किसी भी खर्च को संपादित और हटाने की क्षमता (केवल अंतिम ही नहीं)`,
    
    // प्रीमियम सदस्यता
    premium_subscription_title: '⭐️ सदस्यता',
    premium_status_header: '<b>आपकी स्थिति:</b>',
    premium_privileges: 'लाभ: {status}',
    premium_limits_info: 'यहाँ आपके सीमाएँ दिखाई देंगी: श्रेणियों की संख्या, रिकॉर्ड, पारिवारिक सुविधाएँ, प्रीमियम अवधि।',
    premium_menu_title: '<b>मेनू:</b>',
    premium_tariff_button: '⭐️ टैरिफ',
    premium_why_paid_button: '👀 क्यों भुगतान करना है?',
    premium_donate_button: '🤝 दान करें',
    premium_back_button: '⬅️ वापस',
    premium_tariffs_title: '⭐️ टैरिफ (Telegram Stars)',
    premium_payment_info: '💳 भुगतान Telegram Stars के माध्यम से होता है। <b>स्वचालित नवीनीकरण नहीं।</b>',
    premium_renewal_info: '📅 कभी भी नवीनीकृत कर सकते हैं। समय बाकी में जुड़ जाएगा।',
    premium_stars_info: '💡 सितारों को बिना शुल्क के [@PremiumBot] से खरीदें।',
    premium_why_paid_title: '👀 क्यों भुगतान करना है?',
    premium_purchases_button: '🧾 खरीद इतिहास',
    purchases_header: '🧾 खरीद इतिहास',
    purchases_premium_title: 'प्रीमियम',
    purchases_donations_title: 'दान',
    no_purchases: 'अभी तक कोई खरीद नहीं',
    purchases_prev_button: '◀ पिछला',
    purchases_next_button: 'अगला ▶',
    purchases_page_indicator: 'पृष्ठ {page}/{total}',
    premium_why_paid_text: 'इस बॉट के सर्वर का खर्च लगभग $200/माह आता है, और उपयोगकर्ताओं की संख्या लगातार बढ़ रही है। डेवलपर होने के नाते, मुझे भी सेवा सुधारने के लिए जीवित रहना है :)',
    premium_payment_title: '💳 *प्रीमियम सदस्यता भुगतान*',
    premium_payment_description: 'आपने चुना है: <b>{duration}</b>\nकीमत: <b>{stars} ⭐️</b>\n\nभुगतान के लिए नीचे क्लिक करें।',
    // टैरिफ लेबल्स और उत्पाद नाम
    tariff_button_30: '1 माह',
    tariff_button_90: '3 माह',
    tariff_button_180: '6 माह',
    tariff_button_365: '1 वर्ष',
    tariff_item_30: '1 माह (30 दिन)',
    tariff_item_90: '3 माह (90 दिन)',
    tariff_item_180: '6 माह (180 दिन)',
    tariff_item_365: '12 माह (365 दिन)',
    premium_product: 'प्रीमियम सदस्यता',
    discount_save: '{percent}% बचत',
  
    payment_success: '🎉 *भुगतान सफल!* प्रीमियम सक्रिय हो गया। उन्नत सुविधाओं का आनंद लें।',
    donation_success: '🙏 *समर्थन के लिए धन्यवाद!* आपका दान बॉट के विकास में सहायता करेगा।',
    general_payment_success: '✅ *भुगतान सफल!* हमारे बॉट का उपयोग करने के लिए धन्यवाद।',
    premium_expires: '📅 प्रीमियम समाप्त होने की तारीख: <b>{date}</b>\n⏰ शेष दिन: <b>{days}</b>',
  
    // दान
    donate_prompt_title: '🤝 परियोजना का समर्थन',
    donate_prompt_text: 'आप कितने सितारे (1 से 2500) दान करना चाहते हैं लिखें।\nआप एक संदेश भी जोड़ सकते हैं (अधिकतम 500 अक्षर)।',
    donate_invalid: '❌ 1 से 2500 के बीच पूर्णांक दर्ज करें। संदेश — अधिकतम 500 अक्षर।',
    donate_created: '✅ दान अनुरोध बना: {stars} ⭐️। भुगतान लिंक भेज रहा हूँ।',
    donate_paid: '🙏 समर्थन के लिए धन्यवाद! दान प्राप्त हुआ: {stars} ⭐️',
    
    // मान्यकरण त्रुटियाँ
    error_too_long_regular: '❌ विवरण बहुत लंबा है! सामान्य उपयोगकर्ताओं के लिए अधिकतम 80 अक्षर।',
    error_too_long_premium: '❌ विवरण बहुत लंबा है! प्रीमियम के लिए अधिकतम 160 अक्षर।',
    error_no_description: '❌ राशि के बाद एक विवरण लिखना आवश्यक है।',
    error_amount: '❌ अमान्य राशि। 0.01 से 999999 के बीच दर्ज करें।',
    error_format: '❌ प्रारूप मान्य नहीं। राशि और विवरण लिखें।\nउदा.: `200 किराना` या `1500 कॉफ़ी`',
    error_forbidden_content: '❌ प्रतिबंधित सामग्री।',
    error_limit_reached: '❌ सीमा पूरी हो गई!\nसामान्य: 100 रिकॉर्ड\nप्रीमियम: 300 रिकॉर्ड\n\n💎 सीमा बढ़ाने के लिए प्रीमियम लें!',
    error_premium_required: '💎 यह सुविधा केवल प्रीमियम के लिए है!\n\nलाभ:\n• विवरण में 160 अक्षर\n• 300 रिकॉर्ड\n• कस्टम श्रेणियाँ\n• विस्तृत आँकड़े',
    error_generic: '❌ त्रुटि हुई। बाद में पुनः प्रयास करें या एडमिन से संपर्क करें।',
    
    // बटन
    button_menu: '📋 मेनू',
    button_expenses_month: '💰 महीने के खर्च',
    button_expenses_day: '💰 दिन के खर्च',
    button_expenses_categories: '💰 श्रेणी अनुसार खर्च',
    button_family: '👨‍👩‍👧‍👦 परिवार',
    button_settings: '⚙️ सेटिंग्स',
    button_delete_last: '🗑️ अंतिम प्रविष्टि हटाएँ',
    button_limits: '📊 सीमाएँ',
    button_help: '❓ सहायता',
    button_edit: 'संपादित करें',
    button_delete: 'हटाएँ',
    button_mark_as_family: '👨‍👩‍👧‍👦 परिवार में डालें',
    button_remove_from_family: '🚫 परिवार बजट से हटाएँ',
    expense_already_family: '❌ यह खर्च पहले से ही पारिवारिक है',
    expense_converted_to_family: '✅ खर्च पारिवारिक बजट में जोड़ा गया',
    expense_removed_from_family: '✅ खर्च परिवार बजट से हटाया गया',
    not_owner: '❌ आप इस खर्च के लेखक नहीं हैं',
    button_cancel: '❌ रद्द करें',
    button_back: '⬅️ वापस',
    button_change_currency: '💱 मुद्रा बदलें',
    button_change_timezone: '🌍 समय क्षेत्र',
    button_change_language: '🌐 भाषा',
    button_custom_categories: '🏷️ कस्टम श्रेणियाँ',
    
    // भाषाएँ
    language_select: '🌍 भाषा चुनें:',
    language_set: '✅ भाषा हिंदी में बदली गई',
    language_not_supported: '❌ भाषा समर्थित नहीं है',
    language_change_error: '❌ भाषा बदलने में त्रुटि',
    timezone_error: '❌ समय क्षेत्र सेट करने में त्रुटि',
    
    // एक्सपोर्ट
    export_success: '📊 डेटा सफलतापूर्वक एक्सपोर्ट हुआ!',
    export_error: 'डेटा एक्सपोर्ट में त्रुटि 😞',
    keyboard_updated: '✅ आपका कीबोर्ड भाषा अपडेट हो गया!',
    
    // संपादन
    edit_canceled: 'संपादन रद्द।',
    edit_no_active: 'कोई सक्रिय संपादन नहीं।',
    edit_instructions: 'नई राशि और/या विवरण दर्ज करें (उदा.: 500 कॉफ़ी) या नीचे रद्द करें बटन दबाएँ।',
    edit_empty: 'नई राशि, विवरण या दोनों दर्ज करें।',
    edit_amount_error: 'अमान्य राशि।',
    edit_too_long: 'विवरण बहुत लंबा है (अधिकतम {max} अक्षर)।',
    edit_format_error: 'प्रारूप त्रुटि।',
    
    // कॉलबैक प्रतिक्रियाएँ
    callback_limit_reached: '❌ रिकॉर्ड सीमा पूरी',
    callback_button_not_found: '❌ त्रुटि: बटन नहीं मिला',
    callback_data_not_found: '❌ त्रुटि: डेटा नहीं मिला',
    callback_expense_added: '✅ "{category}" श्रेणी में जोड़ा गया',
    callback_expense_saved: '❌ सहेजने में त्रुटि',
    callback_canceled: '❌ रद्द',
    callback_expense_canceled: '❌ खर्च जोड़ना रद्द',
    callback_deleted: 'प्रविष्टि हटाई गई!',
    callback_delete_error: 'हटाने में त्रुटि या प्रविष्टि नहीं मिली',
    callback_edit_mode: 'संपादन मोड से बाहर:',
    callback_no_cards: 'कोई रिकॉर्ड नहीं मिला... त्रुटि हुई',
    
    // डिफ़ॉल्ट श्रेणियाँ
    category_food: 'खाना',
    category_transport: 'परिवहन',
    category_entertainment: 'मनोरंजन',
    category_shopping: 'खरीदारी',
    category_health: 'स्वास्थ्य',
    category_other: 'अन्य',
    
    // CSV निर्यात
    date_label: 'तारीख',
    currency_label: 'मुद्रा',
    total_by_currencies: 'मुद्राओं के अनुसार कुल:',
    total_in_currency: '{currency} में कुल',
    
    // कस्टम श्रेणियाँ (प्रीमियम)
    custom_categories_title: '🏷️ कस्टम श्रेणियाँ',
    custom_categories_info: 'आप अपनी श्रेणियाँ बना सकते हैं (केवल प्रीमियम)।',
    custom_categories_example: '💡 उदाहरण: "🌍 यात्रा" या "🎮 खेल"',
    custom_categories_add: '➕ श्रेणी जोड़ें',
    custom_categories_manage: '🗂️ श्रेणियाँ प्रबंधित करें',
    custom_categories_enter_name: 'नई श्रेणी का नाम दर्ज करें (1-30 अक्षर):',
    custom_categories_created: '✅ श्रेणी बनाई गई: {name}',
    custom_categories_exists: '❌ यह श्रेणी पहले से मौजूद है।',
    custom_categories_limit_reached: '❌ कस्टम श्रेणियों की सीमा: {max}',
    custom_categories_list_empty: 'आपके पास कोई कस्टम श्रेणियाँ नहीं हैं।',
    custom_categories_list_title: 'आपकी कस्टम श्रेणियाँ:',
    custom_categories_delete: '🗑️ हटाएँ',
    custom_categories_deleted: '✅ श्रेणी हटा दी गई।',
    custom_categories_premium_required: '💎 यह केवल प्रीमियम उपयोगकर्ताओं के लिए है।'
};
