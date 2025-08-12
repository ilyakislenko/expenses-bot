module.exports = {
    button_reminders: '🔔 Hatırlat',
    reminders_enabled: 'Hatırlatıcılar açık. 18:00’e kadar hiçbir şey kaydetmezsen seni küçük bir espriyle hatırlatırım 😉',
    reminders_disabled: 'Hatırlatıcılar kapalı. Tam sessizlik 🤐',
    reminder_sample_variants: [
      'Hey! Cüzdanının sessiz olması mutlu olduğu anlamına gelmez. Harcamalarını yaz 😉',
      'Bugün bir şey harcadın mı? Hafızan ekmek almaya gitmeden önce yaz 🧠🥖',
      'Kaydetmezsen sanki parayı havaya uçurmuşsun gibi olur. Hadi not alalım 💸',
      'Damlaya damlaya bütçe denize akar. Bugünün harcamasını kaydet 🌊',
      'Bot azarlamaz, hatırlatır: Harcama yazma zamanı 😌'
    ],
    reminder_message_title: 'Hatırlatma',
    reminder_turn_on_off: (enabled) => enabled ? 'Hatırlatıcıları kapat' : 'Hatırlatıcıları aç',
  
    // Hata bildirimi
    button_bug_report: '🐛 Hata bildir / İyileştirme öner',
    bug_report_prompt: '🐛 *Hata bildir veya iyileştirme öner*\n\nLütfen sorunu veya önerini yaz (en fazla 1000 karakter):',
    bug_report_success: '✅ Teşekkürler! Mesajın geliştiricilere iletildi.',
    bug_report_too_long: '❌ Mesaj çok uzun! Lütfen {excess} karakter kısalt (en fazla 1000).',
    bug_report_empty: '❌ Mesaj boş. Lütfen bir sorun veya öneri yaz.',
    bug_report_rate_limit: '⚠️ Çok fazla hata bildirimi!\n\n10 dakikada en fazla 3 bildirim gönderebilirsin',
  
    // Güvenlik
    security_rate_limit: '⚠️ *Çok fazla istek*\n\n{resetTime} saniye sonra tekrar dene\nLimit: dakikada {limit} istek',
    security_validation_error: '⚠️ *Doğrulama hatası*\n\n{message}',
    security_error: '❌ *Güvenlik hatası*\n\nLütfen daha sonra tekrar dene veya yöneticiyle iletişime geç.',
    
    // Admin paneli
    button_admin: '👑 Admin paneli',
    admin_access_denied: '❌ Yönetici yetkin yok.',
    admin_panel_title: '👑 *Admin paneli*\n\nBir işlem seç:',
    admin_error: '❌ Yönetici işlemi yapılırken hata oluştu.',
      // Yönetici istatistikleri
      admin_stats_text: `📊 *Bot istatistikleri*
  
      👥 **Kullanıcılar:**
      • Toplam: {totalUsers}
      • Premium: {activePremium}
      • Bu hafta yeni: {newUsersWeek}
      • Bu ay yeni: {newUsersMonth}
      
      💰 **Harcamalar:**
      • Toplam kayıt: {totalExpenses}
      • Bu hafta: {expensesWeek}
      • Aktif kullanıcılar: {activeUsers}
      
      🐛 **Hata bildirimleri:** {totalBugReports}
      
      💎 **Bağışlar:**
      • Toplam: {totalDonations}
      • Toplanan yıldız: {totalStars}
      
      ⭐ **Premium işlemleri:** {premiumTransactions}`,
      
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
      
      📊 **Özet:**
      • Toplam bağış: {totalDonations}
      • Tamamlanan: {completedDonations}
      • Bekleyen: {pendingDonations}
      
      ⭐ **Yıldızlar:**
      • Toplam toplanan: {totalStars}
      • Ortalama bağış: {avgStars} yıldız`,
      
        // Premium istatistikleri
        admin_premium_stats: `⭐ *Premium istatistikleri*
      
      📊 **Kullanıcılar:**
      • Toplam premium: {totalPremiumUsers}
      • Şu an aktif: {activePremiumUsers}
      
      💳 **İşlemler:**
      • Toplam işlem: {totalTransactions}
      • Toplam gelir: {totalRevenue} yıldız`,
      
        // Admin listesi
        admin_admins_title: '👑 *Yöneticiler* ({count})\n',
        
        // Admin arama
        admin_search_prompt: '🔍 *Kullanıcı ara*\n\nKullanıcı ID’si veya kullanıcı adını gir:',
        admin_search_not_found: '❌ Kullanıcı bulunamadı.',
        admin_search_results: '🔍 *Arama sonuçları* "{query}"\n\nBulunan: {count}\n',
        
        // Admin kullanıcı detay
        admin_user_not_found: '❌ Kullanıcı bulunamadı.',
        admin_user_details: `👤 *Kullanıcı bilgileri*
      
      {adminFlag}{premiumFlag} **{firstName}** (@{username})
      🆔 ID: {userId}
      🌐 Dil: {language}
      💱 Para birimi: {currency}
      🕐 Zaman dilimi: {timezone}
      📅 Kayıt tarihi: {createdAt}
      
      📊 **İstatistikler:**
      • Harcama kaydı: {totalExpenses}
      • Toplam tutar: {totalAmount}
      • Hata bildirimi: {bugReportsCount}
      • İşlem sayısı: {transactionsCount}`,
        
        // Admin işlemleri
        admin_promote_success: '✅ {userId} yönetici yapıldı.',
        admin_demote_success: '✅ {userId} kullanıcısının yönetici yetkileri kaldırıldı.',
        admin_cannot_demote_self: '❌ Kendi yönetici yetkini kaldıramazsın.',
        admin_grant_premium_options: '⭐ *{userId} kullanıcısına premium ver*\n\nSüre seç:',
        admin_grant_premium_success: '✅ {userId} kullanıcısına {days} gün premium verildi.',
        admin_revoke_premium_success: '✅ {userId} kullanıcısının premiumu kaldırıldı.',
        
        // Toplu duyuru
        admin_broadcast_prompt: '📢 *Toplu mesaj*\n\nTüm kullanıcılara gidecek mesajı yaz (en fazla 3600 karakter):',
        admin_broadcast_too_long: '❌ Mesaj çok uzun!\n\n📏 Mevcut uzunluk: {current}\n📏 Maksimum: {max}\n📏 Kısalt: {excess} karakter',
        admin_broadcast_confirm: '📢 *Toplu mesajı onayla*\n\n📝 **Mesaj:**\n{message}\n\n📏 **Uzunluk:** {length} karakter\n\n⚠️ Bu mesaj botun **tüm** kullanıcılarına gönderilecek!',
        admin_broadcast_started: '📢 Gönderim başladı...',
        admin_broadcast_result: '📢 *Gönderim bitti!*\n\n📊 **İstatistik:**\n• Toplam: {total}\n• Başarılı: {sent}\n• Başarısız: {failed}',
        admin_broadcast_header: '🔴🔴🔴 *Duyuru!* 🔴🔴🔴',
        
        // Genel mesajlar
        welcome: 'Merhaba, {name}! 👋',
        main_menu_title: '🏠 *Ana menü*\n\nLütfen bir işlem seç:',
        error: 'Bir hata oluştu 😞',
        unknown_error: 'Beklenmeyen hata. Lütfen daha sonra tekrar dene.',
        not_found: 'Bulunamadı',
        error_invalid_description_format: '❌ Geçersiz format. Şu şekilde kullan: Tutar Açıklama veya Tutar Kategori Açıklama',
        expense_save_error: '❌ Harcama kaydedilirken hata oluştu. Tekrar dene.',
        cancel: 'İptal',
        back: 'Geri',
        confirm: 'Onayla',
        save: 'Kaydet',
        
        // Başlangıç mesajı
        start_message: `Merhaba! 👋 Harcamalarını kaydetmene ve bütçeni yönetmene yardımcı olurum.
      
      *Harcama nasıl eklenir:*
      Tutar ve açıklamayı yaz:
      -  \`200 market\`
      -  \`1500 restoranda öğle yemeği\`
      -  \`50 otobüs\`
      -  \`150,50 kahve\`
      
      Sonrasında kategoriler menüsü çıkar — uygun olanı seç 🏷️
      
      *Temel komutlar:*
      /start - Botu yeniden başlat
      /menu - Etkileşimli menüyü aç
      /history - Bugünün kayıtları
      /stats - Aylık kategori istatistikleri
      
      /export - Verileri CSV olarak indir
      /undo - Son kaydı sil
      
      *Ayarlar:*
      /settings - Ayarları aç
      /currency - Varsayılan para birimini değiştir
      /timezone - Zaman dilimini ayarla
      /categories - Kategorileri yönet
      
      *Ek özellikler:*
      /family - Aile bütçesi
      /limits - Limitler ve premium özellikler
      /help - Detaylı yardım
      
      Hadi harcamalarını kaydetmeye başla! 💰`,
      help_message: `📋 *Komutların detaylı açıklaması*
  
      *Harcama ekleme:*
      Tutar ve açıklama arasına boşluk koyarak yaz:
      \`200 alışveriş\` — kategori menüsü çıkar
      \`150,50 kahve\` — ondalıklı sayılar da geçerli
      
      *Temel komutlar:*
      /start - Botu yeniden başlat ve karşılama mesajını göster
      /menu - Tüm özelliklerin olduğu etkileşimli menüyü aç
      /history - Bugünkü kayıtları göster
      /stats - Bu ayın kategorilere göre istatistikleri
      
      /export - Tüm verileri CSV olarak indir
      /undo - Son eklenen kaydı sil
      
      *Ayarlar ve yönetim:*
      /settings - Ana ayar menüsünü aç
      /currency - Varsayılan para birimini değiştir (RUB, USD, EUR, KZT, CNY, THB)
      /timezone - Doğru zaman kaydı için zaman dilimini ayarla
      /categories - Özel kategorileri yönet (Premium)
      
      *Aile bütçesi:*
      /family - Aile grubu ve ortak harcamaları yönet
      - Aile oluştur, üyeleri davet et
      - Ortak harcamalar ve istatistik
      - Aile verilerini dışa aktar
      
      *Premium özellikler:*
      /limits - Limitler ve premium hakkında bilgi
      - Özel kategoriler
      - Detaylı istatistikler
      - Aile bütçesi
      - Öncelikli destek
      
      *Kullanım ipuçları:*
      • Daha iyi anlamak için açıklama ekle  
      • /stats ile düzenli olarak istatistikleri kontrol et  
      • Doğru zaman için zaman dilimini ayarla  
      • Hızlı erişim için /menu komutunu kullan  
      • Veri analizi için /export komutunu kullan
      
      *Harcama düzenleme:*
      • /history içinde kaydı sil veya düzenle  
      • "👨‍👩‍👧‍👦 Aileye ekle" butonu harcamayı aile bütçesine taşır  
      • "🚫 Aile bütçesinden çıkar" butonu tekrar kişisel bütçeye alır  
      • Sadece kendi kayıtlarını düzenleyebilir/silebilirsin  
      
      *Hatırlatıcılar:*
      • Bot her gün 18:00’de harcama girmeyi hatırlatır  
      • Sadece o gün hiç kayıt girmediysen hatırlatır  
      • Ayarlardan açıp kapatabilirsin  
      • Günde en fazla 1 hatırlatma
      
      *Destek:*
      /start komutuyla ana menüye dönebilirsin.
      
      Bütçeni yönetmede başarılar! 💰📊`,
      
        // Harcamalar
        expense_added: '✅ Kaydedildi: {amount} - {description}',
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
        no_expenses_category: 'Bu kategoride son ayda harcama yok.',
        
        // Kategoriler
        select_category: 'Kategori seçin:',
        amount_label: 'Tutar',
        description_label: 'Açıklama',
        category_label: 'Kategori',
        expense_added_title: 'Harcama eklendi!',
        no_categories: 'Kategori bulunamadı.',
        category_expenses: '"{category}" kategorisindeki harcamalar',
        no_category_expenses: 'Geçen ay bu kategoride harcama yok.',
        
        // Ayarlar
        settings_title: 'Ayarlar:',
        currency_select: 'Varsayılan para birimini seçin:',
        currency_set: 'Para birimi ayarlandı: {currency}',
        currency_updated: 'Para birimi değiştirildi: {currency}',
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
    button_family: '👨‍👩‍👧‍👦 Aile',
    family_info: '👨‍👩‍👧‍👦 *Aile Bütçesi*\n\nBurada ailenizle birlikte ortak harcamaları yönetebilirsiniz.',
    family_created: '✅ "{name}" adlı aile oluşturuldu! Şimdi üye davet edebilirsiniz.',
    family_joined: '✅ "{name}" ailesine katıldınız!',
    family_left: '✅ "{name}" ailesinden ayrıldınız.',
    family_deleted: '✅ "{name}" ailesi silindi. Tüm aile harcamaları kişisel harcamalara dönüştürüldü.',
    family_member_removed: '✅ Üye aileden çıkarıldı.',
    family_member_removed_notification: '❌ *{familyName}* ailesinden çıkarıldınız.',
    family_cannot_leave_owner: '❌ Ailenin sahibi aileden ayrılamaz. "Aileyi sil" seçeneğini kullanın.',
    
    // Aile menü tuşları
    create_family: '🏠 Aile oluştur',
    join_family: '🔗 Aileye katıl',
    invite_member: '➕ Üye davet et',
    leave_family: '🚪 Aileden ayrıl',
    delete_family: '🗑️ Aileyi sil',
    family_members: '👥 Aile üyeleri',
    family_stats: '💰 Aylık harcama',
    family_daily_stats: '💰 Günlük harcama',
    family_add_expense: '💰 Aile harcaması ekle',
    family_menu: '👨‍👩‍👧‍👦 Aile menüsü',
    family_cancel: '❌ İptal',
    
    // Davetler
    invitation_sent: '✅ @{username} kullanıcısına davet gönderildi',
    invitation_accepted: '✅ "{name}" ailesine katılma davetini kabul ettiniz!',
    invitation_rejected: '❌ "{name}" ailesine katılma davetini reddettiniz.',
    invitation_not_found: '❌ Davet bulunamadı veya süresi doldu.',
    invitation_expired: '❌ Davetin süresi doldu.',
    invitation_already_processed: '❌ Davet zaten işlenmiş.',
    
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
    family_invitation_received: '🎉 *{familyName}* ailesine davet edildiniz\n\n👤 Davet eden: {inviterName}\n🔑 Kod: `{inviteCode}`\n\nLütfen bir işlem seçin:',
    accept_invitation: '✅ Kabul et',
    reject_invitation: '❌ Reddet',
    invitation_accepted: '🎉 Tebrikler! *{familyName}* ailesine katıldınız',
    invitation_rejected: '❌ Daveti reddettiniz',
    invitation_not_pending: '❌ Davet beklemede değil',
    invitation_cancelled_notification: '❌ *{familyName}* ailesine katılma davetiniz {cancelledBy} tarafından iptal edildi',
    enter_invite_code: '🔑 Davet kodunu girin:',
    only_owner_can_remove: '❌ Üye çıkarma yetkisi sadece aile sahibine aittir.',
    only_owner_can_delete: '❌ Aileyi sadece sahibi silebilir.',
    cannot_remove_owner: '❌ Sahibi çıkaramazsınız.',
    cannot_remove_yourself: '❌ Kendinizi çıkaramazsınız.',
    family_not_found: '❌ Aile bulunamadı.',
    not_family_member: '❌ Bu ailenin üyesi değilsiniz.',
    not_family_owner: '❌ Ailenin sahibi değilsiniz.',
    
    // Onay mesajları
    confirm_delete_family: '⚠️ *Aile silme*\n\nTüm üyeler çıkarılacak ve aile harcamaları kişisel harcama olacak.\n\nEmin misiniz?',
    confirm_remove_member: '⚠️ *Üye çıkarma*\n\nÜye aileden çıkarılacak.\n\nEmin misiniz?',
    // Aile istatistikleri
    family_monthly_stats: '👨‍👩‍👧‍👦 *Bu ayın aile harcamaları*',
    family_daily_stats: '💰 Günlük harcamalar',
    family_daily_stats_title: '👨‍👩‍👧‍👦 *Bugünkü aile harcamaları*',
    family_export: '📊 Aile verilerini dışa aktar',
    family_total_spent: 'Toplam harcama: *{amount}*',
    family_members_count: 'Üye sayısı: {count}',
    family_no_expenses: 'Bu dönem için aile harcaması yok.',
    
    // Üye listesi
    family_members_title: '👥 *Aile üyeleri*',
    family_member_info: '• {name} ({role}) - {date} tarihinde katıldı',
    family_owner_role: 'Sahip',
    family_member_role: 'Üye',
    remove_member: '❌ Çıkar',
    confirm_remove_member: '⚠️ *Üye çıkarma*\n\n{name} ailesinden çıkarılsın mı?',
    member_removed: '✅ {name} aileden çıkarıldı.',
    member_removed_notification: '❌ *{familyName}* ailesinden {ownerName} tarafından çıkarıldınız.',
    
    // Premium özellikler
    premium_required: '❌ Bu özellik yalnızca Premium kullanıcılar içindir.',
    upgrade_to_premium: '💎 Aile bütçesini kullanmak için Premium’a yükseltin!',
    
    timezone_updated: `✅ *Zaman dilimi güncellendi!*
  
  🕐 Seçilen saat: *{time}*
  🌍 Zaman dilimi: *{timezone}*
  
  Artık tüm harcamalar yerel saatte gösterilecek.`,
    timezone_updated_simple: `✅ *Zaman dilimi güncellendi!*
  
  🌍 Yeni zaman dilimi: *{timezone}*
  
  Tüm harcamalar doğru saat ile gösterilecek.`,
    
    // Limitler
    limits_title: '📊 *Limit bilgileri*',
    status_regular: '👤 Standart',
    status_premium: '💎 Premium',
    status_label: '*Durum:* {status}',
    records_usage: '<b>Kayıt:</b> {current}/{max} ({percentage}%)',
    records_remaining: '<b>Kalan:</b> {remaining} kayıt',
    max_description_length: '<b>Maks açıklama uzunluğu:</b> {length} karakter',
    near_limit_warning: '⚠️ *Dikkat:* Kayıt limitine yaklaşıyorsunuz!',
    limit_reached: '❌ *Kayıt limiti doldu!*',
    premium_benefits: `💎 <b>Premium avantajları:</b>
  • 160 karakter açıklama (80 yerine)
  • 300 kayıt (100 yerine)
  • 5 adede kadar özel kategori
  • Detaylı istatistikler
  • Aile bütçesi
  • İstediğiniz kaydı düzenleme/silme imkânı (sadece son değil)`,
    
    // Premium abonelik
    premium_subscription_title: '⭐️ Abonelik',
    premium_status_header: '<b>Durumunuz:</b>',
    premium_privileges: 'Avantajlar: {status}',
    premium_limits_info: 'Burada kategori sayısı, kayıt sayısı, aile özellikleri, Premium süresi gibi limitler görünür.',
    premium_menu_title: '<b>Menü:</b>',
    premium_tariff_button: '⭐️ Tarife',
    premium_why_paid_button: '👀 Neden ücretli?',
    premium_donate_button: '🤝 Bağış',
    premium_back_button: '⬅️ Geri',
    premium_tariffs_title: '⭐️ Tarifeler (Telegram Stars)',
    premium_payment_info: '💳 Ödeme Telegram Stars ile yapılır. <bOtomatik yenileme yok.</b>',
    premium_renewal_info: '📅 İstediğiniz zaman yenileyebilirsiniz. Süre kalan zamana eklenir.',
    premium_stars_info: '💡 Yıldızları komisyonsuz olarak [@PremiumBot] üzerinden satın alabilirsiniz.',
    premium_why_paid_title: '👀 Neden ücretli?',
    premium_why_paid_text: 'Bu botun sunucu masrafı ayda yaklaşık $200. Kullanıcı sayısı sürekli artıyor ve geliştirici olarak hizmeti geliştirmeye devam etmek için gelire ihtiyacım var :)',
    premium_payment_title: '💳 *Premium abonelik ödeme*',
    premium_payment_description: 'Seçilen: <b>{duration}</b>\nFiyat: <b>{stars} ⭐️</b>\n\nÖdemek için aşağıya tıklayın.',
  
    payment_success: '🎉 *Ödeme başarılı!* Premium etkinleştirildi. Gelişmiş özelliklerin tadını çıkar.',
    donation_success: '🙏 *Desteğiniz için teşekkürler!* Bağışınız botun geliştirilmesine yardımcı olacak.',
    general_payment_success: '✅ *Ödeme başarılı!* Botu kullandığınız için teşekkürler.',
    premium_expires: '📅 Premium bitiş tarihi: <b>{date}</b>\n⏰ Kalan gün: <b>{days}</b>',
  
    // Bağış
    donate_prompt_title: '🤝 Projeyi destekle',
    donate_prompt_text: 'Bağış yapmak istediğiniz yıldız sayısını yazın (1–2500).\nİsterseniz yeni satırda en fazla 500 karakterlik mesaj ekleyebilirsiniz.',
    donate_invalid: '❌ 1 ile 2500 arasında tam sayı girin. Mesaj en fazla 500 karakter olabilir.',
    donate_created: '✅ Bağış isteği oluşturuldu: {stars} ⭐️. Ödeme bağlantısını gönderiyorum.',
    donate_paid: '🙏 Desteğiniz için teşekkürler! Bağış alındı: {stars} ⭐️',
    
    // Doğrulama hataları
    error_too_long_regular: '❌ Açıklama çok uzun! Standart kullanıcılar için en fazla 80 karakter.',
    error_too_long_premium: '❌ Açıklama çok uzun! Premium için en fazla 160 karakter.',
    error_no_description: '❌ Tutarın ardından açıklama yazmalısınız.',
    error_amount: '❌ Geçersiz tutar. 0,01 ile 999999 arasında girin.',
    error_format: '❌ Geçersiz format. Tutar ve açıklama yazın.\nÖrnek: `200 market` veya `1500 kahve`',
    error_limit_reached: '❌ Limit doldu!\nStandart: 100 kayıt\nPremium: 300 kayıt\n\n💎 Limiti artırmak için Premium alın!',
    error_premium_required: '💎 Bu özellik yalnızca Premium içindir!\n\nAvantajlar:\n• 160 karakter açıklama\n• 300 kayıt\n• Özel kategoriler\n• Detaylı istatistikler',
    error_generic: '❌ Bir hata oluştu. Daha sonra tekrar deneyin veya yöneticiyle iletişime geçin.',
    
    // Düğmeler
    button_menu: '📋 Menü',
    button_expenses_month: '💰 Aylık harcamalar',
    button_expenses_day: '💰 Günlük harcamalar',
    button_expenses_categories: '💰 Kategoriye göre harcamalar',
    button_family: '👨‍👩‍👧‍👦 Aile',
    button_settings: '⚙️ Ayarlar',
    button_delete_last: '🗑️ Son kaydı sil',
    button_limits: '📊 Limitler',
    button_help: '❓ Yardım',
    button_edit: 'Düzenle',
    button_delete: 'Sil',
    button_mark_as_family: '👨‍👩‍👧‍👦 Aileye ekle',
    button_remove_from_family: '🚫 Aile bütçesinden çıkar',
    expense_already_family: '❌ Bu harcama zaten aile bütçesinde',
    expense_converted_to_family: '✅ Harcama aile bütçesine eklendi',
    expense_removed_from_family: '✅ Harcama aile bütçesinden çıkarıldı',
    not_owner: '❌ Bu harcamanın sahibi değilsiniz',
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
    callback_limit_reached: '❌ Kayıt limiti doldu',
    callback_button_not_found: '❌ Hata: Düğme bulunamadı',
    callback_data_not_found: '❌ Hata: Veri bulunamadı',
    callback_expense_added: '✅ "{category}" kategorisine eklendi',
    callback_expense_saved: '❌ Kayıt sırasında hata',
    callback_canceled: '❌ İptal edildi',
    callback_expense_canceled: '❌ Harcama ekleme iptal edildi',
    callback_deleted: 'Kayıt silindi!',
    callback_delete_error: 'Silme hatası veya kayıt bulunamadı',
    callback_edit_mode: 'Düzenleme modundan çıkıldı:',
    callback_no_cards: 'Kayıt bulunamadı... Hata oluştu',
    
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
    custom_categories_premium_required: '💎 Bu özellik yalnızca Premium kullanıcılar içindir.'
};
        