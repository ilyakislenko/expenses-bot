module.exports = {
    button_reminders: '🔔 Hatırlat',
    reminders_enabled: '🔔 Hatırlatıcılar açık',
    reminders_disabled: 'Hatırlatıcılar kapalı. Tam sessizlik 🤐',
    reminder_sample_variants: [
      '👋 Merhaba! Cüzdanınız sessizse bu, onun mutlu olduğu anlamına gelmez. Harcamalarınızı kaydedin 😉',
'🤔 Bugün bir şey harcadınız mı? Hafızanız ekmek almaya gitmeden önce yazın 🧠🥖',
'💭 Eğer kaydetmediyseniz — boşa gitmiş sayın. Hadi bunu kaydedelim 💸',
'🌊 Damla damla, bütçe fark etmeden akıp gider. Bugünün harcamalarını yazmak daha iyi 🌊',
'🤖 Bot azarlamaz, sadece hatırlatır: harcamaları kaydetme zamanı 😌',
'💡 Kuruşu korursanız — liranız da korunur. Not alma zamanı!',

'💰 Para sayımı ve sessizliği sever. Harcamalarınızı kaydedin.',

'💡 Boş yere harcamayın — önemli olana biriktirin. Kayıt zamanı.',

'🏗️ Küçük tasarruflar — büyük işler. Şimdi bir alışveriş ekleyin.',

'🌱 Bugün tasarruf edin — yarın daha rahat nefes alın. Harcamalarınızı kaydedin.',

'🔄 Korumalı lira iki kat gelir getirir. Bir dakikada bir harcama kaydedin.',

'⏰ Önce biriktirin — sonra harcayın. Not alma zamanı!',

'🧱 Her kuruş özgürlüğünüzün bir tuğlasıdır. Bir harcama kaydedin.',

'🛡️ Kötü günler için önceden biriktirin. Şimdi bir kayıt ekleyin.',

'📈 Akıllı harcama en iyi yatırımdır. Satın alımı kaydedin.',

'🎯 Harcama kontrolü = daha az endişe. Harcamalarınızı kaydedin.',

'🚀 Daha az dürtü — daha çok fırsat. Kayıt zamanı.',

'💎 Önce kendinize ödeme yapın. Bota bir harcama ekleyin.',

'✂️ Kesilen gereksiz harcama = kazanılan gelir. Satın alımı kaydedin.',

'🎪 Bütçe, seçim özgürlüğüdür. Bugünün harcamalarını kaydedin.',

'🌟 Birikim, geleceğinize “evet” demektir. Not alma zamanı!',

'⚡ Disiplin kaosu yener. Harcamayı kaydedin.',

'⏳ Para sessizce gider — zamanında kaydedin. Şimdi bir harcama ekleyin.',

'🧘 Tutumluluk huzura giden yoldur. Satın alımı kaydedin.',

'📋 Para düzeni sever. Kayıt zamanı.'
    ],
    reminder_message_title: 'Hatırlatma',
    reminder_hours_info: 'Hatırlatıcılar için 3 saate kadar seçin (yerel saat diliminiz). Mevcut:',
    reminder_hours_limit: 'Maksimum 3 saat seçebilirsiniz',
    reminder_hours_saved: '✅ Hatırlatıcı saatleri kaydedildi',
    button_save: 'Kaydet',
    button_clear: 'Temizle',
    
    // Ödeme desteği ve politikalar
    paysupport_message: 'Ödeme desteği\n\nİşletme: {businessName}\nDestek: @{supportUsername} / {supportEmail}\n\nŞartlar: {termsUrl}\nGizlilik: {privacyUrl}\nİade politikası: {refundPolicyUrl}\n\nStars ödemeleri/iade konularında önce destek ile iletişime geçin. Telegram Stars politikalarına uyuyoruz.',
    terms_message: '📄 Hizmet şartları: {termsUrl}',
    privacy_message: '🔐 Gizlilik politikası: {privacyUrl}',
    refund_message: '↩️ İade politikası: {refundPolicyUrl}\n\nSorular: @{supportUsername} / {supportEmail}',
  
    // Hata bildirimi
    button_bug_report: '🐛 Hata bildirin / İyileştirme önerin',
    bug_report_prompt: '🐛 *Hata bildirin veya iyileştirme önerin*\n\nLütfen sorunu veya önerinizi yazın (en fazla 1000 karakter):',
    bug_report_success: '✅ Teşekkürler! Mesajınız geliştiricilere iletildi.',
    bug_report_too_long: '❌ Mesaj çok uzun! Lütfen {excess} karakter kısaltın (en fazla 1000).',
    bug_report_empty: '❌ Mesaj boş. Lütfen bir sorun veya öneri yazın.',
    bug_report_rate_limit: '⚠️ Çok fazla hata bildirimi!\n\n10 dakikada en fazla 3 bildirim gönderebilirsiniz',
  
    // Güvenlik
    security_rate_limit: '⚠️ *Çok fazla istek*\n\n{resetTime} saniye sonra tekrar deneyin\nLimit: dakikada {limit} istek',
    security_error: '❌ *Güvenlik hatası*\n\nLütfen daha sonra tekrar deneyin veya yöneticiyle iletişime geçin.',
    
    // Admin paneli
    button_admin: '👑 Admin paneli',
    admin_access_denied: '❌ Yönetici yetkiniz yok.',
    admin_panel_title: '👑 *Admin paneli*\n\nBir işlem seçin:',
    admin_error: '❌ Yönetici işlemi yapılırken hata oluştu.',
      // Yönetici istatistikleri
      admin_stats_text: `📊 *Bot istatistikleri*

👥 *Kullanıcılar:*
• Toplam: {totalUsers}
• Premium: {activePremium}
• Bu hafta yeni: {newUsersWeek}
• Bu ay yeni: {newUsersMonth}

💰 *Harcamalar:*
• Toplam kayıt: {totalExpenses}
• Bu hafta: {expensesWeek}
• Aktif kullanıcılar: {activeUsers}

🐛 *Hata bildirimleri:* {totalBugReports}

💎 *Bağışlar:*
• Toplam: {totalDonations}
• Toplanan yıldız: {totalStars}

⭐ *Premium işlemleri:* {premiumTransactions}`,
      
        // Kullanıcı listesi
        admin_users_title: '👥 *Kullanıcılar* (Sayfa {page}/{totalPages})\n\nToplam: {totalUsers}\n',
        
        // Hata raporları
        admin_bug_reports_title: '🐛 *Hata raporları*',
        bug_report_status_new: '🆕 Yeni',
        bug_report_status_in_progress: '🔄 Devam ediyor',
        bug_report_status_resolved: '✅ Çözüldü',
        bug_report_status_closed: '🔒 Kapalı',
        
        // Bağış istatistikleri
        admin_donations_text: `💰 *Bağış istatistikleri*

📊 *Özet:*
• Toplam bağış: {totalDonations}
• Tamamlanan: {completedDonations}
• Bekleyen: {pendingDonations}

⭐ *Yıldızlar:*
• Toplam toplanan: {totalStars}
• Ortalama bağış: {avgStars} yıldız`,
      
        // Premium istatistikleri
        admin_premium_stats: `⭐ *Premium istatistikleri*

📊 *Kullanıcılar:*
• Toplam premium: {totalPremiumUsers}
• Şu an aktif: {activePremiumUsers}

💳 *İşlemler:*
• Toplam işlem: {totalTransactions}
• Toplam gelir: {totalRevenue} yıldız`,
      
        // Admin listesi
        admin_admins_title: '👑 *Yöneticiler* ({count})\n',
        
        // Admin arama
        admin_search_prompt: '🔍 *Kullanıcı ara*\n\nKullanıcı ID’si veya kullanıcı adını girin:',
        admin_search_not_found: '❌ Kullanıcı bulunamadı.',
        admin_search_results: '🔍 *Arama sonuçları* "{query}"\n\nBulunan: {count}\n',
        
        // Admin kullanıcı detay
        admin_user_not_found: '❌ Kullanıcı bulunamadı.',
        admin_user_details: `👤 *Kullanıcı bilgileri*

{adminFlag}{premiumFlag} {firstName} (@{username})
🆔 ID: {userId}
🌐 Dil: {language}
💱 Para birimi: {currency}
🕐 Zaman dilimi: {timezone}
📅 Kayıt tarihi: {createdAt}

📊 *İstatistikler:*
• Harcama kaydı: {totalExpenses}
• Toplam tutar: {totalAmount}
• Hata bildirimi: {bugReportsCount}
• İşlem sayısı: {transactionsCount}`,
        
        // Admin işlemleri
        admin_promote_success: '✅ {userId} yönetici yapıldı.',
        admin_demote_success: '✅ {userId} kullanıcısının yönetici yetkileri kaldırıldı.',
        admin_cannot_demote_self: '❌ Kendi yönetici yetkinizi kaldıramazsınız.',
        admin_grant_premium_options: '⭐ *{userId} kullanıcısına premium ver*\n\nSüre seçin:',
        admin_grant_premium_success: '✅ {userId} kullanıcısına {days} gün premium verildi.',
        admin_revoke_premium_success: '✅ {userId} kullanıcısının premiumu kaldırıldı.',
        
        // Toplu duyuru
        admin_broadcast_prompt: '📢 *Toplu mesaj*\n\nTüm kullanıcılara gidecek mesajı yazın (en fazla 3600 karakter):',
        admin_broadcast_too_long: '❌ Mesaj çok uzun!\n\n📏 Mevcut uzunluk: {current}\n📏 Maksimum: {max}\n📏 Kısaltın: {excess} karakter',
        admin_broadcast_confirm: '📢 Toplu mesajı onaylayın\n\n📝 Mesaj:\n{message}\n\n📏 Uzunluk: {length} karakter\n\n⚠️ Bu mesaj botun TÜM kullanıcılarına gönderilecek!',
        admin_broadcast_started: '📢 Gönderim başladı...',
        admin_broadcast_result: '📢 *Gönderim bitti!*\n\n📊 *İstatistik:*\n• Toplam: {total}\n• Başarılı: {sent}\n• Başarısız: {failed}',
        admin_broadcast_header: '🔴🔴🔴 Duyuru! 🔴🔴🔴',
        
        // Genel mesajlar
        error: 'Bir hata oluştu 😞',
        not_found: 'Bulunamadı',
        expense_save_error: '❌ Harcama kaydedilirken hata oluştu. Tekrar deneyin.',
        cancel: 'İptal',
        back: 'Geri',
        confirm: 'Onayla',
        
        // Başlangıç mesajı
        start_message: `Merhaba! 👋 Harcamalarınızı ve gelirlerinizi takip etmenize yardımcı olurum.

*Harcama* — tutarı ve açıklamayı yazın: \`250 kahve\`, \`1500 öğle yemeği\`.
Başka para birimi de olur: \`20 USD taksi\` ya da sadece tutar: \`300\`.
*Gelir* — artı ile: \`+50000 maaş\`.

Kategoriyi bir kez seçin — bir dahaki sefere hatırlarım.
Menü aşağıda: ay özeti, bugünkü kayıtlar, gelir, düzenli harcamalar (kira, abonelikler) ve «☰ Daha fazla».`,

        start_returning: '👋 Tekrar hoş geldiniz! Harcamayı mesaj olarak gönderin — `250 kahve`. Menü aşağıdaki klavyede.',
      help_message: `❓ *Nasıl kullanılır*

• \`250 kahve\` — harcama. Kategoriyi bir kez seçin, hatırlarım
• \`20 USD taksi\` — başka para biriminde harcama, \`300\` — açıklamasız
• \`+50000 maaş\` — gelir (\`+1000 USD\` — başka para biriminde)
• Yeni kaydın altında: ↩️ geri al, 🏷 kategoriyi değiştir
• 📊 *Ay özeti* — harcamalar, gelir, bakiye, kategoriler; ◀️ — önceki dönemler
• 📅 *Bugün* — günün kayıtları; düzenlemek veya silmek için numaraya dokunun
• 🔁 *Düzenli harcamalar* — kira ve abonelikler her ay otomatik kaydedilir
• 🎯 *Bütçeler* ve 📄 dönem *Özeti* — ay genel bakışının altındaki düğmeler (Premium)
• Para birimleri, hatırlatıcılar (günde en fazla 3) ve dönem başlangıcı — ☰ Daha fazla → ⚙️ Ayarlar

Komutlar: /stats /history /income /recurring /export /settings /menu`,
      
        // Harcamalar
        expense_updated: '✅ Kayıt güncellendi: {amount} - {description}',
        expense_deleted: '✅ Kayıt silindi: {amount} - {description}',
        no_expenses: 'Silinecek kayıt yok 🤷‍♂️',
        expense_not_found: 'Hata: Kayıt bulunamadı.',
        expense_update_error: 'Hata: Kayıt bulunamadı veya güncellenemedi.',
        
        // İstatistik
        monthly_stats: '💰 *Bu ayki harcamalar*',
        daily_stats: '💰 *Bugünkü harcamalar*',
        total_spent: 'Toplam harcama: *{amount}*',
        records_count: 'Kayıt sayısı: {count}',
        no_expenses_period: 'Bu dönem için harcama yok.',
        
        // Kategorilere göre
        by_categories: 'Kategorilere göre:',
        
        // Kategoriler
        select_category: 'Kategori seçin:',
        amount_label: 'Tutar',
        description_label: 'Açıklama',
        category_label: 'Kategori',
        expense_added_title: 'Harcama eklendi!',
        
        // Ayarlar
        currency_select: 'Varsayılan para birimini seçin:',
        currency_set: 'Para birimi ayarlandı: {currency}',
        button_change_period_start: '📅 Dönem başlangıç günü',
        period_start_prompt: 'Ayın başlangıç gününü gir (1-31). Kısa aylarda son gün seçilir.',
        period_start_invalid: '❌ Geçersiz sayı. 1 ile 31 arasında bir tam sayı girin.',
        period_start_set: '✅ Dönem başlangıç günü ayarlandı: {day}',
        timezone_setup: `🕐 *Zaman dilimi ayarı*

Şu an saat kaç?

*Geçerli UTC zamanı:* {utcTime}

Lütfen yerel saati seçin:`,
        timezone_set: '✅ Zaman dilimi ayarlandı: {timezone}',
    // Aile bütçesi
    // Family labels
    family_label: '🏠 *Aile:*',
    family_owner_label: '👑 *Sahip:*',
    family_info: '👨‍👩‍👧‍👦 *Aile Bütçesi*\n\nBurada aile, meslektaşlar, arkadaşlar vb. ile birlikte giderleri ortak şekilde yönetebilirsiniz.\n\n- \uD83D\uDC6A Ortak harcamaları kaydetmek için paylaşılan bir grup oluşturulur.\n- \u2795 Her üye gider ekleyebilir.\n- \uD83D\uDDD1\uFE0F Gerekirse kendi giderlerinizi silebilirsiniz.\n- \uD83D\uDCCA Tüm üyeler için ortak istatistikler mevcuttur.\n- \uD83D\uDCE4 Tüm grup verilerini tek bir dosyaya aktarabilirsiniz.\n\nOrtak kontrol, daha az kaos ve daha fazla şeffaflık demektir.',
    family_created: '✅ "{name}" adlı aile oluşturuldu! Şimdi üye davet edebilirsiniz.',
    family_left: '✅ "{name}" ailesinden ayrıldınız. Bu ailedeki harcamalarınız artık kişisel.',
    family_deleted: '✅ "{name}" ailesi silindi. Tüm aile harcamaları kişisel harcamalara dönüştürüldü.',
    family_member_removed_notification: '❌ “{familyName}” ailesinden çıkarıldınız. Bu ailedeki harcamalarınız artık kişisel.',
    
    // Aile menü tuşları
    create_family: '🏠 Aile oluştur',
    join_family: '🔗 Aileye katıl',
    invite_member: '➕ Üye davet et',
    leave_family: '🚪 Aileden ayrıl',
    delete_family: '🗑️ Aileyi sil',
    family_members: '👥 Aile üyeleri',
    family_stats: '💰 Aylık harcama',
    family_add_expense: '💰 Aile harcaması ekle',
    button_personal_expense: '👤 Kişisel harcama',
    enter_personal_expense: 'Kişisel harcama miktarını ve açıklamasını girin:',
    family_mode_button_on: '🟢 Tüm harcamalar aileye — kapatmak için dokun',
    family_mode_button_off: '⚪ Tüm harcamalar aileye — açmak için dokun',
    family_mode_line_on: '🟢 Yeni harcamalar aileye kaydedilir',
    family_mode_line_off: '⚪ Yeni harcamalar kişisel',
    family_mode_enabled: '✅ Artık tüm yeni harcamalar aileye kaydedilecek.\n\nKişisel harcama için aşağıdaki «{personalButton}» veya harcama kartındaki «{removeButton}».',
    family_mode_disabled: '✅ Yeni harcamalar yeniden kişisel.\n\nAile harcaması için aşağıdaki «{familyButton}» veya harcama kartındaki «{addButton}».',
    family_menu: '👨‍👩‍👧‍👦 Aile menüsü',
    family_cancel: '❌ İptal',
    
    // Davetler
    invitation_sent: '✅ @{username} kullanıcısına davet gönderildi',
    invitation_not_found: '❌ Davet bulunamadı veya süresi doldu.',
    invitation_expired: '❌ Davetin süresi doldu.',
    
    // Giriş mesajları
    enter_family_name: 'Aile adını girin (3-50 karakter):',
    enter_invite_username: 'Kullanıcı adını girin (@ olmadan):',
    enter_expense_amount: 'Aile harcaması miktarını ve açıklamasını girin:',
    
    // Hatalar
    family_name_too_short: '❌ Aile adı en az 3 karakter olmalı.',
    family_name_too_long: '❌ Aile adı 50 karakteri geçemez.',
    user_not_found: '❌ Kullanıcı bulunamadı.',
    user_already_in_family: '❌ Kullanıcı zaten bir ailede.',
    user_already_has_invitation: '❌ Kullanıcının aktif bir daveti var.',
    user_already_in_other_family: '❌ Kullanıcı başka bir ailede.',
    user_already_in_your_family: '❌ Kullanıcı zaten sizin ailinizin üyesi.',
    user_not_premium: '❌ Kullanıcı premium değil.',
    only_owner_can_invite: '❌ Sadece aile sahibi üye davet edebilir.',
    active_invitations: '📋 Aktif davetler',
    no_active_invitations: '📋 Aktif davetiniz yok.',
    active_invitations_list: '📋 Aktif davetler listesi:',
    cancel_invitation: '❌ Daveti iptal et',
    invitation_cancelled: '✅ Davet iptal edildi.',
    not_authorized: '❌ Bu işlemi yapmaya yetkiniz yok.',
    invitation_code: '🔑 Davet kodu: `{code}`',
    family_invitation_received: '🎉 “{familyName}” ailesine davet edildiniz\n\n👤 Davet eden: {inviterName}\n🔑 Kod: `{inviteCode}`\n\nLütfen bir işlem seçin:',
    accept_invitation: '✅ Kabul et',
    reject_invitation: '❌ Reddet',
    invitation_accepted: '🎉 Tebrikler! “{familyName}” ailesine katıldınız',
    invitation_rejected: '❌ Daveti reddettiniz',
    invitation_not_pending: '❌ Davet beklemede değil',
    invitation_cancelled_notification: '❌ “{familyName}” ailesine katılma davetiniz {cancelledBy} tarafından iptal edildi',
    enter_invite_code: '🔑 Davet kodunu girin:',
    not_family_member: '❌ Bu ailenin üyesi değilsiniz.',
    not_family_owner: '❌ Ailenin sahibi değilsiniz.',
    
    // Onay mesajları
    confirm_delete_family: '⚠️ *Aile silme*\n\nTüm üyeler çıkarılacak ve aile harcamaları kişisel harcama olacak.\n\nEmin misiniz?',
    // Aile istatistikleri
    family_daily_stats: '💰 Günlük harcamalar',
    family_export: '📊 Aile verilerini dışa aktar',
    
    // Üye listesi
    family_members_title: '👥 *Aile üyeleri*',
    family_owner_role: 'Sahip',
    family_member_role: 'Üye',
    remove_member: '❌ Çıkar',
    confirm_remove_member: '⚠️ *Üye çıkarma*\n\n{name} aileden çıkarılsın mı? Bu kişinin aile harcamaları kişisel harcamaları olacak ve aile bunları artık görmeyecek.',
    member_removed: '✅ {name} aileden çıkarıldı.',
    
    // Premium özellikler
    premium_required: '❌ Bu özellik yalnızca Premium kullanıcılar içindir.',
    
    timezone_updated: `✅ *Zaman dilimi güncellendi!*

🕐 Seçilen saat: *{time}*
🌍 Zaman dilimi: *{timezone}*

Artık tüm harcamalar yerel saatte gösterilecek.`,
    
    // Limitler
    status_regular: '👤 Standart',
    status_premium: '💎 Premium',
    max_description_length: '<b>Maks açıklama uzunluğu:</b> {length} karakter',
    premium_benefits: `💎 <b>Premium avantajları:</b>
  • 🎯 %80’de ve aşıldığında uyarılı aylık ve kategori bütçeleri
  • 📄 Tam dönem özeti: her kategori geçen ayla karşılaştırmalı, bütçeler, günlük ortalama harcama
  • 5 adede kadar özel kategori
  • Aile bütçesi
  • Herhangi bir kaydın tutarını ve açıklamasını düzenleme
  • 160 karakter açıklama (80 yerine)

Gider ve gelir kaydı ücretsiz ve sınırsızdır.`,
    
    // Premium abonelik
    premium_subscription_title: '⭐️ Abonelik',
    premium_status_header: '<b>Durumunuz:</b>',
    premium_privileges: 'Avantajlar: {status}',
    premium_menu_title: '<b>Menü:</b>',
    premium_tariff_button: '⭐️ Tarife',
    premium_why_paid_button: '👀 Neden ücretli?',
    premium_donate_button: '🤝 Bağış',
    premium_back_button: '⬅️ Geri',
    premium_tariffs_title: '⭐️ Tarifeler (Telegram Stars)',
    per_month: 'aylık',
    premium_payment_info: '💳 Ödeme, Telegram’ın dahili para birimi Telegram Stars ile yapılır. 🔁 Aylık plan otomatik olarak yenilenir; Telegram’da iptal edebilirsiniz: Ayarlar → Yıldızlarım → Aboneliklerim. 3, 6 ve 12 aylık planlar tek seferlik ödemedir.',
    premium_renewal_info: '📅 İstediğiniz zaman yenileyebilirsiniz. Süre kalan zamana eklenir.',
    premium_stars_info: '💡 Yıldızları komisyonsuz olarak [@PremiumBot] üzerinden satın alabilirsiniz.',
    premium_why_paid_title: '👀 Neden ücretli?',
        premium_purchases_button: '🧾 Satın alma geçmişi',
        purchases_header: '🧾 Satın alma geçmişi',
        purchases_premium_title: 'Premium',
        purchases_donations_title: 'Bağışlar',
        no_purchases: 'Henüz satın alma yok',
        purchases_prev_button: '◀ Önceki',
        purchases_next_button: 'Sonraki ▶',
    premium_why_paid_text: 'Bu botun sunucu masrafı ayda yaklaşık $200. Kullanıcı sayısı sürekli artıyor ve geliştirici olarak hizmeti geliştirmeye devam etmek için gelire ihtiyacım var :)',
    // Tarife etiketleri ve ürün adı
    tariff_button_30: '1 Ay',
    tariff_button_90: '3 Ay',
    tariff_button_180: '6 Ay',
    tariff_button_365: '1 Yıl',
    tariff_item_30: '1 ay (30 gün)',
    tariff_item_90: '3 ay (90 gün)',
    tariff_item_180: '6 ay (180 gün)',
    tariff_item_365: '12 ay (365 gün)',
    premium_product: 'Premium abonelik',
    discount_save: '%{percent} tasarruf',
  
    payment_success: '🎉 *Ödeme başarılı!* Premium etkinleştirildi. Gelişmiş özelliklerin tadını çıkarın.',
    donation_success: '🙏 *Desteğiniz için teşekkürler!* Bağışınız botun geliştirilmesine yardımcı olacak.',
    general_payment_success: '✅ *Ödeme başarılı!* Botu kullandığınız için teşekkürler.',
    premium_expires: '📅 Premium bitiş tarihi: <b>{date}</b>\n⏰ Kalan gün: <b>{days}</b>',
  
    // Bağış
    donate_prompt_title: '🤝 Projeyi destekleyin',
    donate_prompt_text: 'Bağış yapmak istediğiniz yıldız sayısını yazın (1–2500).\nİsterseniz yeni satırda en fazla 500 karakterlik mesaj ekleyebilirsiniz.',
    donate_invalid: '❌ 1 ile 2500 arasında tam sayı girin. Mesaj en fazla 500 karakter olabilir.',
    donate_created: '✅ Bağış isteği oluşturuldu: {stars} ⭐️. Ödeme bağlantısını gönderiyorum.',
    
    // Doğrulama hataları
    error_too_long_regular: '❌ Açıklama çok uzun! Standart kullanıcılar için en fazla 80 karakter.',
    error_too_long_premium: '❌ Açıklama çok uzun! Premium için en fazla 160 karakter.',
    error_amount: '❌ Geçersiz tutar. 0.01 ile {max} arasında bir sayı girin.',
    error_format: '❌ Anlayamadım. Tutarla başlayın: `250 kahve`, `20 USD taksi` veya sadece `300`.',
    error_generic: '❌ Bir hata oluştu. Daha sonra tekrar deneyin veya yöneticiyle iletişime geçin.',
    
    // Düğmeler
    button_menu: '📋 Menü',
    button_expenses_month: '💰 Aylık harcamalar',
    button_expenses_day: '💰 Günlük harcamalar',
    button_expenses_categories: '💰 Kategoriye göre harcamalar',
    button_family: '👨‍👩‍👧‍👦 Aile',
    button_settings: '⚙️ Ayarlar',
    button_delete_last: '🗑️ Son kaydı sil',
    button_help: '❓ Yardım',
    button_edit: 'Düzenle',
    button_mark_as_family: '👨‍👩‍👧‍👦 Aileye ekle',
    button_remove_from_family: '🚫 Aile bütçesinden çıkar',
    expense_already_family: '❌ Bu harcama zaten aile bütçesinde',
    expense_converted_to_family: '✅ Harcama aile bütçesine eklendi',
    expense_removed_from_family: '✅ Harcama aile bütçesinden çıkarıldı',
    button_cancel: '❌ İptal',
    button_back: '⬅️ Geri',
    button_change_currency: '💱 Para birimini değiştir',
    button_change_timezone: '🌍 Zaman dilimi',
    button_change_language: '🌐 Dil',
    button_custom_categories: '🏷️ Özel kategoriler',
    
    // Diller
    language_select: '🌍 Dil seçin:',
    language_set: '✅ Dil Türkçe olarak değiştirildi',
    language_not_supported: '❌ Bu dil desteklenmiyor',
    language_change_error: '❌ Dil değiştirilirken hata oluştu',
    timezone_error: '❌ Zaman dilimi ayarlanırken hata oluştu',
    
    // Dışa aktar
    export_success: '📊 Veri başarıyla dışa aktarıldı!',
    export_error: 'Veri dışa aktarılırken hata 😞',
    keyboard_updated: '✅ Klavye dili güncellendi!',
    
    // Düzenleme
    edit_canceled: 'Düzenleme iptal edildi.',
    edit_no_active: 'Aktif düzenleme yok.',
    edit_instructions: 'Yeni tutar ve/veya açıklama girin (örn: 500 kahve) veya iptal butonuna basın.',
    edit_empty: 'Yeni tutar, açıklama veya ikisini birden girin.',
    edit_amount_error: 'Geçersiz tutar.',
    edit_too_long: 'Açıklama çok uzun (en fazla {max} karakter).',
    edit_format_error: 'Format hatası.',
    
    // Geri bildirimler
    callback_data_not_found: '❌ Hata: Veri bulunamadı',
    callback_expense_added: '✅ "{category}" kategorisine eklendi',
    callback_canceled: '❌ İptal edildi',
    callback_expense_canceled: '❌ Harcama ekleme iptal edildi',
    callback_deleted: 'Kayıt silindi!',
    callback_delete_error: 'Silme hatası veya kayıt bulunamadı',
    
      // Varsayılan kategoriler
  category_food: 'Yemek',
  category_transport: 'Ulaşım',
  category_entertainment: 'Eğlence',
  category_shopping: 'Alışveriş',
  category_health: 'Sağlık',
  category_other: 'Diğer',
  
  // CSV Dışa aktarma
  date_label: 'Tarih',
  currency_label: 'Para birimi',
  total_by_currencies: 'Para birimlerine göre toplam:',
  total_in_currency: '{currency} cinsinden toplam',
    
    // Özel kategoriler (Premium)
    custom_categories_title: '🏷️ Özel kategoriler',
    custom_categories_info: 'Özel harcama kategorileri oluşturabilirsiniz (yalnızca Premium).',
    custom_categories_example: '💡 Örnek: "🌍 Seyahat" veya "🎮 Oyunlar"',
    custom_categories_add: '➕ Kategori ekle',
    custom_categories_manage: '🗂️ Kategorileri yönet',
    custom_categories_enter_name: 'Yeni kategori adını girin (1-30 karakter):',
    custom_categories_created: '✅ Kategori oluşturuldu: {name}',
    custom_categories_exists: '❌ Bu kategori zaten mevcut.',
    custom_categories_limit_reached: '❌ Maksimum özel kategori sınırı: {max}',
    custom_categories_list_empty: 'Özel kategoriniz yok.',
    custom_categories_list_title: 'Özel kategorileriniz:',
    custom_categories_delete: '🗑️ Sil',
    custom_categories_deleted: '✅ Kategori silindi.',
    custom_categories_premium_required: '💎 Bu özellik yalnızca Premium kullanıcılar içindir.',

    button_income: '💵 Gelir',
    button_add_income: '➕ Gelir ekle',
    button_income_currency: '💱 Gelir para birimi',
    income_menu_title: '💵 *Bu dönemin gelirleri*',
    income_menu_empty: 'Bu dönem için henüz gelir yok.',
    income_currency_label: 'Varsayılan gelir para birimi: *{currency}*',
    income_hint: '💡 Hızlı yol: artı ile başlayan bir mesaj gönderin — `+50000 maaş` veya `+1000 USD serbest`',
    income_enter_prompt: 'Gelir tutarını ve açıklamasını girin 👇\n\nÖrnek: `50000 maaş`\nVarsayılan para birimi — *{currency}*. Tutardan sonra kodla başka biri belirtilebilir: `1000 USD serbest`',
    income_added: '✅ Gelir kaydedildi: *{amount}* — {description}',
    income_default_description: 'Gelir',
    income_deleted: '✅ Gelir silindi',
    income_edit_prompt: '✏️ Şu an: {current}\n\nYeni tutarı ve/veya açıklamayı gönderin 👇\nÖrneğin: `60000 maaş`, sadece tutar `60000` ya da sadece açıklama `avans`.\nPara birimi tutardan sonra kodla değiştirilir: `1000 USD`',
    income_updated: '✅ Gelir güncellendi',
    button_savings: '🏦 Birikimler',
    command_savings: 'Birikimler ve hedefler',
    savings_title: '🏦 *Birikimler*',
    savings_intro: 'Burada birikimlerini ve hedeflerini takip edebilir, olağan harcamalarını, faizi ve enflasyonu hesaba katarak ne kadar biriktirebileceğini görebilirsin.\n\nBirikimlerini tek tutar olarak gir ya da hesaplar oluştur — nakit, mevduat, döviz hesabı, kripto; her birinin kendi para birimi ve getirisi olur 👇',
    savings_total: 'Toplam: *{amount}*',
    savings_general: 'Genel birikimler',
    savings_mode_total_short: '(tüm birikimlerden)',
    savings_goal_achieved_short: '✅ ulaşıldı',
    savings_monthly_manual: '📥 Ayda {amount} biriktiriyorsun (elle ayarlandı)',
    savings_monthly_unknown: '📥 Ayda ne kadar biriktirdiğin henüz bilinmiyor: tam bir ayın gelirlerini kaydet ya da tutarı “⚙️ Tahmin ayarları” bölümünde belirle.',
    savings_monthly_negative: '⚠️ Son {n} ayın ortalamasında harcamalar gelirleri ayda {amount} aşıyor — birikimlerin artmıyor.',
    savings_monthly_auto: '📥 Ayda ~{amount} biriktiriyorsun — bu, {n} aylık ortalamada gelirler eksi harcamalar.',
    savings_in_year: '📈 Bir yıl sonra: ~{amount}',
    savings_in_today_money: 'bugünün parasıyla ≈ {amount}',
    savings_button_set_current: '✏️ Tek tutar olarak',
    savings_button_new_goal: '🎯 Yeni hedef',
    savings_button_forecast: '📈 Tahmin',
    savings_button_settings: '⚙️ Tahmin ayarları',
    savings_button_back: '⬅️ Birikimler',
    savings_not_found: '❌ Bu kumbarayı bulamadım — belki zaten silinmiştir.',
    savings_balance: 'Şu an: *{amount}*',
    savings_recent_operations: 'Son değişiklikler:',
    savings_button_deposit: '➕ Para ekle',
    savings_button_withdraw: '➖ Para çek',
    savings_button_set: '✏️ Tam tutar',
    savings_button_transfer: '🔄 Aktar',
    savings_button_goal_target: '🎯 Hedef tutarı',
    savings_button_goal_date: '📅 Süre',
    savings_button_mode_own: '🔀 Mod: ayrı kumbara',
    savings_button_mode_total: '🔀 Mod: tüm birikimlerden',
    savings_button_goal_delete: '🗑 Hedefi sil',
    savings_mode_own_line: '🐷 Ayrı kumbara — ona ayrıca para ekle',
    savings_mode_total_line: '🏦 Tüm birikimlerden hesaplanır',
    savings_goal_progress: 'Biriken: *{current}* / {target}',
    savings_goal_left: '{amount} kaldı',
    savings_goal_deadline: '📅 Süre: {date} · {left}',
    savings_deadline_left: '{duration} kaldı',
    savings_deadline_soon: 'bir aydan az',
    savings_deadline_passed: 'süre doldu',
    savings_goal_achieved: '🎉 Hedefe ulaşıldı!',
    savings_goal_unreachable: '📥 Ayda {amount} ile hedefe ulaşılamıyor — daha fazla biriktirmen gerek.',
    savings_goal_eta: '📥 Ayda {amount} ile hedefe ≈ {duration} içinde ulaşırsın ({date})',
    savings_goal_eta_real: '🔥 Enflasyonla (hedef pahalanıyor) — ≈ {duration} içinde',
    savings_goal_eta_real_never: '🔥 Enflasyonla hedefe ulaşılamıyor: katkın fiyat artışına yetişemiyor',
    savings_goal_own_assumption: '_Aylık katkının tamamı bu kumbaraya gidiyormuş gibi hesaplıyorum._',
    savings_goal_required: '🎯 Süreye yetişmek için ayda {amount} biriktir',
    savings_goal_required_real: '(enflasyonla — {amount})',
    savings_prompt_deposit: '“{name}” kumbarasına ne kadar eklensin? Şu an içinde {amount} var.\n\nÖrneğin: `10000` veya `100 USD` — kumbaranın para birimine çeviririm.',
    savings_prompt_withdraw: '“{name}” kumbarasından ne kadar çekilsin? Şu an içinde {amount} var.',
    savings_prompt_set: 'Şu an “{name}” içinde ne kadar var? Tam tutarı yaz, örneğin `350000`.\n\nŞu an kayıtlı: {amount}.',
    savings_transfer_choose: '“{name}” kumbarasından nereye aktarılsın? Kullanılabilir: {amount}.',
    savings_prompt_transfer: '“{from}” kumbarasından “{to}” kumbarasına ne kadar aktarılsın? Kullanılabilir: {amount}.',
    savings_prompt_goal: 'Hedefin tutarını ve adını yaz 👇\n\nÖrneğin: `1 500 000 araba` veya `3000 USD tatil`. Varsayılan para birimi: *{currency}*.\n\nSüreyi ve modu (ayrı kumbara ya da tüm birikimlerden) hedef kartında ayarlarsın.',
    savings_goal_limit_regular: '🎯 Ücretsiz sürümde {limit} hedef tutabilirsin. Premium ile — aynı anda 10 hedefe kadar.',
    savings_goal_limit_premium: '🎯 Zaten {limit} hedefin var — bu en fazlası. Yeni bir hedef eklemek için birini sil.',
    savings_prompt_goal_target: '“{name}” için yeni tutar (şu an {amount}). Yeni adla birlikte de yazabilirsin: `2 000 000 yeni araba`.',
    savings_prompt_goal_date: '“{name}” için ne zamana kadar biriktirmek istiyorsun? Ay ve yılı `12.2027` ya da tarihi `31.12.2027` yaz.',
    savings_button_no_deadline: '♾ Süresiz',
    savings_deadline_removed: '✅ Süre kaldırıldı',
    savings_mode_set_own: '✅ Hedefin artık ayrı kumbarası var — ona ayrıca para ekle.',
    savings_mode_set_total: '✅ Hedef artık tüm birikimlerden hesaplanıyor.',
    savings_moved_to_general: '💰 {amount} genel birikimlere aktarıldı.',
    savings_button_new_account: '💼 Hesap ekle',
    savings_account_yield: '📈 Hesap getirisi: yılda %{value}',
    savings_account_yield_default: '📈 Getiri — tahmin ayarlarındaki gibi: yılda %{value}',
    savings_button_account_yield: '📈 Getiri',
    savings_button_account_name: '✏️ Ad',
    savings_button_account_delete: '🗑 Hesabı sil',
    savings_button_account_yield_default: '↩️ Ayarlardaki gibi',
    savings_prompt_account: 'Hesabın adı ne ve hangi para biriminde? 👇\n\nÖrneğin: `Nakit USD`, `Mevduat 16%`, `Banka hesabı EUR`, `Kripto USDT`, `Steam skinleri USD`. Para birimi yoksa — *{currency}*; oranı `%` ile belirtebilirsin.\n\n💡 Kripto ve skinler için değerlerini dolar olarak gir ve “✏️ Tam tutar” butonuyla güncelle.',
    savings_prompt_account_yield: '“{name}” için yıllık yüzde getiri, örneğin mevduat için `16` veya nakit için `0` ({max} değerine kadar).',
    savings_prompt_account_name: '“{name}” için yeni ad:',
    savings_account_delete_confirm: '“{name}” hesabı silinsin mi?',
    savings_account_deleted: '✅ “{name}” hesabı silindi.',
    savings_account_created: '✅ “{name}” hesabı oluşturuldu.',
    savings_account_limit: '💼 Zaten {limit} hesabın var — bu en fazlası. Yeni bir hesap eklemek için gereksiz olanı sil.',
    savings_error_account: '❌ Hesabın adını yaz, örneğin `Nakit USD` veya `Mevduat 16%`.',
    savings_error_name: '❌ Ad 1 ile {max} karakter arasında olmalı.',
    savings_goal_delete_confirm: '“{name}” hedefi silinsin mi?',
    savings_goal_delete_moves: 'Biriken {amount} genel birikimlere aktarılacak — para kaybolmaz.',
    savings_button_goal_delete_yes: '🗑 Evet, sil',
    savings_goal_deleted: '✅ “{name}” hedefi silindi.',
    savings_forecast_title: '📈 *Birikim tahmini*',
    savings_now: 'Şu an: *{amount}*',
    savings_rates_not_set: '⚙️ Getiri ve enflasyon ayarlanmamış — tahminin daha doğru olması için bunları ayarlarda belirt.',
    savings_rate_yield_short: 'getiri %{value}',
    savings_rate_inflation_short: 'enflasyon %{value}',
    savings_rate_growth_short: 'katkı artışı yılda %{value}',
    savings_forecast_need_monthly: 'Tahmin için aylık katkı gerekli: en az bir tam ayın gelirlerini kaydet ya da tutarı ayarlarda elle belirle.',
    savings_horizon_6: '6 ay sonra',
    savings_horizon_12: '1 yıl sonra',
    savings_horizon_36: '3 yıl sonra',
    savings_horizon_60: '5 yıl sonra',
    savings_horizon_120: '10 yıl sonra',
    savings_forecast_simple: 'sadece biriktirerek: {amount}',
    savings_forecast_nominal: 'faiz ve katkı artışıyla: {amount}',
    savings_forecast_real: 'bugünün parasıyla: {amount}',
    savings_forecast_depleted: '⚠️ Bu hızla birikimlerin {duration} sonra tükenecek.',
    savings_forecast_legend: '💡 “Sadece biriktirerek” — faiz, enflasyon ve katkı artışı olmadan. “Bugünün parasıyla” — bugünkü fiyatlarla ne kadar edeceği.',
    savings_settings_title: '⚙️ *Tahmin ayarları*',
    savings_setting_yield: '📈 Getiri',
    savings_setting_inflation: '🔥 Enflasyon',
    savings_setting_growth: '⬆️ Katkı artışı',
    savings_rate_yearly: 'yılda %{value}',
    savings_rate_not_set: 'hesaba katılmıyor',
    savings_settings_hint: '💡 Getiri — varsayılan oran: yeni katkılar ve kendi oranı olmayan hesaplar için (kendi oranını hesap kartında ayarla). Enflasyon — fiyatların (ve hedeflerinin) yılda ne kadar arttığı. Katkı artışı — biriktirdiğin tutarın yılda ne kadar arttığı (örneğin maaş zammı).',
    savings_button_monthly: '📥 Aylık katkı',
    savings_button_monthly_auto: '🔄 Otomatik hesapla',
    savings_monthly_auto_set: '✅ Katkı otomatik hesaplanıyor: gelirler eksi harcamalar.',
    savings_prompt_monthly: 'Ayda ne kadar biriktiriyorsun? Örneğin: `30000` ({currency}).',
    savings_prompt_inflation: 'Yıllık yüzde olarak enflasyon, örneğin `8` veya `7,5` ({max} değerine kadar). `0` — hesaba katma.',
    savings_prompt_yield: 'Birikimlerin yıllık yüzde getirisi (mevduat faizi), örneğin `16` ({max} değerine kadar). `0` — hesaba katma.',
    savings_prompt_growth: 'Katkın yılda yüzde kaç artıyor, örneğin `5` ({max} değerine kadar). `0` — hesaba katma.',
    savings_monthly_set: '✅ Katkı: ayda {amount}',
    savings_setting_saved: '✅ Kaydedildi',
    savings_error_amount: '❌ Tutarı anlayamadım. Bir sayı yaz, örneğin `15000`.',
    savings_error_insufficient: '❌ O kadar yok: kumbarada {amount} var.',
    savings_error_rate: '❌ 0 ile {max} arasında bir sayı gerekli, örneğin `8` veya `7,5`.',
    savings_error_date: '❌ Süreyi anlayamadım. Ay ve yılı `12.2027` ya da tarihi `31.12.2027` yaz — gelecekte olmalı.',
    savings_error_goal: '❌ Hedefin tutarını ve adını yaz, örneğin `1 500 000 araba`.',
    savings_deposited: '✅ {amount} eklendi',
    savings_withdrawn: '✅ {amount} çekildi',
    savings_balance_set: '✅ Tutar güncellendi: {amount}',
    savings_transferred: '✅ {amount} “{name}” kumbarasına aktarıldı',
    savings_goal_created: '✅ Hedef oluşturuldu. Süre ve mod — aşağıdaki butonlarla.',
    savings_goal_updated: '✅ Hedef güncellendi',
    savings_deadline_set: '✅ Süre: {date}',
    savings_goal_achieved_notice: '🎉 “{name}” hedefine ulaşıldı!',
    savings_months: '{n} ay',
    savings_years: '{y} yıl',
    savings_years_months: '{y} yıl {m} ay',
    income_not_found: '❌ Gelir bulunamadı',
    income_currency_select: 'Genellikle ödeme aldığınız para birimini seçin. Giderler ana para biriminizde kalır:',
    income_currency_set: '✅ Gelir para birimi: {currency}',
    income_total: '💵 Gelir: *{amount}*',
    balance_label: '⚖️ Bakiye (gelir − gider): *{amount}*',
    income_error_format: '❌ Anlayamadım. Bir tutar ve isteğe bağlı açıklama gönderin: `50000 maaş` veya `1000 USD serbest`',
    income_error_amount: '❌ Geçersiz tutar. 0.01 ile {max} arasında bir sayı girin.',
    button_recurring: '🔁 Düzenli giderler',
    button_add_recurring: '➕ Düzenli gider ekle',
    recurring_menu_title: '🔁 *Düzenli giderler*',
    recurring_menu_info: 'Aylık ödemeler (kira, abonelikler, krediler) ayın seçilen gününde otomatik olarak gider olarak kaydedilir.',
    recurring_menu_empty: 'Henüz düzenli gider yok.',
    recurring_item: '{icon} {description} — *{amount}*, her ayın {day}. günü\n    Sonraki kayıt: {next}',
    recurring_monthly_total: 'Aylık toplam: *{amount}*',
    recurring_enter_prompt: 'Düzenli giderin tutarını ve açıklamasını girin 👇\n\nÖrnek: `50000 kira`\nTutardan sonra para birimi belirtebilirsiniz: `500 USD kira`',
    recurring_day_prompt: 'Bu gideri her ayın hangi gününde kaydedeyim? 1 ile 31 arasında bir sayı girin.\n\nAy daha kısaysa ayın son gününde kaydederim.',
    recurring_day_invalid: '❌ 1 ile 31 arasında bir tam sayı girin.',
    recurring_select_category: 'Düzenli gider için bir kategori seçin:',
    recurring_added: '✅ Düzenli gider eklendi\n\n{description} — *{amount}*, her ayın {day}. günü\nİlk kayıt: {next}',
    recurring_added_charged_now: '✅ Düzenli gider eklendi ve bu ay için zaten kaydedildi\n\n{description} — *{amount}*, her ayın {day}. günü\nSonraki kayıt: {next}',
    recurring_deleted: '✅ Düzenli gider silindi. Önceden kaydedilen giderler geçmişte kalır.',
    recurring_not_found: '❌ Düzenli gider bulunamadı',
    recurring_limit: '❌ En fazla {max} düzenli gideriniz olabilir',
    recurring_charged_notification: '🔁 Düzenli gider kaydedildi: {icon} {description} — *{amount}*',
    recurring_error_format: '❌ Tanınmayan biçim. Tutar ve açıklama gönderin: `50000 kira` veya `500 USD kira`',
    recurring_error_amount: '❌ Geçersiz tutar. 0.01 ile {max} arasında bir sayı girin.',

  // Main menu and «More»
  button_overview: '📊 Ay özeti',
  button_today: '📅 Bugün',
  button_more: '☰ Daha fazla',
  more_menu_title: '☰ *Daha fazla*',
  button_export: '📤 CSV dışa aktar',
  keyboard_refreshed: '✅ Menü güncellendi — artık daha kompakt 👇',
  button_outdated: 'Bu düğme eskidi. Bölümü aşağıdaki menüden tekrar açın.',
  overview_title: 'Özet: {range}',
  overview_spent: '💸 Harcamalar: *{amount}* · kayıt: {count}',
  overview_upcoming: 'Yaklaşan düzenli harcamalar:',
  overview_income_hint: '💡 Geliri artı ile kaydedin: `+50000 maaş`',
  button_prev_period: '◀️ Önceki',
  button_next_period: 'Sonraki ▶️',
  button_back_to_overview: '⬅️ Özete dön',
  day_title_today: 'Bugün, {date}',
  day_title_yesterday: 'Dün, {date}',
  day_title: '{date}',
  day_entry_hint: 'Harcamayı mesaj olarak gönderin: `250 kahve`',
  button_prev_day: '◀️ Önceki gün',
  button_next_day: 'Sonraki gün ▶️',
  list_tap_number: 'Kaydı açmak için numaraya dokunun.',
  family_today_title: 'Aile: bugünkü kayıtlar',
  button_undo: '↩️ Geri al',
  button_delete_record: '🗑 Sil',
  button_change_category: '🏷 Kategori',
  button_edit_record: '✏️ Düzenle',
  expense_family_label: 'aile bütçesinde',
  expense_recurring_label: 'otomatik kaydedildi (düzenli harcama)',
  expense_category_remembered: '🏷 Kategori, aynı açıklamalı önceki kaydınızdan seçildi — aşağıdaki düğmeyle değiştirebilirsiniz.',
  category_will_be_remembered: '💡 Seçiminizi hatırlayacağım: bir dahaki sefere böyle bir kayıt doğrudan bu kategoriye gider.',
  expense_category_changed: 'Kategori: {category}',
  settings_header: 'Ayarlar',
  settings_currency_line: '💱 Para birimi: *{currency}* · gelir: *{incomeCurrency}*',
  settings_timezone_line: '🌍 Saat dilimi: {timezone}',
  settings_language_line: '🌐 Dil: {language}',
  settings_period_line: '📅 Dönem ayın {day}. günü başlar',
  settings_reminders_on_line: '🔔 Hatırlatıcılar: açık ({hours})',
  settings_reminders_off_line: '🔔 Hatırlatıcılar: kapalı',
  button_currencies: '💱 Para birimleri',
  settings_currencies_text: '💱 *Para birimleri*\n\nAna para birimi — harcamalar ve tüm toplamlar bununla hesaplanır: *{currency}*\nVarsayılan gelir para birimi: *{incomeCurrency}*\n\nHer kayıt başka para biriminde olabilir — kodu tutardan sonra yazın: `20 USD taksi`.',
  reminders_title: 'Hatırlatıcılar',
  reminders_info: 'Seçilen saate kadar hiçbir şey kaydetmediyseniz size hatırlatırım. Günde en fazla 3 kez.',
  button_reminders_on: '🟢 Açık — kapatmak için dokunun',
  button_reminders_off: '⚫ Kapalı — açmak için dokunun',
  family_teaser: '👨‍👩‍👧‍👦 *Aile bütçesi*\n\nYakınlarınızla ortak harcamalar tek yerde: herkes kendi kaydını yapar, istatistik ve dışa aktarma ortaktır.\n\nPremium ile kullanılabilir.',
  button_premium: '⭐️ Premium',

  // Subscription and premium ending
  subscription_active_info: '🔁 Aylık abonelik {date} tarihine kadar ödendi ve otomatik olarak yenilenir. İptal etmek için: Telegram → Ayarlar → Yıldızlarım → Aboneliklerim.',
  subscription_renewed: '🔁 Abonelik yenilendi. Premium {date} tarihine kadar aktif.',
  button_view_tariffs: '⭐️ Planlar',
  premium_expiring_trial: '⏳ Premium deneme süreniz {date} tarihinde bitiyor.\n\nBundan sonra bütçeler, tam dönem özeti, özel kategoriler, aile bütçesi ve kayıt düzenleme çalışmayacak. Kaydettiğiniz her şey kalır, harcama takibi ücretsizdir.',
  premium_expiring_paid: '⏳ Premium {date} tarihinde bitiyor. Önceden yenileyebilirsiniz — kalan günler korunur.',
  premium_expired_trial: '🌙 Premium deneme süreniz sona erdi. Gider ve gelir takibi ücretsiz kalır; bütçeler, tam özet, özel kategoriler, aile ve kayıt düzenleme Premium ile kullanılabilir.',
  premium_expired_paid: '🌙 Premium sona erdi. Projeyi desteklediğiniz için teşekkürler! İstediğiniz zaman yenileyebilirsiniz.',
  premium_winback: '👋 Premium’unuz bir hafta önce sona erdi. Bütçeleri, tam özeti, özel kategorileri, aile bütçesini ve kayıt düzenlemeyi geri istiyorsanız aşağıdaki planlara göz atın.',
  start_reminders_note: '🔔 Gün içinde hiçbir şey kaydetmezseniz size hatırlatırım (günde en fazla 3 kez). Saatleri değiştirmek veya kapatmak için: ☰ Daha fazla → ⚙️ Ayarlar → 🔔.',
  bug_report_suspicious: '⚠️ Mesaj yasaklı karakterler veya şüpheli içerik içeriyor',

  // Budgets
  button_budgets: '🎯 Bütçeler',
  budgets_title: 'Bütçeler',
  budgets_empty: 'Tüm ay veya bir kategori için limit belirleyin — %80’de ve limit aşıldığında sizi uyaracağım.',
  budgets_teaser: '🎯 *Bütçeler*\n\nAy veya kategori için limit: ilerleme genel bakışta gösterilir, %80’de ve limit aşıldığında uyarı alırsınız.\n\nPremium ile kullanılabilir.',
  button_budget_total: '➕ Tüm ay',
  button_budget_category: '➕ Kategori',
  button_budget_change: '✏️ Tutarı değiştir',
  budget_total_name: '🎯 Tüm ay',
  budget_left: '{amount} kaldı',
  budget_over: '{amount} aşıldı',
  budget_enter_prompt: '“{name}” için dönem limitini girin 👇\n\nÖrneğin: `10000` (*{currency}* cinsinden) veya `150 USD`',
  budget_amount_invalid: '❌ Yalnızca tutar gerekli: `10000` veya `150 USD`.',
  budget_saved: '✅ Bütçe kaydedildi',
  budget_deleted: '✅ Bütçe silindi',
  budget_not_found: '❌ Bütçe bulunamadı',
  budget_warning_80: '⚠️ {name}: {limit} limitin {spent} harcandı ({percent}%)',
  budget_warning_100: '🚨 {name}: bütçe aşıldı — {limit} limitin {spent} ({percent}%)',
  overview_budget_of: '{amount} bütçeden',
  button_report: '📄 Özet',
  report_title: 'Özet: {range}',
  report_vs_previous: 'Önceki döneme göre: {change} (önceki: {amount})',
  report_change_new: 'yeni',
  report_change_same: 'değişiklik yok',
  report_top_categories: 'En çok harcama:',
  report_locked: '🔒 Tam döküm — önceki dönemle karşılaştırmalı tüm kategoriler, bütçeler, günlük ortalama harcama ve en büyük harcama — Premium ile gelir.',
  report_categories_vs_previous: 'Kategoriler (önceki döneme göre):',
  report_categories_gone: 'Bu sefer harcama yok: {list}',
  report_more_numbers: 'Diğer rakamlar:',
  report_per_day: '📅 Günlük ortalama: {amount}',
  report_largest: '🔝 En büyük harcama: {amount} — {description} ({date})',
  overview_budget_limit: 'limit {amount}',
  report_title_current: 'Şu ana kadarki özet: {range}',
  input_canceled: '✅ İptal edildi. Harcamalarınızı her zamanki gibi kaydedebilirsiniz.',
  no_active_state: 'Şu anda iptal edilecek bir şey yok.',
  daily_summary_title: 'Gün özeti',
  daily_summary_info: 'Günlük özet: akşam bugün ne kadar ve neye harcadığınızı göndereceğim. Yalnızca harcama olan günlerde.',
  daily_summary_enabled: '✅ Günlük özet açık',
  daily_summary_disabled: '⚫ Günlük özet kapalı',
  daily_summary_hour_info: 'Günlük özet için yerel saati seçin:',
  daily_summary_hour_set: 'Özet saati kaydedildi',
  button_daily_summary_on: '🗓 Özet: açık',
  button_daily_summary_off: '🗓 Özet: kapalı',
  settings_daily_summary_on_line: '🗓 Günlük özet: {time}',
  settings_daily_summary_off_line: '🗓 Günlük özet: kapalı',
  export_title: '📤 CSV olarak dışa aktar\n\nDosya için dönemi seçin.',
  export_categories_all: '🗂 Kategoriler: tümü',
  export_categories_selected: '🗂 Kategoriler: {categories}',
  export_period_day: '📅 Bugün',
  export_period_week: '📅 Son 7 gün',
  export_period_current: '📅 Mevcut dönem',
  export_period_previous: '📅 Önceki dönem',
  export_period_all: '♾ Tüm zamanlar',
  export_period_range: '🗓 Tarih seç…',
  export_filter_categories: '🔽 Kategorilere göre filtrele',
  export_select_categories: 'Dışa aktarılacak kategorileri seçin:',
  export_select_all: '✅ Tümünü seç',
  export_deselect_all: '❌ Tümünü kaldır',
  export_done: '✅ Tamam',
  export_no_categories: 'Lütfen en az bir kategori seçin',
  export_enter_dates: '🗓 Bir tarih aralığı girin:\n`01.03.2026 - 15.03.2026`\n\nveya tek bir tarih: `01.03.2026`',
  export_dates_invalid: '❌ Tarihler okunamadı. Lütfen şu biçimde girin: `01.03.2026 - 15.03.2026` veya tek bir tarih `01.03.2026`.',
  export_dates_order: '❌ Başlangıç tarihi bitiş tarihinden sonra. Örnek: `01.03.2026 - 15.03.2026`.',
  total_by_categories: 'Kategorilere göre toplam:',
  bot_short_description: 'Harcamaları birkaç dokunuşla takip edin: "250 kahve" yazın. Gelir, bütçeler, aylık özet, aile bütçesi.',
  bot_description: 'Gider ve gelir takibi doğrudan Telegram\'da.\n\n"250 kahve" yazın — gider kaydedilir ve kategori hatırlanır.\n\n• Kategorilere göre ay özeti ve geçen ayla karşılaştırma\n• Gelir ve bakiye: "+50000 maaş"\n• Düzenli giderler: kira ve abonelikler otomatik kaydedilir\n• Uyarılı bütçeler, günlük özet, hatırlatıcılar\n• Aile bütçesi, birden fazla para birimi, CSV dışa aktarma\n\nTemel özellikler ücretsizdir. Yeni kullanıcılara 14 gün premium.',
  command_start: 'Ana menü',
  command_stats: 'Ay özeti',
  command_history: 'Bugünün kayıtları',
  command_income: 'Gelir ve bakiye',
  command_recurring: 'Düzenli giderler',
  command_export: 'CSV olarak dışa aktar',
  command_family: 'Aile bütçesi',
  command_settings: 'Ayarlar',
  command_limits: 'Abonelik ve premium',
  command_help: 'Yardım',
  command_cancel: 'Girişi iptal et',
  command_paysupport: 'Ödeme desteği',
  command_terms: 'Kullanım koşulları',
  command_privacy: 'Gizlilik politikası',
  payment_outdated: '⚠️ Bu fatura güncel değil: fiyat değişti. Tarifeleri yeniden açın — /limits',
  security_validation_error: '⚠️ İstek işlenemedi. Lütfen tekrar deneyin veya /start ile menüyü açın.',
  expense_draft_outdated: '⌛ Bu taslak artık geçerli değil. Lütfen harcamayı tekrar gönderin.',
  family_invitation_hours_left: '⏰ Kalan süre: {hours} sa',
  family_no_members: 'Üye yok',
  family_already_member: '❌ Zaten bir ailedesiniz.',
  admin_bug_reports_all_title: '📝 Tüm hata raporları (son {count})',
  admin_bug_reports_new_title: '🆕 Yeni hata raporları (son {count})',
  admin_bug_reports_empty: 'Rapor yok.',
  payment_subscription_already_active: '🔁 Zaten aktif bir aylık aboneliğiniz var, ikincisine gerek yok. Premium\'u önceden uzatmak için tek seferlik bir tarife seçin: /limits',
  payment_foreign_payer: '⚠️ Bu ödeme bağlantısı başka bir kullanıcı için oluşturuldu. Tarifeleri botta kendiniz açın — /limits',
  premium_expired_granted: '🌙 Premium süreniz sona erdi. Gider ve gelir takibi ücretsiz kalır; bütçeler, tam özet, özel kategoriler, aile ve kayıt düzenleme Premium ile kullanılabilir. İstediğiniz zaman uzatabilirsiniz.'
};
